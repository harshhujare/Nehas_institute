import { prisma } from './src/lib/prisma';

async function main() {
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      isPublished: true,
      archivedAt: true,
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
  console.log('ALL COURSES:', JSON.stringify(courses, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
