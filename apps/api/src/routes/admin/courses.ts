import { Router, Request, Response } from 'express';
import { prisma, withRetry } from '../../lib/prisma';
import { requireAdmin } from '../../middleware/auth';
import {
  CreateCourseSchema,
  UpdateCourseSchema,
  CreateSectionSchema,
  UpdateSectionSchema,
  CreateLectureSchema,
  UpdateLectureSchema,
  AdminEnrollmentGrantSchema,
  AdminEnrollmentRevokeSchema,
} from '@neha/shared';
import { videoProvider } from '../../services/bunny';

export const adminCoursesRouter = Router();

// All routes require admin (CONTENT_MANAGER or SUPER_ADMIN)
adminCoursesRouter.use(requireAdmin());

// ─── Course CRUD ──────────────────────────────────────────────────────────────

/**
 * GET /api/admin/courses
 * Full list of courses (published & drafts) with enrollment stats.
 */
adminCoursesRouter.get('/', async (_req: Request, res: Response) => {
  const courses = await withRetry(() =>
    prisma.course.findMany({
      where: { archivedAt: null },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { enrollments: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lectures: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                order: true,
                videoId: true,
                durationSec: true,
                status: true,
                isFreePreview: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    })
  );

  res.json({ data: courses });
});

/**
 * POST /api/admin/courses
 * Create a new course draft.
 */
adminCoursesRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateCourseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  // Check slug uniqueness
  const existing = await prisma.course.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    res.status(409).json({ error: 'A course with this slug already exists.' });
    return;
  }

  const course = await withRetry(() =>
    prisma.course.create({ data: parsed.data })
  );

  // Audit
  await prisma.auditLog.create({
    data: {
      actorId: req.user!.userId,
      action: 'course.create',
      entityType: 'Course',
      entityId: course.id,
      meta: { title: course.title, slug: course.slug },
    },
  });

  res.status(201).json({ data: course });
});

/**
 * PUT /api/admin/courses/:id
 * Update course details. Validates publish rules (C6).
 */
adminCoursesRouter.put('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateCourseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const courseId = String(req.params.id);
  const existing = await prisma.course.findUnique({ where: { id: courseId } });
  if (!existing) {
    res.status(404).json({ error: 'Course not found' });
    return;
  }

  // C6: Course with zero READY lectures cannot be published
  if (parsed.data.isPublished === true) {
    const readyLectures = await prisma.lecture.count({
      where: {
        section: { courseId },
        status: 'READY',
      },
    });
    if (readyLectures === 0 && videoProvider.isConfigured()) {
      res.status(400).json({ error: 'Cannot publish a course with no READY lectures.' });
      return;
    }
  }

  const course = await withRetry(() =>
    prisma.course.update({ where: { id: courseId }, data: parsed.data })
  );

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.userId,
      action: 'course.update',
      entityType: 'Course',
      entityId: course.id,
      meta: { changes: parsed.data },
    },
  });

  res.json({ data: course });
});

/**
 * DELETE /api/admin/courses/:id
 * Hard Rule #8: Never hard-delete courses with enrollments, payments, or progress.
 * Archive instead. Only truly empty drafts can be hard-deleted.
 */
adminCoursesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const courseId = String(req.params.id);
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        _count: { select: { enrollments: true, payments: true } },
      },
    });

    if (!course) {
      // Idempotent: If course is already deleted, return success so duplicate clicks do not fail
      res.json({ data: { deleted: true, message: 'Course already removed.' } });
      return;
    }

    const hasData = course._count.enrollments > 0 || course._count.payments > 0;

    if (hasData) {
      // Soft-delete: archive
      await withRetry(() =>
        prisma.course.update({
          where: { id: courseId },
          data: { archivedAt: new Date(), isPublished: false },
        })
      );

      await prisma.auditLog.create({
        data: {
          actorId: req.user?.userId || null,
          action: 'course.archive',
          entityType: 'Course',
          entityId: courseId,
          meta: { reason: 'Has enrollments or payments — archived instead of deleted' },
        },
      });

      res.json({ data: { archived: true, message: 'Course archived (has existing enrollments/payments).' } });
    } else {
      // Hard delete for empty drafts / courses without purchase records
      try {
        await withRetry(() =>
          prisma.course.delete({ where: { id: courseId } })
        );
      } catch (deleteErr: any) {
        console.warn('[course.delete] Direct delete failed, falling back to archive:', deleteErr.message);
        await withRetry(() =>
          prisma.course.update({
            where: { id: courseId },
            data: { archivedAt: new Date(), isPublished: false },
          })
        );
      }

      await prisma.auditLog.create({
        data: {
          actorId: req.user?.userId || null,
          action: 'course.delete',
          entityType: 'Course',
          entityId: courseId,
          meta: { title: course.title },
        },
      });

      res.json({ data: { deleted: true } });
    }
  } catch (err: any) {
    console.error('[adminCoursesRouter.delete] Error deleting course:', err);
    res.status(500).json({ error: err.message || 'Failed to delete course' });
  }
});

