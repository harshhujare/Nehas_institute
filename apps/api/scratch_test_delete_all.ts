import { prisma } from './src/lib/prisma';

async function testDeleteOnActualCourses() {
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      _count: {
        select: {
          sections: true,
          enrollments: true,
          payments: true,
          resources: true,
        },
      },
    },
  });

  console.log(`Checking ${courses.length} courses...`);

  for (const c of courses) {
    console.log(`Testing delete simulation on: [${c.id}] ${c.title}`);
    try {
      // Run inside a transaction and ROLL BACK by throwing an intentional error at the end!
      await prisma.$transaction(async (tx) => {
        // 1. Delete sections or cascade
        await tx.course.delete({
          where: { id: c.id },
        });
        console.log(`  -> SUCCESS! Prisma can delete [${c.title}]`);
        throw new Error('ROLLBACK_INTENTIONAL');
      });
    } catch (err: any) {
      if (err.message === 'ROLLBACK_INTENTIONAL') {
        // This means tx.course.delete SUCCEEDED!
        console.log(`  -> Transaction verified for [${c.title}]`);
      } else {
        console.error(`  -> FAILED on [${c.title}]:`, err.message, err.code, err.meta);
      }
    }
  }
}

testDeleteOnActualCourses()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
