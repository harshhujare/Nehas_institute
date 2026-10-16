import 'dotenv/config';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { canWatchLecture, UserAuthContext } from '../canWatch';
import { prisma } from '../../lib/prisma';

describe('canWatchLecture Access Control', () => {
  let courseId: string;
  let sectionId: string;
  let freeLectureId: string;
  let paidLectureId: string;
  let testUserId: string;

  before(async () => {
    // Setup test records
    const course = await prisma.course.create({
      data: {
        slug: 'test-entitlement-course-' + Date.now(),
        title: 'Test Entitlement Course',
        description: 'Testing canWatchLecture',
        category: 'Regional Indian',
        priceInPaise: 49900,
        sections: {
          create: {
            title: 'Module 1',
            order: 1,
            lectures: {
              create: [
                {
                  title: 'Free Preview Lesson',
                  isFreePreview: true,
                  order: 1,
                  videoId: 'mock-vid-free',
                },
                {
                  title: 'Paid Exclusive Lesson',
                  isFreePreview: false,
                  order: 2,
                  videoId: 'mock-vid-paid',
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
    sectionId = course.sections[0].id;
    const free = course.sections[0].lectures.find((l) => l.isFreePreview)!;
    const paid = course.sections[0].lectures.find((l) => !l.isFreePreview)!;
    freeLectureId = free.id;
    paidLectureId = paid.id;

    // Create a student user
    const student = await prisma.user.create({
      data: {
        name: 'Test Student',
        email: `student-${Date.now()}@test.com`,
        role: 'STUDENT',
        plan: 'FREE',
      },
    });
    testUserId = student.id;
  });

  after(async () => {
    // Cleanup
    await prisma.course.delete({ where: { id: courseId } }).catch(() => {});
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  test('1. Guest / unauthenticated can watch Free Preview lecture', async () => {
    const res = await canWatchLecture(null, freeLectureId);
    assert.equal(res.allowed, true);
    assert.equal(res.reason, 'FREE_PREVIEW');
  });

  test('2. Guest / unauthenticated CANNOT watch Paid lecture (UNAUTHORIZED)', async () => {
    const res = await canWatchLecture(null, paidLectureId);
    assert.equal(res.allowed, false);
    assert.equal(res.reason, 'UNAUTHORIZED');
  });

  test('3. Free student without enrollment CANNOT watch Paid lecture (PAYWALL)', async () => {
    const user: UserAuthContext = {
      userId: testUserId,
      role: 'STUDENT',
      plan: 'FREE',
    };
    const res = await canWatchLecture(user, paidLectureId);
    assert.equal(res.allowed, false);
    assert.equal(res.reason, 'PAYWALL');
  });

  test('4. Staff / Admin CAN watch Paid lecture (STAFF)', async () => {
    const adminUser: UserAuthContext = {
      userId: 'admin-id',
      role: 'SUPER_ADMIN',
      plan: 'FREE',
    };
    const res = await canWatchLecture(adminUser, paidLectureId);
    assert.equal(res.allowed, true);
    assert.equal(res.reason, 'STAFF');
  });

  test('5. Student with active All-Access Pass CAN watch Paid lecture (ALL_ACCESS_PLAN)', async () => {
    const paidUser: UserAuthContext = {
      userId: testUserId,
      role: 'STUDENT',
      plan: 'PAID',
      planExpiresAt: new Date(Date.now() + 86400000), // tomorrow
    };
    const res = await canWatchLecture(paidUser, paidLectureId);
    assert.equal(res.allowed, true);
    assert.equal(res.reason, 'ALL_ACCESS_PLAN');
  });

  test('6. Student with course Enrollment CAN watch Paid lecture (ENROLLED)', async () => {
    // Create enrollment
    await prisma.enrollment.create({
      data: {
        userId: testUserId,
        courseId,
      },
    });

    const user: UserAuthContext = {
      userId: testUserId,
      role: 'STUDENT',
      plan: 'FREE',
    };
    const res = await canWatchLecture(user, paidLectureId);
    assert.equal(res.allowed, true);
    assert.equal(res.reason, 'ENROLLED');

    // Clean up enrollment
    await prisma.enrollment.delete({
      where: {
        userId_courseId: {
          userId: testUserId,
          courseId,
        },
      },
    });
  });
});
