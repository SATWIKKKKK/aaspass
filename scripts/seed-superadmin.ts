/**
 * Super Admin Seed Script
 * -----------------------
 * Creates the initial super admin account in the database.
 *
 * Usage:
 *   npx tsx scripts/seed-superadmin.ts
 *
 * Environment Variables (set in .env.local):
 *   SUPERADMIN_EMAIL    — Override default email  (default: superadmin@aaspass.com)
 *   SUPERADMIN_PASSWORD — Override default password (default: SuperAdmin@2025!)
 *   DATABASE_URL        — PostgreSQL connection string (required)
 *
 * The script retries the DB connection up to 5 times with exponential backoff
 * to handle transient TLS / VPN issues (e.g. Cloudflare WARP).
 *
 * Alternative: Start the dev server and POST to /api/superadmin/seed
 */

// Disable strict TLS for standalone scripts behind corporate VPNs / WARP
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback to .env

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

function createPool() {
  return new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 1_000,
    ssl: { rejectUnauthorized: false },
  });
}

async function waitForConnection(pool: pg.Pool, attempt = 1): Promise<pg.Pool> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    console.log(`✅ Database connected (attempt ${attempt})`);
    return pool;
  } catch (err: any) {
    if (attempt >= MAX_RETRIES) {
      throw new Error(
        `Failed to connect after ${MAX_RETRIES} attempts: ${err.message}\n` +
          `Hint: If you're behind Cloudflare WARP or a VPN, try disabling it and retrying.\n` +
          `Alternative: Start the dev server (npm run dev) and use the API seed endpoint:\n` +
          `  curl -X POST http://localhost:3000/api/superadmin/seed`
      );
    }
    const delay = RETRY_DELAY_MS * attempt;
    console.log(`⏳ Connection attempt ${attempt} failed: ${err.message}`);
    console.log(`   Retrying in ${delay / 1000}s...`);
    await new Promise((r) => setTimeout(r, delay));
    // Destroy old pool and create a fresh one on retry
    try { await pool.end(); } catch { /* ignore */ }
    const newPool = createPool();
    newPool.on("error", () => {});
    return waitForConnection(newPool, attempt + 1);
  }
}

async function main() {
  const email = (process.env.SUPERADMIN_EMAIL || "superadmin@aaspass.com").toLowerCase().trim();
  const password = process.env.SUPERADMIN_PASSWORD || "SuperAdmin@2025!";

  if (password.length < 8) {
    console.error("❌ SUPERADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  console.log("🔐 Seeding SuperAdmin account...\n");

  let pool = createPool();
  pool.on("error", () => {});

  // Wait for a healthy connection before touching Prisma
  pool = await waitForConnection(pool);

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Check if already exists
    const existing = await prisma.superAdmin.findUnique({ where: { email } });
    if (existing) {
      console.log("✅ SuperAdmin already exists:");
      console.log(`   Email: ${existing.email}`);
      console.log(`   Name:  ${existing.name}`);
      console.log("\n⚠️  To reset the password, delete the record and re-run this script.");
      return;
    }

    // Hash password with 12 rounds
    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await prisma.superAdmin.create({
      data: {
        email,
        name: "Super Admin",
        passwordHash: hashedPassword,
        isActive: true,
      },
    });

    console.log("\n✅ SuperAdmin created successfully!");
    console.log(`   ID:    ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name:  ${admin.name}`);
    console.log(`\n🔑 Login credentials:`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`\n⚠️  IMPORTANT: Change this password immediately after first login!`);
    console.log(`   Navigate to /superadmin/login to access the dashboard.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("❌ Seeding failed:", e.message || e);
  process.exit(1);
});