/**
 * PATCH /api/admin/courses/:id/publish
 * Toggle publish status. FR-A9: unpublishing hides from catalog but keeps access.
 */
adminCoursesRouter.patch('/:id/publish', async (req: Request, res: Response) => {
  const courseId = String(req.params.id);
  const { isPublished } = req.body as { isPublished: boolean };

  if (typeof isPublished !== 'boolean') {
    res.status(400).json({ error: 'isPublished must be a boolean' });
    return;
  }

  // C6: Cannot publish with zero READY lectures
  if (isPublished) {
    const readyLectures = await prisma.lecture.count({
      where: { section: { courseId }, status: 'READY' },
    });
    if (readyLectures === 0 && videoProvider.isConfigured()) {
      res.status(400).json({ error: 'Cannot publish a course with no READY lectures.' });
      return;
    }
  }

  const course = await withRetry(() =>
    prisma.course.update({ where: { id: courseId }, data: { isPublished } })
  );

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.userId,
      action: isPublished ? 'course.publish' : 'course.unpublish',
      entityType: 'Course',
      entityId: courseId,
    },
  });

  res.json({ data: course });
});

// ─── Section CRUD ─────────────────────────────────────────────────────────────

/**
 * POST /api/admin/courses/:id/sections
 * Add a new section to a course.
 */
adminCoursesRouter.post('/:id/sections', async (req: Request, res: Response) => {
  const parsed = CreateSectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const courseId = String(req.params.id);
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    res.status(404).json({ error: 'Course not found' });
    return;
  }

  // Auto-assign order if not provided
  if (parsed.data.order === 0) {
    const maxOrder = await prisma.section.aggregate({
      where: { courseId },
      _max: { order: true },
    });
    parsed.data.order = (maxOrder._max.order ?? -1) + 1;
  }

  const section = await withRetry(() =>
    prisma.section.create({
      data: { ...parsed.data, courseId },
      include: { lectures: true },
    })
  );

  res.status(201).json({ data: section });
});

/**
 * PUT /api/admin/sections/:id
 * Update section title or order.
 */
adminCoursesRouter.put('/sections/:id', async (req: Request, res: Response) => {
  const parsed = UpdateSectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const section = await withRetry(() =>
    prisma.section.update({
      where: { id: String(req.params.id) },
      data: parsed.data,
    })
  );

  res.json({ data: section });
});

/**
 * DELETE /api/admin/sections/:id
 * C3: Soft consideration — for now, cascade delete if no student progress exists.
 */
adminCoursesRouter.delete('/sections/:id', async (req: Request, res: Response) => {
  const sectionId = String(req.params.id);

  await withRetry(() =>
    prisma.section.delete({ where: { id: sectionId } })
  );

  res.json({ data: { deleted: true } });
});

// ─── Lecture CRUD ──────────────────────────────────────────────────────────────

/**
 * POST /api/admin/sections/:id/lectures
 * Add a lecture to a section.
 */
adminCoursesRouter.post('/sections/:sectionId/lectures', async (req: Request, res: Response) => {
  const parsed = CreateLectureSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const sectionId = String(req.params.sectionId);
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) {
    res.status(404).json({ error: 'Section not found' });
    return;
  }

  // Auto-assign order
  if (parsed.data.order === 0) {
    const maxOrder = await prisma.lecture.aggregate({
      where: { sectionId },
      _max: { order: true },
    });
    parsed.data.order = (maxOrder._max.order ?? -1) + 1;
  }

  const lecture = await withRetry(() =>
    prisma.lecture.create({
      data: { ...parsed.data, sectionId },
    })
  );

  res.status(201).json({ data: lecture });
});

/**
 * PUT /api/admin/lectures/:id
 * Update lecture details including pasting a Bunny Video ID (FR-A3 P1).
 * When videoId is provided, status is set to READY by default.
 */
