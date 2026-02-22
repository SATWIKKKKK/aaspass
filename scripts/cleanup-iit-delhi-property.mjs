import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const propertyId = process.argv[2];
const ownerId = process.argv[3];

if (!propertyId || !ownerId) {
  console.error("Usage: node cleanup-iit-delhi-property.mjs <propertyId> <ownerId>");
  process.exit(1);
}

async function run() {
  console.log(`Deleting property ${propertyId} and owner ${ownerId} (if present)`);
  try {
    const delP = await pool.query(`DELETE FROM properties WHERE id = $1 RETURNING id`, [propertyId]);
    console.log(`- properties deleted: ${delP.rowCount}`);

    const delU = await pool.query(`DELETE FROM users WHERE id = $1 RETURNING id`, [ownerId]);
    console.log(`- users deleted: ${delU.rowCount}`);

    console.log("Cleanup complete.");
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Cleanup error:", err.message);
  process.exit(1);
});
