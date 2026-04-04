import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import { loadEnvConfig } from "../utils/envLoader.js";

// Load environment variables
loadEnvConfig();

/**
 * Migration Script: Add Unique Constraint to Puroks Table
 * 
 * Purpose: Prevent duplicate purok names within the same barangay
 * This solves the issue where multiple mobile devices syncing simultaneously
 * can create duplicate puroks with the same name.
 * 
 * What this does:
 * 1. Checks for existing duplicate puroks
 * 2. If duplicates exist, merges them (keeps first, updates references)
 * 3. Adds unique constraint: (barangay_id, purok_name)
 */

class PurokUniqueMigration {
  static async migrate() {
    const client = await pool.connect();
    
    try {
      logger.info("🚀 Starting purok unique constraint migration...");
      
      await client.query("BEGIN");
      
      // Step 1: Check if constraint already exists
      const constraintCheck = await client.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'puroks' 
        AND constraint_name = 'unique_purok_per_barangay'
      `);
      
      if (constraintCheck.rows.length > 0) {
        logger.info("✅ Unique constraint already exists. Skipping migration.");
        await client.query("COMMIT");
        return;
      }
      
      // Step 2: Find and log existing duplicates
      logger.info("📊 Checking for duplicate puroks...");
      const duplicates = await client.query(`
        SELECT barangay_id, purok_name, COUNT(*) as count, ARRAY_AGG(id ORDER BY id) as ids
        FROM puroks
        GROUP BY barangay_id, purok_name
        HAVING COUNT(*) > 1
        ORDER BY barangay_id, purok_name
      `);
      
      if (duplicates.rows.length > 0) {
        logger.warn(`⚠️  Found ${duplicates.rows.length} duplicate purok groups:`);
        
        for (const dup of duplicates.rows) {
          logger.warn(`   Barangay ${dup.barangay_id}, Purok "${dup.purok_name}": ${dup.count} duplicates (IDs: ${dup.ids.join(', ')})`);
          
          // Keep the first ID, merge others into it
          const keepId = dup.ids[0];
          const duplicateIds = dup.ids.slice(1);
          
          logger.info(`   → Keeping ID ${keepId}, merging duplicates: ${duplicateIds.join(', ')}`);
          
          // Update households that reference duplicate puroks
          if (duplicateIds.length > 0) {
            const updateHouseholds = await client.query(`
              UPDATE households
              SET purok_id = $1
              WHERE purok_id = ANY($2::int[])
            `, [keepId, duplicateIds]);
            
            if (updateHouseholds.rowCount > 0) {
              logger.info(`   → Updated ${updateHouseholds.rowCount} household(s) to reference ID ${keepId}`);
            }
            
            // Delete duplicate puroks
            const deleteDuplicates = await client.query(`
              DELETE FROM puroks
              WHERE id = ANY($1::int[])
            `, [duplicateIds]);
            
            logger.info(`   → Deleted ${deleteDuplicates.rowCount} duplicate purok(s)`);
          }
        }
        
        logger.info("✅ Duplicate puroks merged successfully");
      } else {
        logger.info("✅ No duplicate puroks found");
      }
      
      // Step 3: Add unique constraint
      logger.info("🔒 Adding unique constraint to puroks table...");
      await client.query(`
        ALTER TABLE puroks 
        ADD CONSTRAINT unique_purok_per_barangay 
        UNIQUE (barangay_id, purok_name)
      `);
      
      logger.info("✅ Unique constraint added successfully");
      
      // Step 4: Create index for better performance
      logger.info("📇 Creating index for better query performance...");
      const indexCheck = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'puroks' 
        AND indexname = 'idx_puroks_barangay_name'
      `);
      
      if (indexCheck.rows.length === 0) {
        await client.query(`
          CREATE INDEX idx_puroks_barangay_name 
          ON puroks(barangay_id, purok_name)
        `);
        logger.info("✅ Index created successfully");
      } else {
        logger.info("✅ Index already exists");
      }
      
      await client.query("COMMIT");
      
      logger.info("🎉 Migration completed successfully!");
      logger.info("📝 Summary:");
      logger.info("   - Unique constraint added: (barangay_id, purok_name)");
      logger.info("   - Duplicate puroks merged (if any)");
      logger.info("   - Performance index created");
      logger.info("   - Mobile apps can now sync without creating duplicates");
      
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("❌ Migration failed:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  PurokUniqueMigration.migrate()
    .then(() => {
      logger.info("✅ Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Migration script failed:", error);
      process.exit(1);
    });
}

export default PurokUniqueMigration;

