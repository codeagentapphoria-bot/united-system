import { Pool } from 'pg';
import { loadEnvConfig } from '../../utils/envLoader.js';

loadEnvConfig();

async function run() {
  const pool = new Pool({
    user:     process.env.PG_USER,
    host:     process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port:     process.env.PG_PORT || 5432,
    ssl:      process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  try {
    console.log('Adding full_name column to requests (idempotent)...');
    await client.query(`
      ALTER TABLE requests
        ADD COLUMN IF NOT EXISTS full_name VARCHAR(200);
    `);
    console.log('Done.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}

export default run;
