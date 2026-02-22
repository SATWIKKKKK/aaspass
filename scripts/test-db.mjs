import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load local env first so DATABASE_URL from .env.local is available
dotenv.config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('Testing DATABASE_URL connectivity...');
    const res = await pool.query('SELECT now() as now');
    console.log('Connected — server time:', res.rows[0].now);
  } catch (err) {
    console.error('DB connectivity test failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
