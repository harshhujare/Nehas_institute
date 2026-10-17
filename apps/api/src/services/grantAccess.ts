import { prisma, withRetry } from '../lib/prisma';

/**
 * Central idempotent access-granting function.
 * Called by both the /verify endpoint and the Razorpay webhook.
 * Whichever arrives first wins; the second is a no-op.
 *
 * System design doc Section 6.3:
 * "Both paths call one idempotent grantAccess(payment) function."
 *
 * Returns true if this call actually transitioned the payment, false if already done.
 */
export async function grantAccess(
  razorpayOrderId: string,
  razorpayPaymentId?: string
): Promise<{ granted: boolean; payment: { userId: string; productType: string | null; courseId: string | null; planDuration: number | null } | null }> {
  // CAS: only transition PENDING → SUCCESS. If already SUCCESS, this is a no-op.
  const result = await withRetry(() =>
    prisma.payment.updateMany({
      where: { razorpayOrderId, status: 'PENDING' },
      data: {
        status: 'SUCCESS',
        ...(razorpayPaymentId && { razorpayPaymentId }),
      },
    })
  );

  if (result.count === 0) {
    // Already processed (by the other path)
    console.log(`[grantAccess] Payment ${razorpayOrderId} already SUCCESS (no-op)`);
    return { granted: false, payment: null };
  }

  // Re-fetch the full payment to determine what to grant
  const payment = await withRetry(() =>
    prisma.payment.findUnique({
      where: { razorpayOrderId },
      select: {
        id: true,
        userId: true,
        productType: true,
        courseId: true,
        planDuration: true,
        amount: true,
      },
    })
  );

  if (!payment) {
    console.error(`[grantAccess] Payment ${razorpayOrderId} not found after update`);
    return { granted: false, payment: null };
  }

  const isCourseOrder = payment.productType === 'COURSE' && payment.courseId;

  if (isCourseOrder) {
    // ── Course purchase: create/reactivate Enrollment ──────────────────────
    await withRetry(() =>
      prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: payment.userId,
            courseId: payment.courseId!,
          },
        },
        create: {
          userId: payment.userId,
          courseId: payment.courseId!,
          paymentId: payment.id,
          source: 'PURCHASE',
        },
        update: {
          // Reactivate if previously revoked (e.g., refund then re-purchase)
          revokedAt: null,
          paymentId: payment.id,
          source: 'PURCHASE',
        },
      })
    );

    // Audit log
    await withRetry(() =>
      prisma.auditLog.create({
        data: {
          action: 'enrollment.grant',
          entityType: 'Enrollment',
          entityId: payment.courseId!,
          actorId: null, // system action
          meta: {
            source: 'payment',
            paymentId: payment.id,
            razorpayOrderId,
            userId: payment.userId,
            amount: payment.amount,
          },
        },
      })
    );

    console.log(`[grantAccess] COURSE enrollment granted: user=${payment.userId} course=${payment.courseId} payment=${razorpayOrderId}`);
  } else {
    // ── Plan purchase: update user plan (existing behavior) ────────────────
    let planExpiresAt: Date | undefined;
    if (payment.planDuration) {
      planExpiresAt = new Date();
      planExpiresAt.setDate(planExpiresAt.getDate() + payment.planDuration);
    }

    const existingUser = await withRetry(() =>
      prisma.user.findUnique({
        where: { id: payment.userId },
        select: { paidAt: true },
      })
    );

    await withRetry(() =>
      prisma.user.update({
        where: { id: payment.userId },
        data: {
          ...(planExpiresAt && { plan: 'PAID', planExpiresAt }),
          // paidAt: set once on first payment, never overwritten
          ...(existingUser?.paidAt == null && { paidAt: new Date() }),
        },
      })
    );

    console.log(`[grantAccess] PLAN activated: user=${payment.userId} duration=${payment.planDuration}d payment=${razorpayOrderId}`);
  }

  return {
    granted: true,
    payment: {
      userId: payment.userId,
      productType: payment.productType,
      courseId: payment.courseId,
      planDuration: payment.planDuration,
    },
  };
}
