import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Refusing to seed in production environment (NODE_ENV=production).');
    process.exit(1);
  }

  const adminEmail = process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('❌ Missing required environment variables:');
    console.error('   Please provide ADMIN_EMAIL and ADMIN_PASSWORD in your environment to seed the initial administrator.');
    process.exit(1);
  }

  console.log('🌱 Seeding database for Neha\'s Institute...');

  // ─── Super Admin User ───────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const adminName = process.env.ADMIN_NAME || "Neha Ma'am";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash: adminHash,
      role: 'SUPER_ADMIN',
      plan: 'PAID',
    },
  });

  console.log(`✅ Super Admin created: ${admin.email} (${admin.name})`);

  // ─── Initial Plan Config (All-Access Pass) ──────────────────────────────────
  await prisma.planConfig.upsert({
    where: { planDuration: 30 },
    update: {}, // do not overwrite custom admin changes
    create: {
      planDuration: 30,
      price: 49900, // ₹499 in paise
      label: 'All-Access Pass',
      description: 'Unlock unlimited access to all courses, lectures, and chef recipe guides.',
      isActive: true,
    },
  });

  console.log('✅ PlanConfig seeded: ₹499 / 30-day All-Access Pass');
  console.log('\n🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
