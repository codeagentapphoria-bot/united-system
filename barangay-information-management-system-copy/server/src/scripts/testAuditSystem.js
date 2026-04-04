import { pool } from '../config/db.js';
import logger from '../utils/logger.js';
import { loadEnvConfig } from '../utils/envLoader.js';

// Load environment variables
loadEnvConfig();

async function testAuditSystem() {
  const client = await pool.connect();
  
  try {
    logger.info("Testing audit system...");
    
    // Test 1: Check if audit_logs table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      logger.info("✅ Audit logs table exists");
    } else {
      logger.error("❌ Audit logs table does not exist");
      return;
    }
    
    // Test 2: Check if functions exist
    const functionCheck = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name IN (
        'get_current_audit_user',
        'audit_trigger_function',
        'get_barangay_audit_logs',
        'get_all_audit_logs',
        'get_record_audit_history'
      );
    `);
    
    const expectedFunctions = [
      'get_current_audit_user',
      'audit_trigger_function', 
      'get_barangay_audit_logs',
      'get_all_audit_logs',
      'get_record_audit_history'
    ];
    
    const foundFunctions = functionCheck.rows.map(row => row.routine_name);
    logger.info(`✅ Found ${foundFunctions.length} audit functions: ${foundFunctions.join(', ')}`);
    
    // Test 3: Check if triggers exist
    const triggerCheck = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND trigger_name LIKE 'audit_%';
    `);
    
    const foundTriggers = triggerCheck.rows.map(row => row.trigger_name);
    logger.info(`✅ Found ${foundTriggers.length} audit triggers: ${foundTriggers.join(', ')}`);
    
    // Test 4: Test the helper functions
    try {
      const allLogsResult = await client.query('SELECT * FROM get_all_audit_logs(5)');
      logger.info(`✅ get_all_audit_logs function works - returned ${allLogsResult.rows.length} records`);
    } catch (error) {
      logger.error(`❌ get_all_audit_logs function failed: ${error.message}`);
    }
    
    // Test 5: Check if there are any existing audit logs
    const logCount = await client.query('SELECT COUNT(*) as count FROM audit_logs');
    logger.info(`📊 Current audit logs count: ${logCount.rows[0].count}`);
    
    logger.info("🎉 Audit system test completed successfully!");
    
  } catch (error) {
    logger.error("❌ Error during audit system test:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run the test
testAuditSystem()
  .then(() => {
    logger.info("Audit system test completed");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Audit system test failed:", error);
    process.exit(1);
  });
