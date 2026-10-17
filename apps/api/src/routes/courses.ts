import { Router, Request, Response } from 'express';
import { prisma, withRetry } from '../lib/prisma';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { CourseQuerySchema } from '@neha/shared';
import type { CourseSummary, CourseDetail, SectionWithLectures, LectureSummary } from '@neha/shared';

export const coursesRouter = Router();

/**
 * GET /api/courses
 * Public course catalog listing.
 * Supports filtering by category, level, keyword search, and pagination.
 */
coursesRouter.get('/', async (req: Request, res: Response) => {
  const parsed = CourseQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.flatten() });
    return;
  }

  const { category, level, search, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const whereClause: Record<string, unknown> = {
    isPublished: true,
  };

  if (category && category !== 'All Tracks') {
    whereClause.category = category;
  }

  if (level) {
    whereClause.level = level;
  }

  if (search && search.trim()) {
    whereClause.OR = [
      { title: { contains: search.trim(), mode: 'insensitive' } },
      { description: { contains: search.trim(), mode: 'insensitive' } },
      { shortDescription: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }

  const [totalCount, courses] = await Promise.all([
    withRetry(() => prisma.course.count({ where: whereClause })),
    withRetry(() =>
      prisma.course.findMany({
        where: whereClause,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          sections: {
            select: {
              lectures: {
                select: {
                  durationSec: true,
                },
              },
            },
          },
        },
      })
    ),
  ]);

  const summaries: CourseSummary[] = courses.map((c) => {
    let totalLectures = 0;
    let totalDurationSec = 0;

    for (const section of c.sections) {
      totalLectures += section.lectures.length;
      for (const lec of section.lectures) {
        totalDurationSec += lec.durationSec || 0;
      }
    }

    return {
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      shortDescription: c.shortDescription,
      category: c.category,
      level: c.level,
      thumbnailKey: c.thumbnailKey,
      previewVideoId: c.previewVideoId,
      priceInPaise: c.priceInPaise,
      isPublished: c.isPublished,
      order: c.order,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      totalLectures,
      totalDurationSec,
    };
  });

  res.json({
    data: summaries,
    pagination: {
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
});

/**
 * GET /api/courses/:slugOrId
 * Detailed course syllabus view with sections and lectures.
 * Security: NEVER returns raw videoId.
 * Optionally populates user enrollment and watch progress if authenticated.
 */
coursesRouter.get('/:slugOrId', optionalAuth(), async (req: Request, res: Response) => {
  const slugOrId = String(req.params.slugOrId);

  const whereCondition = {
    OR: [{ slug: slugOrId }, { id: slugOrId }],
    ...(!req.user || req.user.role === 'STUDENT' ? { isPublished: true } : {}),
  };

  const course = await withRetry(() =>
    prisma.course.findFirst({
      where: whereCondition,
      include: {
        sections: {
          orderBy: { order: 'asc' as const },
          include: {
            lectures: {
              orderBy: { order: 'asc' as const },
              select: {
                id: true,
                sectionId: true,
                title: true,
                description: true,
                order: true,
                durationSec: true,
                status: true,
                isFreePreview: true,
                createdAt: true,
                updatedAt: true,
                // CRITICAL: videoId is explicitly OMITTED
              },
            },
          },
        },
      },
    })
  );

  if (!course) {
    res.status(404).json({ error: 'Course not found' });
    return;
  }

  let totalLectures = 0;
  let totalDurationSec = 0;
  const allLectureIds: string[] = [];

  const sections: SectionWithLectures[] = course.sections.map((s) => {
    const lectures: LectureSummary[] = s.lectures.map((l) => {
      totalLectures += 1;
      totalDurationSec += l.durationSec || 0;
      allLectureIds.push(l.id);

      return {
        id: l.id,
        sectionId: l.sectionId,
        title: l.title,
        description: l.description,
        order: l.order,
        durationSec: l.durationSec || 0,
        status: l.status,
        isFreePreview: l.isFreePreview,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      };
    });

    return {
      id: s.id,
      courseId: s.courseId,
      title: s.title,
      order: s.order,
      lectures,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  });

  // Evaluate optional user enrollment and progress
  let isEnrolled = false;
  let userProgress: CourseDetail['userProgress'] = undefined;

  if (req.user) {
    const [enrollment, progressList] = await Promise.all([
      withRetry(() =>
        prisma.enrollment.findUnique({
          where: {
            userId_courseId: {
              userId: req.user!.userId,
              courseId: course.id,
            },
          },
        })
      ),
      withRetry(() =>
        prisma.lectureProgress.findMany({
          where: {
            userId: req.user!.userId,
            lectureId: { in: allLectureIds },
          },
          orderBy: { updatedAt: 'desc' },
        })
      ),
    ]);

    // Active paid plan grants all-access enrollment equivalent
    const hasActivePaidPlan =
      req.user.plan === 'PAID' &&
      (!req.user.planExpiresAt || new Date(req.user.planExpiresAt) > new Date());

    isEnrolled = Boolean(enrollment || hasActivePaidPlan || req.user.role !== 'STUDENT');

    const completedLectureIds = progressList.filter((p) => p.completed).map((p) => p.lectureId);
    const percentComplete =
      totalLectures > 0 ? Math.round((completedLectureIds.length / totalLectures) * 100) : 0;
    const lastWatchedLectureId = progressList[0]?.lectureId || null;

    userProgress = {
      completedLectureIds,
      percentComplete,
      lastWatchedLectureId,
    };
  }

  const detail: CourseDetail = {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    shortDescription: course.shortDescription,
    category: course.category,
    level: course.level,
    thumbnailKey: course.thumbnailKey,
    previewVideoId: course.previewVideoId,
    priceInPaise: course.priceInPaise,
    isPublished: course.isPublished,
    order: course.order,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
    totalLectures,
    totalDurationSec,
    sections,
    isEnrolled,
    userProgress,
  };

  res.json({ data: detail });
});

/**
 * GET /api/courses/:id/progress
 * Fetch the authenticated user's current progress for a course.
 */
coursesRouter.get('/:id/progress', requireAuth(), async (req: Request, res: Response) => {
  const id = String(req.params.id);

  const course = await withRetry(() =>
    prisma.course.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            lectures: {
              select: { id: true },
            },
          },
        },
      },
    })
  );

  if (!course) {
    res.status(404).json({ error: 'Course not found' });
    return;
  }

  const lectureIds = course.sections.flatMap((s) => s.lectures.map((l) => l.id));

  const progressRecords = await withRetry(() =>
    prisma.lectureProgress.findMany({
      where: {
        userId: req.user!.userId,
        lectureId: { in: lectureIds },
      },
      orderBy: { updatedAt: 'desc' },
    })
  );

  const completedLectureIds = progressRecords.filter((p) => p.completed).map((p) => p.lectureId);
  const totalLectures = lectureIds.length;
  const percentComplete =
    totalLectures > 0 ? Math.round((completedLectureIds.length / totalLectures) * 100) : 0;

  res.json({
    data: {
      totalLectures,
      completedCount: completedLectureIds.length,
      percentComplete,
      lastWatchedLectureId: progressRecords[0]?.lectureId || null,
      completedLectureIds,
    },
  });
});

