import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const propertyId = process.argv[2] || "prop_iit_1771739922365";

async function run() {
  console.log(`Verifying AI pickup for property id: ${propertyId}`);

  try {
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
       LIMIT 10`,
      []
    );

    const foundInChat = aiChatMatch.rows.some((r) => r.id === propertyId);
    console.log(`- Found by AI chat semantics: ${foundInChat}`);

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
       LIMIT 20`,
      []
    );

    const foundInSearch = aiSearchMatch.rows.some((r) => r.id === propertyId);
    console.log(`- Found by AI-search semantics: ${foundInSearch}`);

    if (foundInChat && foundInSearch) {
      console.log("\n✅ Verification passed: AI paths can reach the property.");
      process.exit(0);
    }

    console.error("\n❌ Verification failed: property not found by AI semantics.");
    process.exit(2);
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Error during verification:", err.message);
  process.exit(1);
});
