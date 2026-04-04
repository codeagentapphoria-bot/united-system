// =============================================================================
// DEPRECATED (v1 only) — Targets old schema with puroks, citizens, and
// citizen_resident_mapping tables that no longer exist in v2.
// Do NOT run against a v2 database. Keep for historical reference only.
// =============================================================================
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { loadEnvConfig } from '../utils/envLoader.js';

// Load environment variables immediately when module loads
loadEnvConfig();

const { Pool } = pg;

let config = null;
let adminPool = null;

const createTargetPool = (databaseName) => {
  if (!config) {
    throw new Error('Database configuration not initialized. Call migrateDatabase() first.');
  }
  return new Pool({
    ...config,
    database: databaseName,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 1
  });
};

const readSQLFile = (filename) => {
  const filePath = path.join(process.cwd(), '..', 'docs', filename);
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filename}:`, error.message);
    return null;
  }
};

const createDatabase = async (databaseName) => {
  try {
    console.log(`Checking if database '${databaseName}' exists...`);
    
    const checkResult = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName]
    );
    
    if (checkResult.rows.length === 0) {
      console.log(`Creating database '${databaseName}'...`);
      await adminPool.query(`CREATE DATABASE "${databaseName}"`);
      console.log(`Database '${databaseName}' created successfully`);
    } else {
      console.log(`Database '${databaseName}' already exists`);
    }
  } catch (error) {
    console.error('Error creating database:', error.message);
    throw error;
  }
};

const dropDatabase = async (databaseName) => {
  try {
    console.log(`Checking if database '${databaseName}' exists...`);
    
    const checkResult = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName]
    );

    if (checkResult.rows.length > 0) {
      console.log(`Dropping database '${databaseName}'...`);
      
      // Terminate active connections
      await adminPool.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [databaseName]);
      
      await adminPool.query(`DROP DATABASE "${databaseName}"`);
      console.log(`Database '${databaseName}' dropped successfully`);
    } else {
      console.log(`Database '${databaseName}' does not exist`);
    }
  } catch (error) {
    console.error('Error dropping database:', error.message);
    throw error;
  }
};

const executeSQLScript = async (pool, sql, description) => {
  try {
    console.log(`Executing: ${description}`);
    await pool.query(sql);
    console.log(`✓ ${description} completed successfully`);
  } catch (error) {
    console.error(`✗ Error executing ${description}:`, error.message);
    throw error;
  }
};

const migrateDatabase = async (options = {}) => {
  // Load environment variables at the start of the function
  loadEnvConfig();
  
  // Initialize configuration and admin pool after environment is loaded
  config = {
    user: process.env.PG_USER || 'postgres',
    host: process.env.PG_HOST || 'localhost',
    password: process.env.PG_PASSWORD || '123',
    port: process.env.PG_PORT || 5432,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
  };

  adminPool = new Pool({
    ...config,
    database: 'postgres',
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 1
  });
  
  const { rollback = false } = options;
  const databaseName = process.env.PG_DATABASE;
  
  if (!databaseName) {
    console.error('PG_DATABASE environment variable is not set');
    process.exit(1);
  }

  console.log('🚀 Starting database migration...');
  console.log(`Target database: ${databaseName}`);
  console.log(`Mode: ${rollback ? 'ROLLBACK' : 'MIGRATION'}`);
  console.log('');

  try {
    if (rollback) {
      console.log('🔄 Rollback mode: Dropping existing database...');
      await dropDatabase(databaseName);
    }
    
    // Create database if it doesn't exist
    await createDatabase(databaseName);
    
    // Create pool for target database
    const targetPool = createTargetPool(databaseName);

    // Execute database schema creation
    const dbSchema = readSQLFile('db.docs.txt');
    if (dbSchema) {
      await executeSQLScript(targetPool, dbSchema, 'Database schema creation');
    } else {
      console.error('Failed to load database schema file');
      process.exit(1);
    }

    // Execute database configuration (triggers, functions, audit logs)
    const dbConfig = readSQLFile('db-config.docs.txt');
    if (dbConfig) {
      await executeSQLScript(targetPool, dbConfig, 'Database configuration (triggers, functions, audit logs)');
    } else {
      console.error('Failed to load database configuration file');
      process.exit(1);
    }

    // Close connections
    await targetPool.end();
    await adminPool.end();

    console.log('');
    console.log('🎉 Database migration completed successfully!');
    console.log('');
    console.log('Database tables created:');
    console.log('- users');
    console.log('- municipalities');
    console.log('- barangays');
    console.log('- puroks');
    console.log('- residents');
    console.log('- resident_classifications');
    console.log('- resident_counters');
    console.log('- officials');
    console.log('- households');
    console.log('- families');
    console.log('- family_members');
    console.log('- archives');
    console.log('- inventories');
    console.log('- pets');
    console.log('- vaccines');
    console.log('- requests');
    console.log('- audit_logs');
    console.log('');
    console.log('Features enabled:');
    console.log('- Automatic updated_at timestamp updates');
    console.log('- Comprehensive audit logging');
    console.log('- PostGIS extension for geospatial data');
    console.log('- JSONB support for flexible data storage');

  } catch (error) {
    console.error('❌ Database migration failed:', error.message);
    process.exit(1);
  }
};

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    rollback: false
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--rollback') {
      options.rollback = true;
    } else if (arg === '--help') {
      console.log(`
Database Migration Script

Usage:
  npm run db:migrate [options]

Options:
  --rollback       Drop and recreate database (full rollback)
  --help          Show this help message

Examples:
  npm run db:migrate
  npm run db:migrate -- --rollback
      `);
      return;
    }
  }

  await migrateDatabase(options);
}

// Run migration if this file is executed directly
const decodedUrl = decodeURIComponent(import.meta.url);
const normalizedArgv = process.argv[1].replace(/\\/g, '/');
const normalizedUrl = decodedUrl.replace(/\\/g, '/');

if (decodedUrl === `file://${process.argv[1]}` || normalizedUrl.includes(normalizedArgv)) {
  main().catch(error => {
    console.error('Migration failed:', error.message);
    process.exit(1);
  });
}

export default migrateDatabase; 