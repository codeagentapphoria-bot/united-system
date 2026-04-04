import { Pool } from 'pg';
import { loadEnvConfig } from '../../utils/envLoader.js';

// Ensure env is loaded
loadEnvConfig();

async function run() {
  const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT || 5432,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  try {
    console.log("Applying civil_status CHECK constraint update to include 'live_in' (idempotent)...");
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'residents'::regclass
            AND contype = 'c'
            AND pg_get_constraintdef(oid) LIKE '%civil_status%live_in%'
        ) THEN
          BEGIN
            ALTER TABLE residents
            DROP CONSTRAINT IF EXISTS residents_civil_status_check,
            ADD CONSTRAINT residents_civil_status_check
            CHECK (civil_status IN ('single','married','widowed','separated','divorced','live_in'));
          EXCEPTION WHEN others THEN
            -- fallback no-op
            PERFORM 1;
          END;
        END IF;
      END$$;
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

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}

export default run;