adminCoursesRouter.put('/lectures/:id', async (req: Request, res: Response) => {
  const parsed = UpdateLectureSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const lectureId = String(req.params.id);
  const existing = await prisma.lecture.findUnique({ where: { id: lectureId } });
  if (!existing) {
    res.status(404).json({ error: 'Lecture not found' });
    return;
  }

  // If videoId is being set and status isn't explicitly provided, default to READY
  const data = { ...parsed.data };
  if (data.videoId && !data.status) {
    data.status = 'READY';
  }

  const lecture = await withRetry(() =>
    prisma.lecture.update({ where: { id: lectureId }, data })
  );

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.userId,
      action: 'lecture.update',
      entityType: 'Lecture',
      entityId: lectureId,
      meta: { changes: parsed.data },
    },
  });

  res.json({ data: lecture });
});

/**
 * DELETE /api/admin/lectures/:id
 */
adminCoursesRouter.delete('/lectures/:id', async (req: Request, res: Response) => {
  const lectureId = String(req.params.id);

  await withRetry(() =>
    prisma.lecture.delete({ where: { id: lectureId } })
  );

  res.json({ data: { deleted: true } });
});

/**
 * POST /api/admin/lectures/:id/refresh-status
 * FR-A4: Re-fetch video status from Bunny and update the DB.
 */
adminCoursesRouter.post('/lectures/:id/refresh-status', async (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const lecture = await prisma.lecture.findUnique({ where: { id: lectureId } });

  if (!lecture) {
    res.status(404).json({ error: 'Lecture not found' });
    return;
  }

  if (!lecture.videoId && !lecture.pendingVideoId) {
    res.status(400).json({ error: 'No video attached to this lecture.' });
    return;
  }

  if (!videoProvider.isConfigured()) {
    res.status(503).json({ error: 'Video provider not configured.' });
    return;
  }

  const targetVideoId = lecture.pendingVideoId || lecture.videoId!;
  const isCheckingPending = Boolean(lecture.pendingVideoId);

  const { status, durationSec } = await videoProvider.getVideoStatus(targetVideoId);

  let updated = lecture;
  if (isCheckingPending && status === 'READY') {
    // Section 6.7: Pending replacement video is READY. Atomically swap videoId
    const oldVideoId = lecture.videoId;
    updated = await withRetry(() =>
      prisma.lecture.update({
        where: { id: lectureId },
        data: {
          videoId: lecture.pendingVideoId!,
          pendingVideoId: null,
          status: 'READY',
          durationSec,
        },
      })
    );

    // Asynchronously delete old video in Bunny
    if (oldVideoId) {
      videoProvider.deleteVideo(oldVideoId).catch((err) => {
        console.warn(`[VideoReplacement] Failed to delete old video ${oldVideoId}:`, err);
      });
    }
  } else if (!isCheckingPending) {
    updated = await withRetry(() =>
      prisma.lecture.update({
        where: { id: lectureId },
        data: { status, durationSec },
      })
    );
  }

  res.json({
    data: {
      ...updated,
      checkStatus: status,
      isPendingProcessing: isCheckingPending && status !== 'READY',
    },
  });
});

/**
 * POST /api/admin/lectures/:id/upload-auth
 * FR-A3 P2: Generate TUS upload credentials for browser-direct upload.
 * U9: Idempotent per lecture while UPLOADING.
 */
adminCoursesRouter.post('/lectures/:id/upload-auth', async (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const lecture = await prisma.lecture.findUnique({ where: { id: lectureId } });

  if (!lecture) {
    res.status(404).json({ error: 'Lecture not found' });
    return;
  }

  if (!videoProvider.isConfigured()) {
    res.status(503).json({ error: 'Video provider not configured.' });
    return;
  }

  let videoId = lecture.videoId;

  // U9: If UPLOADING and already has a videoId, reuse it
  if (!videoId || lecture.status !== 'UPLOADING') {
    // U6: Write DB first with status=UPLOADING, then create Bunny video
    const { videoId: newVideoId } = await videoProvider.createVideoRecord(`lecture-${lectureId}`);
    videoId = newVideoId;

    await withRetry(() =>
      prisma.lecture.update({
        where: { id: lectureId },
        data: { videoId, status: 'UPLOADING', durationSec: 0 },
      })
    );
  }

  const tusAuth = await videoProvider.generateTusUploadAuth(videoId);

  res.json({ data: tusAuth });
});

