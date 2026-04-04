// =============================================================================
// DEPRECATED — References puroks, citizens, and citizen_resident_mapping
// tables that no longer exist in the v2 schema. Running this against a
// v2 database WILL FAIL. Keep only for v1 rollback reference.
// =============================================================================
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { loadEnvConfig } from '../utils/envLoader.js';
import logger from '../utils/logger.js';

// Load environment variables
loadEnvConfig();

const { Pool } = pg;

// Rollback levels
const ROLLBACK_LEVELS = {
  1: 'Remove audit system only',
  2: 'Remove audit system and seeded data',
  3: 'Remove audit system, seeded data, and GIS data',
  4: 'Complete rollback (drop and recreate database)'
};

class DatabaseRollback {
  constructor() {
    this.config = {
      user: process.env.PG_USER || 'postgres',
      host: process.env.PG_HOST || 'localhost',
      password: process.env.PG_PASSWORD || '123',
      port: process.env.PG_PORT || 5432,
      ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
    };
    
    this.databaseName = process.env.PG_DATABASE;
    
    if (!this.databaseName) {
      throw new Error('PG_DATABASE environment variable is not set');
    }
  }

  async rollback(level = 1, options = {}) {
    const { force = false, backup = false } = options;
    
    logger.info(`🔄 Starting database rollback to level ${level}...`);
    logger.info(`Rollback description: ${ROLLBACK_LEVELS[level]}`);
    
    if (!force) {
      console.log(`\n⚠️  WARNING: This will rollback the database to level ${level}`);
      console.log(`Description: ${ROLLBACK_LEVELS[level]}`);
      console.log('This action cannot be undone without restoring from backup.');
      console.log('\nTo proceed, run with --force flag:');
      console.log(`npm run db:rollback -- --level=${level} --force`);
      return;
    }

    try {
      switch (level) {
        case 1:
          await this.rollbackLevel1();
          break;
        case 2:
          await this.rollbackLevel2();
          break;
        case 3:
          await this.rollbackLevel3();
          break;
        case 4:
          await this.rollbackLevel4();
          break;
        default:
          throw new Error(`Invalid rollback level: ${level}. Valid levels are 1-4.`);
      }
      
      logger.info(`✅ Rollback to level ${level} completed successfully`);
      
    } catch (error) {
      logger.error(`❌ Rollback failed:`, error.message);
      throw error;
    }
  }

  async rollbackLevel1() {
    logger.info('🔄 Level 1: Removing audit system...');
    
    const pool = new Pool({
      ...this.config,
      database: this.databaseName
    });

    try {
      await this.cleanupAuditSystem(pool);
      logger.info('✅ Audit system removed successfully');
      
    } finally {
      await pool.end();
    }
  }

  async rollbackLevel2() {
    logger.info('🔄 Level 2: Removing audit system and seeded data...');
    
    const pool = new Pool({
      ...this.config,
      database: this.databaseName
    });

    try {
      // Remove audit system first
      await this.cleanupAuditSystem(pool);
      
      // Remove seeded data
      await this.removeSeededData(pool);
      
      logger.info('✅ Audit system and seeded data removed successfully');
      
    } finally {
      await pool.end();
    }
  }

  async rollbackLevel3() {
    logger.info('🔄 Level 3: Removing audit system, seeded data, and GIS data...');
    
    const pool = new Pool({
      ...this.config,
      database: this.databaseName
    });

    try {
      // Remove audit system
      await this.cleanupAuditSystem(pool);
      
      // Remove seeded data
      await this.removeSeededData(pool);
      
      // Remove GIS data
      await this.removeGISData(pool);
      
      logger.info('✅ Audit system, seeded data, and GIS data removed successfully');
      
    } finally {
      await pool.end();
    }
  }

  async rollbackLevel4() {
    logger.info('🔄 Level 4: Complete database rollback...');
    
    // Create admin pool for database operations
    const adminPool = new Pool({
      ...this.config,
      database: 'postgres'
    });

    try {
      // Drop and recreate database
      await this.dropAndRecreateDatabase(adminPool);
      
      logger.info('✅ Complete database rollback completed successfully');
      
    } finally {
      await adminPool.end();
    }
  }

