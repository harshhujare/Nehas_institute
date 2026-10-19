import { prisma } from './src/lib/prisma';

async function testDelete() {
  // 1. Create a dummy test course with a section and a lecture
  const dummy = await prisma.course.create({
    data: {
      title: 'Temporary Test Course',
      slug: 'temp-test-course-' + Date.now(),
      description: 'temp',
      category: 'Baking & Pastry',
      priceInPaise: 0,
      sections: {
        create: [
          {
            title: 'Section 1',
            order: 0,
            lectures: {
              create: [
                {
                  title: 'Lecture 1',
                  order: 0,
                  status: 'READY',
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      sections: {
        include: { lectures: true },
      },
    },
  });

  console.log('Created dummy course:', dummy.id);

  // 2. Try deleting it using prisma.course.delete
  try {
    const deleted = await prisma.course.delete({
      where: { id: dummy.id },
    });
    console.log('Deleted successfully via Prisma:', deleted.id);
  } catch (err: any) {
    console.error('FAILED TO DELETE DUMMY COURSE:', err);
  }
}

testDelete()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