/**
 * POST /api/courses/:id/enroll
 * Free course enrollment — bypasses Razorpay (FR-P3).
 * Razorpay cannot create zero-amount orders, so free courses use this endpoint.
 * Idempotent: re-enrollment returns existing enrollment.
 */
coursesRouter.post('/:id/enroll', requireAuth(), async (req: Request, res: Response) => {
  const courseId = String(req.params.id);

  const course = await withRetry(() =>
    prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, priceInPaise: true, isPublished: true, archivedAt: true },
    })
  );

  if (!course || !course.isPublished || course.archivedAt) {
    res.status(404).json({ error: 'Course not found or not available' });
    return;
  }

  // Only free courses can use this endpoint
  if (course.priceInPaise > 0) {
    res.status(400).json({ error: 'This course requires payment. Use the purchase flow instead.' });
    return;
  }

  // Idempotent: upsert — if already enrolled (even if revoked), reactivate
  const enrollment = await withRetry(() =>
    prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId: req.user!.userId, courseId: course.id },
      },
      create: {
        userId: req.user!.userId,
        courseId: course.id,
        source: 'FREE',
      },
      update: {
        // Reactivate if previously revoked
        revokedAt: null,
        source: 'FREE',
      },
    })
  );

  // Audit log
  await withRetry(() =>
    prisma.auditLog.create({
      data: {
        action: 'enrollment.grant',
        entityType: 'Enrollment',
        entityId: enrollment.id,
        actorId: req.user!.userId,
        meta: { source: 'free', courseId: course.id },
      },
    })
  );

  res.status(201).json({
    data: {
      enrolled: true,
      courseId: course.id,
      enrollmentId: enrollment.id,
    },
  });
});
