import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rowCount } = await pool.query("DELETE FROM users WHERE email LIKE 'testowner_%'");
console.log(`Deleted ${rowCount} test owners`);
await pool.end();
