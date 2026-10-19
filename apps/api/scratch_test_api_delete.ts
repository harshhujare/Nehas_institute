import axios from 'axios';
import { prisma } from './src/lib/prisma';
import { signAccessToken } from './src/services/token';

async function testApiDelete() {
  // 1. Get an admin user
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ['SUPER_ADMIN', 'CONTENT_MANAGER'] } },
  });

  if (!adminUser) {
    console.error('No admin user found!');
    return;
  }

  const token = signAccessToken({
    userId: adminUser.id,
    role: adminUser.role,
    plan: adminUser.plan,
  });

  // 2. Create a test course to delete via API
  const testCourse = await prisma.course.create({
    data: {
      title: 'API Delete Test Course',
      slug: 'api-delete-test-' + Date.now(),
      description: 'To test DELETE /api/admin/courses/:id',
      category: 'Baking & Pastry',
      priceInPaise: 0,
      sections: {
        create: [
          {
            title: 'Test Section',
            lectures: {
              create: [
                {
                  title: 'Test Lecture',
                  status: 'READY',
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('Created test course for API delete:', testCourse.id, testCourse.title);

  // 3. Call DELETE /api/admin/courses/:id via Axios
  try {
    const res = await axios.delete(`http://localhost:4000/api/admin/courses/${testCourse.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('DELETE response status:', res.status);
    console.log('DELETE response data:', res.data);
  } catch (err: any) {
    console.error('DELETE FAILED:');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error('Error message:', err.message);
    }
  }
}

testApiDelete()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
