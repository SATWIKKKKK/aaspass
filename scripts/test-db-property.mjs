import pg from "pg";
const { Client } = pg;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Test 1: with SSL
const c1 = new Client({
  host: "2406:da1a:6b0:f604:58c1:fec5:1ea3:e4e9",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "uoLNBMKrgWakH0kd",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

try {
  await c1.connect();
  console.log("SSL connected!");
  const r = await c1.query("SELECT count(*) FROM properties");
  console.log("Properties count (SSL):", r.rows);
  await c1.end();
} catch (e) {
  console.error("SSL ERROR:", e.message);
  try { await c1.end(); } catch {}
}

// Test 2: without SSL - complex query
const c2 = new Client({
  host: "2406:da1a:6b0:f604:58c1:fec5:1ea3:e4e9",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "uoLNBMKrgWakH0kd",
  ssl: false,
  connectionTimeoutMillis: 15000,
});

try {
  await c2.connect();
  console.log("No-SSL connected!");
  const r = await c2.query("SELECT count(*) FROM properties");
  console.log("Properties count (no-SSL):", r.rows);
  
  const r2 = await c2.query(`
    SELECT p.id, p.name, p.city, p.price, p.status 
    FROM properties p 
    WHERE p.status = 'VERIFIED' 
    ORDER BY p."avgRating" DESC 
    LIMIT 12
  `);
  console.log("Properties (no-SSL):", r2.rows.length, "rows");
  await c2.end();
} catch (e) {
  console.error("No-SSL ERROR:", e.message);
  try { await c2.end(); } catch {}
}
