import { Router, Request, Response } from 'express';
import { prisma, withRetry } from '../lib/prisma';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { canWatchLecture } from '../middleware/canWatch';
import { videoProvider } from '../services/bunny';
import { UpdateLectureProgressSchema } from '@neha/shared';
import type { PlaybackAuthResponse } from '@neha/shared';

export const lecturesRouter = Router();

/**
 * Compute dynamic token TTL per system design doc Section 10.3 T1:
 * clamp(duration × 1.5 + 10 min, 30 min, 4 h)
 * Unknown duration => 2 hours.
 */
function computeTokenTTL(durationSec: number | null | undefined): number {
  if (!durationSec || durationSec <= 0) {
    return 2 * 3600; // 2 hours for unknown duration
  }
  const idealSec = Math.round(durationSec * 1.5 + 10 * 60);
  const minSec = 30 * 60;  // 30 minutes
  const maxSec = 4 * 3600; // 4 hours
  return Math.max(minSec, Math.min(maxSec, idealSec));
}

/**
 * GET /api/lectures/:id/play
 * Retrieves a signed time-limited iframe embed URL for playing the lecture video.
 * Validates entitlements (Free preview, Staff, All-Access Pass, or Course Enrollment).
 * Security: NEVER returns raw video GUID; only signed embed player URL.
 *
 * System design doc Section 6.4:
 * - Sign a fresh embed URL per request
 * - Insert PlaybackGrant audit row (FR-Y3)
 * - Return resumePositionSec + next/prev for UX (Section 8)
 */
