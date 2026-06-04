import pg from 'pg';
import logger from '../utils/logger.js';
import { loadEnvConfig } from '../utils/envLoader.js';

// Load environment variables
loadEnvConfig();

const { Pool } = pg;

// =============================================================================
// SUPABASE POSTGRESQL CONNECTION
// Uses Supabase's PostgreSQL connection pooling for better performance
// =============================================================================

const pool = new Pool({
  // Connection credentials - use Supabase environment variables
  user: process.env.SUPABASE_PG_USER || process.env.PG_USER,
  host: process.env.SUPABASE_PG_HOST || process.env.PG_HOST,
  database: process.env.SUPABASE_PG_DATABASE || process.env.PG_DATABASE,
  password: String(process.env.SUPABASE_PG_PASSWORD || process.env.PG_PASSWORD),
  port: parseInt(process.env.SUPABASE_PG_PORT || process.env.PG_PORT || '6543'),
  ssl: process.env.SUPABASE_PG_SSL === 'true' || process.env.PG_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false,

  // Connection pool configuration optimized for Supabase cloud
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000, // Higher for Supabase cloud connections
  maxUses: 7500,
});


// Test the database connection
const connectDB = async () => {
  try {
    const host = process.env.SUPABASE_PG_HOST || process.env.PG_HOST;
    const port = process.env.SUPABASE_PG_PORT || process.env.PG_PORT;
    const database = process.env.SUPABASE_PG_DATABASE || process.env.PG_DATABASE;
    const user = process.env.SUPABASE_PG_USER || process.env.PG_USER;

    logger.info(`Connecting to Supabase PostgreSQL: ${user}@${host}:${port}/${database}`);

    await pool.query('SELECT NOW()');
    logger.info('Supabase PostgreSQL connected successfully');
  } catch (error) {
    logger.error('PostgreSQL connection error:', error);
    process.exit(1);
  }
};

// Close pool function
const closePool = async () => {
  await pool.end();
  logger.info('PostgreSQL pool closed');
};

// Export both the pool and connectDB function
export { pool, connectDB, closePool };