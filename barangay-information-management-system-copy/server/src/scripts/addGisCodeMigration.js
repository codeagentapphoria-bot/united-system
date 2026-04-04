import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import { loadEnvConfig } from '../utils/envLoader.js';
import logger from '../utils/logger.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
loadEnvConfig();

class GisCodeMigration {
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

  async run() {
    const pool = new Pool({
      ...this.config,
      database: this.databaseName,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 1
    });

    try {
      logger.info('🚀 Starting GIS Code Migration...');
      
      // Check if gis_code column exists
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'municipalities' 
        AND column_name = 'gis_code'
      `);

      if (columnCheck.rows.length === 0) {
        logger.info('Adding gis_code column to municipalities table...');
        
        // Add the gis_code column
        await pool.query(`
          ALTER TABLE municipalities 
          ADD COLUMN gis_code VARCHAR(50)
        `);
        
        // Add index for better performance
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_municipalities_gis_code 
          ON municipalities(gis_code)
        `);
        
        logger.info('✅ gis_code column added successfully');
      } else {
        logger.info('✅ gis_code column already exists');
      }

      // Check if gis_municipality table has codes and populate municipalities
      const gisMunicipalityCheck = await pool.query(`
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
          await pool.query(`
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
      const municipalitiesWithoutGisCode = await pool.query(`
        SELECT id, municipality_name 
        FROM municipalities 
        WHERE gis_code IS NULL OR gis_code = ''
      `);

      if (municipalitiesWithoutGisCode.rows.length > 0) {
        logger.info(`Found ${municipalitiesWithoutGisCode.rows.length} municipalities without GIS codes, updating...`);
        
        for (const municipality of municipalitiesWithoutGisCode.rows) {
          // Try to find matching GIS municipality
          const gisMunicipality = await pool.query(`
            SELECT gis_municipality_code 
            FROM gis_municipality 
            WHERE name = $1 AND gis_municipality_code IS NOT NULL AND gis_municipality_code != ''
          `, [municipality.municipality_name]);

          if (gisMunicipality.rows.length > 0) {
            // Update with matching GIS code
            await pool.query(`
              UPDATE municipalities 
              SET gis_code = $1 
              WHERE id = $2
            `, [gisMunicipality.rows[0].gis_municipality_code, municipality.id]);
            
            logger.info(`✅ Updated ${municipality.municipality_name} with GIS code: ${gisMunicipality.rows[0].gis_municipality_code}`);
          } else {
            // Generate a default GIS code for municipalities without matches
            const defaultCode = `PH0802${municipality.id.toString().padStart(3, '0')}`;
            await pool.query(`
              UPDATE municipalities 
              SET gis_code = $1 
              WHERE id = $2
            `, [defaultCode, municipality.id]);
            
            logger.info(`✅ Updated ${municipality.municipality_name} with default GIS code: ${defaultCode}`);
          }
        }
      }

      // Verify the migration
      const verification = await pool.query(`
        SELECT 
          COUNT(*) as total_municipalities,
          COUNT(gis_code) as municipalities_with_gis_code
        FROM municipalities
      `);

      logger.info('📊 Migration Verification:');
      logger.info(`   Total municipalities: ${verification.rows[0].total_municipalities}`);
      logger.info(`   Municipalities with GIS codes: ${verification.rows[0].municipalities_with_gis_code}`);

      logger.info('🎉 GIS Code Migration completed successfully!');

    } catch (error) {
      logger.error('❌ GIS Code Migration failed:', error);
      throw error;
    } finally {
      await pool.end();
    }
  }
}

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new GisCodeMigration();
  migration.run()
    .then(() => {
      logger.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

export default GisCodeMigration;
