import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCourses() {
  console.log('🍳 Seeding Culinary Masterclasses for Neha\'s Institute...');

  // ─── Course 1: Mastering Restaurant-Style Indian Gravies ────────────────────
  const graviesCourse = await prisma.course.upsert({
    where: { slug: 'mastering-restaurant-style-indian-gravies' },
    update: {},
    create: {
      slug: 'mastering-restaurant-style-indian-gravies',
      title: 'Mastering Restaurant-Style Indian Gravies',
      description:
        'Unlock the closely guarded techniques of commercial Indian kitchens. Learn to prepare the four foundational gravy bases (Makhani, Shahi, Bhuna, and Hariyali) with restaurant-grade consistency, authentic rogan separation, and long-term shelf-life freezer protocols.',
      shortDescription:
        'The definitive culinary guide to authentic hotel-style gravies, spice balancing, and freezer batching.',
      category: 'Regional Indian',
      level: 'INTERMEDIATE',
      priceInPaise: 49900, // ₹499
      isPublished: true,
      order: 1,
      sections: {
        create: [
          {
            title: 'Module 1: The Foundations & The Silk Red/White Bases',
            order: 1,
            lectures: {
              create: [
                {
                  title: 'Introduction: Deconstructing Commercial vs Home Gravies',
                  description: 'The critical differences between domestic cooking and high-heat commercial base gravy preparation.',
                  order: 1,
                  durationSec: 860, // 14m 20s
                  isFreePreview: true,
                  status: 'READY',
                  videoId: 'mock-vid-gravies-1',
                },
                {
                  title: 'Whole Spice Blooming & Temperature Management',
                  description: 'How to release volatile essential oils without scorching delicate whole spices in hot oil.',
                  order: 2,
                  durationSec: 1125, // 18m 45s
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-gravies-2',
                },
                {
                  title: 'Onion Chemistry: Slice, Paste, or Fried Birista?',
                  description: 'Mastering Maillard reaction on onions for sweetness, depth, and smooth texture.',
                  order: 3,
                  durationSec: 1330, // 22m 10s
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-gravies-3',
                },
                {
                  title: 'The Silk Makhani (Red) Base: Emulsification & Kasuri Methi',
                  description: 'Tomatoes, butter, cashew paste, and fenugreek leaf finishing for velvety makhani sauce.',
                  order: 4,
                  durationSec: 1695, // 28m 15s
                  isFreePreview: true,
                  status: 'READY',
                  videoId: 'mock-vid-gravies-4',
                },
              ],
            },
          },
          {
            title: 'Module 2: Royal White & Deep Brown Bases',
            order: 2,
            lectures: {
              create: [
                {
                  title: 'The Royal Shahi (White) Cashew Base: Velvety texture without curdling',
                  description: 'Creamy cashew and melon seed emulsion balanced with mild green cardamom and mace.',
                  order: 5,
                  durationSec: 1470, // 24m 30s
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-gravies-5',
                },
                {
                  title: 'The Deep Bhuna (Brown) Onion-Tomato Base: Authentic rogan release',
                  description: 'Slow-cooked caramelised base gravy with rich oil separation and earthy undertones.',
                  order: 6,
                  durationSec: 1600, // 26m 40s
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-gravies-6',
                },
                {
                  title: 'Paneer Butter Masala & Shahi Paneer Assembly',
                  description: 'Combining base sauces with aromatics to assemble two iconic menu headliners.',
                  order: 7,
                  durationSec: 1265, // 21m 05s
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-gravies-7',
                },
                {
                  title: 'Malai Kofta: Soft melt-in-mouth dumplings that never disintegrate',
                  description: 'Paneer-khoya dough formulation, gentle frying techniques, and delicate sauce pairing.',
                  order: 8,
                  durationSec: 1550, // 25m 50s
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-gravies-8',
                },
              ],
            },
          },
          {
            title: 'Module 3: Regional Adaptations, Preservation & Quality Control',
            order: 3,
            lectures: {
              create: [
                {
                  title: 'Veg Kolhapuri & Spicy Maharashtrian Tambda/Pandhra Rassa adaptation',
                  description: 'Specialised roasted dry-coconut spice blend (Kanda Lasun Masala) application.',
                  order: 9,
                  durationSec: 1335, // 22m 15s
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-gravies-9',
                },
                {
                  title: 'Freezer Batching: 30-Day Storage & Reheating Protocol',
                  description: 'Portioning, vacuum packaging, and gentle thaw cycles preserving freshness.',
                  order: 10,
                  durationSec: 990, // 16m 30s
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-gravies-10',
                },
                {
                  title: 'Troubleshooting: Overly sour tomatoes, split cream, and spice fixes',
                  description: 'Practical kitchen remedies for common cooking pitfalls.',
                  order: 11,
                  durationSec: 910, // 15m 10s
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-gravies-11',
                },
                {
                  title: 'Course Wrap-up, Q&A and Certificate Requirements',
                  description: 'Final review, assignment details, and next steps in professional catering.',
                  order: 12,
                  durationSec: 720, // 12m 00s
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-gravies-12',
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`✅ Seeded Course: ${graviesCourse.title}`);

  // ─── Course 2: Artisan Sourdough & Crusty Breads ───────────────────────────
  const sourdoughCourse = await prisma.course.upsert({
    where: { slug: 'artisan-sourdough-and-crusty-breads' },
    update: {},
    create: {
      slug: 'artisan-sourdough-and-crusty-breads',
      title: 'Artisan Sourdough & Crusty Breads',
      description:
        'Demystify wild yeast, starter maintenance, and dough hydration. Learn stretch-and-fold mechanics, cold bulk fermentation, scoring art, and achieving an open, custardy crumb with blistered crusts in standard home ovens.',
      shortDescription:
        'From starter cultivation to master artisan batards and open-crumb focaccia.',
      category: 'Baking & Pastry',
      level: 'ADVANCED',
      priceInPaise: 69900, // ₹699
      isPublished: true,
      order: 2,
      sections: {
        create: [
          {
            title: 'Module 1: Flour Science & Starter Culture',
            order: 1,
            lectures: {
              create: [
                {
                  title: 'Cultivating and Feeding a Wild Yeast Levain',
                  description: 'Establishing active sourdough starter with regular flour feeds.',
                  order: 1,
                  durationSec: 900,
                  isFreePreview: true,
                  status: 'READY',
                  videoId: 'mock-vid-bread-1',
                },
                {
                  title: 'Hydration Math: Calculating Baker’s Percentages',
                  description: 'Understanding 65% to 80% hydration formulations.',
                  order: 2,
                  durationSec: 840,
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-bread-2',
                },
                {
                  title: 'Autolyse vs Fermentolyse',
                  description: 'Optimal enzyme activation and gluten network formation.',
                  order: 3,
                  durationSec: 780,
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-bread-3',
                },
              ],
            },
          },
          {
            title: 'Module 2: Shaping, Scoring & Dutch Oven Baking',
            order: 2,
            lectures: {
              create: [
                {
                  title: 'Stretch & Fold, Coil Folds & Bulk Fermentation Cues',
                  description: 'Visual cues for dough aeration and dough dome rise.',
                  order: 4,
                  durationSec: 1020,
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-bread-4',
                },
                {
                  title: 'Pre-shaping and Final Batard / Boule Tightening',
                  description: 'Creating surface tension without tearing the delicate gluten cloak.',
                  order: 5,
                  durationSec: 960,
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-bread-5',
                },
                {
                  title: 'Lame Scoring Techniques & Oven Steam Simulation',
                  description: 'Achieving dramatic sourdough ears and golden blistering in home ovens.',
                  order: 6,
                  durationSec: 1140,
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-bread-6',
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`✅ Seeded Course: ${sourdoughCourse.title}`);

  // ─── Course 3: Mithai & Traditional Indian Sweets Masterclass ──────────────
  const mithaiCourse = await prisma.course.upsert({
    where: { slug: 'mithai-and-traditional-indian-sweets' },
    update: {},
    create: {
      slug: 'mithai-and-traditional-indian-sweets',
      title: 'Mithai & Traditional Indian Sweets Masterclass',
      description:
        'Master the chemistry of milk reduction (Mawa/Khoya), sugar syrup stages (Ek Taar to Teen Taar), and pure ghee confectionery. Make halwai-quality Kaju Katli, Gulab Jamun, Mysore Pak, and soft spongy Rasgulla.',
      shortDescription:
        'Authentic halwai secrets for silky Kaju Katli, syrupy Gulab Jamun, and spongy Chenna sweets.',
      category: 'Mithai & Sweets',
      level: 'BEGINNER',
      priceInPaise: 39900, // ₹399
      isPublished: true,
      order: 3,
      sections: {
        create: [
          {
            title: 'Module 1: Milk Reduction & Nut Confectionery',
            order: 1,
            lectures: {
              create: [
                {
                  title: 'Sugar Syrup Science: Testing Stages Without a Thermometer',
                  description: 'Water-drop and thread tests for consistent confectionery consistency.',
                  order: 1,
                  durationSec: 810,
                  isFreePreview: true,
                  status: 'READY',
                  videoId: 'mock-vid-mithai-1',
                },
                {
                  title: 'Velvety Kaju Katli: Rolling and Cutting Without Sticky Residue',
                  description: 'Cashew dough kneading and precise diamond cut alignment.',
                  order: 2,
                  durationSec: 980,
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-mithai-2',
                },
                {
                  title: 'Traditional Mawa Bati & Gulab Jamun Core Formulation',
                  description: 'Soft dough preparation preventing hard center knots.',
                  order: 3,
                  durationSec: 1050,
                  isFreePreview: false,
                  status: 'READY',
                  videoId: 'mock-vid-mithai-3',
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`✅ Seeded Course: ${mithaiCourse.title}`);

  // ─── Course 4: Street Classics: Chaats, Rolls & Fast Food Secrets ──────────
  const streetCourse = await prisma.course.upsert({
    where: { slug: 'street-classics-chaats-and-rolls' },
    update: {},
    create: {
      slug: 'street-classics-chaats-and-rolls',
      title: 'Street Classics: Chaats, Rolls & Fast Food Secrets',
      description:
        'Recreate India’s most beloved street delicacies with clean hygiene standards and explosive flavors. Master spiced chutneys (Teekha Pani & Meethi Saunth), crispy puris, and Kolkata kathi roll parathas.',
      shortDescription:
        'Crispy Pani Puri, Mumbai Sev Puri, and flaky Kolkata Kathi Rolls made right at home.',
      category: 'Street Classics',
      level: 'BEGINNER',
      priceInPaise: 0, // Free course
      isPublished: true,
      order: 4,
      sections: {
        create: [
          {
            title: 'Module 1: The Chutneys & The Crispy Puri',
            order: 1,
            lectures: {
              create: [
                {
                  title: 'The Ultimate Street Chutney Duo (Mint-Coriander & Tamarind-Date)',
                  description: 'Vibrant green and glossy sweet chutneys with zero bitter aftertaste.',
                  order: 1,
                  durationSec: 720,
                  isFreePreview: true,
                  status: 'READY',
                  videoId: 'mock-vid-street-1',
                },
                {
                  title: 'Pani Puri Dough & Puffing Technique (Sooji vs Maida)',
                  description: 'Frying hollow, ultra-crisp puris that stay crisp for days.',
                  order: 2,
                  durationSec: 880,
                  isFreePreview: true,
                  status: 'READY',
                  videoId: 'mock-vid-street-2',
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`✅ Seeded Course: ${streetCourse.title}`);
  console.log('🎉 All 4 culinary masterclasses successfully seeded in Neon!');
}

if (require.main === module) {
  seedCourses()
    .catch((err) => {
      console.error('❌ Failed to seed courses:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
