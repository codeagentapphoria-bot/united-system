#!/usr/bin/env node

/**
 * Cleanup Script for Orphaned Data Associated with Deleted Barangays
 * 
 * This script finds and deletes orphaned data that remains after a barangay
 * is deleted, including:
 * - Residents without valid barangay references
 * - Household members, documents, pets, and other dependent entities
 * 
 * The script performs cascading cleanup to maintain referential integrity.
 * 
 * Usage: node cleanupOrphanedBarangayData.js [--dry-run] [--verbose]
 * 
 * Options:
 *   --dry-run: Show what would be deleted without actually deleting
 *   --verbose: Show detailed progress and statistics
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Change to server directory to load .env file
const serverDir = path.resolve(__dirname, '../..');
process.chdir(serverDir);

// Dynamically import modules after changing directory
let pool, logger;

// Configuration
const BATCH_SIZE = 100;

/**
 * Find orphaned residents (residents with non-existent barangay_id)
 */
async function findOrphanedResidents() {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.barangay_id,
        r.last_name || ', ' || r.first_name || COALESCE(' ' || r.middle_name, '') AS name,
        r.created_at
      FROM residents r
      WHERE NOT EXISTS (
        SELECT 1 FROM barangays b WHERE b.id = r.barangay_id
      )
      ORDER BY r.id;
    `);
    
    return result.rows;
  } catch (error) {
    logger.error('Error finding orphaned residents:', error);
    throw error;
  }
}

/**
 * Find orphaned requests with non-existent barangay_id
 * (Note: requests.barangay_id has no FK constraint)
 */
async function findOrphanedRequests() {
  try {
    const result = await pool.query(`
      SELECT 
        r.id,
        r.barangay_id,
        r.type,
        r.status,
        COALESCE(r.full_name, 'N/A') as name
      FROM requests r
      WHERE NOT EXISTS (
        SELECT 1 FROM barangays b WHERE b.id = r.barangay_id
      )
      ORDER BY r.id;
    `);
    
    return result.rows;
  } catch (error) {
    logger.error('Error finding orphaned requests:', error);
    throw error;
  }
}

/**
 * Get statistics about orphaned data
 */
async function getOrphanedStatistics() {
  const stats = {};
  
  try {
    // Orphaned residents
    const orphanedResidents = await pool.query(`
      SELECT COUNT(*) as count
      FROM residents r
      WHERE NOT EXISTS (SELECT 1 FROM barangays b WHERE b.id = r.barangay_id)
    `);
    stats.orphanedResidents = parseInt(orphanedResidents.rows[0].count);
    
    // Orphaned requests (barangay_id has no FK constraint)
    const orphanedRequests = await pool.query(`
      SELECT COUNT(*) as count
      FROM requests r
      WHERE NOT EXISTS (SELECT 1 FROM barangays b WHERE b.id = r.barangay_id)
    `);
    stats.orphanedRequestsByBarangay = parseInt(orphanedRequests.rows[0].count);
    
    // Dependent data counts
    const dependentCounts = await pool.query(`
      SELECT 
        'resident_classifications' as table_name,
        COUNT(*) as count
      FROM resident_classifications rc
      WHERE rc.resident_id IN (
        SELECT r.id FROM residents r 
        WHERE NOT EXISTS (SELECT 1 FROM barangays b WHERE b.id = r.barangay_id)
      )
      UNION ALL
      SELECT 
        'family_members' as table_name,
        COUNT(*) as count
      FROM family_members fm
      WHERE fm.family_member IN (
        SELECT r.id FROM residents r 
        WHERE NOT EXISTS (SELECT 1 FROM barangays b WHERE b.id = r.barangay_id)
      )
      UNION ALL
      SELECT 
        'families' as table_name,
        COUNT(*) as count
      FROM families f
      WHERE f.family_head IN (
        SELECT r.id FROM residents r 
        WHERE NOT EXISTS (SELECT 1 FROM barangays b WHERE b.id = r.barangay_id)
      )
      UNION ALL
      SELECT 
        'households' as table_name,
        COUNT(*) as count
      FROM households h
      WHERE h.house_head IN (
        SELECT r.id FROM residents r 
        WHERE NOT EXISTS (SELECT 1 FROM barangays b WHERE b.id = r.barangay_id)
      )
      UNION ALL
      SELECT 
        'pets' as table_name,
        COUNT(*) as count
      FROM pets p
      WHERE p.owner_id IN (
        SELECT r.id FROM residents r 
        WHERE NOT EXISTS (SELECT 1 FROM barangays b WHERE b.id = r.barangay_id)
      )
      UNION ALL
      SELECT 
        'vaccines' as table_name,
        COUNT(*) as count
      FROM vaccines v
      WHERE v.target_type = 'resident' 
        AND v.target_id IN (
          SELECT r.id FROM residents r 
          WHERE NOT EXISTS (SELECT 1 FROM barangays b WHERE b.id = r.barangay_id)
        )
      UNION ALL
      SELECT 
        'requests_by_resident' as table_name,
        COUNT(*) as count
      FROM requests req
      WHERE req.resident_id IN (
        SELECT r.id FROM residents r 
        WHERE NOT EXISTS (SELECT 1 FROM barangays b WHERE b.id = r.barangay_id)
      )
    `);
    
    // Convert to object
    dependentCounts.rows.forEach(row => {
      stats[`orphaned${row.table_name}`] = parseInt(row.count);
    });
    
    return stats;
  } catch (error) {
    logger.error('Error getting orphaned statistics:', error);
    throw error;
  }
}

/**
 * Display statistics
 */
function displayStatistics(stats, verbose = false) {
  console.log('📊 Orphaned Data Statistics:');
  console.log('='.repeat(60));
  
  const totalOrphaned = Object.values(stats).reduce((sum, val) => sum + val, 0);
  
  if (totalOrphaned === 0) {
    console.log('✅ No orphaned data found!');
    console.log('   The database is clean.\n');
    return;
  }
  
  console.log(`Total orphaned records: ${totalOrphaned}\n`);
  console.log('Breakdown:');
  
  if (stats.orphanedResidents > 0) {
    console.log(`  📋 Orphaned residents: ${stats.orphanedResidents}`);
  }
  if (stats.orphanedRequestsByBarangay > 0) {
    console.log(`  📝 Orphaned requests (by barangay): ${stats.orphanedRequestsByBarangay}`);
  }
  if (stats.orphanedresident_classifications > 0) {
    console.log(`  🏷️  Resident classifications: ${stats.orphanedresident_classifications}`);
  }
  if (stats.orphanedfamily_members > 0) {
    console.log(`  👨‍👩‍👧‍👦 Family members: ${stats.orphanedfamily_members}`);
  }
  if (stats.orphanedfamilies > 0) {
    console.log(`  🏡 Families: ${stats.orphanedfamilies}`);
  }
  if (stats.orphanedhouseholds > 0) {
    console.log(`  🏠 Households: ${stats.orphanedhouseholds}`);
  }
  if (stats.orphanedpets > 0) {
    console.log(`  🐾 Pets: ${stats.orphanedpets}`);
  }
  if (stats.orphanedvaccines > 0) {
    console.log(`  💉 Vaccines: ${stats.orphanedvaccines}`);
  }
  if (stats.orphanedrequests_by_resident > 0) {
    console.log(`  📝 Requests (by resident): ${stats.orphanedrequests_by_resident}`);
  }
  
  console.log('');
  
  if (verbose && stats.orphanedResidents > 0) {
    console.log('Sample orphaned residents (first 10):');
    // This will be filled by the calling function
  }
}

/**
 * Delete orphaned data in proper order to maintain referential integrity
 */
async function deleteOrphanedData(orphanedResidents, dryRun = false, verbose = false) {
  if (orphanedResidents.length === 0) {
    console.log('✅ No orphaned residents to delete.\n');
    return { deleted: 0, errors: [] };
  }
  
  console.log(`🗑️  Found ${orphanedResidents.length} orphaned residents to delete and their dependent data.\n`);
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE: Showing records that would be deleted...\n');
    
    orphanedResidents.slice(0, 20).forEach(resident => {
      console.log(`   Would delete: ${resident.name} (ID: ${resident.id}, Barangay: ${resident.barangay_id})`);
    });
    
    if (orphanedResidents.length > 20) {
      console.log(`   ... and ${orphanedResidents.length - 20} more residents`);
    }
    
    console.log(`\n🔍 DRY RUN: Would delete ${orphanedResidents.length} orphaned residents and all dependent data`);
    return { deleted: 0, errors: [] };
  }
  
  // Actually delete the records
  console.log('🗑️  Deleting orphaned data in cascading order...\n');
  
  const client = await pool.connect();
  let totalDeleted = 0;
  const errors = [];
  const deletionStats = {};
  
  try {
    await client.query('BEGIN');
    
    // Temporarily disable audit triggers to prevent FK constraint violations
    // when deleting orphaned data with invalid barangay_id references
    const disableTriggersSQL = `
      ALTER TABLE residents DISABLE TRIGGER audit_residents_trigger;
      ALTER TABLE households DISABLE TRIGGER audit_households_trigger;
      ALTER TABLE families DISABLE TRIGGER audit_families_trigger;
      ALTER TABLE family_members DISABLE TRIGGER audit_family_members_trigger;
      ALTER TABLE archives DISABLE TRIGGER audit_archives_trigger;
      ALTER TABLE inventories DISABLE TRIGGER audit_inventories_trigger;
      ALTER TABLE pets DISABLE TRIGGER audit_pets_trigger;
      ALTER TABLE requests DISABLE TRIGGER audit_requests_trigger;
    `;
    await client.query(disableTriggersSQL);
    
    // Get list of orphaned resident IDs
    const orphanedResidentIds = orphanedResidents.map(r => r.id);
    
    // 1. Delete vaccines first (independent of residents but references them)
    try {
      const vaccinesResult = await client.query(`
        DELETE FROM vaccines
        WHERE target_type = 'resident' AND target_id = ANY($1::varchar[])
      `, [orphanedResidentIds]);
      deletionStats.vaccines = vaccinesResult.rowCount;
      totalDeleted += vaccinesResult.rowCount;
      if (verbose) {
        console.log(`   ✅ Deleted ${vaccinesResult.rowCount} vaccines`);
      }
    } catch (error) {
      logger.error('Error deleting vaccines:', error);
      errors.push({ table: 'vaccines', error: error.message });
    }
    
    // 2. Delete requests (ON DELETE SET NULL, but we want to clean them up)
    try {
      const requestsResult = await client.query(`
        DELETE FROM requests
        WHERE resident_id = ANY($1::varchar[])
      `, [orphanedResidentIds]);
      deletionStats.requests = requestsResult.rowCount;
      totalDeleted += requestsResult.rowCount;
      if (verbose) {
        console.log(`   ✅ Deleted ${requestsResult.rowCount} requests`);
      }
    } catch (error) {
      logger.error('Error deleting requests:', error);
      errors.push({ table: 'requests', error: error.message });
    }
    
    // 3. Delete family members (references residents)
    try {
      const familyMembersResult = await client.query(`
        DELETE FROM family_members
        WHERE family_member = ANY($1::varchar[])
      `, [orphanedResidentIds]);
      deletionStats.familyMembers = familyMembersResult.rowCount;
      totalDeleted += familyMembersResult.rowCount;
      if (verbose) {
        console.log(`   ✅ Deleted ${familyMembersResult.rowCount} family members`);
      }
    } catch (error) {
      logger.error('Error deleting family members:', error);
      errors.push({ table: 'family_members', error: error.message });
    }
    
    // 4. Delete families (references residents as family head)
    try {
      const familiesResult = await client.query(`
        DELETE FROM families
        WHERE family_head = ANY($1::varchar[])
      `, [orphanedResidentIds]);
      deletionStats.families = familiesResult.rowCount;
      totalDeleted += familiesResult.rowCount;
      if (verbose) {
        console.log(`   ✅ Deleted ${familiesResult.rowCount} families`);
      }
    } catch (error) {
      logger.error('Error deleting families:', error);
      errors.push({ table: 'families', error: error.message });
    }
    
    // 5. Delete households (references residents as house head)
    try {
      const householdsResult = await client.query(`
        DELETE FROM households
        WHERE house_head = ANY($1::varchar[])
      `, [orphanedResidentIds]);
      deletionStats.households = householdsResult.rowCount;
      totalDeleted += householdsResult.rowCount;
      if (verbose) {
        console.log(`   ✅ Deleted ${householdsResult.rowCount} households`);
      }
    } catch (error) {
      logger.error('Error deleting households:', error);
      errors.push({ table: 'households', error: error.message });
    }
    
    // 6. Delete pets (references residents)
    try {
      const petsResult = await client.query(`
        DELETE FROM pets
        WHERE owner_id = ANY($1::varchar[])
      `, [orphanedResidentIds]);
      deletionStats.pets = petsResult.rowCount;
      totalDeleted += petsResult.rowCount;
      if (verbose) {
        console.log(`   ✅ Deleted ${petsResult.rowCount} pets`);
      }
    } catch (error) {
      logger.error('Error deleting pets:', error);
      errors.push({ table: 'pets', error: error.message });
    }
    
    // 7. Delete resident classifications (references residents)
    try {
      const classificationsResult = await client.query(`
        DELETE FROM resident_classifications
        WHERE resident_id = ANY($1::varchar[])
      `, [orphanedResidentIds]);
      deletionStats.residentClassifications = classificationsResult.rowCount;
      totalDeleted += classificationsResult.rowCount;
      if (verbose) {
        console.log(`   ✅ Deleted ${classificationsResult.rowCount} resident classifications`);
      }
    } catch (error) {
      logger.error('Error deleting resident classifications:', error);
      errors.push({ table: 'resident_classifications', error: error.message });
    }
    
    // 8. Finally, delete the orphaned residents themselves
    try {
      // Delete in batches to avoid locking issues
      for (let i = 0; i < orphanedResidentIds.length; i += BATCH_SIZE) {
        const batch = orphanedResidentIds.slice(i, i + BATCH_SIZE);
        
        const residentsResult = await client.query(
          `DELETE FROM residents WHERE id = ANY($1::varchar[])`,
          [batch]
        );
        
        deletionStats.residents = (deletionStats.residents || 0) + residentsResult.rowCount;
        totalDeleted += residentsResult.rowCount;
        
        if (verbose) {
          console.log(`   ✅ Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${residentsResult.rowCount} residents`);
        }
      }
    } catch (error) {
      logger.error('Error deleting residents:', error);
      errors.push({ table: 'residents', error: error.message });
    }
    
    // Re-enable audit triggers before committing
    const enableTriggersSQL = `
      ALTER TABLE residents ENABLE TRIGGER audit_residents_trigger;
      ALTER TABLE households ENABLE TRIGGER audit_households_trigger;
      ALTER TABLE families ENABLE TRIGGER audit_families_trigger;
      ALTER TABLE family_members ENABLE TRIGGER audit_family_members_trigger;
      ALTER TABLE archives ENABLE TRIGGER audit_archives_trigger;
      ALTER TABLE inventories ENABLE TRIGGER audit_inventories_trigger;
      ALTER TABLE pets ENABLE TRIGGER audit_pets_trigger;
      ALTER TABLE requests ENABLE TRIGGER audit_requests_trigger;
    `;
    await client.query(enableTriggersSQL);
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Successfully deleted ${totalDeleted} orphaned records`);
    
    if (verbose) {
      console.log('\nDeletion Summary:');
      Object.entries(deletionStats).forEach(([table, count]) => {
        console.log(`   ${table}: ${count}`);
      });
    }
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Encountered ${errors.length} errors during deletion:`);
      errors.forEach((err, idx) => {
        console.log(`   Error ${idx + 1} (${err.table}): ${err.error}`);
      });
    }
    
    return { deleted: totalDeleted, errors, stats: deletionStats };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction failed, rolling back:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete orphaned requests by barangay (requests.barangay_id has no FK constraint)
 */
async function deleteOrphanedRequestsByBarangay(orphanedRequests, dryRun = false, verbose = false) {
  if (orphanedRequests.length === 0) {
    return { deleted: 0, errors: [] };
  }
  
  console.log(`🗑️  Found ${orphanedRequests.length} orphaned requests to delete.\n`);
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE: Showing orphaned requests that would be deleted...\n');
    
    orphanedRequests.slice(0, 20).forEach(request => {
      console.log(`   Would delete: Request #${request.id} (${request.type}, ${request.status}) - Missing Barangay: ${request.barangay_id}`);
    });
    
    if (orphanedRequests.length > 20) {
      console.log(`   ... and ${orphanedRequests.length - 20} more requests`);
    }
    
    console.log(`\n🔍 DRY RUN: Would delete ${orphanedRequests.length} orphaned requests`);
    return { deleted: 0, errors: [] };
  }
  
  console.log('🗑️  Deleting orphaned requests...\n');
  
  const client = await pool.connect();
  let totalDeleted = 0;
  const errors = [];
  
  try {
    await client.query('BEGIN');
    
    // Disable audit trigger for requests table
    await client.query('ALTER TABLE requests DISABLE TRIGGER audit_requests_trigger');
    
    // Get list of orphaned request IDs
    const orphanedRequestIds = orphanedRequests.map(r => r.id);
    
    // Delete in batches
    for (let i = 0; i < orphanedRequestIds.length; i += BATCH_SIZE) {
      const batch = orphanedRequestIds.slice(i, i + BATCH_SIZE);
      
      try {
        const result = await client.query(
          `DELETE FROM requests WHERE id = ANY($1::int[])`,
          [batch]
        );
        
        totalDeleted += result.rowCount;
        
        if (verbose) {
          console.log(`   ✅ Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.rowCount} requests`);
        }
      } catch (error) {
        logger.error(`Error deleting batch starting at index ${i}:`, error);
        errors.push({ batch: batch, error: error.message });
      }
    }
    
    // Re-enable audit trigger before committing
    await client.query('ALTER TABLE requests ENABLE TRIGGER audit_requests_trigger');
    
    await client.query('COMMIT');
    
    console.log(`✅ Successfully deleted ${totalDeleted} orphaned requests`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Encountered ${errors.length} errors during deletion:`);
      errors.forEach((err, idx) => {
        console.log(`   Error ${idx + 1}: ${err.error}`);
      });
    }
    
    return { deleted: totalDeleted, errors };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction failed, rolling back:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verify cleanup was successful
 */
async function verifyCleanup() {
  try {
    const remainingResidents = await findOrphanedResidents();
    const remainingRequests = await findOrphanedRequests();
    return {
      residents: remainingResidents.length,
      requests: remainingRequests.length
    };
  } catch (error) {
    logger.error('Error verifying cleanup:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  // Import modules after directory is set
  const dbModule = await import('../config/db.js');
  const loggerModule = await import('../utils/logger.js');
  pool = dbModule.pool;
  logger = loggerModule.default;
  
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  
  console.log('🧹 BIMS Orphaned Barangay Data Cleanup');
  console.log('======================================\n');
  
  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no records will be deleted\n');
  }
  
  if (verbose) {
    console.log('📢 Verbose mode enabled - showing detailed progress\n');
  }
  
  try {
    // Get statistics
    const stats = await getOrphanedStatistics();
    displayStatistics(stats, verbose);
    
    // If no orphaned data, exit early
    const totalOrphaned = Object.values(stats).reduce((sum, val) => sum + val, 0);
    if (totalOrphaned === 0) {
      return;
    }
    
    // Find orphaned residents and requests
    const orphanedResidents = await findOrphanedResidents();
    const orphanedRequests = await findOrphanedRequests();
    
    if (verbose && orphanedResidents.length > 0) {
      console.log('Sample orphaned residents:');
      orphanedResidents.slice(0, 10).forEach(resident => {
        console.log(`  - ${resident.name} (ID: ${resident.id}, Missing Barangay: ${resident.barangay_id})`);
      });
      if (orphanedResidents.length > 10) {
        console.log(`  ... and ${orphanedResidents.length - 10} more`);
      }
      console.log('');
    }
    
    if (verbose && orphanedRequests.length > 0) {
      console.log('Sample orphaned requests:');
      orphanedRequests.slice(0, 10).forEach(request => {
        console.log(`  - Request #${request.id} (${request.type}, ${request.status}) - Missing Barangay: ${request.barangay_id}`);
      });
      if (orphanedRequests.length > 10) {
        console.log(`  ... and ${orphanedRequests.length - 10} more`);
      }
      console.log('');
    }
    
    // Delete orphaned residents and their dependent data
    let totalDeleted = 0;
    if (orphanedResidents.length > 0) {
      const result = await deleteOrphanedData(orphanedResidents, dryRun, verbose);
      totalDeleted += result.deleted;
    }
    
    // Delete orphaned requests by barangay
    if (orphanedRequests.length > 0) {
      const requestsResult = await deleteOrphanedRequestsByBarangay(orphanedRequests, dryRun, verbose);
      totalDeleted += requestsResult.deleted;
    }
    
    // Verify cleanup
    if (!dryRun) {
      console.log('\n🔍 Verifying cleanup...');
      const remaining = await verifyCleanup();
      
      if (remaining.residents === 0 && remaining.requests === 0) {
        console.log('✅ Verification passed: No orphaned data remains.\n');
      } else {
        if (remaining.residents > 0) {
          console.log(`⚠️  Verification warning: ${remaining.residents} orphaned residents still remain.`);
        }
        if (remaining.requests > 0) {
          console.log(`⚠️  Verification warning: ${remaining.requests} orphaned requests still remain.`);
        }
        console.log('');
      }
    }
    
  } catch (error) {
    logger.error('Cleanup failed:', error);
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);

