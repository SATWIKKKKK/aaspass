import pg from "pg";
const { Pool } = pg;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const regions = [
  "ap-south-1",
  "ap-southeast-1", 
  "us-east-1",
  "us-west-1",
  "eu-west-1",
  "eu-central-1",
];

const ref = "ofcwfevliwkevpjaavun";
const pass = "uoLNBMKrgWakH0kd";

for (const region of regions) {
  for (const port of [6543, 5432]) {
    const url = `postgresql://postgres.${ref}:${pass}@aws-0-${region}.pooler.supabase.com:${port}/postgres`;
    const pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 8000,
    });
    try {
      const res = await pool.query("SELECT 1 as ok");
      console.log(`✅ ${region}:${port} => OK`);
      await pool.end();
      process.exit(0);
    } catch (e) {
      console.log(`❌ ${region}:${port} => ${e.message.substring(0, 60)}`);
      await pool.end();
    }
  }
}
console.log("No working region found.");