  async cleanupAuditSystem(pool) {
    logger.info('Removing audit system components...');
    
    // Drop audit triggers
    const dropTriggersSQL = `
      DROP TRIGGER IF EXISTS audit_residents_trigger ON residents;
      DROP TRIGGER IF EXISTS audit_households_trigger ON households;
      DROP TRIGGER IF EXISTS audit_families_trigger ON families;
      DROP TRIGGER IF EXISTS audit_family_members_trigger ON family_members;
      DROP TRIGGER IF EXISTS audit_archives_trigger ON archives;
      DROP TRIGGER IF EXISTS audit_inventories_trigger ON inventories;
      DROP TRIGGER IF EXISTS audit_pets_trigger ON pets;
      DROP TRIGGER IF EXISTS audit_requests_trigger ON requests;
    `;
    
    await pool.query(dropTriggersSQL);
    logger.info('Audit triggers removed');

    // Drop audit functions
    const dropFunctionsSQL = `
      DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;
      DROP FUNCTION IF EXISTS get_current_audit_user() CASCADE;
      DROP FUNCTION IF EXISTS get_barangay_audit_logs(INTEGER, INTEGER) CASCADE;
      DROP FUNCTION IF EXISTS get_all_audit_logs(INTEGER) CASCADE;
      DROP FUNCTION IF EXISTS get_record_audit_history(VARCHAR, VARCHAR) CASCADE;
    `;
    
    await pool.query(dropFunctionsSQL);
    logger.info('Audit functions removed');

    // Drop audit_logs table
    await pool.query("DROP TABLE IF EXISTS audit_logs CASCADE");
    logger.info('Audit logs table removed');
  }

  async removeSeededData(pool) {
    logger.info('Removing seeded data...');
    
    // Remove classification types
    await pool.query('DELETE FROM classification_types');
    logger.info('Classification types removed');

    // Remove seeded residents (but keep the structure)
    await pool.query('DELETE FROM residents WHERE id LIKE \'SEEDED-%\'');
    logger.info('Seeded residents removed');

    // Remove seeded officials
    await pool.query('DELETE FROM officials WHERE position LIKE \'%SEEDED%\'');
    logger.info('Seeded officials removed');

    // Remove seeded puroks (but keep the structure)
    await pool.query('DELETE FROM puroks WHERE purok_name LIKE \'%SEEDED%\'');
    logger.info('Seeded puroks removed');

    // Remove seeded barangays (but keep the structure)
    await pool.query('DELETE FROM barangays WHERE barangay_name LIKE \'%SEEDED%\'');
    logger.info('Seeded barangays removed');

    // Remove seeded municipalities (but keep the structure)
    await pool.query('DELETE FROM municipalities WHERE municipality_name LIKE \'%SEEDED%\'');
    logger.info('Seeded municipalities removed');

    // Remove seeded users (but keep admin user)
    await pool.query('DELETE FROM bims_users WHERE email LIKE \'%SEEDED%\'');
    logger.info('Seeded bims_users removed');
  }

  async removeGISData(pool) {
    logger.info('Removing GIS data...');
    
    // Remove GIS tables
    await pool.query('DROP TABLE IF EXISTS gis_barangay CASCADE');
    await pool.query('DROP TABLE IF EXISTS gis_municipality CASCADE');
    logger.info('GIS tables removed');

    // Remove spatial indexes from households
    try {
      await pool.query('DROP INDEX IF EXISTS idx_households_geom');
      logger.info('Spatial indexes removed');
    } catch (error) {
      logger.warn('Could not remove spatial indexes:', error.message);
    }
  }

  async dropAndRecreateDatabase(adminPool) {
    logger.info('Dropping and recreating database...');
    
    // Terminate active connections
    await adminPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [this.databaseName]);
    
    // Drop database
    await adminPool.query(`DROP DATABASE IF EXISTS "${this.databaseName}"`);
    logger.info('Database dropped');

    // Create database
    await adminPool.query(`CREATE DATABASE "${this.databaseName}"`);
    logger.info('Database recreated');

    // Re-enable PostGIS extension
    const targetPool = new Pool({
      ...this.config,
      database: this.databaseName
    });

