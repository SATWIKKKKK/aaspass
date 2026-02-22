import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const email = process.argv[2] || 'test+2@example.com';

(async () => {
  try {
    const res = await pool.query('SELECT id, email, name, role FROM users WHERE email = $1', [email]);
    if (res.rowCount === 0) {
      console.log('NOT FOUND');
      process.exitCode = 2;
      return;
    }
    console.log('FOUND', res.rows[0]);
  } catch (err) {
    console.error('ERROR', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
