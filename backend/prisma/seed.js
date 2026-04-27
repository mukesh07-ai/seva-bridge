require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Prisma 5: reads DATABASE_URL from env() in schema.prisma (loaded by dotenv above)
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // ── Seed Services ─────────────────────────────────────────────────────────
  const services = [
    { name: 'Blood Pressure Monitoring',  description: 'Regular BP check and recording',                          category: 'VITALS_MONITORING',     basePrice: 150, requiredLevel: 'LEVEL_1', icon: '🩺' },
    { name: 'Blood Sugar Testing',         description: 'Glucometer-based sugar level check',                      category: 'VITALS_MONITORING',     basePrice: 120, requiredLevel: 'LEVEL_1', icon: '💉' },
    { name: 'Temperature & SpO2 Check',    description: 'Thermometer & Pulse Oximeter monitoring',               category: 'VITALS_MONITORING',     basePrice: 100, requiredLevel: 'LEVEL_1', icon: '🌡️' },
    { name: 'Wound Dressing',              description: 'Sterile wound cleaning and dressing change',             category: 'WOUND_CARE',            basePrice: 300, requiredLevel: 'LEVEL_2', icon: '🩹' },
    { name: 'Post-Surgery Suture Care',    description: 'Suture inspection and dressing for post-op wounds',      category: 'WOUND_CARE',            basePrice: 450, requiredLevel: 'LEVEL_2', icon: '🔬' },
    { name: 'Medication Administration',   description: 'Oral/topical medication management and reminders',       category: 'MEDICATION_MANAGEMENT', basePrice: 200, requiredLevel: 'LEVEL_3', icon: '💊' },
    { name: 'IV Cannula Maintenance',      description: 'Saline flush and IV site inspection',                    category: 'MEDICATION_MANAGEMENT', basePrice: 500, requiredLevel: 'LEVEL_3', icon: '🏥' },
    { name: 'Catheter Care',               description: 'Urinary catheter maintenance and care',                  category: 'ADVANCED_CARE',         basePrice: 600, requiredLevel: 'LEVEL_4', icon: '⚕️' },
    { name: 'Nasogastric Tube Feeding',    description: 'NGT feeding for patients unable to eat orally',         category: 'ADVANCED_CARE',         basePrice: 700, requiredLevel: 'LEVEL_4', icon: '🫀' },
  ];

  for (const svc of services) {
    // Check if service with this name already exists
    const existing = await prisma.service.findFirst({ where: { name: svc.name } });
    if (!existing) {
      await prisma.service.create({ data: svc });
      console.log(`  ✅ Created service: ${svc.name}`);
    } else {
      console.log(`  ⏭️  Skipped (exists): ${svc.name}`);
    }
  }

  console.log(`\n✅ Seeded ${services.length} services`);

  // ── Seed Admin User ───────────────────────────────────────────────────────
  const hashedPwd = await bcrypt.hash('Admin@1234', 12);

  const adminExists = await prisma.user.findUnique({ where: { email: 'admin@sevabridge.in' } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        name: 'Seva Admin',
        email: 'admin@sevabridge.in',
        password: hashedPwd,
        role: 'ADMIN',
        phone: '9000000000',
      },
    });
    console.log('✅ Admin user created: admin@sevabridge.in / Admin@1234');
  } else {
    console.log('⏭️  Admin user already exists');
  }

  console.log('\n🎉 Seeding complete!');
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
