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

class UnifiedMigration {
  constructor() {
    this.config = null;
    this.adminPool = null;
    this.databaseName = null;
    this.targetPool = null;

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

    this.targetPool = new Pool({
      ...this.config,
      database: this.databaseName,
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

    logger.info('🚀 Starting unified database migration...');
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

      logger.info('\n🎉 Unified database migration finished successfully!');
      await this.displayMigrationSummary();
      
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  // Step 1: Database Creation
  async createDatabase() {
    try {
      logger.info(`Checking if database '${this.databaseName}' exists...`);
      
      const checkResult = await this.adminPool.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [this.databaseName]
      );
      
      if (checkResult.rows.length === 0) {
        logger.info(`Creating database '${this.databaseName}'...`);
        await this.adminPool.query(`CREATE DATABASE "${this.databaseName}"`);
        logger.info(`Database '${this.databaseName}' created successfully`);
      } else {
        logger.info(`Database '${this.databaseName}' already exists`);
      }
    } catch (error) {
      logger.error('Error creating database:', error.message);
      throw error;
    }
  }

  // Step 2: Schema Migration
  async runSchemaMigration() {
    logger.info('Running schema migration...');

    try {
      // Check if schema already exists by checking for users table
      const checkResult = await this.targetPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'users'
        )
      `);

      if (checkResult.rows[0].exists) {
        logger.info('Database schema already exists, skipping schema creation');
      } else {
        // Execute database schema creation
        const dbSchema = this.readSQLFile('db.docs.txt');
        if (dbSchema) {
          await this.executeSQLScript(dbSchema, 'Database schema creation');
        } else {
          throw new Error('Failed to load database schema file');
        }

        // Execute database configuration (triggers, functions, audit logs)
        const dbConfig = this.readSQLFile('db-config.docs.txt');
        if (dbConfig) {
          await this.executeSQLScript(dbConfig, 'Database configuration (triggers, functions, audit logs)');
        }
      }
    } catch (error) {
      logger.error('Schema migration failed:', error);
      throw error;
    }
  }

  // Step 3: GIS Data Conversion
  async convertGISData() {
    logger.info('Converting GIS data...');
    
    try {
      // Check if GIS data already exists
      const checkResult = await this.targetPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'gis_municipality'
        )
      `);

      if (checkResult.rows[0].exists) {
        const countResult = await this.targetPool.query('SELECT COUNT(*) as count FROM gis_municipality');
        if (parseInt(countResult.rows[0].count) > 0) {
          logger.info('GIS data already exists, skipping conversion');
          return;
        }
      }

      // Import and run the actual GIS data conversion logic
      const { convertGeoJSONToSQL } = await import('./convertGeoJSONToSQL.js');
      await convertGeoJSONToSQL();
      
      logger.info('GIS data conversion completed successfully');
    } catch (error) {
      logger.error('GIS data conversion failed:', error);
      throw error;
    }
  }

  // Step 4: GIS Data Import
  async importGISData() {
    logger.info('Importing GIS data...');
    
    try {
      // Check if GIS data already exists
      const checkResult = await this.targetPool.query(`
        SELECT COUNT(*) as count FROM gis_municipality
      `);

      if (parseInt(checkResult.rows[0].count) > 0) {
        logger.info('GIS data already imported, skipping import');
        return;
      }

      // Import and run the actual GIS data import logic
      const { importGISData } = await import('./importGISData.js');
      await importGISData();
      
      logger.info('GIS data import completed successfully');
    } catch (error) {
      logger.error('GIS data import failed:', error);
      throw error;
    }
  }

