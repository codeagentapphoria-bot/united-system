import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { loadEnvConfig } from '../utils/envLoader.js';

// Load environment variables
loadEnvConfig();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to the GeoJSON files
const barangayGeoJSONPath = path.join(__dirname, '../../../geodata/Eastern Samar Barangay.geojson');
const municipalityGeoJSONPath = path.join(__dirname, '../../../geodata/Eastern Samar Municipality.geojson');

export async function convertGeoJSONToSQL() {
  try {
    logger.info('Starting GeoJSON to SQL conversion process...');
    
    // Check if GeoJSON files exist
    if (!fs.existsSync(barangayGeoJSONPath)) {
      throw new Error(`Barangay GeoJSON file not found at: ${barangayGeoJSONPath}`);
    }

    if (!fs.existsSync(municipalityGeoJSONPath)) {
      throw new Error(`Municipality GeoJSON file not found at: ${municipalityGeoJSONPath}`);
    }

    logger.info('GeoJSON files found, proceeding with conversion...');
    
    // Ensure the data directory exists
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.info(`Created data directory: ${dataDir}`);
    }

    // Convert municipality GeoJSON
    logger.info('Converting municipality GeoJSON...');
    await convertMunicipalityGeoJSON(dataDir);
    
    // Convert barangay GeoJSON
    logger.info('Converting barangay GeoJSON...');
    await convertBarangayGeoJSON(dataDir);
    
    // Create combined SQL file
    logger.info('Creating combined SQL file...');
    await createCombinedSQLFile(dataDir);
    
    logger.info('All GeoJSON files successfully converted to SQL');
    
  } catch (error) {
    logger.error('Error converting GeoJSON files:', error);
    throw error;
  }
}

async function convertMunicipalityGeoJSON(dataDir) {
  try {
    const geoJSONData = JSON.parse(fs.readFileSync(municipalityGeoJSONPath, 'utf8'));
    const municipalities = geoJSONData.features || [];
    
    logger.info(`Found ${municipalities.length} municipalities in GeoJSON`);
    
    // Inspect the first feature to see available properties
    if (municipalities.length > 0) {
      const firstFeature = municipalities[0];
      logger.info('Available properties in municipality GeoJSON:');
      logger.info(Object.keys(firstFeature.properties || {}));
    }
    
    // Create SQL file for municipality table structure and data
    const municipalitySQLPath = path.join(dataDir, 'gis_municipality.sql');
    
    let sqlContent = `-- GIS Municipality data converted from GeoJSON
-- Table structure for gis_municipality
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop table if exists and recreate
DROP TABLE IF EXISTS gis_municipality CASCADE;

CREATE TABLE gis_municipality (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    gis_municipality_code VARCHAR(20),
    geom GEOMETRY(GEOMETRY, 4326),
    shape_sqkm NUMERIC(23, 15)
);

-- Insert municipality data
`;

    municipalities.forEach((feature, index) => {
      const properties = feature.properties || {};
      const geometry = feature.geometry;
      
      // Extract actual codes from GeoJSON properties
      const name = properties.name || properties.NAME || properties.adm3_en || `Municipality_${index + 1}`;
      const code = properties.adm3_pcode || properties.ADM3_PCODE || properties.PCODE || `MUN_${index + 1}`;
      
      // Log the first few records to verify data extraction
      if (index < 3) {
        logger.info(`Municipality ${index + 1}: Name="${name}", Code="${code}"`);
      }
      
      sqlContent += `INSERT INTO gis_municipality (name, gis_municipality_code, geom) VALUES ('${escapeSQLString(name)}', '${escapeSQLString(code)}', ST_GeomFromGeoJSON('${JSON.stringify(geometry)}'));\n`;
    });

    // Add shape_sqkm calculation
    sqlContent += `
-- Update shape_sqkm values based on geometry area (in square kilometers)
UPDATE gis_municipality 
SET shape_sqkm = ST_Area(ST_Transform(geom, 3857)) / 1000000 
WHERE shape_sqkm IS NULL;

-- Create spatial index
CREATE INDEX IF NOT EXISTS idx_gis_municipality_geom ON gis_municipality USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_gis_municipality_code ON gis_municipality(gis_municipality_code);
`;

    fs.writeFileSync(municipalitySQLPath, sqlContent);
    logger.info(`Municipality SQL file created at: ${municipalitySQLPath} with ${municipalities.length} records`);
    
  } catch (error) {
    logger.error('Error converting municipality GeoJSON:', error);
    throw error;
  }
}

async function convertBarangayGeoJSON(dataDir) {
  try {
    const geoJSONData = JSON.parse(fs.readFileSync(barangayGeoJSONPath, 'utf8'));
    const barangays = geoJSONData.features || [];
    
    logger.info(`Found ${barangays.length} barangays in GeoJSON`);
    
    // Inspect the first feature to see available properties
    if (barangays.length > 0) {
      const firstFeature = barangays[0];
      logger.info('Available properties in barangay GeoJSON:');
      logger.info(Object.keys(firstFeature.properties || {}));
    }
    
    // Create SQL file for barangay table structure and data
    const barangaySQLPath = path.join(dataDir, 'gis_barangay.sql');
    
    let sqlContent = `-- GIS Barangay data converted from GeoJSON
-- Table structure for gis_barangay
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop table if exists and recreate
DROP TABLE IF EXISTS gis_barangay CASCADE;

CREATE TABLE gis_barangay (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    gis_barangay_code VARCHAR(20),
    gis_municipality_code VARCHAR(20),
    geom GEOMETRY(GEOMETRY, 4326),
    shape_sqkm NUMERIC(23, 15)
);

-- Insert barangay data
`;

    barangays.forEach((feature, index) => {
      const properties = feature.properties || {};
      const geometry = feature.geometry;
      
      // Extract actual codes from GeoJSON properties
      const name = properties.name || properties.NAME || properties.adm4_en || `Barangay_${index + 1}`;
      const barangayCode = properties.adm4_pcode || properties.ADM4_PCODE || properties.PCODE || `BRG_${index + 1}`;
      const municipalityCode = properties.adm3_pcode || properties.ADM3_PCODE || properties.municipality_code || `MUN_${index + 1}`;
      
      // Log the first few records to verify data extraction
      if (index < 3) {
        logger.info(`Barangay ${index + 1}: Name="${name}", BarangayCode="${barangayCode}", MunicipalityCode="${municipalityCode}"`);
      }
      
      sqlContent += `INSERT INTO gis_barangay (name, gis_barangay_code, gis_municipality_code, geom) VALUES ('${escapeSQLString(name)}', '${escapeSQLString(barangayCode)}', '${escapeSQLString(municipalityCode)}', ST_GeomFromGeoJSON('${JSON.stringify(geometry)}'));\n`;
    });

    // Add shape_sqkm calculation
    sqlContent += `
-- Update shape_sqkm values based on geometry area (in square kilometers)
UPDATE gis_barangay 
SET shape_sqkm = ST_Area(ST_Transform(geom, 3857)) / 1000000 
WHERE shape_sqkm IS NULL;

-- Create spatial indexes
CREATE INDEX IF NOT EXISTS idx_gis_barangay_geom ON gis_barangay USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_gis_barangay_code ON gis_barangay(gis_barangay_code);
CREATE INDEX IF NOT EXISTS idx_gis_barangay_municipality ON gis_barangay(gis_municipality_code);
`;

    fs.writeFileSync(barangaySQLPath, sqlContent);
    logger.info(`Barangay SQL file created at: ${barangaySQLPath} with ${barangays.length} records`);
    
  } catch (error) {
    logger.error('Error converting barangay GeoJSON:', error);
    throw error;
  }
}

async function createCombinedSQLFile(dataDir) {
  try {
    const combinedSQLPath = path.join(dataDir, 'gis_tables.sql');
    
    const combinedSQL = `-- GIS Tables Structure and Data
-- This file contains the structure and data for both gis_municipality and gis_barangay tables

CREATE EXTENSION IF NOT EXISTS postgis;

-- Municipality GIS table
DROP TABLE IF EXISTS gis_municipality CASCADE;
CREATE TABLE gis_municipality (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    gis_municipality_code VARCHAR(20),
    geom GEOMETRY(GEOMETRY, 4326),
    shape_sqkm NUMERIC(23, 15)
);

-- Barangay GIS table
DROP TABLE IF EXISTS gis_barangay CASCADE;
CREATE TABLE gis_barangay (
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

-- Note: Data will be imported from the separate gis_municipality.sql and gis_barangay.sql files
-- Run those files first to populate the data, then run this file to create the structure and indexes
`;

    fs.writeFileSync(combinedSQLPath, combinedSQL);
    logger.info(`Combined GIS SQL file created at: ${combinedSQLPath}`);
    
  } catch (error) {
    logger.error('Error creating combined SQL file:', error);
    throw error;
  }
}

function geometryToWKT(geometry) {
  // Convert GeoJSON geometry to WKT format
  if (!geometry || !geometry.coordinates) {
    return 'GEOMETRYCOLLECTION EMPTY';
  }

  const type = geometry.type.toUpperCase();
  const coords = geometry.coordinates;

  switch (type) {
    case 'POINT':
      return `POINT(${coords[0]} ${coords[1]})`;
    case 'LINESTRING':
      return `LINESTRING(${coords.map(c => `${c[0]} ${c[1]}`).join(', ')})`;
    case 'POLYGON':
      return `POLYGON((${coords[0].map(c => `${c[0]} ${c[1]}`).join(', ')}))`;
    case 'MULTIPOINT':
      return `MULTIPOINT(${coords.map(c => `${c[0]} ${c[1]}`).join(', ')})`;
    case 'MULTILINESTRING':
      return `MULTILINESTRING(${coords.map(line => `(${line.map(c => `${c[0]} ${c[1]}`).join(', ')})`).join(', ')})`;
    case 'MULTIPOLYGON':
      return `MULTIPOLYGON(${coords.map(poly => `((${poly[0].map(c => `${c[0]} ${c[1]}`).join(', ')}))`).join(', ')})`;
    default:
      return 'GEOMETRYCOLLECTION EMPTY';
  }
}

function escapeSQLString(str) {
  if (!str) return '';
  return str.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

// Run the conversion if this script is executed directly
const decodedUrl = decodeURIComponent(import.meta.url);
const normalizedArgv = process.argv[1].replace(/\\/g, '/');
const normalizedUrl = decodedUrl.replace(/\\/g, '/');

if (decodedUrl === `file://${process.argv[1]}` || normalizedUrl.includes(normalizedArgv)) {
  console.log("Starting GeoJSON to SQL conversion...");
  convertGeoJSONToSQL()
    .then(() => {
      console.log("GeoJSON to SQL conversion completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("GeoJSON to SQL conversion failed:", error);
      process.exit(1);
    });
}
