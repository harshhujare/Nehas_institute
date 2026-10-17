import { Router, Request, Response, NextFunction } from 'express';
import { prisma, withRetry } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { createRazorpayOrder, verifyRazorpaySignature, verifyWebhookSignature, isRazorpayConfigured } from '../services/razorpay';
import { CreateOrderSchema, CreatePlanOrderSchema, CreateCourseOrderSchema, VerifyPaymentSchema } from '@neha/shared';
import { grantAccess } from '../services/grantAccess';

export const paymentsRouter = Router();

// Guard: if Razorpay keys are missing return 503 instead of crashing
paymentsRouter.use((_req: Request, res: Response, next: NextFunction) => {
  if (!isRazorpayConfigured()) {
    res.status(503).json({ error: 'Payment service is not available' });
    return;
  }
  next();
});

// GET /api/payments/plan-config — Publicly available pricing info
paymentsRouter.get('/plan-config', async (_req: Request, res: Response) => {
  const configs = await prisma.planConfig.findMany({
    where: { isActive: true },
    orderBy: { planDuration: 'asc' },
    select: {
      planDuration: true,
      price: true,
      label: true,
      description: true,
    }
  });
  res.json({ data: configs });
});


// POST /api/payments/create-order
// Backward compatible: if productType is omitted or 'PLAN', existing plan flow runs.
// If productType === 'COURSE', creates a course purchase order.
// Hard Rule #7: prices are computed server-side; client-supplied amounts are ignored.
paymentsRouter.post('/create-order', requireAuth(), async (req: Request, res: Response) => {
  const parsed = CreateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;
  const productType = 'productType' in data ? data.productType : 'PLAN';

  if (productType === 'COURSE') {
    // ── COURSE purchase flow ────────────────────────────────────────────────
    const courseData = data as { productType: 'COURSE'; courseId: string };

    const course = await withRetry(() =>
      prisma.course.findUnique({
        where: { id: courseData.courseId },
        select: { id: true, title: true, priceInPaise: true, isPublished: true, archivedAt: true },
      })
    );

    if (!course || !course.isPublished || course.archivedAt) {
      res.status(404).json({ error: 'Course not found or not available for purchase' });
      return;
    }

    // FR-P3: Free courses bypass Razorpay (Razorpay cannot create zero-amount orders)
    if (course.priceInPaise === 0) {
      res.status(400).json({ error: 'This is a free course. Use POST /api/courses/:id/enroll instead.' });
      return;
    }

    // P4: Block if already enrolled (not revoked)
    const existingEnrollment = await withRetry(() =>
      prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId: req.user!.userId, courseId: course.id },
        },
        select: { revokedAt: true },
      })
    );

    if (existingEnrollment && !existingEnrollment.revokedAt) {
      res.status(409).json({ error: 'You are already enrolled in this course.' });
      return;
    }

    // Idempotency: return existing PENDING order for same user+course within 30 minutes
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existingOrder = await prisma.payment.findFirst({
      where: {
        userId: req.user!.userId,
        status: 'PENDING',
        productType: 'COURSE',
        courseId: course.id,
        createdAt: { gte: thirtyMinsAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingOrder) {
      res.json({
        data: {
          orderId: existingOrder.razorpayOrderId,
          amount: existingOrder.amount,
          currency: 'INR',
          keyId: process.env.RAZORPAY_KEY_ID,
          productType: 'COURSE',
          courseTitle: course.title,
        },
      });
      return;
    }

    // Create Razorpay order — amount from DB, not client (Hard Rule #7)
    let order: Awaited<ReturnType<typeof createRazorpayOrder>>;
    try {
      order = await createRazorpayOrder({
        amount: course.priceInPaise,
        receipt: `rcpt_${req.user!.userId.substring(0, 8)}_${Date.now()}`,
        notes: {
          productType: 'COURSE',
          courseId: course.id,
          courseTitle: course.title,
          userId: req.user!.userId,
        },
      });
    } catch (err) {
      console.error('[create-order] Razorpay API error:', err);
      res.status(503).json({ error: 'Payment gateway unavailable. Please try again in a moment.' });
      return;
    }

    try {
      await withRetry(() =>
        prisma.payment.create({
          data: {
            userId: req.user!.userId,
            razorpayOrderId: order.id,
            amount: course.priceInPaise,
            status: 'PENDING',
            productType: 'COURSE',
            courseId: course.id,
          },
        })
      );
    } catch (err) {
      console.error('[create-order] DB error saving pending course payment:', err);
      res.status(503).json({ error: 'Could not save order. Please try again.' });
      return;
    }

    res.json({
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        productType: 'COURSE',
        courseTitle: course.title,
      },
    });
    return;
  }

  // ── PLAN purchase flow (existing behavior unchanged — Hard Rule #6) ──────
  // Block mid-plan purchase — user cannot buy again while their plan is active
  const currentUser = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { plan: true, planExpiresAt: true },
  });
  if (
    currentUser?.plan === 'PAID' &&
    currentUser.planExpiresAt &&
    currentUser.planExpiresAt > new Date()
  ) {
    res.status(409).json({
      error: 'You already have an active plan. You can purchase again after it expires.',
      planExpiresAt: currentUser.planExpiresAt,
    });
    return;
  }

  const planData = data as { planDuration: string };
  const planDuration = parseInt(planData.planDuration);

  // ── Fix G: wrap planConfig fetch in withRetry() ───────────────────────────
  const planConfig = await withRetry(() =>
    prisma.planConfig.findFirst({ where: { planDuration, isActive: true } })
  );
  if (!planConfig) {
    res.status(400).json({ error: 'Invalid plan duration or plan is not available' });
    return;
  }
  const { price: amount, label: planLabel } = planConfig;

  // Idempotency: return existing PENDING order if created within the last 30 minutes
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
  const existingOrder = await prisma.payment.findFirst({
    where: {
      userId: req.user!.userId,
      status: 'PENDING',
      planDuration,
      createdAt: { gte: thirtyMinsAgo }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (existingOrder) {
    res.json({
      data: {
        orderId: existingOrder.razorpayOrderId,
        amount: existingOrder.amount,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
    return;
  }

  let order: Awaited<ReturnType<typeof createRazorpayOrder>>;
  try {
    order = await createRazorpayOrder({
      amount,
      receipt: `rcpt_${req.user!.userId.substring(0, 8)}_${Date.now()}`,
    });
  } catch (err) {
    console.error('[create-order] Razorpay API error:', err);
    res.status(503).json({ error: 'Payment gateway unavailable. Please try again in a moment.' });
    return;
  }

  try {
    await withRetry(() =>
      prisma.payment.create({
        data: {
          userId: req.user!.userId,
          razorpayOrderId: order.id,
          amount,
          status: 'PENDING',
          planDuration,
          productType: 'PLAN',
        },
      })
    );
  } catch (err) {
    console.error('[create-order] DB error saving pending payment:', err);
    res.status(503).json({ error: 'Could not save order. Please try again.' });
    return;
  }

  res.json({
    data: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      planLabel,
    },
  });
});

// POST /api/payments/verify
// Uses grantAccess for idempotent access granting (system design Section 6.3)
paymentsRouter.post('/verify', requireAuth(), async (req: Request, res: Response) => {
  const parsed = VerifyPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  // Server-side HMAC verification — never trust client
  const valid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) {
    res.status(400).json({ error: 'Payment verification failed — invalid signature' });
    return;
  }

  const payment = await prisma.payment.findUnique({ where: { razorpayOrderId } });
  if (!payment || payment.userId !== req.user!.userId) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  // Idempotency: if already SUCCESS, don't re-grant
  if (payment.status === 'SUCCESS') {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { planExpiresAt: true } });
    res.json({ data: { message: 'Payment already verified.', planExpiresAt: user?.planExpiresAt } });
    return;
  }

  // Use the central grantAccess function
  const result = await grantAccess(razorpayOrderId, razorpayPaymentId);

  if (result.granted && result.payment) {
    if (result.payment.productType === 'COURSE') {
      res.json({ data: { message: 'Payment successful. Course access activated.', courseId: result.payment.courseId } });
    } else {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { planExpiresAt: true } });
      res.json({ data: { message: 'Payment successful. Subscription activated.', planExpiresAt: user?.planExpiresAt } });
    }
  } else {
    // Already processed (race with webhook) — return success anyway
    res.json({ data: { message: 'Payment already verified.' } });
  }
});