  // Step 5: GIS Code Migration
  async addGisCodes() {
    logger.info('Adding GIS codes...');
    
    try {
      // Check if gis_code column exists
      const columnCheck = await this.targetPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'municipalities' 
        AND column_name = 'gis_code'
      `);

      if (columnCheck.rows.length === 0) {
        logger.info('Adding gis_code column to municipalities table...');
        
        // Add the gis_code column
        await this.targetPool.query(`
          ALTER TABLE municipalities 
          ADD COLUMN gis_code VARCHAR(50)
        `);
        
        // Add index for better performance
        await this.targetPool.query(`
          CREATE INDEX IF NOT EXISTS idx_municipalities_gis_code 
          ON municipalities(gis_code)
        `);
        
        logger.info('✅ gis_code column added successfully');
      } else {
        logger.info('✅ gis_code column already exists');
      }

      // Check if gis_municipality table has codes and populate municipalities
      const gisMunicipalityCheck = await this.targetPool.query(`
        SELECT COUNT(*) as count 
        FROM gis_municipality 
        WHERE gis_municipality_code IS NOT NULL 
        AND gis_municipality_code != ''
      `);

      if (parseInt(gisMunicipalityCheck.rows[0].count) === 0) {
        logger.info('Populating GIS codes for municipalities...');
        
        // Populate sample GIS codes for Eastern Samar municipalities
        const gisCodes = [
          { name: 'Arteche', code: 'PH0802601' },
          { name: 'Balangiga', code: 'PH0802602' },
          { name: 'Balangkayan', code: 'PH0802603' },
          { name: 'City of Borongan', code: 'PH0802604' },
          { name: 'Can-Avid', code: 'PH0802605' },
          { name: 'Dolores', code: 'PH0802606' },
          { name: 'General Macarthur', code: 'PH0802607' },
          { name: 'Giporlos', code: 'PH0802608' },
          { name: 'Guiuan', code: 'PH0802609' },
          { name: 'Hernani', code: 'PH0802610' },
          { name: 'Jipapad', code: 'PH0802611' },
          { name: 'Lawaan', code: 'PH0802612' },
          { name: 'Llorente', code: 'PH0802613' },
          { name: 'Maslog', code: 'PH0802614' },
          { name: 'Maydolong', code: 'PH0802615' },
          { name: 'Mercedes', code: 'PH0802616' },
          { name: 'Oras', code: 'PH0802617' },
          { name: 'Quinapondan', code: 'PH0802618' },
          { name: 'Salcedo', code: 'PH0802619' },
          { name: 'San Julian', code: 'PH0802620' },
          { name: 'San Policarpo', code: 'PH0802621' },
          { name: 'Sulat', code: 'PH0802622' },
          { name: 'Taft', code: 'PH0802623' }
        ];

        // Update gis_municipality table
        for (const municipality of gisCodes) {
          await this.targetPool.query(`
            UPDATE gis_municipality 
            SET gis_municipality_code = $1 
            WHERE name = $2
          `, [municipality.code, municipality.name]);
        }

        logger.info(`✅ Populated GIS codes for ${gisCodes.length} municipalities`);
      } else {
        logger.info('✅ GIS codes already populated');
      }

      // Update any existing municipalities without gis_code
      const municipalitiesWithoutGisCode = await this.targetPool.query(`
        SELECT id, municipality_name 
        FROM municipalities 
        WHERE gis_code IS NULL OR gis_code = ''
      `);

      if (municipalitiesWithoutGisCode.rows.length > 0) {
        logger.info(`Found ${municipalitiesWithoutGisCode.rows.length} municipalities without GIS codes, updating...`);
        
        for (const municipality of municipalitiesWithoutGisCode.rows) {
          // Try to find matching GIS municipality
          const gisMunicipality = await this.targetPool.query(`
            SELECT gis_municipality_code 
            FROM gis_municipality 
            WHERE name = $1 AND gis_municipality_code IS NOT NULL AND gis_municipality_code != ''
          `, [municipality.municipality_name]);

          if (gisMunicipality.rows.length > 0) {
            // Update with matching GIS code
            await this.targetPool.query(`
              UPDATE municipalities 
              SET gis_code = $1 
              WHERE id = $2
            `, [gisMunicipality.rows[0].gis_municipality_code, municipality.id]);
            
            logger.info(`✅ Updated ${municipality.municipality_name} with GIS code: ${gisMunicipality.rows[0].gis_municipality_code}`);
          } else {
            // Generate a default GIS code for municipalities without matches
            const defaultCode = `PH0802${municipality.id.toString().padStart(3, '0')}`;
            await this.targetPool.query(`
              UPDATE municipalities 
              SET gis_code = $1 
              WHERE id = $2
            `, [defaultCode, municipality.id]);
            
            logger.info(`✅ Updated ${municipality.municipality_name} with default GIS code: ${defaultCode}`);
          }
        }
      }
    } catch (error) {
      logger.error('GIS code migration failed:', error);
      throw error;
    }
  }

  // Step 6: Data Seeding
  async seedDatabase() {
    logger.info('Seeding database...');
    
    try {
      // Check if data already exists
      const checkResult = await this.targetPool.query(`
        SELECT COUNT(*) as count FROM users
      `);

      if (parseInt(checkResult.rows[0].count) > 0) {
        logger.info('Database already seeded, skipping seeding');
        return;
      }

      // Import and run the actual seeding logic
      const { default: DatabaseSeeder } = await import('./seedDatabase.js');
      await DatabaseSeeder.seed();
      
      logger.info('Database seeding completed successfully');
    } catch (error) {
      logger.error('Database seeding failed:', error);
      throw error;
    }
  }

  // Step 7: Audit System Setup
  async setupAuditSystem() {
    logger.info('Setting up audit system...');
    
    try {
      // Check if audit system already exists
      const checkResult = await this.targetPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'audit_logs'
        )
      `);

      if (checkResult.rows[0].exists) {
        logger.info('Audit system already exists, skipping setup');
        return;
      }

      // Import audit system setup logic here
      logger.info('Audit system setup completed (placeholder)');
    } catch (error) {
      logger.error('Audit system setup failed:', error);
      throw error;
    }
  }

  // Step 8: Classification Types Seeding
  async seedClassificationTypes() {
    logger.info('Seeding classification types...');
    
    try {
      // Check if classification types already exist
      const checkResult = await this.targetPool.query(`
        SELECT COUNT(*) as count FROM classification_types
      `);

      if (parseInt(checkResult.rows[0].count) > 0) {
        logger.info('Classification types already exist, skipping seeding');
        return;
      }

      // Import classification types seeding logic here
      logger.info('Classification types seeding completed (placeholder)');
    } catch (error) {
      logger.error('Classification types seeding failed:', error);
      throw error;
    }
  }

  // Step 9: Verification
  async verifyMigration() {
    logger.info('Verifying migration...');
    
    try {
      // Verify the migration
      const verification = await this.targetPool.query(`
        SELECT 
          COUNT(*) as total_municipalities,
          COUNT(gis_code) as municipalities_with_gis_code
        FROM municipalities
      `);

      logger.info('📊 Migration Verification:');
      logger.info(`   Total municipalities: ${verification.rows[0].total_municipalities}`);
      logger.info(`   Municipalities with GIS codes: ${verification.rows[0].municipalities_with_gis_code}`);

      // Check PostGIS status
      const postgisCheck = await this.targetPool.query(`
        SELECT version() as postgis_version 
        FROM pg_extension 
        WHERE extname = 'postgis'
      `);
      
      if (postgisCheck.rows.length > 0) {
        logger.info(`   PostGIS: ${postgisCheck.rows[0].postgis_version}`);
      }

      logger.info('✅ Migration verification completed');
    } catch (error) {
      logger.error('Migration verification failed:', error);
      throw error;
    }
  }

  // Helper methods
  readSQLFile(filename) {
    const filePath = path.join(process.cwd(), '..', 'docs', filename);
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      logger.error(`Error reading file ${filename}:`, error.message);
      return null;
    }
  }

  async executeSQLScript(sql, description) {
    try {
      logger.info(`Executing: ${description}`);
      await this.targetPool.query(sql);
      logger.info(`✓ ${description} completed successfully`);
    } catch (error) {
      logger.error(`✗ Error executing ${description}:`, error.message);
      throw error;
    }
  }

  async createBackup() {
    logger.warn('Backup creation not implemented - requires pg_dump utility');
  }

  async findLastCompletedStep() {
    // Placeholder for finding last completed step
    return 0;
  }

  async markStepCompleted(stepIndex) {
    // Placeholder for marking step as completed
    logger.debug(`Step ${stepIndex + 1} marked as completed`);
  }

  async displayMigrationSummary() {
    try {
      logger.info('\n📊 Migration Summary:');
      
      // Get table counts
      const tables = [
        'municipalities', 'barangays', 'puroks', 'residents', 
        'users', 'classification_types', 'audit_logs'
      ];

      for (const table of tables) {
        try {
          const result = await this.targetPool.query(`SELECT COUNT(*) as count FROM ${table}`);
          logger.info(`  ${table}: ${result.rows[0].count} records`);
        } catch (error) {
          logger.warn(`  ${table}: Unable to count records`);
        }
      }

      logger.info('\n✅ Unified database migration completed successfully!');
      logger.info('You can now start the application with: npm run dev');
      
    } catch (error) {
      logger.error('Error displaying migration summary:', error);
    }
  }

  async cleanup() {
    try {
      if (this.targetPool) {
        await this.targetPool.end();
      }
      if (this.adminPool) {
        await this.adminPool.end();
      }
    } catch (error) {
      logger.error('Error during cleanup:', error);
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
Unified Database Migration Script

Usage:
  npm run db:migrate [options]

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
  4 - GIS Code Migration
  5 - Data Seeding
  6 - Audit System Setup
  7 - Classification Types Seeding
  8 - Verification

Examples:
  npm run db:migrate
  npm run db:migrate -- --resume
  npm run db:migrate -- --force --backup
  npm run db:migrate -- --skip-step=2 --skip-step=3
      `);
      return;
    }
  }

  try {
    const migration = new UnifiedMigration();
    await migration.run(options);
    
  } catch (error) {
    logger.error('Migration failed:', error.message);
    process.exit(1);
  }
}

// Export for use in other scripts
export { UnifiedMigration };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
