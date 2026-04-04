import { pool } from "../config/db.js";
import logger from "../utils/logger.js";

/**
 * Migration Script: Add UUID column to requests table
 * 
 * Purpose: Add a secondary UUID identifier for secure public tracking
 * 
 * What this does:
 * 1. Adds uuid column with gen_random_uuid() default
 * 2. Generates UUIDs for existing records
 * 3. Adds UNIQUE constraint and index
 * 4. Provides rollback capability
 */

class RequestUuidMigration {
  static async migrate() {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      logger.info("Starting migration: Adding UUID to requests table...");
      
      // Step 1: Check if uuid column already exists
      const checkColumn = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'requests' AND column_name = 'uuid'
      `);
      
      if (checkColumn.rows.length > 0) {
        logger.warn("UUID column already exists. Skipping migration.");
        await client.query('ROLLBACK');
        return {
          success: true,
          message: "UUID column already exists",
          alreadyExists: true
        };
      }
      
      // Step 2: Add uuid column with default value
      logger.info("Adding uuid column to requests table...");
      await client.query(`
        ALTER TABLE requests 
        ADD COLUMN uuid UUID DEFAULT gen_random_uuid()
      `);
      
      // Step 3: Generate UUIDs for existing records (if any don't have one)
      logger.info("Generating UUIDs for existing records...");
      const updateResult = await client.query(`
        UPDATE requests 
        SET uuid = gen_random_uuid() 
        WHERE uuid IS NULL
      `);
      logger.info(`Updated ${updateResult.rowCount} existing records with UUIDs`);
      
      // Step 4: Make uuid NOT NULL
      logger.info("Setting uuid column to NOT NULL...");
      await client.query(`
        ALTER TABLE requests 
        ALTER COLUMN uuid SET NOT NULL
      `);
      
      // Step 5: Add UNIQUE constraint
      logger.info("Adding UNIQUE constraint to uuid column...");
      await client.query(`
        ALTER TABLE requests 
        ADD CONSTRAINT requests_uuid_unique UNIQUE (uuid)
      `);
      
      // Step 6: Create index for performance
      logger.info("Creating index on uuid column...");
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_requests_uuid ON requests(uuid)
      `);
      
      // Step 7: Get statistics
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(uuid) as requests_with_uuid
        FROM requests
      `);
      
      await client.query('COMMIT');
      
      logger.info("✅ Migration completed successfully!");
      logger.info(`Total requests: ${stats.rows[0].total_requests}`);
      logger.info(`Requests with UUID: ${stats.rows[0].requests_with_uuid}`);
      
      return {
        success: true,
        message: "UUID column added successfully",
        stats: stats.rows[0]
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error("❌ Migration failed:", error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  static async rollback() {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      logger.info("Starting rollback: Removing UUID from requests table...");
      
      // Check if uuid column exists
      const checkColumn = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'requests' AND column_name = 'uuid'
      `);
      
      if (checkColumn.rows.length === 0) {
        logger.warn("UUID column does not exist. Nothing to rollback.");
        await client.query('ROLLBACK');
        return {
          success: true,
          message: "UUID column does not exist",
          nothingToRollback: true
        };
      }
      
      // Drop index
      logger.info("Dropping uuid index...");
      await client.query(`
        DROP INDEX IF EXISTS idx_requests_uuid
      `);
      
      // Drop constraint
      logger.info("Dropping uuid constraint...");
      await client.query(`
        ALTER TABLE requests 
        DROP CONSTRAINT IF EXISTS requests_uuid_unique
      `);
      
      // Drop column
      logger.info("Dropping uuid column...");
      await client.query(`
        ALTER TABLE requests 
        DROP COLUMN IF EXISTS uuid
      `);
      
      await client.query('COMMIT');
      
      logger.info("✅ Rollback completed successfully!");
      
      return {
        success: true,
        message: "UUID column removed successfully"
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error("❌ Rollback failed:", error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  static async checkStatus() {
    const client = await pool.connect();
    
    try {
      // Check if uuid column exists
      const columnCheck = await client.query(`
        SELECT 
          column_name,
          data_type,
          column_default,
          is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'requests' AND column_name = 'uuid'
      `);
      
      // Check for constraint
      const constraintCheck = await client.query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'requests' AND constraint_name = 'requests_uuid_unique'
      `);
      
      // Check for index
      const indexCheck = await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'requests' AND indexname = 'idx_requests_uuid'
      `);
      
      // Get sample records
      const sampleRecords = await client.query(`
        SELECT id, uuid, type, status
        FROM requests
        ORDER BY created_at DESC
        LIMIT 5
      `);
      
      const status = {
        columnExists: columnCheck.rows.length > 0,
        columnDetails: columnCheck.rows[0] || null,
        constraintExists: constraintCheck.rows.length > 0,
        indexExists: indexCheck.rows.length > 0,
        sampleRecords: sampleRecords.rows
      };
      
      logger.info("Migration Status:", JSON.stringify(status, null, 2));
      
      return status;
      
    } catch (error) {
      logger.error("Error checking migration status:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

// CLI execution
const command = process.argv[2];

if (command === 'migrate' || command === 'up') {
  RequestUuidMigration.migrate()
    .then(result => {
      console.log(result);
      process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} else if (command === 'rollback' || command === 'down') {
  RequestUuidMigration.rollback()
    .then(result => {
      console.log(result);
      process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} else if (command === 'status') {
  RequestUuidMigration.checkStatus()
    .then(result => {
      console.log(result);
      process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} else {
  console.log(`
Usage: node addRequestUuidMigration.js [command]

Commands:
  migrate, up    - Run the migration (add uuid column)
  rollback, down - Rollback the migration (remove uuid column)
  status         - Check current migration status

Examples:
  node addRequestUuidMigration.js migrate
  node addRequestUuidMigration.js rollback
  node addRequestUuidMigration.js status
  `);
  process.exit(0);
}

export default RequestUuidMigration;

