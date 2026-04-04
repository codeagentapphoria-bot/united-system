// =============================================================================
// DEPRECATED (v1 only) — Targets old schema with puroks, citizens, and
// citizen_resident_mapping tables that no longer exist in v2.
// Do NOT run against a v2 database. Keep for historical reference only.
// =============================================================================
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvConfig } from '../utils/envLoader.js';
import logger from '../utils/logger.js';

// Load environment variables
loadEnvConfig();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CompleteMigration {
  constructor() {
    this.config = null;
    this.adminPool = null;
    this.databaseName = null;

    this.migrationSteps = [
      { name: 'Database Creation', fn: this.createDatabase.bind(this) },
      { name: 'Schema Migration', fn: this.runSchemaMigration.bind(this) },
      { name: 'GIS Data Conversion', fn: this.convertGISData.bind(this) },
      { name: 'GIS Data Import', fn: this.importGISData.bind(this) },
      { name: 'GIS Code Migration', fn: this.addGisCodes.bind(this) },
      { name: 'Data Seeding', fn: this.seedDatabase.bind(this) },
      { name: 'Audit System Setup', fn: this.setupAuditSystem.bind(this) },
      { name: 'Classification Types Seeding', fn: this.seedClassificationTypes.bind(this) },
      { name: 'Verification', fn: this.verifyMigration.bind(this) }
    ];
  }

  initialize() {
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

    this.adminPool = new Pool({
      ...this.config,
      database: 'postgres',
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 1
    });
  }

  async run(options = {}) {
    const { 
      resume = false, 
      skipSteps = [], 
      force = false,
      backup = false 
    } = options;

    // Initialize configuration after environment is loaded
    this.initialize();

    logger.info('🚀 Starting complete database migration...');
    logger.info(`Target database: ${this.databaseName}`);
    
    if (backup) {
      logger.info('📦 Creating backup before migration...');
      await this.createBackup();
    }

    try {
      let startStep = 0;
      
      if (resume) {
        startStep = await this.findLastCompletedStep();
        logger.info(`Resuming migration from step ${startStep + 1}: ${this.migrationSteps[startStep].name}`);
      }

      for (let i = startStep; i < this.migrationSteps.length; i++) {
        const step = this.migrationSteps[i];
        
        if (skipSteps.includes(i)) {
          logger.info(`⏭️  Skipping step ${i + 1}: ${step.name}`);
          continue;
        }

        logger.info(`\n📋 Step ${i + 1}/${this.migrationSteps.length}: ${step.name}`);
        
        try {
          await step.fn();
          await this.markStepCompleted(i);
          logger.info(`✅ Step ${i + 1} completed: ${step.name}`);
          
        } catch (error) {
          logger.error(`❌ Step ${i + 1} failed: ${step.name}`, error.message);
          
          if (!force) {
            logger.error('Migration stopped. Use --force to continue despite errors.');
            throw error;
          } else {
            logger.warn('Continuing migration despite error...');
          }
        }
      }

      logger.info('\n🎉 Complete database migration finished successfully!');
      await this.displayMigrationSummary();
      
    } catch (error) {
      logger.error('❌ Migration failed:', error.message);
      throw error;
    } finally {
      await this.adminPool.end();
    }
  }

  async createDatabase() {
    logger.info('Creating database if it does not exist...');
    
    try {
      const checkResult = await this.adminPool.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [this.databaseName]
      );

      if (checkResult.rows.length === 0) {
        await this.adminPool.query(`CREATE DATABASE "${this.databaseName}"`);
        logger.info(`Database '${this.databaseName}' created successfully`);
      } else {
        logger.info(`Database '${this.databaseName}' already exists`);
      }
    } catch (error) {
      logger.error('Failed to create database:', error.message);
      throw error;
    }
  }

  async runSchemaMigration() {
    logger.info('Running schema migration...');
    
    const targetPool = new Pool({
      ...this.config,
      database: this.databaseName,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 1
    });

    try {
      // Check if schema already exists by checking for users table
      const checkResult = await targetPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'bims_users'
        )
      `);

      if (checkResult.rows[0].exists) {
        logger.info('Database schema already exists, skipping schema creation');
      } else {
        // Execute database schema creation
        const dbSchema = this.readSQLFile('db.docs.txt');
        if (dbSchema) {
          await this.executeSQLScript(targetPool, dbSchema, 'Database schema creation');
        } else {
          throw new Error('Failed to load database schema file');
        }
      }

      // Check if database configuration already exists by checking for audit_logs table
      const auditCheckResult = await targetPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'audit_logs'
        )
      `);

      if (auditCheckResult.rows[0].exists) {
        logger.info('Database configuration already exists, skipping configuration');
      } else {
        // Execute database configuration (triggers, functions, audit logs)
        const dbConfig = this.readSQLFile('db-config.docs.txt');
        if (dbConfig) {
          await this.executeSQLScript(targetPool, dbConfig, 'Database configuration');
        } else {
          throw new Error('Failed to load database configuration file');
        }
      }

      logger.info('Schema migration completed successfully');
      
    } finally {
      await targetPool.end();
    }
  }

  async convertGISData() {
    logger.info('Converting GIS data...');
    
    const { convertGeoJSONToSQL } = await import('./convertGeoJSONToSQL.js');
    await convertGeoJSONToSQL();
    
    logger.info('GIS data conversion completed');
  }

  async importGISData() {
    logger.info('Importing GIS data...');
    
    const { importGISData } = await import('./importGISData.js');
    await importGISData();
    
    logger.info('GIS data import completed');
  }

  async seedDatabase() {
    logger.info('Seeding database...');
    
    // Import and run the seedDatabase function
    const { default: DatabaseSeeder } = await import('./seedDatabase.js');
    await DatabaseSeeder.seed();
    
    logger.info('Database seeding completed');
  }

  async setupAuditSystem() {
    logger.info('Setting up audit system...');
    
    try {
      const { setupAuditSystem } = await import('./setupAuditSystem.js');
      await setupAuditSystem();
      logger.info('Audit system setup completed');
    } catch (error) {
      logger.warn('Audit system setup failed, but continuing migration:', error.message);
      // Don't throw the error, just log it and continue
    }
  }

  async seedClassificationTypes() {
    logger.info('Seeding classification types...');
    
    const { default: seedClassificationTypes } = await import('./seed_classification_types.js');
    await seedClassificationTypes();
    
    logger.info('Classification types seeding completed');
  }

  async verifyMigration() {
    logger.info('Verifying migration...');
    
    const targetPool = new Pool({
      ...this.config,
      database: this.databaseName
    });

    try {
      // Check if all essential tables exist
      const essentialTables = [
        'bims_users', 'municipalities', 'barangays', 'puroks', 
        'residents', 'classification_types', 'audit_logs'
      ];

      for (const table of essentialTables) {
        const result = await targetPool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [table]);

        if (!result.rows[0].exists) {
          throw new Error(`Essential table '${table}' does not exist`);
        }
      }

      // Check if PostGIS extension is enabled
      const postgisCheck = await targetPool.query(`
        SELECT EXISTS (
          SELECT FROM pg_extension WHERE extname = 'postgis'
        )
      `);

      if (!postgisCheck.rows[0].exists) {
        throw new Error('PostGIS extension is not enabled');
      }

      // Check if there's at least one municipality
      const municipalityCount = await targetPool.query('SELECT COUNT(*) as count FROM municipalities');
      if (municipalityCount.rows[0].count === 0) {
        throw new Error('No municipalities found - seeding may have failed');
      }

      // Check if there's at least one admin user
      const userCount = await targetPool.query('SELECT COUNT(*) as count FROM bims_users');
      if (userCount.rows[0].count === 0) {
        throw new Error('No bims_users found - seeding may have failed');
      }

      // Check if classification types exist
      const classificationCount = await targetPool.query('SELECT COUNT(*) as count FROM classification_types');
      if (classificationCount.rows[0].count === 0) {
        throw new Error('No classification types found - seeding may have failed');
      }

      logger.info('Migration verification completed successfully');
      
    } finally {
      await targetPool.end();
    }
  }

  readSQLFile(filename) {
    const filePath = path.join(process.cwd(), '..', 'docs', filename);
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      logger.error(`Error reading file ${filename}:`, error.message);
      return null;
    }
  }

  async executeSQLScript(pool, sqlScript, description) {
    try {
      logger.info(`Executing: ${description}`);
      await pool.query(sqlScript);
      logger.info(`✅ ${description} completed successfully`);
    } catch (error) {
      logger.error(`❌ ${description} failed:`, error.message);
      throw error;
    }
  }

  async markStepCompleted(stepIndex) {
    // Create a simple migration tracking table
    const targetPool = new Pool({
      ...this.config,
      database: this.databaseName
    });

    try {
      // Create migration tracking table if it doesn't exist
      await targetPool.query(`
        CREATE TABLE IF NOT EXISTS migration_tracking (
          id SERIAL PRIMARY KEY,
          step_index INTEGER NOT NULL,
          step_name VARCHAR(255) NOT NULL,
          completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(step_index)
        )
      `);

      // Mark step as completed
      await targetPool.query(`
        INSERT INTO migration_tracking (step_index, step_name) 
        VALUES ($1, $2) 
        ON CONFLICT (step_index) 
        DO UPDATE SET completed_at = CURRENT_TIMESTAMP
      `, [stepIndex, this.migrationSteps[stepIndex].name]);

    } finally {
      await targetPool.end();
    }
  }

  async findLastCompletedStep() {
    const targetPool = new Pool({
      ...this.config,
      database: this.databaseName
    });

    try {
      const result = await targetPool.query(`
        SELECT MAX(step_index) as last_step 
        FROM migration_tracking
      `);

      return result.rows[0].last_step !== null ? result.rows[0].last_step + 1 : 0;
      
    } catch (error) {
      // If table doesn't exist, start from beginning
      return 0;
    } finally {
      await targetPool.end();
    }
  }

  async createBackup() {
    const backupDir = path.join(__dirname, '../backups');
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

    logger.info(`Creating backup to: ${backupFile}`);
    
    // This would require pg_dump to be available
    // For now, we'll just log the intention
    logger.warn('Backup creation not implemented - requires pg_dump utility');
    logger.info(`Backup would be saved to: ${backupFile}`);
  }

  async displayMigrationSummary() {
    const targetPool = new Pool({
      ...this.config,
      database: this.databaseName
    });

    try {
      logger.info('\n📊 Migration Summary:');
      
      // Get table counts
      const tables = [
        'municipalities', 'barangays', 'puroks', 'residents', 
        'bims_users', 'classification_types', 'audit_logs'
      ];

      for (const table of tables) {
        try {
          const result = await targetPool.query(`SELECT COUNT(*) as count FROM ${table}`);
          logger.info(`  ${table}: ${result.rows[0].count} records`);
        } catch (error) {
          logger.warn(`  ${table}: Unable to count records`);
        }
      }

      // Check PostGIS status
      const postgisCheck = await targetPool.query(`
        SELECT version() as postgis_version 
        FROM pg_extension 
        WHERE extname = 'postgis'
      `);
      
      if (postgisCheck.rows.length > 0) {
        logger.info(`  PostGIS: ${postgisCheck.rows[0].postgis_version}`);
      }

      logger.info('\n✅ Database migration completed successfully!');
      logger.info('You can now start the application with: npm run dev');
      
    } finally {
      await targetPool.end();
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    resume: false,
    skipSteps: [],
    force: false,
    backup: false
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--resume') {
      options.resume = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--backup') {
      options.backup = true;
    } else if (arg.startsWith('--skip-step=')) {
      const stepIndex = parseInt(arg.split('=')[1]);
      if (!isNaN(stepIndex)) {
        options.skipSteps.push(stepIndex);
      }
    } else if (arg === '--help') {
      console.log(`
Complete Database Migration Script

Usage:
  npm run db:complete-migration [options]

Options:
  --resume           Resume migration from last completed step
  --force            Continue migration despite errors
  --backup           Create backup before migration
  --skip-step=<N>    Skip step N (0-based index)
  --help             Show this help message

Migration Steps:
  0 - Database Creation
  1 - Schema Migration
  2 - GIS Data Conversion
  3 - GIS Data Import
  4 - Data Seeding
  5 - Audit System Setup
  6 - Classification Types Seeding
  7 - Verification

Examples:
  npm run db:complete-migration
  npm run db:complete-migration -- --resume
  npm run db:complete-migration -- --force --backup
  npm run db:complete-migration -- --skip-step=2 --skip-step=3
      `);
      return;
    }
  }

  try {
    const migration = new CompleteMigration();
    await migration.run(options);
    
  } catch (error) {
    logger.error('Migration failed:', error.message);
    process.exit(1);
  }
}

// Export for use in other scripts
export { CompleteMigration };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
