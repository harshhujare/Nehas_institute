import { Router, Request, Response } from 'express';
import { prisma, withRetry } from '../../lib/prisma';
import { videoProvider } from '../../services/bunny';
import { grantAccess } from '../../services/grantAccess';

export const reconcileRouter = Router();

/**
 * POST /api/internal/reconcile
 * Safety net reconciliation job per system design doc (FR-Y2, Section 6.2, 6.3, 8).
 *
 * Checks:
 * 1. Missed video webhooks: lectures stuck in UPLOADING or PROCESSING for > 15 minutes.
 * 2. Safe video replacements: lectures with pendingVideoId where the pending video became READY.
 * 3. Paid-without-access: SUCCESS payments for COURSE without an active Enrollment.
 *
 * Auth: Protected by X-Reconcile-Secret header or Bearer secret.
 */
reconcileRouter.post('/', async (req: Request, res: Response) => {
  const authHeader = (req.headers['x-reconcile-secret'] ||
    req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
    '') as string;

  const validSecret =
    process.env.RECONCILIATION_SECRET ||
    process.env.ADMIN_SECRET ||
    process.env.JWT_SECRET;

  if (process.env.NODE_ENV === 'production' && (!validSecret || authHeader !== validSecret)) {
    res.status(401).json({ error: 'Unauthorized: invalid reconciliation secret' });
    return;
  }

  const results = {
    repairedLectures: 0,
    repairedEnrollments: 0,
    repairedPlans: 0,
    errors: [] as string[],
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Reconcile stuck lectures (> 15 minutes old in UPLOADING or PROCESSING, or pending replacement)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const stuckLectures = await withRetry(() =>
      prisma.lecture.findMany({
        where: {
          OR: [
            {
              status: { in: ['UPLOADING', 'PROCESSING'] },
              updatedAt: { lt: fifteenMinutesAgo },
              videoId: { not: null },
            },
            {
              pendingVideoId: { not: null },
            },
          ],
        },
      })
    );

    for (const lecture of stuckLectures) {
      try {
        const isPending = Boolean(lecture.pendingVideoId);
        const targetVideoId = lecture.pendingVideoId || lecture.videoId!;

        const { status, durationSec } = await videoProvider.getVideoStatus(targetVideoId);

        if (isPending && status === 'READY') {
          // Complete swap
          const oldVideoId = lecture.videoId;
          await withRetry(() =>
            prisma.lecture.update({
              where: { id: lecture.id },
              data: {
                videoId: lecture.pendingVideoId!,
                pendingVideoId: null,
                status: 'READY',
                durationSec,
              },
            })
          );
          if (oldVideoId) {
            videoProvider.deleteVideo(oldVideoId).catch(() => {});
          }
          results.repairedLectures++;
        } else if (!isPending && status !== lecture.status) {
          // Monotonic guard: do not revert READY
          if (lecture.status !== 'READY') {
            await withRetry(() =>
              prisma.lecture.update({
                where: { id: lecture.id },
                data: {
                  status,
                  ...(durationSec > 0 ? { durationSec } : {}),
                },
              })
            );
            results.repairedLectures++;
          }
        }
      } catch (err: any) {
        results.errors.push(`Lecture ${lecture.id}: ${err.message}`);
      }
    }

    // 2. Reconcile paid payments without enrollments (Section 6.3, 10.2 P3)
    const successfulCoursePayments = await withRetry(() =>
      prisma.payment.findMany({
        where: {
          status: 'SUCCESS',
          courseId: { not: null },
        },
        include: {
          user: {
            include: {
              enrollments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Reconcile most recent 100 payments
      })
    );

    for (const payment of successfulCoursePayments) {
      if (!payment.courseId) continue;

      // Only repair if NO enrollment record exists at all for this course.
      // If an enrollment exists (even if revokedAt is set by an admin), do NOT un-revoke it.
      const hasEnrollment = payment.user.enrollments.some(
        (e) => e.courseId === payment.courseId
      );

      if (!hasEnrollment) {
        try {
          console.warn(`[Reconcile] Detected paid order without enrollment: payment=${payment.id}, user=${payment.userId}, course=${payment.courseId}`);
          await withRetry(() =>
            prisma.enrollment.create({
              data: {
                userId: payment.userId,
                courseId: payment.courseId!,
                paymentId: payment.id,
                source: 'PURCHASE',
              },
            })
          );
          results.repairedEnrollments++;
        } catch (err: any) {
          results.errors.push(`Payment ${payment.id}: ${err.message}`);
        }
      }
    }

    // 3. Reconcile paid payments without active Plan (FR-Y2, Flaw 2)
    const successfulPlanPayments = await withRetry(() =>
      prisma.payment.findMany({
        where: {
          status: 'SUCCESS',
          OR: [
            { productType: 'PLAN' },
            { courseId: null, planDuration: { not: null } },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              plan: true,
              planExpiresAt: true,
              paidAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    );

    for (const payment of successfulPlanPayments) {
      const user = payment.user;
      if (!user) continue;

      const durationDays = payment.planDuration || 365;
      const expectedExpiryMin = new Date(payment.createdAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

      // If user is currently FREE, or their plan expired before this payment's coverage period
      const isMissingActivePlan =
        user.plan !== 'PAID' ||
        !user.planExpiresAt ||
        new Date(user.planExpiresAt) < expectedExpiryMin;

      // Only repair if the coverage period is still valid in the future
      if (isMissingActivePlan && expectedExpiryMin > new Date()) {
        try {
          console.warn(`[Reconcile] Detected paid plan without activation: payment=${payment.id}, user=${payment.userId}`);
          await withRetry(() =>
            prisma.user.update({
              where: { id: payment.userId },
              data: {
                plan: 'PAID',
                planExpiresAt: expectedExpiryMin,
                ...(user.paidAt == null && { paidAt: payment.createdAt }),
              },
            })
          );
          results.repairedPlans++;
        } catch (err: any) {
          results.errors.push(`Plan Payment ${payment.id}: ${err.message}`);
        }
      }
    }

    res.json({
      status: 'ok',
      data: results,
    });
  } catch (err: any) {
    console.error('[Reconcile] Reconciliation job error:', err.message);
    res.status(500).json({ error: 'Reconciliation failed', details: err.message });
  }
});
