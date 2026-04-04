/**
 * Script to create PostgreSQL database from DATABASE_URL
 * 
 * Usage:
 *   npm run db:create
 * 
 * This script:
 * - Reads DATABASE_URL from .env file
 * - Extracts database name and connection details
 * - Creates the database if it doesn't exist
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const execAsync = promisify(exec);

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('❌ Error: .env file not found');
  console.log('Please create a .env file in multysis-backend/ with DATABASE_URL');
  process.exit(1);
}

interface DatabaseConfig {
  user: string;
  password: string;
  host: string;
  port: string;
  database: string;
}

function parseDatabaseUrl(url: string): DatabaseConfig | null {
  try {
    // Format: postgresql://user:password@host:port/database?schema=public
    const match = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    
    if (!match) {
      return null;
    }

    // Decode URL-encoded characters (e.g., %40 for @, %3A for :)
    const decodeUrlComponent = (str: string) => {
      try {
        return decodeURIComponent(str);
      } catch {
        return str;
      }
    };

    return {
      user: decodeUrlComponent(match[1]),
      password: decodeUrlComponent(match[2]),
      host: decodeUrlComponent(match[3]),
      port: match[4],
      database: decodeUrlComponent(match[5]),
    };
  } catch (error) {
    return null;
  }
}

async function checkDatabaseExists(config: DatabaseConfig): Promise<boolean> {
  try {
    // Use psql to check if database exists
    const checkUrl = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/postgres`;
    const command = `psql "${checkUrl}" -tAc "SELECT 1 FROM pg_database WHERE datname='${config.database}'"`;
    
    const { stdout } = await execAsync(command);
    return stdout.trim() === '1';
  } catch (error) {
    // If check fails, assume database doesn't exist
    return false;
  }
}

async function createDatabase(config: DatabaseConfig): Promise<void> {
  try {
    console.log(`📦 Creating database '${config.database}'...`);
    
    // Set PGPASSWORD environment variable for PostgreSQL commands
    const env = {
      ...process.env,
      PGPASSWORD: config.password,
    };

    // Escape database name for shell (quote it)
    const dbNameEscaped = `"${config.database.replace(/"/g, '\\"')}"`;
    
    // Use createdb command
    const command = `createdb -h ${config.host} -p ${config.port} -U ${config.user} ${dbNameEscaped}`;
    
    await execAsync(command, { env });
    console.log(`✅ Database '${config.database}' created successfully!`);
  } catch (error: any) {
    // If createdb fails, try using psql
    console.log('⚠️  createdb command failed, trying psql...');
    
    try {
      // Use PGPASSWORD for psql as well, connect to postgres database
      const env = {
        ...process.env,
        PGPASSWORD: config.password,
        PGHOST: config.host,
        PGPORT: config.port,
        PGUSER: config.user,
      };
      
      // Escape database name for SQL (double quotes for identifiers)
      const dbNameEscaped = `"${config.database.replace(/"/g, '""')}"`;
      const psqlCommand = `psql -d postgres -c "CREATE DATABASE ${dbNameEscaped};"`;
      
      await execAsync(psqlCommand, { env });
      console.log(`✅ Database '${config.database}' created successfully using psql!`);
    } catch (psqlError: any) {
      console.error('❌ Error creating database with psql:', psqlError.message);
      throw psqlError;
    }
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL not found in .env file');
    console.log('\nPlease add DATABASE_URL to your .env file:');
    console.log('DATABASE_URL=postgresql://user:password@host:port/database?schema=public');
    process.exit(1);
  }

  console.log('🔍 Parsing DATABASE_URL...');
  const config = parseDatabaseUrl(databaseUrl);

  if (!config) {
    console.error('❌ Error: Invalid DATABASE_URL format');
    console.log('\nExpected format:');
    console.log('postgresql://user:password@host:port/database?schema=public');
    process.exit(1);
  }

  console.log(`📊 Database: ${config.database}`);
  console.log(`👤 User: ${config.user}`);
  console.log(`🌐 Host: ${config.host}:${config.port}`);
  console.log('');

  // Check if database already exists
  console.log('🔍 Checking if database exists...');
  const exists = await checkDatabaseExists(config);

  if (exists) {
    console.log(`✅ Database '${config.database}' already exists!`);
    process.exit(0);
  }

  // Create database
  try {
    await createDatabase(config);
    console.log('\n🎉 Database creation completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. npm run db:generate  - Generate Prisma Client');
    console.log('  2. npm run db:migrate  - Run database migrations');
    console.log('  3. npm run db:seed     - Seed initial data');
  } catch (error: any) {
    console.error('\n❌ Error creating database:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('  - Ensure PostgreSQL is running');
    console.log('  - Verify DATABASE_URL credentials are correct');
    console.log('  - Check that the user has CREATE DATABASE permission');
    console.log('  - Try creating manually: createdb -U postgres ' + config.database);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

