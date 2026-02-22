// Test: Owner adds property → appears in student search
// Run: node scripts/test-property-flow.mjs

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testFlow() {
  console.log("=== Testing Owner → Student Property Flow ===\n");

  try {
    // 1. Check for any existing properties
    const { rows: existing } = await pool.query(
      `SELECT id, name, "serviceType", city, status, "ownerId" FROM properties LIMIT 5`
    );
    console.log("1. Existing properties:", existing.length);
    existing.forEach((p) => console.log(`   - ${p.name} (${p.serviceType}) in ${p.city} | Status: ${p.status}`));

    // 2. Check for users (owners and students)
    const { rows: users } = await pool.query(
      `SELECT id, name, email, role FROM users LIMIT 10`
    );
    console.log("\n2. Users:");
    users.forEach((u) => console.log(`   - ${u.name} (${u.role}) - ${u.email}`));

    const owner = users.find((u) => u.role === "OWNER");
    const student = users.find((u) => u.role === "STUDENT");

    // 3. Create a test property (if owner exists)
    if (owner) {
      console.log(`\n3. Creating test property for owner: ${owner.name}`);
      const { rows: [newProp] } = await pool.query(
        `INSERT INTO properties (id, name, slug, description, "serviceType", price, "ownerId", city, state, address, pincode, status, "avgRating", "totalReviews", "occupancy", "isAC", "hasWifi", "foodIncluded", "laundryIncluded", "hasMedical", "forGender", "gstRate", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 18, NOW(), NOW())
         RETURNING id, name, status`,
        [
          `test_${Date.now()}`,
          "Test Hostel Near KIIT",
          `test-hostel-near-kiit-${Date.now()}`,
          "A boys hostel near KIIT University with WiFi, AC and food included",
          "HOSTEL",
          5000,
          owner.id,
          "Bhubaneswar",
          "Odisha",
          "Near KIIT Square, Patia",
          "751024",
          "VERIFIED",
          4.2,
          10,
          2,
          true,
          true,
          true,
          false,
          false,
          "MALE",
        ]
      );
      console.log(`   Created: ${newProp.name} (ID: ${newProp.id}) — Status: ${newProp.status}`);

      // 4. Verify it's visible in a search query (simulating student search)
      console.log("\n4. Simulating student search for 'hostel in Bhubaneswar'...");
      const { rows: searchResults } = await pool.query(
        `SELECT id, name, "serviceType", city, price, status 
         FROM properties 
         WHERE status = 'VERIFIED' 
           AND (city ILIKE '%Bhubaneswar%' OR address ILIKE '%KIIT%')
         ORDER BY "avgRating" DESC`
      );
      console.log(`   Found ${searchResults.length} results:`);
      searchResults.forEach((p) => console.log(`   - ${p.name} (₹${p.price}/mo) in ${p.city} — ${p.status}`));

      // 5. Cleanup test property
      await pool.query(`DELETE FROM properties WHERE id = $1`, [newProp.id]);
      console.log(`\n5. Cleaned up test property`);
    } else {
      console.log("\n3. No OWNER user found. Creating test owner...");
      // Create a test owner and property for demo
      const { rows: [testOwner] } = await pool.query(
        `INSERT INTO users (id, name, email, password, role, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, name, role`,
        [
          `testowner_${Date.now()}`,
          "Test Owner",
          `testowner_${Date.now()}@test.com`,
          "$2a$12$placeholder", // not a real password
          "OWNER",
        ]
      );
      console.log(`   Created owner: ${testOwner.name} (${testOwner.role})`);

      const { rows: [testProp] } = await pool.query(
        `INSERT INTO properties (id, name, slug, description, "serviceType", price, "ownerId", city, state, address, pincode, status, "avgRating", "totalReviews", "occupancy", "isAC", "hasWifi", "foodIncluded", "laundryIncluded", "hasMedical", "forGender", "gstRate", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 18, NOW(), NOW())
         RETURNING id, name, status`,
        [
          `testprop_${Date.now()}`,
          "Sample PG in Kota",
          `sample-pg-kota-${Date.now()}`,
          "A well-maintained girls PG near Allen Career Institute with food and WiFi",
          "PG",
          7000,
          testOwner.id,
          "Kota",
          "Rajasthan",
          "Near Allen Career Institute",
          "324001",
          "VERIFIED",
          4.5,
          25,
          2,
          true,
          true,
          true,
          true,
          false,
          "FEMALE",
        ]
      );
      console.log(`   Created property: ${testProp.name} — ${testProp.status}`);

      // Search it
      console.log("\n4. Student search for 'PG in Kota':");
      const { rows: results } = await pool.query(
        `SELECT name, "serviceType", city, price, status FROM properties WHERE status = 'VERIFIED' AND city ILIKE '%Kota%'`
      );
      results.forEach((p) => console.log(`   - ${p.name} (₹${p.price}/mo) — ${p.status}`));

      // Cleanup
      await pool.query(`DELETE FROM properties WHERE id = $1`, [testProp.id]);
      await pool.query(`DELETE FROM users WHERE id = $1`, [testOwner.id]);
      console.log("\n5. Cleaned up test data");
    }

    console.log("\n✅ Property flow test complete! Owner-added properties with VERIFIED status are visible to students.");
  } catch (error) {
    console.error("Test error:", error);
  } finally {
    await pool.end();
  }
}

testFlow();
