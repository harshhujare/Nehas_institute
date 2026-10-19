import { prisma } from './src/lib/prisma';

async function checkCourse() {
  const c = await prisma.course.findUnique({
    where: { id: 'cmvf3vt4v0003fw381vca8wsf' },
    include: {
      sections: {
        include: {
          lectures: true,
        },
      },
      enrollments: true,
      payments: true,
      resources: true,
    },
  });
  console.log('Course details:', JSON.stringify(c, null, 2));
}

checkCourse()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
