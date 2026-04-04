import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import { loadEnvConfig } from "../utils/envLoader.js";

// Load environment variables
loadEnvConfig();

async function cleanupAuditSystem() {
  const client = await pool.connect();
  
  try {
    logger.info("Cleaning up audit system...");
    
    // Drop audit triggers if they exist
    const dropTriggersSQL = `
      DROP TRIGGER IF EXISTS audit_residents_trigger ON residents;
      DROP TRIGGER IF EXISTS audit_households_trigger ON households;
      DROP TRIGGER IF EXISTS audit_families_trigger ON families;
      DROP TRIGGER IF EXISTS audit_family_members_trigger ON family_members;
      DROP TRIGGER IF EXISTS audit_archives_trigger ON archives;
      DROP TRIGGER IF EXISTS audit_inventories_trigger ON inventories;
      DROP TRIGGER IF EXISTS audit_pets_trigger ON pets;
      DROP TRIGGER IF EXISTS audit_requests_trigger ON requests;
    `;
    
    await client.query(dropTriggersSQL);
    logger.info("Audit triggers dropped");
    
    // Drop audit functions if they exist
    const dropFunctionsSQL = `
      DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;
      DROP FUNCTION IF EXISTS get_current_audit_user() CASCADE;
      DROP FUNCTION IF EXISTS get_barangay_audit_logs(INTEGER, INTEGER) CASCADE;
      DROP FUNCTION IF EXISTS get_all_audit_logs(INTEGER) CASCADE;
      DROP FUNCTION IF EXISTS get_record_audit_history(VARCHAR, VARCHAR) CASCADE;
    `;
    
    await client.query(dropFunctionsSQL);
    logger.info("Audit functions dropped");
    
    // Drop audit_logs table if it exists
    await client.query("DROP TABLE IF EXISTS audit_logs CASCADE");
    logger.info("Audit logs table dropped");
    
    logger.info("Audit system cleanup completed successfully");
    
  } catch (error) {
    logger.error("Error during audit system cleanup:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run the cleanup if this script is executed directly
const decodedUrl = decodeURIComponent(import.meta.url);
const normalizedArgv = process.argv[1].replace(/\\/g, '/');
const normalizedUrl = decodedUrl.replace(/\\/g, '/');

if (decodedUrl === `file://${process.argv[1]}` || normalizedUrl.includes(normalizedArgv)) {
  console.log("Starting audit system cleanup...");
  cleanupAuditSystem()
    .then(() => {
      console.log("Audit system cleanup completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Audit system cleanup failed:", error);
      process.exit(1);
    });
}

export default cleanupAuditSystem;
