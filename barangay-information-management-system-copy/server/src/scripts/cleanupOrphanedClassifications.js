#!/usr/bin/env node

/**
 * Cleanup Script for Orphaned Resident Classifications
 * 
 * This script finds and deletes orphaned resident_classifications records that:
 * - Reference non-existent residents or have NULL resident_id
 * - Reference classification types that no longer exist in classification_types table
 * 
 * Usage: node cleanupOrphanedClassifications.js [--dry-run]
 * 
 * Options:
 *   --dry-run: Show what would be deleted without actually deleting
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Change to server directory to load .env file
const serverDir = path.resolve(__dirname, '../..');
process.chdir(serverDir);

// Dynamically import modules after changing directory (db.js loads .env on import)
let pool, logger;

async function findOrphanedClassifications() {
  try {
    const result = await pool.query(`
      SELECT 
        rc.id,
        rc.resident_id,
        rc.classification_type,
        rc.classification_details,
        CASE 
          WHEN rc.resident_id IS NULL THEN 'NULL resident_id'
          WHEN NOT EXISTS (
            SELECT 1 FROM residents r WHERE r.id = rc.resident_id
          ) THEN 'Non-existent resident_id'
          WHEN rc.classification_type = 'voter' THEN NULL
          WHEN NOT EXISTS (
            SELECT 1 
            FROM classification_types ct
            JOIN residents r ON r.id = rc.resident_id
            JOIN barangays b ON b.id = r.barangay_id
            WHERE ct.name = rc.classification_type
              AND ct.municipality_id = b.municipality_id
              AND ct.is_active = true
          ) THEN 'Non-existent or inactive classification_type'
          ELSE NULL
        END AS orphan_reason
      FROM resident_classifications rc
      WHERE (
        rc.resident_id IS NULL 
        OR NOT EXISTS (
          SELECT 1 FROM residents r WHERE r.id = rc.resident_id
        )
        OR (
          rc.resident_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM residents r WHERE r.id = rc.resident_id)
          AND rc.classification_type != 'voter'
          AND NOT EXISTS (
            SELECT 1 
            FROM classification_types ct
            JOIN residents r ON r.id = rc.resident_id
            JOIN barangays b ON b.id = r.barangay_id
            WHERE ct.name = rc.classification_type
              AND ct.municipality_id = b.municipality_id
              AND ct.is_active = true
          )
        )
      )
      ORDER BY rc.id;
    `);
    
    // Filter out NULL orphan_reason (these are valid records)
    return result.rows.filter(row => row.orphan_reason !== null);
  } catch (error) {
    logger.error('Error finding orphaned classifications:', error);
    throw error;
  }
}

async function deleteOrphanedClassifications(orphanedRecords, dryRun = false) {
  if (orphanedRecords.length === 0) {
    console.log('✅ No orphaned records to delete.\n');
    return { deleted: 0, errors: [] };
  }
  
  console.log(`🗑️  Found ${orphanedRecords.length} orphaned records to delete:\n`);
  
  // Group by reason for reporting
  const groupedByReason = orphanedRecords.reduce((acc, record) => {
    const reason = record.orphan_reason;
    if (!acc[reason]) {
      acc[reason] = [];
    }
    acc[reason].push(record);
    return acc;
  }, {});
  
  for (const [reason, records] of Object.entries(groupedByReason)) {
    console.log(`${reason} (${records.length} records)`);
  }
  console.log('');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE: Showing records that would be deleted...\n');
    
    // Show sample of records
    orphanedRecords.slice(0, 20).forEach(record => {
      console.log(`   Would delete: ID=${record.id}, Resident ID=${record.resident_id || 'NULL'}, Type=${record.classification_type || 'NULL'}, Reason=${record.orphan_reason}`);
    });
    
    if (orphanedRecords.length > 20) {
      console.log(`   ... and ${orphanedRecords.length - 20} more records`);
    }
    
    console.log(`\n🔍 DRY RUN: Would delete ${orphanedRecords.length} orphaned records`);
    return { deleted: 0, errors: [] };
  }
  
  // Actually delete the records
  console.log('🗑️  Deleting orphaned records...\n');
  
  const client = await pool.connect();
  let deleted = 0;
  const errors = [];
  
  try {
    await client.query('BEGIN');
    
    // Delete in batches to avoid locking issues
    const batchSize = 100;
    const idsToDelete = orphanedRecords.map(r => r.id);
    
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      
      try {
        const result = await client.query(
          `DELETE FROM resident_classifications WHERE id = ANY($1::int[])`,
          [batch]
        );
        
        deleted += result.rowCount;
        console.log(`   Deleted batch ${Math.floor(i / batchSize) + 1}: ${result.rowCount} records`);
      } catch (error) {
        logger.error(`Error deleting batch starting at index ${i}:`, error);
        errors.push({ batch: batch, error: error.message });
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Successfully deleted ${deleted} orphaned records`);
    
    if (errors.length > 0) {
      console.log(`⚠️  Encountered ${errors.length} errors during deletion:`);
      errors.forEach((err, idx) => {
        console.log(`   Error ${idx + 1}: ${err.error}`);
      });
    }
    
    return { deleted, errors };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction failed, rolling back:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  // Import modules after directory is set
  const dbModule = await import('../config/db.js');
  const loggerModule = await import('../utils/logger.js');
  pool = dbModule.pool;
  logger = loggerModule.default;
  
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('🧹 BIMS Orphaned Resident Classifications Cleanup');
  console.log('==================================================\n');
  
  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no records will be deleted\n');
  }
  
  try {
    // Find orphaned records
    const orphanedRecords = await findOrphanedClassifications();
    
    if (orphanedRecords.length === 0) {
      console.log('✅ No orphaned resident_classifications found!');
      console.log('   The database is clean.\n');
      return;
    }
    
    // Delete orphaned records
    const result = await deleteOrphanedClassifications(orphanedRecords, dryRun);
    
    // Verify cleanup
    if (!dryRun) {
      console.log('\n🔍 Verifying cleanup...');
      const remaining = await findOrphanedClassifications();
      
      if (remaining.length === 0) {
        console.log('✅ Verification passed: No orphaned records remain.\n');
      } else {
        console.log(`⚠️  Verification warning: ${remaining.length} orphaned records still remain.\n`);
      }
    }
    
  } catch (error) {
    logger.error('Cleanup failed:', error);
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);