// POST /api/payments/webhook — Razorpay async events
// Note: req.rawBody is populated by captureRawBody middleware (registered in index.ts)
// before express.json() so the HMAC is computed over the original bytes Razorpay sent.
paymentsRouter.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  if (!signature) {
    res.status(400).json({ error: 'Missing webhook signature' });
    return;
  }

  // Use raw bytes for HMAC — never re-serialize the parsed JSON object
  const rawBody = req.rawBody?.toString('utf8') ?? JSON.stringify(req.body);
  const valid = verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    res.status(400).json({ error: 'Invalid webhook signature' });
    return;
  }

  const event = req.body.event;
  const orderId = req.body.payload?.payment?.entity?.order_id
    ?? req.body.payload?.order?.entity?.id;
  const razorpayPaymentId: string | undefined =
    req.body.payload?.payment?.entity?.id;

  // ── Payment captured / order paid ─────────────────────────────────────────
  if ((event === 'payment.captured' || event === 'order.paid') && orderId) {
    try {
      await withRetry(async () => {
        const result = await grantAccess(orderId, razorpayPaymentId);
        if (result.granted) {
          console.log(`[Webhook] Payment ${orderId} → SUCCESS via ${event}`);
        } else {
          console.log(`[Webhook] Payment ${orderId} already SUCCESS (skipped) via ${event}`);
        }
      });
    } catch (err) {
      console.error('[Webhook] DB error processing payment event:', err);
      res.status(500).json({ error: 'Webhook processing failed — will retry' });
      return;
    }
  }

  // ── Payment failed ────────────────────────────────────────────────────────
  if (event === 'payment.failed' && orderId) {
    try {
      await withRetry(() =>
        prisma.payment.updateMany({
          where: { razorpayOrderId: orderId, status: 'PENDING' },
          data: { status: 'FAILED' },
        })
      );
    } catch (err) {
      console.error('[Webhook] DB error processing payment.failed event:', err);
      res.status(500).json({ error: 'Webhook processing failed — will retry' });
      return;
    }
  }

  // ── Refund (FR-P4): full refund revokes enrollment, partial refund ignored ──
  if (event === 'refund.created' && razorpayPaymentId) {
    try {
      const refundAmount = req.body.payload?.refund?.entity?.amount;

      // Find the payment by razorpayPaymentId
      const payment = await withRetry(() =>
        prisma.payment.findFirst({
          where: { razorpayPaymentId },
          select: { id: true, userId: true, amount: true, productType: true, courseId: true, razorpayOrderId: true },
        })
      );

      if (payment) {
        const isFullRefund = refundAmount >= payment.amount;

        if (isFullRefund) {
          // Mark payment as refunded
          await withRetry(() =>
            prisma.payment.updateMany({
              where: { id: payment.id, status: 'SUCCESS' },
              data: { status: 'REFUNDED' },
            })
          );

          if (payment.productType === 'COURSE' && payment.courseId) {
            // Set revokedAt on the enrollment (Section 6.6)
            await withRetry(() =>
              prisma.enrollment.updateMany({
                where: {
                  userId: payment.userId,
                  courseId: payment.courseId!,
                  revokedAt: null,
                },
                data: { revokedAt: new Date() },
              })
            );

            await withRetry(() =>
              prisma.auditLog.create({
                data: {
                  action: 'enrollment.revoke',
                  entityType: 'Enrollment',
                  entityId: payment.courseId!,
                  meta: {
                    source: 'refund',
                    paymentId: payment.id,
                    razorpayPaymentId,
                    userId: payment.userId,
                    refundAmount,
                  },
                },
              })
            );

            console.log(`[Webhook] COURSE refund: enrollment revoked for user=${payment.userId} course=${payment.courseId}`);
          } else {
            // PLAN refund: revert user to FREE (existing behavior)
            await withRetry(() =>
              prisma.user.update({
                where: { id: payment.userId },
                data: { plan: 'FREE', planExpiresAt: null },
              })
            );
            console.log(`[Webhook] PLAN refund: user=${payment.userId} reverted to FREE`);
          }
        } else {
          // Partial refund: ignore but log (per spec)
          console.log(`[Webhook] Partial refund ignored: payment=${payment.id} refund=${refundAmount} original=${payment.amount}`);
        }
      }
    } catch (err) {
      console.error('[Webhook] DB error processing refund event:', err);
      res.status(500).json({ error: 'Webhook processing failed — will retry' });
      return;
    }
  }

  res.json({ status: 'ok' });
});
