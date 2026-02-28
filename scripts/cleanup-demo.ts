import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_SLUGS = [
  "sunrise-boys-hostel",
  "comfort-pg-for-girls",
  "studyzone-library-coworking",
  "fitlife-gym-wellness",
  "homeplate-mess",
];

async function main() {
  console.log("🗑️  Cleaning up demo/seed data...\n");

  // 1. Delete demo properties (cascade deletes images, bookings, reviews, etc.)
  for (const slug of DEMO_SLUGS) {
    const prop = await prisma.property.findUnique({ where: { slug } });
    if (!prop) {
      console.log(`  ⏭  "${slug}" not found, skipping`);
      continue;
    }

    // Delete related records first (not all FKs have onDelete: Cascade)
    await prisma.cartItem.deleteMany({ where: { propertyId: prop.id } });
    await prisma.propertyImage.deleteMany({ where: { propertyId: prop.id } });
    await prisma.review.deleteMany({ where: { propertyId: prop.id } });
    await prisma.complaint.deleteMany({ where: { propertyId: prop.id } });
    await prisma.announcement.deleteMany({ where: { propertyId: prop.id } });
    await prisma.pricingPlan.deleteMany({ where: { propertyId: prop.id } });
    // Delete bookings (also delete complaints referencing them)
    const bookingIds = (await prisma.booking.findMany({ where: { propertyId: prop.id }, select: { id: true } })).map(b => b.id);
    if (bookingIds.length) {
      await prisma.complaint.deleteMany({ where: { bookingId: { in: bookingIds } } });
    }
    await prisma.booking.deleteMany({ where: { propertyId: prop.id } });
    await prisma.property.delete({ where: { id: prop.id } });

    console.log(`  ✅ Deleted "${prop.name}" (${prop.serviceType})`);
  }

  // 2. Optionally delete demo owner if they have no remaining properties
  const demoOwner = await prisma.user.findFirst({
    where: { email: "owner@demo.com" },
    include: { _count: { select: { properties: true } } },
  });
  if (demoOwner && demoOwner._count.properties === 0) {
    await prisma.notification.deleteMany({ where: { userId: demoOwner.id } });
    await prisma.user.delete({ where: { id: demoOwner.id } });
    console.log(`  ✅ Deleted demo owner (owner@demo.com)`);
  } else if (demoOwner) {
    console.log(`  ⏭  Demo owner still has ${demoOwner._count.properties} properties, keeping`);
  }

  console.log("\n✅ Cleanup complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
