import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const propertyId = process.argv[2];

if (!propertyId) {
  console.error("Usage: node scripts/check-iit-delhi-property.mjs <propertyId>");
  process.exit(1);
}

try {
  const { rows } = await pool.query(
    `SELECT id, name, slug, city, status, "ownerId" FROM properties WHERE id = $1`,
    [propertyId]
  );
  console.log(rows);
} finally {
  await pool.end();
}
