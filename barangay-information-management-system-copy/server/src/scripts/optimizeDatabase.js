import { pool } from '../config/db.js';
import logger from '../utils/logger.js';
import { loadEnvConfig } from '../utils/envLoader.js';

// Load environment variables
loadEnvConfig();

/**
 * Database Optimization Script
 * Adds strategic indexes for better query performance
 */
async function optimizeDatabase() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting database optimization...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // 1. Residents table indexes
    logger.info('Creating residents table indexes...');
    
    const residentIndexes = [
      // Composite index for resident list queries
      `CREATE INDEX IF NOT EXISTS idx_residents_list_optimized 
       ON residents(barangay_id, resident_status, last_name, first_name)`,
      
      // Index for search functionality
      `CREATE INDEX IF NOT EXISTS idx_residents_search_optimized 
       ON residents USING gin(to_tsvector('english', last_name || ' ' || first_name || ' ' || COALESCE(middle_name, '')))`,
      
      // Index for age-based queries
      `CREATE INDEX IF NOT EXISTS idx_residents_birthdate_optimized 
       ON residents(birthdate) WHERE birthdate IS NOT NULL`,
      
      // Index for contact information
      `CREATE INDEX IF NOT EXISTS idx_residents_contact_optimized 
       ON residents(contact_number, email) WHERE contact_number IS NOT NULL OR email IS NOT NULL`
    ];
    
    for (const indexQuery of residentIndexes) {
      await client.query(indexQuery);
      logger.info(`Created index: ${indexQuery.split('idx_')[1]?.split(' ')[0]}`);
    }
    
    // 2. Resident classifications indexes
    logger.info('Creating resident classifications indexes...');
    
    const classificationIndexes = [
      // Composite index for classification queries
      `CREATE INDEX IF NOT EXISTS idx_resident_classifications_optimized 
       ON resident_classifications(resident_id, classification_type)`,
      
      // Index for classification type searches
      `CREATE INDEX IF NOT EXISTS idx_classification_types_search 
       ON resident_classifications(classification_type) WHERE classification_type IS NOT NULL`
    ];
    
    for (const indexQuery of classificationIndexes) {
      await client.query(indexQuery);
      logger.info(`Created index: ${indexQuery.split('idx_')[1]?.split(' ')[0]}`);
    }
    
    // 3. Households table indexes
    logger.info('Creating households table indexes...');
    
    const householdIndexes = [
      // Composite index for household queries
      `CREATE INDEX IF NOT EXISTS idx_households_location_optimized 
       ON households(barangay_id, purok_id, house_head)`,
      
      // Index for household search
      `CREATE INDEX IF NOT EXISTS idx_households_search_optimized 
       ON households(house_number, street) WHERE house_number IS NOT NULL OR street IS NOT NULL`,
      
      // Spatial index for GIS queries
      `CREATE INDEX IF NOT EXISTS idx_households_geom_optimized 
       ON households USING GIST (geom) WHERE geom IS NOT NULL`
    ];
    
    for (const indexQuery of householdIndexes) {
      await client.query(indexQuery);
      logger.info(`Created index: ${indexQuery.split('idx_')[1]?.split(' ')[0]}`);
    }
    
    // 4. Officials table indexes
    logger.info('Creating officials table indexes...');
    
    const officialIndexes = [
      // Composite index for official queries
      `CREATE INDEX IF NOT EXISTS idx_officials_barangay_position 
       ON officials(barangay_id, position, term_start, term_end)`,
      
      // Index for active officials (without date predicate)
      `CREATE INDEX IF NOT EXISTS idx_officials_active 
       ON officials(barangay_id, position) WHERE term_end IS NULL`
    ];
    
    for (const indexQuery of officialIndexes) {
      await client.query(indexQuery);
      logger.info(`Created index: ${indexQuery.split('idx_')[1]?.split(' ')[0]}`);
    }
    
    // 5. Requests table indexes
    logger.info('Creating requests table indexes...');
    
    const requestIndexes = [
      // Composite index for request queries
      `CREATE INDEX IF NOT EXISTS idx_requests_status_type 
       ON requests(barangay_id, status, type, created_at)`,
      
      // Index for pending requests
      `CREATE INDEX IF NOT EXISTS idx_requests_pending 
       ON requests(barangay_id, created_at) WHERE status = 'pending'::text`,
      
      // Index for request search
      `CREATE INDEX IF NOT EXISTS idx_requests_search 
       ON requests USING gin(to_tsvector('english', full_name || ' ' || COALESCE(purpose, '')))`
    ];
    
    for (const indexQuery of requestIndexes) {
      await client.query(indexQuery);
      logger.info(`Created index: ${indexQuery.split('idx_')[1]?.split(' ')[0]}`);
    }
    
    // 6. GIS table indexes
    logger.info('Creating GIS table indexes...');
    
    const gisIndexes = [
      // Spatial indexes for GIS queries
      `CREATE INDEX IF NOT EXISTS idx_gis_barangay_spatial 
       ON gis_barangay USING GIST (geom) WHERE geom IS NOT NULL`,
      
      `CREATE INDEX IF NOT EXISTS idx_gis_municipality_spatial 
       ON gis_municipality USING GIST (geom) WHERE geom IS NOT NULL`,
      
      // Code indexes for GIS data
      `CREATE INDEX IF NOT EXISTS idx_gis_barangay_codes 
       ON gis_barangay(gis_barangay_code, gis_municipality_code)`,
      
      `CREATE INDEX IF NOT EXISTS idx_gis_municipality_codes 
       ON gis_municipality(gis_municipality_code)`
    ];
    
    for (const indexQuery of gisIndexes) {
      await client.query(indexQuery);
      logger.info(`Created index: ${indexQuery.split('idx_')[1]?.split(' ')[0]}`);
    }
    
    // 7. Puroks table indexes
    logger.info('Creating puroks table indexes...');
    
    const purokIndexes = [
      // Index for purok list queries
      `CREATE INDEX IF NOT EXISTS idx_puroks_barangay_optimized 
       ON puroks(barangay_id, purok_name)`,
      
      // Index for purok search
      `CREATE INDEX IF NOT EXISTS idx_puroks_search_optimized 
       ON puroks USING gin(to_tsvector('english', purok_name || ' ' || COALESCE(purok_leader, '') || ' ' || COALESCE(description, '')))`,
      
      // Index for purok leader queries
      `CREATE INDEX IF NOT EXISTS idx_puroks_leader_optimized 
       ON puroks(purok_leader) WHERE purok_leader IS NOT NULL`
    ];
    
    for (const indexQuery of purokIndexes) {
      await client.query(indexQuery);
      logger.info(`Created index: ${indexQuery.split('idx_')[1]?.split(' ')[0]}`);
    }
    
    // 8. Purok-related statistics indexes
    logger.info('Creating purok statistics indexes...');
    
    const purokStatsIndexes = [
      // Index for household-purok relationships
      `CREATE INDEX IF NOT EXISTS idx_households_purok_optimized 
       ON households(purok_id, barangay_id)`,
      
      // Index for family-purok relationships (via households)
      `CREATE INDEX IF NOT EXISTS idx_families_purok_optimized 
       ON families(household_id)`,
      
      // Index for family members purok filtering
      `CREATE INDEX IF NOT EXISTS idx_family_members_purok_optimized 
       ON family_members(family_id)`,
      
      // Index for residents in puroks (house heads) - simplified
      `CREATE INDEX IF NOT EXISTS idx_residents_purok_house_heads 
       ON residents(id, barangay_id)`,
      
      // Index for residents in puroks (family members) - simplified  
      `CREATE INDEX IF NOT EXISTS idx_residents_purok_family_members 
       ON residents(id, barangay_id)`,
      
      // Index for pets in puroks
      `CREATE INDEX IF NOT EXISTS idx_pets_purok_optimized 
       ON pets(owner_id)`,
      
      // Composite index for purok statistics queries
      `CREATE INDEX IF NOT EXISTS idx_purok_stats_composite 
       ON households(purok_id, barangay_id, house_head)`,
      
      // Index for purok-based family queries
      `CREATE INDEX IF NOT EXISTS idx_families_purok_stats 
       ON families(household_id, family_head)`,
      
      // Index for purok-based family member queries  
      `CREATE INDEX IF NOT EXISTS idx_family_members_purok_stats 
       ON family_members(family_id, family_member)`
    ];
    
    for (const indexQuery of purokStatsIndexes) {
      await client.query(indexQuery);
      logger.info(`Created index: ${indexQuery.split('idx_')[1]?.split(' ')[0]}`);
    }
    
    // 9. Statistics and analytics indexes
    logger.info('Creating statistics indexes...');
    
    const statisticsIndexes = [
      // Index for age group queries
      `CREATE INDEX IF NOT EXISTS idx_residents_age_groups 
       ON residents(barangay_id, birthdate) WHERE birthdate IS NOT NULL`,
      
      // Index for status-based statistics
      `CREATE INDEX IF NOT EXISTS idx_residents_status_stats 
       ON residents(barangay_id, resident_status, created_at)`,
      
      // Index for classification statistics
      `CREATE INDEX IF NOT EXISTS idx_classifications_stats 
       ON resident_classifications(classification_type) WHERE classification_type IS NOT NULL`
    ];
    
    for (const indexQuery of statisticsIndexes) {
      await client.query(indexQuery);
      logger.info(`Created index: ${indexQuery.split('idx_')[1]?.split(' ')[0]}`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('Database optimization completed successfully!');
    
    // Get index statistics
    const indexStats = await client.query(`
      SELECT 
        schemaname,
        relname as tablename,
        indexrelname as indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes 
      WHERE indexrelname LIKE 'idx_%'
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 20
    `);
    
    logger.info('Top 20 indexes by size:');
    indexStats.rows.forEach(row => {
      logger.info(`  ${row.tablename}.${row.indexname}: ${row.index_size}`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Database optimization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run optimization if called directly
const decodedUrl = decodeURIComponent(import.meta.url);
const normalizedArgv = process.argv[1].replace(/\\/g, '/');
const normalizedUrl = decodedUrl.replace(/\\/g, '/');

if (decodedUrl === `file://${process.argv[1]}` || normalizedUrl.includes(normalizedArgv)) {
  console.log('🔧 Starting database optimization...');
  optimizeDatabase()
    .then(() => {
      console.log('✅ Database optimization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database optimization failed:', error);
      process.exit(1);
    });
}

export default optimizeDatabase;
