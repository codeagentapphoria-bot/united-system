// =============================================================================
// DEPRECATED — Contains puroks DDL and households.purok_id FK which do not
// exist in the v2 schema. Use united-database/seed.sql instead.
// Running this against a v2 database WILL FAIL.
// =============================================================================
import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import { INSERT_USER } from "../queries/user.queries.js";
import { INSERT_MUNICIPALITY } from "../queries/municipality.queries.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadEnvConfig } from "../utils/envLoader.js";

// Load environment variables
loadEnvConfig();

const SALT_ROUNDS = 12;
const SETUP_LOCK_ID = process.env.SETUP_LOCK_ID || 12345;

class DatabaseSeeder {
  static isInitializing = false;
  static initializationPromise = null;

  static async seed() {
    if (this.isInitializing) {
      logger.info("Seeding is already in progress, waiting...");
      return this.initializationPromise;
    }

    this.isInitializing = true;
    this.initializationPromise = this._doSeed();

    try {
      const result = await this.initializationPromise;
      return result;
    } finally {
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  static async _doSeed() {
    // Validate environment variables
    const requiredEnvVars = [
      "DEFAULT_MUNICIPALITY_NAME",
      "DEFAULT_REGION",
      "DEFAULT_PROVINCE",
      "DEFAULT_DESCRIPTION",
      "DEFAULT_ADMIN_EMAIL",
      "DEFAULT_ADMIN_PASSWORD",
      "DEFAULT_ADMIN_NAME",
    ];
    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    );
    if (missingEnvVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingEnvVars.join(", ")}`
      );
    }

    // Validate queries
    if (!INSERT_MUNICIPALITY || !INSERT_USER) {
      throw new Error(
        "Query constants INSERT_MUNICIPALITY or INSERT_USER are undefined"
      );
    }

    // Extract environment config
    const municipalityName = process.env.DEFAULT_MUNICIPALITY_NAME;
    const region = process.env.DEFAULT_REGION;
    const province = process.env.DEFAULT_PROVINCE;
    const description = process.env.DEFAULT_DESCRIPTION;

    const email = process.env.DEFAULT_ADMIN_EMAIL;
    const password = process.env.DEFAULT_ADMIN_PASSWORD;
    const fullname = process.env.DEFAULT_ADMIN_NAME;
    const role = "admin";
    const picturePath = null;

    const client = await pool.connect();
    let locked = false;

    try {
      await client.query("SELECT pg_advisory_lock($1)", [SETUP_LOCK_ID]);
      locked = true;

      logger.info("Starting comprehensive database seeding...");

      // Step 1: Create database schema and structure
      await this._createDatabaseSchema(client);

      // Step 2: Create indexes for performance
      await this._createDatabaseIndexes(client);

      // Step 3: Create triggers and functions
      await this._createTriggersAndFunctions(client);

      // Step 4: Insert initial municipality
      const municipalityId = await this._insertMunicipality(client, {
        municipalityName,
        region,
        province,
        description
      });

      // Step 5: Insert initial admin user
      await this._insertAdminUser(client, {
        municipalityId,
        email,
        password,
        fullname,
        role,
        picturePath
      });

      // Step 6: Initialize resident counters
      await this._initializeResidentCounters(client);

      // Step 7: Import GIS data
      await this._importGISData(client);

      logger.info("Database seeding completed successfully.");
    } catch (error) {
      logger.error(
        "Error during seeding:",
        error.stack || error.message
      );
      throw error;
    } finally {
      if (locked) {
        try {
          await client.query("SELECT pg_advisory_unlock($1)", [SETUP_LOCK_ID]);
        } catch (unlockError) {
          logger.warn("Failed to release advisory lock:", unlockError.message);
        }
      }
      client.release();
    }
  }

  static async _createDatabaseSchema(client) {
    logger.info("Creating database schema...");

    // Enable PostGIS extension
    await client.query("CREATE EXTENSION IF NOT EXISTS postgis");

    // Create all tables with proper structure
    const createTablesSQL = `
      -- Users table (unified DB table name: bims_users)
      CREATE TABLE IF NOT EXISTS bims_users (
          id SERIAL PRIMARY KEY,
          target_type VARCHAR(15) NOT NULL CHECK(target_type IN ('municipality', 'barangay')),
          target_id VARCHAR(20) NOT NULL,
          full_name VARCHAR(100) NOT NULL,
          email VARCHAR(100) NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff')),
          picture_path TEXT,
          last_login TIMESTAMP NULL,
          failed_login_attempts INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          reset_token TEXT,
          reset_token_expiry TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Municipalities table
      CREATE TABLE IF NOT EXISTS municipalities (
          id SERIAL PRIMARY KEY,
          municipality_name VARCHAR(50) NOT NULL UNIQUE,
          municipality_code VARCHAR(8) NOT NULL,
          region VARCHAR(20) NOT NULL,
          province VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          municipality_logo_path TEXT,
          id_background_front_path TEXT,
          id_background_back_path TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Barangays table
      CREATE TABLE IF NOT EXISTS barangays (
          id SERIAL PRIMARY KEY,
          municipality_id INTEGER NOT NULL,
          barangay_name VARCHAR(50) NOT NULL UNIQUE,
          barangay_code VARCHAR(20) NOT NULL,
          barangay_logo_path TEXT,
          certificate_background_path TEXT,
          organizational_chart_path TEXT,
          contact_number VARCHAR(15),
          email VARCHAR(50),
          gis_code VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE CASCADE
      );

      -- Puroks table
      CREATE TABLE IF NOT EXISTS puroks (
          id SERIAL PRIMARY KEY,
          barangay_id INTEGER NOT NULL,
          purok_name VARCHAR(50) NOT NULL,
          purok_leader VARCHAR(50), 
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE
      );

      -- Residents table
      CREATE TABLE IF NOT EXISTS residents (
          id VARCHAR(20) PRIMARY KEY,
          barangay_id INTEGER NOT NULL,
          last_name VARCHAR(50) NOT NULL,
          first_name VARCHAR(50) NOT NULL,
          middle_name VARCHAR(50),
          extension_name VARCHAR(10),
          sex VARCHAR(10) NOT NULL CHECK (sex IN('male', 'female')),
          civil_status VARCHAR(25) NOT NULL CHECK (civil_status IN ('single', 'married', 'widowed', 'separated', 'divorced')),
          birthdate DATE NOT NULL,
          birthplace TEXT NULL,
          contact_number VARCHAR(15) NULL,
          email VARCHAR(100) NULL,
          occupation TEXT NULL,
          monthly_income DECIMAL(10,2) NULL,
          employment_status VARCHAR(20) CHECK (employment_status IN ('employed', 'unemployed', 'self-employed', 'student', 'retired')),
          education_attainment VARCHAR(30) NULL,
          resident_status VARCHAR(15) DEFAULT 'active' CHECK (resident_status IN ('active', 'deceased', 'moved_out', 'temporarily_away')),
          picture_path TEXT NULL,
          indigenous_person BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE
      );

      -- Resident classifications table
      CREATE TABLE IF NOT EXISTS resident_classifications(
          id SERIAL PRIMARY KEY,
          resident_id VARCHAR(20),
          classification_type VARCHAR(50) NOT NULL,
          classification_details JSONB DEFAULT '[]'::JSONB,
          FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE
      );

      -- Classification types table (for dynamic classification management)
      CREATE TABLE IF NOT EXISTS classification_types(
          id SERIAL PRIMARY KEY,
          municipality_id INTEGER NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          color VARCHAR(7) DEFAULT '#4CAF50',
          details JSONB DEFAULT '[]'::JSONB,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE CASCADE,
          UNIQUE(municipality_id, name)
      );

      -- Resident counters table
      CREATE TABLE IF NOT EXISTS resident_counters (
          year INT PRIMARY KEY,
          counter INT NOT NULL DEFAULT 0,
          prefix CHAR(4) NOT NULL
      );

      -- Officials table
      CREATE TABLE IF NOT EXISTS officials (
          id SERIAL PRIMARY KEY,
          barangay_id INTEGER NOT NULL,
          resident_id VARCHAR(20) NOT NULL,
          position VARCHAR(100) NOT NULL,
          committee VARCHAR(50),
          term_start DATE NOT NULL,
          term_end DATE,
          responsibilities TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
          FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE
      );

      -- Households table
      CREATE TABLE IF NOT EXISTS households (
          id SERIAL PRIMARY KEY,
          house_number VARCHAR(10),
          street VARCHAR(50),
          purok_id INTEGER NOT NULL,
          barangay_id INTEGER NOT NULL,
          house_head VARCHAR(20) NOT NULL,
          housing_type VARCHAR(30),
          structure_type VARCHAR(30),
          electricity BOOLEAN DEFAULT FALSE,
          water_source VARCHAR(30),
          toilet_facility VARCHAR(30),
          geom GEOMETRY(GEOMETRY, 4326),
          area NUMERIC(10,2),
          household_image_path TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (purok_id) REFERENCES puroks(id) ON DELETE CASCADE,
          FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE,
          FOREIGN KEY (house_head) REFERENCES residents(id) ON DELETE CASCADE
      );

      -- Families table
      CREATE TABLE IF NOT EXISTS families (
          id SERIAL PRIMARY KEY,
          household_id INTEGER NOT NULL,
          family_group VARCHAR(20) NOT NULL,
          family_head VARCHAR(20) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (family_head) REFERENCES residents(id) ON DELETE CASCADE,
          FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
      );

      -- Family members table
      CREATE TABLE IF NOT EXISTS family_members (
          id SERIAL PRIMARY KEY,
          family_id INTEGER NOT NULL,
          family_member VARCHAR(20) NOT NULL,
          relationship_to_head VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (family_member) REFERENCES residents(id) ON DELETE CASCADE,
          FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
      );

      -- Archives table
      CREATE TABLE IF NOT EXISTS archives (
          id SERIAL PRIMARY KEY,
          barangay_id INTEGER NOT NULL,
          title VARCHAR(255) NOT NULL,
          document_type VARCHAR(50),
          description TEXT NOT NULL,
          author VARCHAR(50),
          signatory VARCHAR(50),
          relate_resident VARCHAR(20),
          file_path TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE
      );

      -- Inventories table
      CREATE TABLE IF NOT EXISTS inventories (
          id SERIAL PRIMARY KEY,
          barangay_id INTEGER NOT NULL,
          item_name VARCHAR(255) NOT NULL,
          item_type VARCHAR(50) NOT NULL,
          description TEXT NOT NULL,
          sponsors VARCHAR(50),
          quantity INTEGER NOT NULL DEFAULT 0,
          unit VARCHAR(20),
          file_path TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE
      );

      -- Pets table
      CREATE TABLE IF NOT EXISTS pets (
          id SERIAL PRIMARY KEY,
          owner_id VARCHAR(20) NOT NULL,
          pet_name VARCHAR(50) NOT NULL,
          species VARCHAR(50) NOT NULL,
          breed VARCHAR(50) NOT NULL,
          sex VARCHAR(10) NOT NULL CHECK (sex IN ('male', 'female')),
          birthdate DATE NOT NULL,
          color VARCHAR(20) NOT NULL,
          picture_path TEXT,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES residents(id) ON DELETE CASCADE
      );

      -- Vaccines table
      CREATE TABLE IF NOT EXISTS vaccines(
          id SERIAL PRIMARY KEY,
          target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('pet', 'resident')),
          target_id VARCHAR(20) NOT NULL,
          vaccine_name VARCHAR(100) NOT NULL,
          vaccine_type VARCHAR(50) NULL,
          vaccine_description TEXT NULL,
          vaccination_date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Requests table
      CREATE TABLE IF NOT EXISTS requests (
          id SERIAL PRIMARY KEY,
          resident_id VARCHAR(20) NULL,
          full_name VARCHAR(200) NULL,
          contact_number VARCHAR(50) NULL,
          email VARCHAR(50) NULL,
          address TEXT NULL,
          barangay_id INTEGER NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('certificate', 'appointment')),
          status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
          certificate_type VARCHAR(100),
          urgency VARCHAR(50) DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'express')),
          purpose TEXT NOT NULL,
          requirements JSONB,
          appointment_with VARCHAR(255),
          appointment_date DATE,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL
      );

      -- GIS Barangay table
      CREATE TABLE IF NOT EXISTS gis_barangay (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50),
          gis_barangay_code VARCHAR(20),
          gis_municipality_code VARCHAR(20),
          geom GEOMETRY(GEOMETRY, 4326),
          shape_sqkm NUMERIC(23, 15)
      );

      -- GIS Municipality table
      CREATE TABLE IF NOT EXISTS gis_municipality (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50),
          gis_municipality_code VARCHAR(20),
          geom GEOMETRY(GEOMETRY, 4326),
          shape_sqkm NUMERIC(23, 15)
      );
    `;

    await client.query(createTablesSQL);
    logger.info("Database schema created successfully");
  }

  static async _createDatabaseIndexes(client) {
    logger.info("Creating database indexes...");

    const createIndexesSQL = `
      -- bims_users indexes
      CREATE INDEX IF NOT EXISTS idx_bims_users_email ON bims_users(email);
      CREATE INDEX IF NOT EXISTS idx_bims_users_target ON bims_users(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_bims_users_role ON bims_users(role);
      CREATE INDEX IF NOT EXISTS idx_bims_users_active ON bims_users(is_active);

      -- Municipalities indexes
      CREATE INDEX IF NOT EXISTS idx_municipalities_code ON municipalities(municipality_code);
      CREATE INDEX IF NOT EXISTS idx_municipalities_region ON municipalities(region);
      CREATE INDEX IF NOT EXISTS idx_municipalities_province ON municipalities(province);

      -- Barangays indexes
      CREATE INDEX IF NOT EXISTS idx_barangays_municipality ON barangays(municipality_id);
      CREATE INDEX IF NOT EXISTS idx_barangays_code ON barangays(barangay_code);
      CREATE INDEX IF NOT EXISTS idx_barangays_gis_code ON barangays(gis_code);

      -- Puroks indexes
      CREATE INDEX IF NOT EXISTS idx_puroks_barangay ON puroks(barangay_id);
      CREATE INDEX IF NOT EXISTS idx_puroks_name ON puroks(purok_name);

      -- Residents indexes
      CREATE INDEX IF NOT EXISTS idx_residents_barangay ON residents(barangay_id);
      CREATE INDEX IF NOT EXISTS idx_residents_last_name ON residents(last_name);
      CREATE INDEX IF NOT EXISTS idx_residents_first_name ON residents(first_name);
      CREATE INDEX IF NOT EXISTS idx_residents_status ON residents(resident_status);
      CREATE INDEX IF NOT EXISTS idx_residents_birthdate ON residents(birthdate);
      CREATE INDEX IF NOT EXISTS idx_residents_search ON residents(barangay_id, last_name, first_name);

      -- Resident classifications indexes
      CREATE INDEX IF NOT EXISTS idx_resident_classifications_resident ON resident_classifications(resident_id);
      CREATE INDEX IF NOT EXISTS idx_resident_classifications_type ON resident_classifications(classification_type);
      CREATE INDEX IF NOT EXISTS idx_resident_classifications_details ON resident_classifications USING GIN (classification_details);

      -- Classification types indexes
      CREATE INDEX IF NOT EXISTS idx_classification_types_municipality ON classification_types(municipality_id);
      CREATE INDEX IF NOT EXISTS idx_classification_types_name ON classification_types(name);
      CREATE INDEX IF NOT EXISTS idx_classification_types_active ON classification_types(is_active);

      -- Officials indexes
      CREATE INDEX IF NOT EXISTS idx_officials_barangay ON officials(barangay_id);
      CREATE INDEX IF NOT EXISTS idx_officials_resident ON officials(resident_id);
      CREATE INDEX IF NOT EXISTS idx_officials_position ON officials(position);
      CREATE INDEX IF NOT EXISTS idx_officials_term ON officials(term_start, term_end);

      -- Households indexes
      CREATE INDEX IF NOT EXISTS idx_households_barangay ON households(barangay_id);
      CREATE INDEX IF NOT EXISTS idx_households_purok ON households(purok_id);
      CREATE INDEX IF NOT EXISTS idx_households_head ON households(house_head);
      CREATE INDEX IF NOT EXISTS idx_households_geom ON households USING GIST (geom);

      -- Families indexes
      CREATE INDEX IF NOT EXISTS idx_families_household ON families(household_id);
      CREATE INDEX IF NOT EXISTS idx_families_head ON families(family_head);

      -- Family members indexes
      CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);
      CREATE INDEX IF NOT EXISTS idx_family_members_member ON family_members(family_member);

      -- Archives indexes
      CREATE INDEX IF NOT EXISTS idx_archives_barangay ON archives(barangay_id);
      CREATE INDEX IF NOT EXISTS idx_archives_type ON archives(document_type);
      CREATE INDEX IF NOT EXISTS idx_archives_created ON archives(created_at);

      -- Inventories indexes
      CREATE INDEX IF NOT EXISTS idx_inventories_barangay ON inventories(barangay_id);
      CREATE INDEX IF NOT EXISTS idx_inventories_type ON inventories(item_type);
      CREATE INDEX IF NOT EXISTS idx_inventories_name ON inventories(item_name);

      -- Pets indexes
      CREATE INDEX IF NOT EXISTS idx_pets_owner ON pets(owner_id);
      CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species);
      CREATE INDEX IF NOT EXISTS idx_pets_breed ON pets(breed);

      -- Vaccines indexes
      CREATE INDEX IF NOT EXISTS idx_vaccines_target ON vaccines(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_vaccines_date ON vaccines(vaccination_date);
      CREATE INDEX IF NOT EXISTS idx_vaccines_name ON vaccines(vaccine_name);

      -- Requests indexes
      CREATE INDEX IF NOT EXISTS idx_requests_barangay ON requests(barangay_id);
      CREATE INDEX IF NOT EXISTS idx_requests_resident ON requests(resident_id);
      CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
      CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(type);
      CREATE INDEX IF NOT EXISTS idx_requests_created ON requests(created_at);
      CREATE INDEX IF NOT EXISTS idx_requests_requirements ON requests USING GIN (requirements);

      -- GIS indexes
      CREATE INDEX IF NOT EXISTS idx_gis_barangay_geom ON gis_barangay USING GIST (geom);
      CREATE INDEX IF NOT EXISTS idx_gis_barangay_code ON gis_barangay(gis_barangay_code);
      CREATE INDEX IF NOT EXISTS idx_gis_municipality_geom ON gis_municipality USING GIST (geom);
      CREATE INDEX IF NOT EXISTS idx_gis_municipality_code ON gis_municipality(gis_municipality_code);
    `;

    await client.query(createIndexesSQL);
    logger.info("Database indexes created successfully");
  }

  static async _createTriggersAndFunctions(client) {
    logger.info("Creating triggers and functions...");

    const createTriggersSQL = `
      -- Function to automatically update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Apply updated_at triggers to all relevant tables
      DROP TRIGGER IF EXISTS trigger_update_bims_users_updated_at ON bims_users;
      CREATE TRIGGER trigger_update_bims_users_updated_at BEFORE UPDATE ON bims_users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_municipalities_updated_at ON municipalities;
      CREATE TRIGGER update_municipalities_updated_at BEFORE UPDATE ON municipalities
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_barangays_updated_at ON barangays;
      CREATE TRIGGER update_barangays_updated_at BEFORE UPDATE ON barangays
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_puroks_updated_at ON puroks;
      CREATE TRIGGER update_puroks_updated_at BEFORE UPDATE ON puroks
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_residents_updated_at ON residents;
      CREATE TRIGGER update_residents_updated_at BEFORE UPDATE ON residents
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_officials_updated_at ON officials;
      CREATE TRIGGER update_officials_updated_at BEFORE UPDATE ON officials
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_households_updated_at ON households;
      CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_families_updated_at ON families;
      CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON families
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_family_members_updated_at ON family_members;
      CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON family_members
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_archives_updated_at ON archives;
      CREATE TRIGGER update_archives_updated_at BEFORE UPDATE ON archives
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_inventories_updated_at ON inventories;
      CREATE TRIGGER update_inventories_updated_at BEFORE UPDATE ON inventories
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_pets_updated_at ON pets;
      CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON pets
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_vaccines_updated_at ON vaccines;
      CREATE TRIGGER update_vaccines_updated_at BEFORE UPDATE ON vaccines
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_requests_updated_at ON requests;
      CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_classification_types_updated_at ON classification_types;
      CREATE TRIGGER update_classification_types_updated_at BEFORE UPDATE ON classification_types
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    await client.query(createTriggersSQL);
    logger.info("Triggers and functions created successfully");
  }

  static async _insertMunicipality(client, { municipalityName, region, province, description }) {
    // Check if municipality exists
    const { rows: existingMunicipality } = await client.query(
      "SELECT id FROM municipalities WHERE municipality_name = $1",
      [municipalityName]
    );

    let municipalityId = null;

    if (existingMunicipality.length > 0) {
      municipalityId = existingMunicipality[0].id;
      logger.info("Municipality already exists, skipping insert...");
    } else {
      const { rows: municipalityRows } = await client.query(
        INSERT_MUNICIPALITY,
        [municipalityName, "BRGN", region, province, description, null, null, null]
      );

      if (!municipalityRows?.[0]?.id) {
        throw new Error("Failed to insert municipality");
      }

      municipalityId = municipalityRows[0].id;
      logger.info(`Municipality inserted with ID: ${municipalityId}`);
    }

    return municipalityId;
  }

  static async _insertAdminUser(client, { municipalityId, email, password, fullname, role, picturePath }) {
    // Check if user exists
    const { rows: existingUser } = await client.query(
      "SELECT id FROM bims_users WHERE email = $1",
      [email]
    );
    
    if (existingUser.length > 0) {
      logger.info("User already exists, skipping insert...");
    } else {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const { rows: userRows } = await client.query(`
        INSERT INTO bims_users (target_type, target_id, full_name, email, password, role, picture_path)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id;
      `, [
        "municipality",
        municipalityId,
        fullname,
        email,
        hashedPassword,
        role,
        picturePath,
      ]);

      if (!userRows?.[0]?.id) {
        throw new Error("Failed to insert user");
      }

      logger.info(`User inserted with ID: ${userRows[0].id}`);
    }
  }

  static async _initializeResidentCounters(client) {
    logger.info("Initializing resident counters...");

    const currentYear = new Date().getFullYear();
    
    // Check if counter exists for current year
    const { rows: existingCounter } = await client.query(
      "SELECT year FROM resident_counters WHERE year = $1",
      [currentYear]
    );

    if (existingCounter.length === 0) {
      await client.query(`
        INSERT INTO resident_counters (year, counter, prefix)
        VALUES ($1, $2, $3)
      `, [currentYear, 0, currentYear.toString().slice(-4)]);
      
      logger.info(`Resident counter initialized for year ${currentYear}`);
    } else {
      logger.info("Resident counter already exists for current year");
    }
  }

  static async _importGISData(client) {
    logger.info("Importing GIS data...");

    try {
      // Check if GIS tables exist and have data
      const barangayCountResult = await client.query('SELECT COUNT(*) FROM gis_barangay');
      const municipalityCountResult = await client.query('SELECT COUNT(*) FROM gis_municipality');
      
      const barangayCount = parseInt(barangayCountResult.rows[0].count);
      const municipalityCount = parseInt(municipalityCountResult.rows[0].count);
      
      if (barangayCount > 0 && municipalityCount > 0) {
        logger.info(`GIS data already exists: ${barangayCount} barangays, ${municipalityCount} municipalities`);
        
        // Ensure all required columns exist and are populated
        await this._ensureGISColumns(client);
        
      } else {
        logger.warn('GIS tables exist but no data found. You may need to run the GeoJSON conversion first: npm run db:convert-geojson');
        logger.info('Expected GIS data structure:');
        logger.info('- gis_barangay: Barangay-level geographic data');
        logger.info('- gis_municipality: Municipality-level geographic data');
        logger.info('Files should be converted from geodata/Eastern Samar Barangay.geojson and geodata/Eastern Samar Municipality.geojson');
        logger.info('Alternative: Run npm run db:import-gis to import existing SQL files');
      }
    } catch (error) {
      logger.warn("Error checking GIS data, continuing with seeding:", error.message);
      // Don't throw error, continue with other imports
    }
  }

  static async _ensureGISColumns(client) {
    try {
      // Ensure gis_barangay table has all required columns
      const barangayColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'gis_barangay' 
        AND column_name IN ('geom', 'shape_sqkm')
      `);
      
      const barangayHasGeom = barangayColumns.rows.some(row => row.column_name === 'geom');
      const barangayHasShape = barangayColumns.rows.some(row => row.column_name === 'shape_sqkm');
      
      if (!barangayHasGeom) {
        logger.info('Adding geom column to gis_barangay table...');
        await client.query('ALTER TABLE gis_barangay ADD COLUMN geom GEOMETRY(GEOMETRY, 4326)');
      }
      
      if (!barangayHasShape) {
        logger.info('Adding shape_sqkm column to gis_barangay table...');
        await client.query('ALTER TABLE gis_barangay ADD COLUMN shape_sqkm NUMERIC(23, 15)');
      }
      
      // Ensure gis_municipality table has all required columns
      const municipalityColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'gis_municipality' 
        AND column_name IN ('geom', 'shape_sqkm')
      `);
      
      const municipalityHasGeom = municipalityColumns.rows.some(row => row.column_name === 'geom');
      const municipalityHasShape = municipalityColumns.rows.some(row => row.column_name === 'shape_sqkm');
      
      if (!municipalityHasGeom) {
        logger.info('Adding geom column to gis_municipality table...');
        await client.query('ALTER TABLE gis_municipality ADD COLUMN geom GEOMETRY(GEOMETRY, 4326)');
      }
      
      if (!municipalityHasShape) {
        logger.info('Adding shape_sqkm column to gis_municipality table...');
        await client.query('ALTER TABLE gis_municipality ADD COLUMN shape_sqkm NUMERIC(23, 15)');
      }
      
      // Update shape_sqkm values based on geometry area for both tables
      const barangayUpdateResult = await client.query(`
        UPDATE gis_barangay 
        SET shape_sqkm = ST_Area(ST_Transform(geom, 3857)) / 1000000 
        WHERE shape_sqkm IS NULL AND geom IS NOT NULL
      `);
      
      const municipalityUpdateResult = await client.query(`
        UPDATE gis_municipality 
        SET shape_sqkm = ST_Area(ST_Transform(geom, 3857)) / 1000000 
        WHERE shape_sqkm IS NULL AND geom IS NOT NULL
      `);
      
      if (barangayUpdateResult.rowCount > 0) {
        logger.info(`Updated shape_sqkm for ${barangayUpdateResult.rowCount} barangay records`);
      }
      
      if (municipalityUpdateResult.rowCount > 0) {
        logger.info(`Updated shape_sqkm for ${municipalityUpdateResult.rowCount} municipality records`);
      }
      
    } catch (gisError) {
      logger.warn('Error updating GIS columns, continuing:', gisError.message);
      // Don't throw error, continue with seeding
    }
  }
}

export default DatabaseSeeder;

// Run the script if called directly
const decodedUrl = decodeURIComponent(import.meta.url);
const normalizedArgv = process.argv[1].replace(/\\/g, '/');
const normalizedUrl = decodedUrl.replace(/\\/g, '/');

if (decodedUrl === `file://${process.argv[1]}` || normalizedUrl.includes(normalizedArgv)) {
  console.log("Starting database seeding...");
  DatabaseSeeder.seed()
    .then(() => {
      console.log("Database seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Database seeding failed:", error);
      process.exit(1);
    });
} 