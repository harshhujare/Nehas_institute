import 'dotenv/config';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../lib/prisma';
import { signAccessToken } from '../../services/token';
import express from 'express';
import { coursesRouter } from '../courses';
import { errorHandler } from '../../middleware/error';
import http from 'http';

describe('Courses API Routes', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;
  let testCourseId: string;
  let testSlug: string;
  let paidToken: string;

  before(async () => {
    // 1. Create a dummy test course
    testSlug = 'test-course-catalog-' + Date.now();
    const course = await prisma.course.create({
      data: {
        slug: testSlug,
        title: 'Mastering Handcrafted Pasta',
        description: 'Authentic pasta making from scratch.',
        shortDescription: 'From egg dough to silky ravioli.',
        category: 'Street Classics',
        level: 'INTERMEDIATE',
        priceInPaise: 59900,
        isPublished: true,
        order: 1,
        sections: {
          create: {
            title: 'Module 1: Dough Fundamentals',
            order: 1,
            lectures: {
              create: [
                {
                  title: 'Semolina vs 00 Flour Science',
                  order: 1,
                  durationSec: 840,
                  isFreePreview: true,
                  videoId: 'bunny-secret-video-guid-1',
                },
                {
                  title: 'Lamination and Resting Protocol',
                  order: 2,
                  durationSec: 960,
                  isFreePreview: false,
                  videoId: 'bunny-secret-video-guid-2',
                },
              ],
            },
          },
        },
      },
    });
    testCourseId = course.id;

    // 2. Setup JWT for an enrolled/paid user
    paidToken = signAccessToken({
      userId: 'test-user-pasta',
      role: 'STUDENT',
      plan: 'PAID',
    });

    // 3. Start lightweight test HTTP server
    const app = express();
    app.use(express.json());
    app.use('/api/courses', coursesRouter);
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr) {
          port = addr.port;
          baseUrl = `http://localhost:${port}/api/courses`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.course.delete({ where: { id: testCourseId } }).catch(() => {});
  });

  test('GET /api/courses returns published catalog with aggregate stats', async () => {
    const res = await fetch(`${baseUrl}?category=Street Classics`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as { data: Array<{ id: string; slug: string; totalLectures: number; totalDurationSec: number }> };
    assert.ok(Array.isArray(json.data));

    const found = json.data.find((c) => c.slug === testSlug);
    assert.ok(found);
    assert.equal(found.totalLectures, 2);
    assert.equal(found.totalDurationSec, 1800); // 840 + 960
  });

  test('GET /api/courses/:slug returns syllabus WITHOUT videoId leak', async () => {
    const res = await fetch(`${baseUrl}/${testSlug}`);
    assert.equal(res.status, 200);

    const json = (await res.json()) as {
      data: {
        slug: string;
        isEnrolled: boolean;
        sections: Array<{
          lectures: Array<{ id: string; title: string; videoId?: string; isFreePreview: boolean }>;
        }>;
      };
    };

    assert.equal(json.data.slug, testSlug);
    assert.equal(json.data.isEnrolled, false); // guest

    const allLectures = json.data.sections.flatMap((s) => s.lectures);
    assert.equal(allLectures.length, 2);

    for (const lec of allLectures) {
      assert.equal(lec.videoId, undefined, `SECURITY VIOLATION: videoId leaked on lecture ${lec.id}`);
    }
  });

  test('GET /api/courses/:slug recognizes authenticated all-access user as enrolled', async () => {
    const res = await fetch(`${baseUrl}/${testSlug}`, {
      headers: {
        Authorization: `Bearer ${paidToken}`,
      },
    });
    assert.equal(res.status, 200);

    const json = (await res.json()) as { data: { isEnrolled: boolean } };
    assert.equal(json.data.isEnrolled, true);
  });
});
