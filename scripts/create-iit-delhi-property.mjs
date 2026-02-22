import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const stamp = Date.now();
  const ownerId = `owner_iit_${stamp}`;
  const propertyId = `prop_iit_${stamp}`;
  const ownerEmail = `owner_iit_${stamp}@test.com`;
  const slug = `iit-delhi-scholar-hostel-${stamp}`;

  try {
    const owner = await pool.query(
      `INSERT INTO users (id, name, email, password, role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'OWNER', NOW(), NOW())
       RETURNING id, name, email, role`,
      [ownerId, "IIT Delhi Test Owner", ownerEmail, "$2a$12$placeholder"]
    );

    const property = await pool.query(
      `INSERT INTO properties (
        id, name, slug, description, "serviceType", price, "ownerId", city, state, address, pincode,
        "nearbyLandmark", status, "avgRating", "totalReviews", occupancy,
        "isAC", "hasWifi", "foodIncluded", "laundryIncluded", "hasMedical", "forGender", "gstRate",
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, 'HOSTEL', 9000, $5, 'Delhi', 'Delhi', 'Hauz Khas, near IIT Delhi', '110016',
        'IIT Delhi', 'VERIFIED', 4.7, 20, 2,
        true, true, true, false, true, 'MALE', 18,
        NOW(), NOW()
      )
      RETURNING id, name, slug, city, status, "ownerId"`,
      [
        propertyId,
        "IIT Delhi Scholar Hostel",
        slug,
        "Boys hostel near IIT Delhi with AC, WiFi, food and medical support",
        ownerId,
      ]
    );

    console.log("\n✅ Persistent test data created in Supabase DB");
    console.log("OWNER:", owner.rows[0]);
    console.log("PROPERTY:", property.rows[0]);
    console.log("\nUse these SQL checks in Supabase SQL Editor:");
    console.log(`SELECT id, name, email, role FROM users WHERE id = '${ownerId}';`);
    console.log(`SELECT id, name, slug, city, status, \"ownerId\" FROM properties WHERE id = '${propertyId}';`);
    console.log("\nTo clean up later:");
    console.log(`DELETE FROM properties WHERE id = '${propertyId}';`);
    console.log(`DELETE FROM users WHERE id = '${ownerId}';`);
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("❌ Failed to create persistent data:", err.message);
  process.exit(1);
});