    try {
      await targetPool.query('CREATE EXTENSION IF NOT EXISTS postgis');
      logger.info('PostGIS extension enabled');
    } finally {
      await targetPool.end();
    }
  }

  async checkRollbackStatus() {
    logger.info('Checking current database status...');
    
    const pool = new Pool({
      ...this.config,
      database: this.databaseName
    });

    try {
      const status = {
        databaseExists: false,
        hasAuditSystem: false,
        hasSeededData: false,
        hasGISData: false,
        tablesExist: false
      };

      // Check if database exists and has tables
      try {
        const tableCount = await pool.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `);
        
        status.databaseExists = true;
        status.tablesExist = tableCount.rows[0].count > 0;
        
      } catch (error) {
        status.databaseExists = false;
        return status;
      }

      // Check for audit system
      try {
        const auditTable = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'audit_logs'
          )
        `);
        status.hasAuditSystem = auditTable.rows[0].exists;
      } catch (error) {
        // Ignore errors
      }

      // Check for seeded data
      try {
        const seededCount = await pool.query(`
          SELECT 
            (SELECT COUNT(*) FROM municipalities) as municipalities,
            (SELECT COUNT(*) FROM barangays) as barangays,
            (SELECT COUNT(*) FROM puroks) as puroks,
            (SELECT COUNT(*) FROM bims_users) as bims_users
        `);
        
        const counts = seededCount.rows[0];
        status.hasSeededData = counts.municipalities > 0 || counts.barangays > 0 || 
                              counts.puroks > 0 || counts.bims_users > 0;
      } catch (error) {
        // Ignore errors
      }

      // Check for GIS data
      try {
        const gisTable = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'gis_barangay'
          )
        `);
        status.hasGISData = gisTable.rows[0].exists;
      } catch (error) {
        // Ignore errors
      }

      return status;
      
    } finally {
      await pool.end();
    }
  }

  displayStatus(status) {
    console.log('\n📊 Current Database Status:');
    console.log(`Database exists: ${status.databaseExists ? '✅' : '❌'}`);
    console.log(`Tables exist: ${status.tablesExist ? '✅' : '❌'}`);
    console.log(`Has audit system: ${status.hasAuditSystem ? '✅' : '❌'}`);
    console.log(`Has seeded data: ${status.hasSeededData ? '✅' : '❌'}`);
    console.log(`Has GIS data: ${status.hasGISData ? '✅' : '❌'}`);
    console.log('\nRollback Level Recommendations:');
    
    if (!status.databaseExists) {
      console.log('No rollback needed - database does not exist');
    } else if (status.hasAuditSystem) {
      console.log('Recommended rollback level: 1 (remove audit system)');
    } else if (status.hasSeededData) {
      console.log('Recommended rollback level: 2 (remove seeded data)');
    } else if (status.hasGISData) {
      console.log('Recommended rollback level: 3 (remove GIS data)');
    } else if (status.tablesExist) {
      console.log('Recommended rollback level: 4 (complete rollback)');
    } else {
      console.log('Database is empty - no rollback needed');
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  let level = 1;
  let force = false;
  let status = false;

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--level' && args[i + 1]) {
      level = parseInt(args[i + 1]);
      i++; // Skip next argument
    } else if (arg.startsWith('--level=')) {
      level = parseInt(arg.split('=')[1]);
    } else if (arg === '--force') {
      force = true;
    } else if (arg === '--status') {
      status = true;
    } else if (arg === '--help') {
      console.log(`
Database Rollback Script

Usage:
  npm run db:rollback -- [options]

Options:
  --level=<1-4>     Rollback level (default: 1)
  --force          Skip confirmation prompt
  --status         Show current database status
  --help           Show this help message

Rollback Levels:
  1 - Remove audit system only
  2 - Remove audit system and seeded data
  3 - Remove audit system, seeded data, and GIS data
  4 - Complete rollback (drop and recreate database)

Examples:
  npm run db:rollback -- --status
  npm run db:rollback -- --level=2 --force
  npm run db:rollback -- --level=4 --force
      `);
      return;
    }
  }

  try {
    const rollback = new DatabaseRollback();

    if (status) {
      const currentStatus = await rollback.checkRollbackStatus();
      rollback.displayStatus(currentStatus);
      return;
    }

    // Validate rollback level
    if (level < 1 || level > 4) {
      throw new Error('Rollback level must be between 1 and 4');
    }

    await rollback.rollback(level, { force });
    
  } catch (error) {
    logger.error('Rollback failed:', error.message);
    process.exit(1);
  }
}

// Export for use in other scripts
export { DatabaseRollback };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
