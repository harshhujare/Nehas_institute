import { Role, Plan } from '@prisma/client';
import { prisma, withRetry } from '../lib/prisma';

export type WatchAccessReason =
  | 'FREE_PREVIEW'
  | 'STAFF'
  | 'ALL_ACCESS_PLAN'
  | 'ENROLLED'
  | 'UNAUTHORIZED'
  | 'PAYWALL';

export interface CanWatchResult {
  allowed: boolean;
  reason: WatchAccessReason;
  lecture?: {
    id: string;
    title: string;
    videoId: string | null;
    durationSec: number | null;
    isFreePreview: boolean;
    section: {
      id: string;
      courseId: string;
    };
  };
}

export interface UserAuthContext {
  userId: string;
  role: Role;
  plan: Plan;
  planExpiresAt?: Date | string | null;
}

/**
 * Evaluates whether a given user (or guest) is entitled to watch a specific lecture.
 *
 * Rules:
 * 1. If lecture isFreePreview = true -> ALLOW (even guests / unauthenticated users)
 * 2. If user is null/undefined -> DENY (401 Unauthorized)
 * 3. If user is Staff (SUPER_ADMIN, CONTENT_MANAGER, SUPPORT_MANAGER) -> ALLOW
 * 4. If user has active All-Access Pass (plan = PAID and not expired) -> ALLOW
 * 5. If user has active course Enrollment (not expired) -> ALLOW
 * 6. Otherwise -> DENY (403 Forbidden / Paywall)
 */
export async function canWatchLecture(
  user: UserAuthContext | null | undefined,
  lectureId: string
): Promise<CanWatchResult> {
  const lecture = await withRetry(() =>
    prisma.lecture.findUnique({
      where: { id: lectureId },
      select: {
        id: true,
        title: true,
        videoId: true,
        durationSec: true,
        isFreePreview: true,
        section: {
          select: {
            id: true,
            courseId: true,
          },
        },
      },
    })
  );

  if (!lecture) {
    return { allowed: false, reason: 'PAYWALL' };
  }

  // 1. Free Preview is accessible to everyone
  if (lecture.isFreePreview) {
    return { allowed: true, reason: 'FREE_PREVIEW', lecture };
  }

  // 2. Non-free preview requires authentication
  if (!user) {
    return { allowed: false, reason: 'UNAUTHORIZED', lecture };
  }

  // 3. Staff & Admins always have full curriculum access
  const staffRoles: Role[] = ['SUPER_ADMIN', 'CONTENT_MANAGER', 'SUPPORT_MANAGER'];
  if (staffRoles.includes(user.role)) {
    return { allowed: true, reason: 'STAFF', lecture };
  }

  // 4. Active All-Access Pass (PAID plan)
  if (user.plan === 'PAID') {
    const isPlanActive = !user.planExpiresAt || new Date(user.planExpiresAt) > new Date();
    if (isPlanActive) {
      return { allowed: true, reason: 'ALL_ACCESS_PLAN', lecture };
    }
  }

  // 5. Course-specific Enrollment
  const enrollment = await withRetry(() =>
    prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.userId,
          courseId: lecture.section.courseId,
        },
      },
      select: {
        expiresAt: true,
      },
    })
  );

  if (enrollment) {
    const isEnrollmentActive = !enrollment.expiresAt || new Date(enrollment.expiresAt) > new Date();
    if (isEnrollmentActive) {
      return { allowed: true, reason: 'ENROLLED', lecture };
    }
  }

  // 6. Paywall
  return { allowed: false, reason: 'PAYWALL', lecture };
}
