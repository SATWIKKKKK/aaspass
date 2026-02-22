import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function assertWithLog(condition, successMsg, failMsg) {
  if (!condition) {
    throw new Error(failMsg);
  }
  console.log(` ${successMsg}`);
}

async function run() {
  const stamp = Date.now();
  const ownerId = `owner_iit_${stamp}`;
  const propertyId = `prop_iit_${stamp}`;
  const slug = `iit-delhi-hostel-${stamp}`;

  console.log("=== IIT Delhi Owner → Student → AI Flow Test ===\n");

  try {
    // 1) Create test owner
    const ownerInsert = await pool.query(
      `INSERT INTO users (id, name, email, password, role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'OWNER', NOW(), NOW())
       RETURNING id, name, role`,
      [ownerId, "IIT Delhi Test Owner", `owner_iit_${stamp}@test.com`, "$2a$12$placeholder"]
    );
    assertWithLog(ownerInsert.rows.length === 1, "Created test owner", "Failed to create test owner");

    // 2) Owner adds IIT Delhi property (simulating owner create flow)
    const propertyInsert = await pool.query(
      `INSERT INTO properties (
        id, name, slug, description, "serviceType", price, "ownerId", city, state, address, pincode,
        "nearbyLandmark", status, "avgRating", "totalReviews", occupancy,
        "isAC", "hasWifi", "foodIncluded", "laundryIncluded", "hasMedical", "forGender", "gstRate",
        "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, 'HOSTEL', 9000, $5, 'Delhi', 'Delhi', 'Hauz Khas, near IIT Delhi', '110016',
        'IIT Delhi', 'VERIFIED', 4.6, 18, 2,
        true, true, true, false, true, 'MALE', 18,
        NOW(), NOW()
      ) RETURNING id, name, city, status, "ownerId"`,
      [
        propertyId,
        "IIT Delhi Scholar Hostel",
        slug,
        "Boys hostel near IIT Delhi with AC, WiFi, food and medical support",
        ownerId,
      ]
    );
    assertWithLog(propertyInsert.rows.length === 1, "Created IIT Delhi test property", "Failed to create IIT Delhi property");

    // 3) Verify DB persistence
    const dbCheck = await pool.query(
      `SELECT id, name, city, status, "ownerId"
       FROM properties
       WHERE id = $1`,
      [propertyId]
    );
    assertWithLog(dbCheck.rows.length === 1, "Property stored in DB", "Property was not stored in DB");

    // 4) Verify owner dashboard data shape (owner=me should map to ownerId filter)
    const ownerScoped = await pool.query(
      `SELECT id, name
       FROM properties
       WHERE status = 'VERIFIED' AND "ownerId" = $1`,
      [ownerId]
    );
    assertWithLog(
      ownerScoped.rows.some((r) => r.id === propertyId),
      "Property is present in owner-scoped listing",
      "Property missing from owner-scoped listing"
    );

    // 5) Verify student discoverability via services search semantics (q=iit delhi)
    const studentSearch = await pool.query(
      `SELECT id, name, city
       FROM properties
       WHERE status = 'VERIFIED'
         AND (
           name ILIKE '%iit delhi%'
           OR city ILIKE '%iit delhi%'
           OR address ILIKE '%iit delhi%'
           OR description ILIKE '%iit delhi%'
           OR "nearbyLandmark" ILIKE '%iit delhi%'
         )`,
      []
    );
    assertWithLog(
      studentSearch.rows.some((r) => r.id === propertyId),
      "Property is discoverable in student services search",
      "Property not discoverable in student services search"
    );

    // 6) Verify AI chat retrieval semantics for query like "hostel near iit delhi"
    // Chat route extracts HOSTEL + keyword delhi, then searches city/name/address/nearbyLandmark contains delhi
    const aiChatMatch = await pool.query(
      `SELECT id, name
       FROM properties
       WHERE status = 'VERIFIED'
         AND "serviceType" = 'HOSTEL'
         AND (
           city ILIKE '%delhi%'
           OR name ILIKE '%delhi%'
           OR address ILIKE '%delhi%'
           OR "nearbyLandmark" ILIKE '%delhi%'
         )
       ORDER BY "avgRating" DESC
       LIMIT 5`,
      []
    );
    assertWithLog(
      aiChatMatch.rows.some((r) => r.id === propertyId),
      "Property is reachable by AI chat DB retrieval",
      "Property not reachable by AI chat DB retrieval"
    );

    // 7) Verify AI-search route broad location OR semantics for IIT Delhi
    const aiSearchMatch = await pool.query(
      `SELECT id, name
       FROM properties
       WHERE status = 'VERIFIED'
         AND (
           city ILIKE '%iit delhi%'
           OR address ILIKE '%iit delhi%'
           OR state ILIKE '%iit delhi%'
           OR "nearbyLandmark" ILIKE '%iit delhi%'
         )
       LIMIT 10`,
      []
    );
    assertWithLog(
      aiSearchMatch.rows.some((r) => r.id === propertyId),
      "Property is reachable by AI-search location matching",
      "Property not reachable by AI-search location matching"
    );

    console.log("\n🎉 All checks passed: owner add -> DB save -> student discoverability -> AI visibility.");
  } finally {
    await pool.query(`DELETE FROM properties WHERE id = $1`, [propertyId]).catch(() => {});
    await pool.query(`DELETE FROM users WHERE id = $1`, [ownerId]).catch(() => {});
    await pool.end();
  }
}

run().catch((err) => {
  console.error("❌ Test failed:", err.message);
  process.exit(1);
});
