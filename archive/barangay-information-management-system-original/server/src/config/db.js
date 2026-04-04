import pg from 'pg';
import logger from '../utils/logger.js';
import { loadEnvConfig } from '../utils/envLoader.js';

// Load environment variables
loadEnvConfig();

const { Pool } = pg;

// Create a new PostgreSQL pool
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  
  // password: process.env.PG_PASSWORD,
  // port: process.env.PG_PORT || 5432,
  // ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false 

  // ito yung lumang config the cursor convert to string for the performance kuno
  // nagsync kasi ako ng 200 resident tapos nag crash yung server ito ynig response *POST /api/resident - - ms - -*


  password: String(process.env.PG_PASSWORD), // Ensure password is always a string
  port: parseInt(process.env.PG_PORT),
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // Connection pool configuration for better performance
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used this many times
});



// Test the database connection
const connectDB = async () => {
  try {
    // Log connection details (without password)
    logger.info(`Connecting to PostgreSQL: ${process.env.PG_USER}@${process.env.PG_HOST}:${process.env.PG_PORT}/${process.env.PG_DATABASE}`);
    
    await pool.query('SELECT NOW()');
    logger.info('PostgreSQL connected successfully');
  } catch (error) {
    logger.error('PostgreSQL connection error:', error);
    console.error('Failed to connect to PostgreSQL:', error.message);
    console.error('Connection details:', {
      user: process.env.PG_USER,
      host: process.env.PG_HOST,
      database: process.env.PG_DATABASE,
      port: process.env.PG_PORT,
      ssl: process.env.PG_SSL
    });
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