import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';
import logger from '../utils/logger.js';
import { loadEnvConfig } from '../utils/envLoader.js';

// Load environment variables
loadEnvConfig();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to the SQL files
const municipalitySQLPath = path.join(__dirname, '../data/gis_municipality.sql');
const barangaySQLPath = path.join(__dirname, '../data/gis_barangay.sql');
const combinedSQLPath = path.join(__dirname, '../data/gis_tables.sql');

export async function importGISData() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting GIS data import process...');
    
    // Check if SQL files exist
    if (!fs.existsSync(municipalitySQLPath)) {
      throw new Error(`Municipality SQL file not found at: ${municipalitySQLPath}`);
    }
    
    if (!fs.existsSync(barangaySQLPath)) {
      throw new Error(`Barangay SQL file not found at: ${barangaySQLPath}`);
    }
    
    logger.info('SQL files found, proceeding with import...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    try {
      // Import municipality data
      logger.info('Importing municipality GIS data...');
      const municipalitySQL = fs.readFileSync(municipalitySQLPath, 'utf8');
      await client.query(municipalitySQL);
      logger.info('Municipality GIS data imported successfully');
      
      // Import barangay data
      logger.info('Importing barangay GIS data...');
      const barangaySQL = fs.readFileSync(barangaySQLPath, 'utf8');
      await client.query(barangaySQL);
      logger.info('Barangay GIS data imported successfully');
      
      // Commit transaction
      await client.query('COMMIT');
      logger.info('All GIS data imported successfully');
      
      // Verify the import
      await verifyImport(client);
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error during import, transaction rolled back:', error);
      throw error;
    }
    
  } catch (error) {
    logger.error('Error importing GIS data:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function verifyImport(client) {
  try {
    logger.info('Verifying imported data...');
    
    // Check municipality count
    const municipalityResult = await client.query('SELECT COUNT(*) as count FROM gis_municipality');
    const municipalityCount = parseInt(municipalityResult.rows[0].count);
    logger.info(`Municipality records: ${municipalityCount}`);
    
    // Check barangay count
    const barangayResult = await client.query('SELECT COUNT(*) as count FROM gis_barangay');
    const barangayCount = parseInt(barangayResult.rows[0].count);
    logger.info(`Barangay records: ${barangayCount}`);
    
    // Check if spatial indexes exist
    const indexResult = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND (tablename = 'gis_municipality' OR tablename = 'gis_barangay')
      AND indexdef LIKE '%GIST%'
    `);
    
    logger.info(`Spatial indexes found: ${indexResult.rows.length}`);
    
    // Sample data verification
    const sampleMunicipality = await client.query('SELECT name, gis_municipality_code FROM gis_municipality LIMIT 1');
    if (sampleMunicipality.rows.length > 0) {
      logger.info(`Sample municipality: ${sampleMunicipality.rows[0].name} (${sampleMunicipality.rows[0].gis_municipality_code})`);
    }
    
    const sampleBarangay = await client.query('SELECT name, gis_barangay_code FROM gis_barangay LIMIT 1');
    if (sampleBarangay.rows.length > 0) {
      logger.info(`Sample barangay: ${sampleBarangay.rows[0].name} (${sampleBarangay.rows[0].gis_barangay_code})`);
    }
    
    logger.info('Data verification completed successfully');
    
  } catch (error) {
    logger.error('Error during data verification:', error);
    throw error;
  }
}

// Run the import if this script is executed directly
const decodedUrl = decodeURIComponent(import.meta.url);
const normalizedArgv = process.argv[1].replace(/\\/g, '/');
const normalizedUrl = decodedUrl.replace(/\\/g, '/');

if (decodedUrl === `file://${process.argv[1]}` || normalizedUrl.includes(normalizedArgv)) {
  console.log("Starting GIS data import...");
  importGISData()
    .then(() => {
      console.log("GIS data import completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("GIS data import failed:", error);
      process.exit(1);
    });
}
