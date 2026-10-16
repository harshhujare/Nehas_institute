import { Router, Request, Response } from 'express';
import { prisma, withRetry } from '../lib/prisma';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { canWatchLecture } from '../middleware/canWatch';
import { videoProvider } from '../services/bunny';
import { UpdateLectureProgressSchema } from '@neha/shared';
import type { PlaybackAuthResponse } from '@neha/shared';

export const lecturesRouter = Router();

/**
 * GET /api/lectures/:id/play
 * Retrieves a signed time-limited iframe embed URL for playing the lecture video.
 * Validates entitlements (Free preview, Staff, All-Access Pass, or Course Enrollment).
 * Security: NEVER returns raw video GUID; only signed embed player URL.
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

    res.status(403).json({
      error: 'Enrollment or All-Access Pass required to watch this lesson.',
      code: 'PAYWALL',
      courseId: access.lecture?.section.courseId,
    });
    return;
  }

  const lecture = access.lecture!;
  const videoId = lecture.videoId || `mock-video-${lecture.id}`;
  const expiresInSeconds = 14400; // 4 hours

  const embedUrl = await videoProvider.generateSignedEmbedUrl({
    videoId,
    expiresInSeconds,
  });

  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const payload: PlaybackAuthResponse = {
    embedUrl,
    expiresAt,
    lecture: {
      id: lecture.id,
      title: lecture.title,
      durationSec: lecture.durationSec || 0,
      isFreePreview: lecture.isFreePreview,
    },
  };

  res.json({ data: payload });
});

/**
 * POST /api/lectures/:id/progress
 * Heartbeat / progress sync endpoint.
 * Saves playback timestamp (seconds) and optional completion flag.
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

  // Auto-mark completed if watched >= 90% of duration
  const autoCompleted =
    completed !== undefined
      ? completed
      : lecture.durationSec && lecture.durationSec > 0
      ? positionSec >= lecture.durationSec * 0.9
      : false;

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
        completed: autoCompleted,
      },
      create: {
        userId: req.user!.userId,
        lectureId: id,
        positionSec,
        completed: autoCompleted,
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
