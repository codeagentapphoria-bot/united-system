#!/usr/bin/env node

/**
 * Investigation Script for Orphaned Resident Classifications
 * 
 * This script investigates why resident_classifications records are not being
 * deleted when their corresponding resident is deleted. It checks:
 * 1. Records with resident_id that don't exist in residents table
 * 2. Records with NULL resident_id
 * 3. Foreign key constraint status
 * 
 * Usage: node investigateOrphanedClassifications.js
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

async function checkForeignConstraint() {
  console.log('🔍 Checking foreign key constraint status...\n');
  
  try {
    const result = await pool.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'resident_classifications'
        AND kcu.column_name = 'resident_id';
    `);
    
    if (result.rows.length === 0) {
      console.log('⚠️  WARNING: No foreign key constraint found!');
      console.log('   This means CASCADE delete is not configured.\n');
      return false;
    }
    
    const constraint = result.rows[0];
    console.log('✅ Foreign key constraint found:');
    console.log(`   Constraint name: ${constraint.constraint_name}`);
    console.log(`   Column: ${constraint.column_name}`);
    console.log(`   References: ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
    console.log(`   Delete rule: ${constraint.delete_rule}`);
    
    if (constraint.delete_rule !== 'CASCADE') {
      console.log(`\n⚠️  WARNING: Delete rule is "${constraint.delete_rule}" instead of "CASCADE"!`);
      console.log('   This means orphaned records will not be automatically deleted.\n');
      return false;
    }
    
    console.log('\n✅ Foreign key constraint is properly configured with CASCADE.\n');
    return true;
  } catch (error) {
    console.error('❌ Error checking foreign key constraint:', error);
    return false;
  }
}

async function findOrphanedClassifications() {
  console.log('🔍 Searching for orphaned resident_classifications...\n');
  
  try {
    // Find records where resident_id doesn't exist in residents table
    const orphanedResult = await pool.query(`
      SELECT 
        rc.id,
        rc.resident_id,
        rc.classification_type,
        rc.classification_details,
        CASE 
          WHEN rc.resident_id IS NULL THEN 'NULL resident_id'
          ELSE 'Non-existent resident_id'
        END AS orphan_reason
      FROM resident_classifications rc
      WHERE rc.resident_id IS NULL 
         OR NOT EXISTS (
           SELECT 1 FROM residents r WHERE r.id = rc.resident_id
         )
      ORDER BY rc.id;
    `);
    
    const orphanedRecords = orphanedResult.rows;
    
    // Get statistics
    const totalClassifications = await pool.query(
      'SELECT COUNT(*) as count FROM resident_classifications'
    );
    const totalResidents = await pool.query(
      'SELECT COUNT(*) as count FROM residents'
    );
    const nullResidentId = await pool.query(
      'SELECT COUNT(*) as count FROM resident_classifications WHERE resident_id IS NULL'
    );
    const nonExistentResidentId = await pool.query(`
      SELECT COUNT(*) as count 
      FROM resident_classifications rc
      WHERE rc.resident_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM residents r WHERE r.id = rc.resident_id
        )
    `);
    
    console.log('📊 Statistics:');
    console.log(`   Total resident_classifications: ${totalClassifications.rows[0].count}`);
    console.log(`   Total residents: ${totalResidents.rows[0].count}`);
    console.log(`   Classifications with NULL resident_id: ${nullResidentId.rows[0].count}`);
    console.log(`   Classifications with non-existent resident_id: ${nonExistentResidentId.rows[0].count}`);
    console.log(`   Total orphaned records: ${orphanedRecords.length}\n`);
    
    if (orphanedRecords.length === 0) {
      console.log('✅ No orphaned resident_classifications found!\n');
      return [];
    }
    
    console.log(`❌ Found ${orphanedRecords.length} orphaned records:\n`);
    
    // Group by reason
    const groupedByReason = orphanedRecords.reduce((acc, record) => {
      const reason = record.orphan_reason;
      if (!acc[reason]) {
        acc[reason] = [];
      }
      acc[reason].push(record);
      return acc;
    }, {});
    
    for (const [reason, records] of Object.entries(groupedByReason)) {
      console.log(`${reason} (${records.length} records):`);
      records.slice(0, 10).forEach(record => {
        console.log(`   - ID: ${record.id}, Resident ID: ${record.resident_id || 'NULL'}, Type: ${record.classification_type}`);
      });
      if (records.length > 10) {
        console.log(`   ... and ${records.length - 10} more`);
      }
      console.log('');
    }
    
    return orphanedRecords;
  } catch (error) {
    console.error('❌ Error finding orphaned classifications:', error);
    throw error;
  }
}

async function checkResidentDeleteBehavior() {
  console.log('🔍 Analyzing resident deletion behavior...\n');
  
  try {
    // Check if there are any residents that were deleted but classifications remain
    const recentDeletions = await pool.query(`
      SELECT 
        al.record_id as deleted_resident_id,
        al.changed_at as deleted_at,
        al.changed_by,
        u.full_name as deleted_by_user,
        COUNT(rc.id) as remaining_classifications
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.changed_by
      LEFT JOIN resident_classifications rc ON rc.resident_id = al.record_id
      WHERE al.table_name = 'residents'
        AND al.operation = 'DELETE'
        AND al.changed_at > NOW() - INTERVAL '30 days'
      GROUP BY al.record_id, al.changed_at, al.changed_by, u.full_name
      HAVING COUNT(rc.id) > 0
      ORDER BY al.changed_at DESC
      LIMIT 10;
    `);
    
    if (recentDeletions.rows.length > 0) {
      console.log(`⚠️  Found ${recentDeletions.rows.length} recently deleted residents with remaining classifications:`);
      recentDeletions.rows.forEach(row => {
        console.log(`   - Resident ID: ${row.deleted_resident_id}, Deleted: ${row.deleted_at}, Remaining classifications: ${row.remaining_classifications}`);
      });
      console.log('');
    } else {
      console.log('✅ No recent deletions with orphaned classifications found.\n');
    }
    
    return recentDeletions.rows;
  } catch (error) {
    console.error('❌ Error checking resident delete behavior:', error);
    return [];
  }
}

async function main() {
  // Import modules after directory is set
  const dbModule = await import('../config/db.js');
  const loggerModule = await import('../utils/logger.js');
  pool = dbModule.pool;
  logger = loggerModule.default;
  
  console.log('🔍 BIMS Orphaned Resident Classifications Investigation');
  console.log('======================================================\n');
  
  try {
    // Step 1: Check foreign key constraint
    const hasValidConstraint = await checkForeignConstraint();
    
    // Step 2: Find orphaned records
    const orphanedRecords = await findOrphanedClassifications();
    
    // Step 3: Check recent deletion behavior
    const recentIssues = await checkResidentDeleteBehavior();
    
    // Summary
    console.log('\n📋 Summary:');
    console.log('===========');
    console.log(`Foreign key constraint: ${hasValidConstraint ? '✅ Properly configured' : '⚠️  Issues detected'}`);
    console.log(`Orphaned records found: ${orphanedRecords.length}`);
    console.log(`Recent deletion issues: ${recentIssues.length}`);
    
    if (orphanedRecords.length > 0) {
      console.log('\n💡 Recommendation:');
      console.log('   Run cleanupOrphanedClassifications.js to remove these orphaned records.');
    }
    
    if (!hasValidConstraint) {
      console.log('\n💡 Recommendation:');
      console.log('   Fix the foreign key constraint to ensure CASCADE delete works properly.');
    }
    
  } catch (error) {
    logger.error('Investigation failed:', error);
    console.error('❌ Investigation failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);

