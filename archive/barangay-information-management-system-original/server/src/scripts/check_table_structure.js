import { Pool } from 'pg';
import { loadEnvConfig } from '../utils/envLoader.js';

// Load environment variables
loadEnvConfig();

async function checkTableStructure() {
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
    console.log('🔍 Checking classification_types table structure...\n');
    
    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'classification_types'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ classification_types table does not exist.');
      return;
    }
    
    console.log('✅ classification_types table exists.\n');
    
    // Get all columns
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'classification_types'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Current columns in classification_types table:');
    columns.rows.forEach(column => {
      console.log(`   - ${column.column_name} (${column.data_type}) ${column.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check for barangay_id vs municipality_id
    const hasBarangayId = columns.rows.some(col => col.column_name === 'barangay_id');
    const hasMunicipalityId = columns.rows.some(col => col.column_name === 'municipality_id');
    
    console.log('\n🔍 Migration Status:');
    if (hasBarangayId && !hasMunicipalityId) {
      console.log('⚠️  Table has barangay_id but NO municipality_id - Migration needed!');
      console.log('💡 Run: npm run db:migrate-classification-to-municipality');
    } else if (!hasBarangayId && hasMunicipalityId) {
      console.log('✅ Table has municipality_id but NO barangay_id - Already migrated!');
    } else if (hasBarangayId && hasMunicipalityId) {
      console.log('⚠️  Table has BOTH barangay_id and municipality_id - Migration in progress!');
    } else {
      console.log('❓ Table has neither barangay_id nor municipality_id - Check table structure!');
    }
    
    // Count records
    const count = await client.query('SELECT COUNT(*) as count FROM classification_types');
    console.log(`\n📊 Total records: ${count.rows[0].count}`);
    
    // Show constraints
    const constraints = await client.query(`
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        confrelid::regclass as foreign_table
      FROM pg_constraint 
      WHERE conrelid = 'classification_types'::regclass;
    `);
    
    if (constraints.rows.length > 0) {
      console.log('\n🔐 Constraints:');
      constraints.rows.forEach(constraint => {
        const type = {
          'p': 'PRIMARY KEY',
          'f': 'FOREIGN KEY',
          'u': 'UNIQUE',
          'c': 'CHECK'
        }[constraint.constraint_type] || constraint.constraint_type;
        
        console.log(`   - ${constraint.constraint_name} (${type})`);
      });
    }
    
    // Show indexes
    const indexes = await client.query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'classification_types';
    `);
    
    if (indexes.rows.length > 0) {
      console.log('\n📇 Indexes:');
      indexes.rows.forEach(index => {
        console.log(`   - ${index.indexname}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function if this file is executed directly
// Always run for now (fix for Windows path issues)
checkTableStructure()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });

export default checkTableStructure;