lecturesRouter.get('/:id/play', optionalAuth(), async (req: Request, res: Response) => {
  const id = String(req.params.id);

  const access = await canWatchLecture(req.user, id);

  if (!access.allowed) {
    if (access.reason === 'UNAUTHORIZED') {
      res.status(401).json({
        error: 'Please sign in to watch this lesson.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Machine-readable reason per Section 8 API contracts
    const reasonMap: Record<string, string> = {
      PLAN_EXPIRED: 'Your All-Access Pass has expired.',
      ENROLLMENT_REVOKED: 'Your enrollment has been revoked.',
      PAYWALL: 'Enrollment or All-Access Pass required to watch this lesson.',
    };

    res.status(403).json({
      error: reasonMap[access.reason] || 'Access denied.',
      code: access.reason,
      courseId: access.lecture?.section.courseId,
    });
    return;
  }

  const lecture = access.lecture!;

  // T6: Lecture not READY — return 409
  if (lecture.videoId && lecture.status !== 'READY' && !lecture.isFreePreview) {
    if (videoProvider.isConfigured()) {
      res.status(409).json({
        error: 'This lecture video is being prepared. Please check back shortly.',
        code: 'NOT_READY',
        status: lecture.status,
      });
      return;
    }
  }

  const videoId = lecture.videoId || `mock-video-${lecture.id}`;
  const expiresInSeconds = computeTokenTTL(lecture.durationSec);

  const embedUrl = await videoProvider.generateSignedEmbedUrl({
    videoId,
    expiresInSeconds,
  });

  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  // Fetch resume position for authenticated users
  let resumePositionSec = 0;
  if (req.user) {
    const progress = await withRetry(() =>
      prisma.lectureProgress.findUnique({
        where: {
          userId_lectureId: {
            userId: req.user!.userId,
            lectureId: id,
          },
        },
        select: { positionSec: true, completed: true },
      })
    );

    if (progress) {
      // T11: If >= 95% completed, restart from 0
      if (progress.completed || (lecture.durationSec && progress.positionSec >= lecture.durationSec * 0.95)) {
        resumePositionSec = 0;
      } else {
        resumePositionSec = progress.positionSec;
      }
    }
  }

  // Fetch next/prev lectures in the same course for navigation
  let next: { id: string; title: string } | null = null;
  let prev: { id: string; title: string } | null = null;

  try {
    // Get all lectures in the course ordered by section.order then lecture.order
    const allLectures = await withRetry(() =>
      prisma.lecture.findMany({
        where: {
          section: {
            courseId: lecture.section.courseId,
          },
        },
        orderBy: [
          { section: { order: 'asc' } },
          { order: 'asc' },
        ],
        select: { id: true, title: true },
      })
    );

    const currentIndex = allLectures.findIndex((l) => l.id === id);
    if (currentIndex > 0) {
      prev = { id: allLectures[currentIndex - 1].id, title: allLectures[currentIndex - 1].title };
    }
    if (currentIndex >= 0 && currentIndex < allLectures.length - 1) {
      next = { id: allLectures[currentIndex + 1].id, title: allLectures[currentIndex + 1].title };
    }
  } catch {
    // Non-critical — don't block playback if nav data fails
  }

  // Insert PlaybackGrant audit row (FR-Y3)
  if (req.user) {
    try {
      await prisma.playbackGrant.create({
        data: {
          userId: req.user.userId,
          lectureId: id,
          expiresAt: new Date(expiresAt * 1000),
          ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null,
          userAgent: req.headers['user-agent']?.substring(0, 255) || null,
        },
      });
    } catch {
      // Non-critical — don't block playback if audit insert fails
      console.error('[play] Failed to insert PlaybackGrant audit row');
    }
  }

  const payload: PlaybackAuthResponse = {
    embedUrl,
    expiresAt,
    resumePositionSec,
    lecture: {
      id: lecture.id,
      title: lecture.title,
      durationSec: lecture.durationSec || 0,
      isFreePreview: lecture.isFreePreview,
    },
    next,
    prev,
  };

  console.log(`[play] play_granted: user=${req.user?.userId || 'guest'} lecture=${id} reason=${access.reason} ttl=${expiresInSeconds}s`);

  res.json({ data: payload });
});

/**
 * POST /api/lectures/:id/progress
 * Heartbeat / progress sync endpoint.
 * Saves playback timestamp (seconds) and optional completion flag.
 *
 * System design doc Section 6.5 & 10.7:
 * - `completed` is sticky: never auto-flipped back to false (X3)
 * - Auto-mark completed at >= 90% of duration (X3)
 */
lecturesRouter.post('/:id/progress', requireAuth(), async (req: Request, res: Response) => {
  const id = String(req.params.id);

  const parsed = UpdateLectureProgressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid progress data', details: parsed.error.flatten() });
    return;
  }

  const { positionSec, completed } = parsed.data;

  // Verify lecture exists
  const lecture = await withRetry(() =>
    prisma.lecture.findUnique({
      where: { id },
      select: { id: true, durationSec: true },
    })
  );

  if (!lecture) {
    res.status(404).json({ error: 'Lecture not found' });
    return;
  }

  // Check if already completed (sticky — X3)
  const existing = await withRetry(() =>
    prisma.lectureProgress.findUnique({
      where: {
        userId_lectureId: {
          userId: req.user!.userId,
          lectureId: id,
        },
      },
      select: { completed: true },
    })
  );

  // Auto-mark completed if watched >= 90% of duration (X3)
  let newCompleted: boolean;
  if (existing?.completed) {
    // Sticky: once completed, never auto-flip back to false
    newCompleted = true;
  } else if (completed !== undefined) {
    newCompleted = completed;
  } else {
    newCompleted = lecture.durationSec && lecture.durationSec > 0
      ? positionSec >= lecture.durationSec * 0.9
      : false;
  }

  const progress = await withRetry(() =>
    prisma.lectureProgress.upsert({
      where: {
        userId_lectureId: {
          userId: req.user!.userId,
          lectureId: id,
        },
      },
      update: {
        positionSec,
        completed: newCompleted,
      },
      create: {
        userId: req.user!.userId,
        lectureId: id,
        positionSec,
        completed: newCompleted,
      },
    })
  );

  res.json({
    data: {
      userId: progress.userId,
      lectureId: progress.lectureId,
      positionSec: progress.positionSec,
      completed: progress.completed,
      updatedAt: progress.updatedAt.toISOString(),
    },
  });
});