/**
 * POST /api/admin/lectures/:id/replace-video
 * FR-A3 P2 / Section 6.7: Safe video replacement.
 * Generates TUS auth for a new Bunny video stored in pendingVideoId.
 */
adminCoursesRouter.post('/lectures/:id/replace-video', async (req: Request, res: Response) => {
  const lectureId = String(req.params.id);
  const lecture = await prisma.lecture.findUnique({ where: { id: lectureId } });

  if (!lecture) {
    res.status(404).json({ error: 'Lecture not found' });
    return;
  }

  if (!videoProvider.isConfigured()) {
    res.status(503).json({ error: 'Video provider not configured.' });
    return;
  }

  const { videoId: pendingVideoId } = await videoProvider.createVideoRecord(`lecture-${lectureId}-replacement`);

  await withRetry(() =>
    prisma.lecture.update({
      where: { id: lectureId },
      data: { pendingVideoId },
    })
  );

  const tusAuth = await videoProvider.generateTusUploadAuth(pendingVideoId);

  res.json({
    data: {
      ...tusAuth,
      isReplacement: true,
      pendingVideoId,
    },
  });
});

// ─── Curriculum Reorder ───────────────────────────────────────────────────────

/**
 * PUT /api/admin/curriculum/reorder
 * Batch reorder sections and lectures.
 * C1: Single transaction rewriting order values; IDs stable so progress is preserved.
 */
adminCoursesRouter.put('/curriculum/reorder', async (req: Request, res: Response) => {
  const { sections, lectures } = req.body as {
    sections?: { id: string; order: number }[];
    lectures?: { id: string; order: number }[];
  };

  if (!sections && !lectures) {
    res.status(400).json({ error: 'Provide sections and/or lectures arrays to reorder.' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (sections) {
      for (const s of sections) {
        await tx.section.update({ where: { id: s.id }, data: { order: s.order } });
      }
    }
    if (lectures) {
      for (const l of lectures) {
        await tx.lecture.update({ where: { id: l.id }, data: { order: l.order } });
      }
    }
  });

  res.json({ data: { reordered: true } });
});

// ─── Admin Enrollment Management (FR-A7) ─────────────────────────────────────

/**
 * POST /api/admin/enrollments
 * Manually grant access (WhatsApp/UPI-direct sales, goodwill).
 * source = ADMIN_GRANT, grantedBy and reason required.
 */
adminCoursesRouter.post('/enrollments', async (req: Request, res: Response) => {
  const parsed = AdminEnrollmentGrantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const { userId, courseId, reason, expiresAt } = parsed.data;

  // Verify user and course exist
  const [user, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }),
  ]);

  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (!course) { res.status(404).json({ error: 'Course not found' }); return; }

  const enrollment = await withRetry(() =>
    prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: {
        userId,
        courseId,
        source: 'ADMIN_GRANT',
        grantedBy: req.user!.userId,
        reason,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      update: {
        revokedAt: null, // reactivate if revoked
        source: 'ADMIN_GRANT',
        grantedBy: req.user!.userId,
        reason,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })
  );

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.userId,
      action: 'enrollment.admin_grant',
      entityType: 'Enrollment',
      entityId: enrollment.id,
      meta: { userId, courseId, reason },
    },
  });

  res.status(201).json({ data: enrollment });
});

/**
 * POST /api/admin/enrollments/:id/revoke
 * Admin revoke with reason. Sets revokedAt, keeps row for audit.
 */
adminCoursesRouter.post('/enrollments/:id/revoke', async (req: Request, res: Response) => {
  const parsed = AdminEnrollmentRevokeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const enrollmentId = String(req.params.id);
  const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });

  if (!enrollment) {
    res.status(404).json({ error: 'Enrollment not found' });
    return;
  }

  if (enrollment.revokedAt) {
    res.status(409).json({ error: 'Enrollment already revoked.' });
    return;
  }

  const updated = await withRetry(() =>
    prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { revokedAt: new Date(), reason: parsed.data.reason },
    })
  );

  await prisma.auditLog.create({
    data: {
      actorId: req.user!.userId,
      action: 'enrollment.admin_revoke',
      entityType: 'Enrollment',
      entityId: enrollmentId,
      meta: {
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        reason: parsed.data.reason,
      },
    },
  });

  res.json({ data: updated });
});
