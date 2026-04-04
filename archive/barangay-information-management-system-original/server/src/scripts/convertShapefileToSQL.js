import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import logger from '../utils/logger.js';
import { loadEnvConfig } from '../utils/envLoader.js';

// Load environment variables
loadEnvConfig();

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to the new geodata files
const barangayShapefilePath = path.join(__dirname, '../../../geodata/Eastern Samar Barangay.shp');
const municipalityShapefilePath = path.join(__dirname, '../../../geodata/Eastern Samar Municipality.shp');

export async function convertShapefileToSQL() {
  try {
    logger.info('Starting shapefile conversion process...');
    
    // Check if shapefiles exist
    if (!fs.existsSync(barangayShapefilePath)) {
      throw new Error(`Barangay shapefile not found at: ${barangayShapefilePath}`);
    }

    if (!fs.existsSync(municipalityShapefilePath)) {
      throw new Error(`Municipality shapefile not found at: ${municipalityShapefilePath}`);
    }

    logger.info('Shapefiles found, proceeding with conversion...');
    
    // Get database connection parameters from environment
    const dbHost = process.env.PG_HOST || 'localhost';
    const dbPort = process.env.PG_PORT || '5432';
    const dbName = process.env.PG_DATABASE || 'bims';
    const dbUser = process.env.PG_USER || 'postgres';
    const dbPassword = process.env.PG_PASSWORD || '1234';
    
    logger.info(`Using database: ${dbHost}:${dbPort}/${dbName} as ${dbUser}`);
    
    // Convert municipality shapefile first
    logger.info('Converting municipality shapefile...');
    const municipalityCommand = `ogr2ogr -progress --config PG_USE_COPY YES --config SHAPE_RESTORE_SHX YES -f PostgreSQL "PG:host=${dbHost} port=${dbPort} dbname=${dbName} password=${dbPassword} active_schema=public user=${dbUser}" -lco DIM=2 -nln public.gis_municipality -nlt PROMOTE_TO_MULTI -lco GEOMETRY_NAME=geom -append "${municipalityShapefilePath}"`;
    
    logger.info('Executing municipality conversion command...');
    const { stdout: municipalityStdout, stderr: municipalityStderr } = await execAsync(municipalityCommand);
    
    if (municipalityStderr) {
      logger.warn('Municipality ogr2ogr stderr:', municipalityStderr);
    }
    
    if (municipalityStdout) {
      logger.info('Municipality ogr2ogr stdout:', municipalityStdout);
    }
    
    logger.info('Municipality shapefile successfully imported');
    
    // Convert barangay shapefile
    logger.info('Converting barangay shapefile...');
    const barangayCommand = `ogr2ogr -progress --config PG_USE_COPY YES --config SHAPE_RESTORE_SHX YES -f PostgreSQL "PG:host=${dbHost} port=${dbPort} dbname=${dbName} password=${dbPassword} active_schema=public user=${dbUser}" -lco DIM=2 -nln public.gis_barangay -nlt PROMOTE_TO_MULTI -lco GEOMETRY_NAME=geom -append "${barangayShapefilePath}"`;
    
    logger.info('Executing barangay conversion command...');
    const { stdout: barangayStdout, stderr: barangayStderr } = await execAsync(barangayCommand);
    
    if (barangayStderr) {
      logger.warn('Barangay ogr2ogr stderr:', barangayStderr);
    }
    
    if (barangayStdout) {
      logger.info('Barangay ogr2ogr stdout:', barangayStdout);
    }
    
    logger.info('Barangay shapefile successfully imported');
    
    // Create SQL files for both tables
    await createGISSQLFiles();
    
    logger.info('All shapefiles successfully converted and imported to PostgreSQL');
    
  } catch (error) {
    logger.error('Error converting shapefiles:', error);
    throw error;
  }
}

