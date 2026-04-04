import { Pool } from 'pg';
import { loadEnvConfig } from '../utils/envLoader.js';

// Load environment variables
loadEnvConfig();

async function migrateClassificationTypesToMunicipality() {
  const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT || 5432,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting Classification Types Migration: barangay_id → municipality_id\n');
    
    // Step 1: Check if the table exists and has barangay_id column
    console.log('📋 Step 1: Checking current table structure...');
    const tableCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'classification_types' 
      AND column_name = 'barangay_id'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ Table does not exist or barangay_id column not found.');
      console.log('💡 This script is for migrating from barangay_id to municipality_id.');
      console.log('💡 If you already have municipality_id, no migration is needed.');
      return;
    }
    
    // Check if municipality_id column already exists
    const municipalityCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'classification_types' 
      AND column_name = 'municipality_id'
    `);
    
    if (municipalityCheck.rows.length > 0) {
      console.log('✅ municipality_id column already exists.');
      console.log('💡 Checking if barangay_id still exists...');
      
      // Check if barangay_id still exists
      const barangayCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'classification_types' 
        AND column_name = 'barangay_id'
      `);
      
      if (barangayCheck.rows.length > 0) {
        console.log('⚠️  barangay_id column still exists. Completing migration...\n');
        // Continue with the migration to remove barangay_id
      } else {
        console.log('✅ barangay_id column already removed. Migration completed!');
        return;
      }
    }
    
    console.log('✅ Found barangay_id column. Proceeding with migration...\n');
    
    // Step 2: Add municipality_id column (skip if already exists)
    if (municipalityCheck.rows.length === 0) {
      console.log('📋 Step 2: Adding municipality_id column...');
      await client.query(`
        ALTER TABLE classification_types 
        ADD COLUMN municipality_id INTEGER;
      `);
      console.log('✅ municipality_id column added successfully.\n');
    } else {
      console.log('📋 Step 2: municipality_id column already exists, skipping...\n');
    }
    
    // Step 3: Update municipality_id values based on barangay's municipality
    console.log('📋 Step 3: Updating municipality_id values...');
    const updateResult = await client.query(`
      UPDATE classification_types 
      SET municipality_id = (
        SELECT municipality_id 
        FROM barangays 
        WHERE barangays.id = classification_types.barangay_id
      )
      WHERE barangay_id IS NOT NULL;
    `);
    console.log(`✅ Updated ${updateResult.rowCount} records.\n`);
    
    // Step 4: Remove duplicates (keep first occurrence of each name per municipality)
    console.log('📋 Step 4: Removing duplicate classification types...');
    const duplicateResult = await client.query(`
      DELETE FROM classification_types 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM classification_types 
        GROUP BY municipality_id, name
      );
    `);
    console.log(`✅ Removed ${duplicateResult.rowCount} duplicate records.\n`);
    
    // Step 5: Set municipality_id as NOT NULL
    console.log('📋 Step 5: Setting municipality_id as NOT NULL...');
    await client.query(`
      ALTER TABLE classification_types 
      ALTER COLUMN municipality_id SET NOT NULL;
    `);
    console.log('✅ municipality_id set as NOT NULL.\n');
    
    // Step 6: Add foreign key constraint
    console.log('📋 Step 6: Adding foreign key constraint...');
    try {
      await client.query(`
        ALTER TABLE classification_types 
        ADD CONSTRAINT fk_classification_types_municipality 
        FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE CASCADE;
      `);
      console.log('✅ Foreign key constraint added successfully.\n');
    } catch (error) {
      if (error.code === '42710') {
        console.log('⚠️  Foreign key constraint already exists.\n');
      } else {
        throw error;
      }
    }
    
    // Step 7: Update unique constraint
    console.log('📋 Step 7: Updating unique constraint...');
    try {
      await client.query(`
        ALTER TABLE classification_types 
        DROP CONSTRAINT IF EXISTS classification_types_barangay_id_name_key;
      `);
      
      await client.query(`
        ALTER TABLE classification_types 
        ADD CONSTRAINT classification_types_municipality_id_name_key 
        UNIQUE (municipality_id, name);
      `);
      console.log('✅ Unique constraint updated successfully.\n');
    } catch (error) {
      if (error.code === '42710' || error.code === '42P07') {
        console.log('⚠️  Unique constraint already exists.\n');
      } else {
        throw error;
      }
    }
    
    // Step 8: Update indexes
    console.log('📋 Step 8: Updating indexes...');
    await client.query(`
      DROP INDEX IF EXISTS idx_classification_types_barangay;
    `);
    
    try {
      await client.query(`
        CREATE INDEX idx_classification_types_municipality ON classification_types(municipality_id);
      `);
      console.log('✅ Indexes updated successfully.\n');
    } catch (error) {
      if (error.code === '42P07') {
        console.log('⚠️  Index already exists.\n');
      } else {
        throw error;
      }
    }
    
    // Step 9: Remove barangay_id column
    console.log('📋 Step 9: Removing barangay_id column...');
    await client.query(`
      ALTER TABLE classification_types 
      DROP COLUMN barangay_id;
    `);
    console.log('✅ barangay_id column removed successfully.\n');
    
    // Step 10: Show migration summary
    console.log('📋 Step 10: Migration Summary');
    const { rows: totalCount } = await client.query('SELECT COUNT(*) as count FROM classification_types');
    console.log(`📊 Total classification types in database: ${totalCount[0].count}`);
    
    const { rows: municipalities } = await client.query(`
      SELECT 
        m.municipality_name,
        COUNT(ct.id) as classification_count
      FROM municipalities m
      LEFT JOIN classification_types ct ON m.id = ct.municipality_id
      GROUP BY m.id, m.municipality_name
      ORDER BY m.id
    `);
    
    console.log('\n📊 Classification types by municipality:');
    municipalities.forEach(municipality => {
      console.log(`   🏛️  ${municipality.municipality_name}: ${municipality.classification_count} types`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ All classification types now use municipality_id');
    console.log('✅ All barangays within a municipality share the same classification types');
    console.log('✅ System is ready for production use');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}` || decodeURIComponent(import.meta.url) === `file://${process.argv[1]}`) {
  migrateClassificationTypesToMunicipality()
    .then(() => {
      console.log('\n✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateClassificationTypesToMunicipality;
