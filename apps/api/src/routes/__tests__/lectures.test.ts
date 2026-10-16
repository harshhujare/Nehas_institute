import 'dotenv/config';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma';
import { signAccessToken } from '../../services/token';
import express from 'express';
import { lecturesRouter } from '../lectures';
import { errorHandler } from '../../middleware/error';
import http from 'http';

describe('Lectures Playback & Progress Routes', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;
  let courseId: string;
  let freeLectureId: string;
  let paidLectureId: string;
  let testUserId: string;
  let studentToken: string;
  let enrolledToken: string;

  before(async () => {
    // 1. Create Course, Section, and 2 Lectures (one free, one paid)
    const course = await prisma.course.create({
      data: {
        slug: 'test-lecture-play-' + Date.now(),
        title: 'Artisan Pastry Masterclass',
        description: 'Testing lecture playback endpoints',
        category: 'Baking & Pastry',
        priceInPaise: 49900,
        isPublished: true,
        sections: {
          create: {
            title: 'Module 1: Croissant Lamination',
            order: 1,
            lectures: {
              create: [
                {
                  title: 'Butter Block Prep (Free Preview)',
                  order: 1,
                  durationSec: 600,
                  isFreePreview: true,
                  videoId: 'bunny-test-free-guid',
                },
                {
                  title: 'Double Book Turn & Sheeting (Paid)',
                  order: 2,
                  durationSec: 1200,
                  isFreePreview: false,
                  videoId: 'bunny-test-paid-guid',
                },
              ],
            },
          },
        },
      },
      include: {
        sections: {
          include: {
            lectures: true,
          },
        },
      },
    });

    courseId = course.id;
    const free = course.sections[0].lectures.find((l) => l.isFreePreview)!;
    const paid = course.sections[0].lectures.find((l) => !l.isFreePreview)!;
    freeLectureId = free.id;
    paidLectureId = paid.id;

    // 2. Create student user
    const user = await prisma.user.create({
      data: {
        name: 'Pastry Student',
        email: `pastry-${Date.now()}@test.com`,
        role: 'STUDENT',
        plan: 'FREE',
      },
    });
    testUserId = user.id;

    studentToken = signAccessToken({
      userId: user.id,
      role: 'STUDENT',
      plan: 'FREE',
    });

    // 3. Create another user who IS enrolled in this course
    const enrolledUser = await prisma.user.create({
      data: {
        name: 'Enrolled Pastry Student',
        email: `enrolled-${Date.now()}@test.com`,
        role: 'STUDENT',
        plan: 'FREE',
      },
    });

    await prisma.enrollment.create({
      data: {
        userId: enrolledUser.id,
        courseId,
      },
    });

    enrolledToken = signAccessToken({
      userId: enrolledUser.id,
      role: 'STUDENT',
      plan: 'FREE',
    });

    // 4. Start test server
    const app = express();
    app.use(express.json());
    app.use('/api/lectures', lecturesRouter);
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr) {
          port = addr.port;
          baseUrl = `http://localhost:${port}/api/lectures`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.course.delete({ where: { id: courseId } }).catch(() => {});
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'pastry-',
        },
      },
    }).catch(() => {});
  });

  test('GET /api/lectures/:id/play allows Guest to watch Free Preview with signed embed URL', async () => {
    const res = await fetch(`${baseUrl}/${freeLectureId}/play`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as {
      data: {
        embedUrl: string;
        expiresAt: number;
        lecture: { id: string; title: string; isFreePreview: boolean };
      };
    };

    assert.ok(json.data.embedUrl);
    assert.ok(json.data.embedUrl.includes('bunny-test-free-guid') || json.data.embedUrl.includes('mockVideoId'));
    assert.equal(json.data.lecture.id, freeLectureId);
    assert.equal(json.data.lecture.isFreePreview, true);
  });

  test('GET /api/lectures/:id/play returns 401 UNAUTHORIZED for Guest on Paid lecture', async () => {
    const res = await fetch(`${baseUrl}/${paidLectureId}/play`);
    assert.equal(res.status, 401);

    const json = (await res.json()) as { code: string };
    assert.equal(json.code, 'UNAUTHORIZED');
  });

  test('GET /api/lectures/:id/play returns 403 PAYWALL for unenrolled Free Student on Paid lecture', async () => {
    const res = await fetch(`${baseUrl}/${paidLectureId}/play`, {
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    });
    assert.equal(res.status, 403);

    const json = (await res.json()) as { code: string; courseId: string };
    assert.equal(json.code, 'PAYWALL');
    assert.equal(json.courseId, courseId);
  });

  test('GET /api/lectures/:id/play returns 200 with signed embed URL for Enrolled Student', async () => {
    const res = await fetch(`${baseUrl}/${paidLectureId}/play`, {
      headers: {
        Authorization: `Bearer ${enrolledToken}`,
      },
    });
    assert.equal(res.status, 200);

    const json = (await res.json()) as { data: { embedUrl: string; lecture: { id: string } } };
    assert.ok(json.data.embedUrl);
    assert.equal(json.data.lecture.id, paidLectureId);
  });

  test('POST /api/lectures/:id/progress tracks playback and auto-completes on 90% duration', async () => {
    // Lecture duration is 1200 seconds; watching 1100 seconds is > 90%
    const res = await fetch(`${baseUrl}/${paidLectureId}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${enrolledToken}`,
      },
      body: JSON.stringify({
        positionSec: 1100,
      }),
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as { data: { positionSec: number; completed: boolean } };

    assert.equal(json.data.positionSec, 1100);
    assert.equal(json.data.completed, true);
  });
});