async function createGISSQLFiles() {
  try {
    // Ensure the data directory exists
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.info(`Created data directory: ${dataDir}`);
    }

    // Create SQL file for municipality table structure
    const municipalitySQLPath = path.join(dataDir, 'gis_municipality.sql');
    const municipalitySQL = `-- GIS Municipality data imported via ogr2ogr
-- Table structure for gis_municipality
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS gis_municipality (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    gis_municipality_code VARCHAR(20),
    geom GEOMETRY(GEOMETRY, 4326),
    shape_sqkm NUMERIC(23, 15)
);

-- Data was imported directly using ogr2ogr command:
-- ogr2ogr -progress --config PG_USE_COPY YES -f PostgreSQL "PG:host=localhost port=5432 dbname=bims password=1234 active_schema=public user=postgres" -lco DIM=2 -nln public.gis_municipality -nlt PROMOTE_TO_MULTI -lco GEOMETRY_NAME=geom -append "geodata/Eastern Samar Municipality.shp"

-- Add shape_sqkm column if it doesn't exist (for existing installations)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gis_municipality' 
        AND column_name = 'shape_sqkm'
    ) THEN
        ALTER TABLE gis_municipality ADD COLUMN shape_sqkm NUMERIC(23, 15);
    END IF;
END $$;

-- Update shape_sqkm values based on geometry area (in square kilometers)
UPDATE gis_municipality 
SET shape_sqkm = ST_Area(ST_Transform(geom, 3857)) / 1000000 
WHERE shape_sqkm IS NULL;
`;

    fs.writeFileSync(municipalitySQLPath, municipalitySQL);
    logger.info(`Municipality SQL file created at: ${municipalitySQLPath}`);

    // Create SQL file for barangay table structure
    const barangaySQLPath = path.join(dataDir, 'gis_barangay.sql');
    const barangaySQL = `-- GIS Barangay data imported via ogr2ogr
-- Table structure for gis_barangay
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS gis_barangay (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    gis_barangay_code VARCHAR(20),
    gis_municipality_code VARCHAR(20),
    geom GEOMETRY(GEOMETRY, 4326),
    shape_sqkm NUMERIC(23, 15)
);

-- Data was imported directly using ogr2ogr command:
-- ogr2ogr -progress --config PG_USE_COPY YES -f PostgreSQL "PG:host=localhost port=5432 dbname=bims password=1234 active_schema=public user=postgres" -lco DIM=2 -nln public.gis_barangay -nlt PROMOTE_TO_MULTI -lco GEOMETRY_NAME=geom -append "geodata/Eastern Samar Barangay.shp"

-- Add shape_sqkm column if it doesn't exist (for existing installations)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gis_barangay' 
        AND column_name = 'shape_sqkm'
    ) THEN
        ALTER TABLE gis_barangay ADD COLUMN shape_sqkm NUMERIC(23, 15);
    END IF;
END $$;

-- Update shape_sqkm values based on geometry area (in square kilometers)
UPDATE gis_barangay 
SET shape_sqkm = ST_Area(ST_Transform(geom, 3857)) / 1000000 
WHERE shape_sqkm IS NULL;
`;

    fs.writeFileSync(barangaySQLPath, barangaySQL);
    logger.info(`Barangay SQL file created at: ${barangaySQLPath}`);

    // Create a combined SQL file for both tables
    const combinedSQLPath = path.join(dataDir, 'gis_tables.sql');
    const combinedSQL = `-- GIS Tables Structure
-- This file contains the structure for both gis_municipality and gis_barangay tables

CREATE EXTENSION IF NOT EXISTS postgis;

-- Municipality GIS table
CREATE TABLE IF NOT EXISTS gis_municipality (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    gis_municipality_code VARCHAR(20),
    geom GEOMETRY(GEOMETRY, 4326),
    shape_sqkm NUMERIC(23, 15)
);

-- Barangay GIS table
CREATE TABLE IF NOT EXISTS gis_barangay (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    gis_barangay_code VARCHAR(20),
    gis_municipality_code VARCHAR(20),
    geom GEOMETRY(GEOMETRY, 4326),
    shape_sqkm NUMERIC(23, 15)
);

-- Spatial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gis_municipality_geom ON gis_municipality USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_gis_municipality_code ON gis_municipality(gis_municipality_code);
CREATE INDEX IF NOT EXISTS idx_gis_barangay_geom ON gis_barangay USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_gis_barangay_code ON gis_barangay(gis_barangay_code);
CREATE INDEX IF NOT EXISTS idx_gis_barangay_municipality ON gis_barangay(gis_municipality_code);
`;

    fs.writeFileSync(combinedSQLPath, combinedSQL);
    logger.info(`Combined GIS SQL file created at: ${combinedSQLPath}`);

  } catch (error) {
    logger.error('Error creating SQL files:', error);
    throw error;
  }
}

// Run the conversion if this script is executed directly
const decodedUrl = decodeURIComponent(import.meta.url);
const normalizedArgv = process.argv[1].replace(/\\/g, '/');
const normalizedUrl = decodedUrl.replace(/\\/g, '/');

if (decodedUrl === `file://${process.argv[1]}` || normalizedUrl.includes(normalizedArgv)) {
  console.log("Starting shapefile conversion...");
  convertShapefileToSQL()
    .then(() => {
      console.log("Shapefile conversion completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Shapefile conversion failed:", error);
      process.exit(1);
    });
} 