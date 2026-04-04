import { pool } from '../config/db.js';
import logger from '../utils/logger.js';
import { loadEnvConfig } from '../utils/envLoader.js';

// Load environment variables
loadEnvConfig();

async function setupAuditSystem() {
  const client = await pool.connect();
  
  try {
    logger.info("Setting up audit system...");
    
    // Create audit_logs table
    const createAuditTableSQL = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        barangay_id INTEGER,
        table_name VARCHAR(50) NOT NULL,
        operation VARCHAR(10) NOT NULL,
        record_id VARCHAR(20) NOT NULL,
        old_values JSONB,
        new_values JSONB,
        changed_by INTEGER,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE SET NULL,
        FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
      );
    `;
    
    await client.query(createAuditTableSQL);
    logger.info("Audit logs table created");
    
    // Create indexes
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_audit_logs_barangay_id ON audit_logs(barangay_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs(operation);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
    `;
    
    await client.query(createIndexesSQL);
    logger.info("Audit indexes created");
    
    // Create helper function for getting current user
    const createGetCurrentUserSQL = `
      CREATE OR REPLACE FUNCTION get_current_audit_user()
      RETURNS INTEGER AS $$
      BEGIN
          RETURN COALESCE(current_setting('audit.user_id', true)::INTEGER, NULL);
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await client.query(createGetCurrentUserSQL);
    logger.info("get_current_audit_user function created");
    
    // Create audit trigger function
    const createAuditTriggerSQL = `
      CREATE OR REPLACE FUNCTION audit_trigger_function()
      RETURNS TRIGGER AS $$
      DECLARE
          audit_barangay_id INTEGER := NULL;
          audit_record_id VARCHAR(20);
          audit_old_values JSONB := NULL;
          audit_new_values JSONB := NULL;
      BEGIN
          -- Determine barangay_id based on table
          IF TG_TABLE_NAME = 'residents' THEN
              IF TG_OP = 'DELETE' THEN
                  audit_barangay_id := OLD.barangay_id;
                  audit_record_id := OLD.id;
              ELSE
                  audit_barangay_id := NEW.barangay_id;
                  audit_record_id := NEW.id;
              END IF;
          
          ELSIF TG_TABLE_NAME = 'households' THEN
              IF TG_OP = 'DELETE' THEN
                  audit_barangay_id := OLD.barangay_id;
                  audit_record_id := OLD.id::VARCHAR;
              ELSE
                  audit_barangay_id := NEW.barangay_id;
                  audit_record_id := NEW.id::VARCHAR;
              END IF;
          
          ELSIF TG_TABLE_NAME = 'families' THEN
              IF TG_OP = 'DELETE' THEN
                  SELECT h.barangay_id INTO audit_barangay_id 
                  FROM households h WHERE h.id = OLD.household_id;
                  audit_record_id := OLD.id::VARCHAR;
              ELSE
                  SELECT h.barangay_id INTO audit_barangay_id 
                  FROM households h WHERE h.id = NEW.household_id;
                  audit_record_id := NEW.id::VARCHAR;
              END IF;
          
          ELSIF TG_TABLE_NAME = 'family_members' THEN
              IF TG_OP = 'DELETE' THEN
                  SELECT h.barangay_id INTO audit_barangay_id 
                  FROM families f 
                  JOIN households h ON h.id = f.household_id 
                  WHERE f.id = OLD.family_id;
                  audit_record_id := OLD.id::VARCHAR;
              ELSE
                  SELECT h.barangay_id INTO audit_barangay_id 
                  FROM families f 
                  JOIN households h ON h.id = f.household_id 
                  WHERE f.id = NEW.family_id;
                  audit_record_id := NEW.id::VARCHAR;
              END IF;
          
          ELSIF TG_TABLE_NAME = 'archives' THEN
              IF TG_OP = 'DELETE' THEN
                  audit_barangay_id := OLD.barangay_id;
                  audit_record_id := OLD.id::VARCHAR;
              ELSE
                  audit_barangay_id := NEW.barangay_id;
                  audit_record_id := NEW.id::VARCHAR;
              END IF;
          
          ELSIF TG_TABLE_NAME = 'inventories' THEN
              IF TG_OP = 'DELETE' THEN
                  audit_barangay_id := OLD.barangay_id;
                  audit_record_id := OLD.id::VARCHAR;
              ELSE
                  audit_barangay_id := NEW.barangay_id;
                  audit_record_id := NEW.id::VARCHAR;
              END IF;
          
          ELSIF TG_TABLE_NAME = 'pets' THEN
              IF TG_OP = 'DELETE' THEN
                  SELECT r.barangay_id INTO audit_barangay_id 
                  FROM residents r WHERE r.id = OLD.owner_id;
                  audit_record_id := OLD.id::VARCHAR;
              ELSE
                  SELECT r.barangay_id INTO audit_barangay_id 
                  FROM residents r WHERE r.id = NEW.owner_id;
                  audit_record_id := NEW.id::VARCHAR;
              END IF;
          
          ELSIF TG_TABLE_NAME = 'requests' THEN
              IF TG_OP = 'DELETE' THEN
                  audit_barangay_id := OLD.barangay_id;
                  audit_record_id := OLD.id::VARCHAR;
              ELSE
                  audit_barangay_id := NEW.barangay_id;
                  audit_record_id := NEW.id::VARCHAR;
              END IF;
          END IF;

          -- Set old and new values based on operation
          IF TG_OP = 'DELETE' THEN
              audit_old_values := to_jsonb(OLD);
          ELSIF TG_OP = 'INSERT' THEN
              audit_new_values := to_jsonb(NEW);
          ELSIF TG_OP = 'UPDATE' THEN
              audit_old_values := to_jsonb(OLD);
              audit_new_values := to_jsonb(NEW);
          END IF;

                     -- For households, add house head name to the audit data
           IF TG_TABLE_NAME = 'households' THEN
               DECLARE
                   house_head_name VARCHAR(200);
                   house_head_data JSONB;
               BEGIN
                   IF TG_OP = 'DELETE' THEN
                       -- Get house head name and data for deleted record
                       SELECT TRIM(REGEXP_REPLACE(
                                  CONCAT_WS(' ', 
                                    NULLIF(first_name, ''), 
                                    NULLIF(middle_name, ''), 
                                    NULLIF(last_name, ''), 
                                    NULLIF(suffix, '')
                                  ), 
                                  '\\s+', ' ', 'g'
                                )),
                              to_jsonb(r.*)
                       INTO house_head_name, house_head_data
                       FROM residents r WHERE r.id = OLD.house_head;
                       
                       -- Only add to audit if we found the resident
                       IF house_head_name IS NOT NULL AND house_head_name != '' THEN
                           audit_old_values := audit_old_values || jsonb_build_object('house_head_name', house_head_name, 'house_head_data', house_head_data);
                       END IF;
                   ELSIF TG_OP = 'INSERT' THEN
                       -- Get house head name and data for inserted record
                       SELECT TRIM(REGEXP_REPLACE(
                                  CONCAT_WS(' ', 
                                    NULLIF(first_name, ''), 
                                    NULLIF(middle_name, ''), 
                                    NULLIF(last_name, ''), 
                                    NULLIF(suffix, '')
                                  ), 
                                  '\\s+', ' ', 'g'
                                )),
                              to_jsonb(r.*)
                       INTO house_head_name, house_head_data
                       FROM residents r WHERE r.id = NEW.house_head;
                       
                       -- Only add to audit if we found the resident
                       IF house_head_name IS NOT NULL AND house_head_name != '' THEN
                           audit_new_values := audit_new_values || jsonb_build_object('house_head_name', house_head_name, 'house_head_data', house_head_data);
                       END IF;
                   ELSIF TG_OP = 'UPDATE' THEN
                       -- Get house head name and data for updated record
                       SELECT TRIM(REGEXP_REPLACE(
                                  CONCAT_WS(' ', 
                                    NULLIF(first_name, ''), 
                                    NULLIF(middle_name, ''), 
                                    NULLIF(last_name, ''), 
                                    NULLIF(suffix, '')
                                  ), 
                                  '\\s+', ' ', 'g'
                                )),
                              to_jsonb(r.*)
                       INTO house_head_name, house_head_data
                       FROM residents r WHERE r.id = NEW.house_head;
                       
                       -- Only add to audit if we found the resident
                       IF house_head_name IS NOT NULL AND house_head_name != '' THEN
                           audit_new_values := audit_new_values || jsonb_build_object('house_head_name', house_head_name, 'house_head_data', house_head_data);
                       END IF;
                   END IF;
               END;
           END IF;

          -- Insert audit record
          INSERT INTO audit_logs (
              barangay_id,
              table_name,
              operation,
              record_id,
              old_values,
              new_values,
              changed_by,
              changed_at
          ) VALUES (
              audit_barangay_id,
              TG_TABLE_NAME,
              TG_OP,
              audit_record_id,
              audit_old_values,
              audit_new_values,
              get_current_audit_user(),
              CURRENT_TIMESTAMP
          );

          -- Return appropriate value
          IF TG_OP = 'DELETE' THEN
              RETURN OLD;
          ELSE
              RETURN NEW;
          END IF;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await client.query(createAuditTriggerSQL);
    logger.info("audit_trigger_function created");
    
    // Create helper functions for querying audit logs
    const createHelperFunctionsSQL = `
      -- Get audit logs for a specific barangay
      CREATE OR REPLACE FUNCTION get_barangay_audit_logs(p_barangay_id INTEGER, p_limit INTEGER DEFAULT 100)
      RETURNS TABLE (
          id INTEGER,
          table_name VARCHAR(50),
          operation VARCHAR(10),
          record_id VARCHAR(20),
          old_values JSONB,
          new_values JSONB,
          changed_by INTEGER,
          user_name VARCHAR(100),
          changed_at TIMESTAMP
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              al.id,
              al.table_name,
              al.operation,
              al.record_id,
              al.old_values,
              al.new_values,
              al.changed_by,
              u.full_name as user_name,
              al.changed_at
          FROM audit_logs al
          LEFT JOIN users u ON u.id = al.changed_by
          WHERE al.barangay_id = p_barangay_id
          ORDER BY al.changed_at DESC
          LIMIT p_limit;
      END;
      $$ LANGUAGE plpgsql;

      -- Get all audit logs (system-wide)
      CREATE OR REPLACE FUNCTION get_all_audit_logs(p_limit INTEGER DEFAULT 100)
      RETURNS TABLE (
          id INTEGER,
          barangay_id INTEGER,
          barangay_name VARCHAR(50),
          table_name VARCHAR(50),
          operation VARCHAR(10),
          record_id VARCHAR(20),
          old_values JSONB,
          new_values JSONB,
          changed_by INTEGER,
          user_name VARCHAR(100),
          changed_at TIMESTAMP
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              al.id,
              al.barangay_id,
              b.barangay_name,
              al.table_name,
              al.operation,
              al.record_id,
              al.old_values,
              al.new_values,
              al.changed_by,
              u.full_name as user_name,
              al.changed_at
          FROM audit_logs al
          LEFT JOIN users u ON u.id = al.changed_by
          LEFT JOIN barangays b ON b.id = al.barangay_id
          ORDER BY al.changed_at DESC
          LIMIT p_limit;
      END;
      $$ LANGUAGE plpgsql;

      -- Get audit logs for a specific record
      CREATE OR REPLACE FUNCTION get_record_audit_history(p_table_name VARCHAR(50), p_record_id VARCHAR(20))
      RETURNS TABLE (
          id INTEGER,
          operation VARCHAR(10),
          old_values JSONB,
          new_values JSONB,
          changed_by INTEGER,
          user_name VARCHAR(100),
          changed_at TIMESTAMP
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              al.id,
              al.operation,
              al.old_values,
              al.new_values,
              al.changed_by,
              u.full_name as user_name,
              al.changed_at
          FROM audit_logs al
          LEFT JOIN users u ON u.id = al.changed_by
          WHERE al.table_name = p_table_name AND al.record_id = p_record_id
          ORDER BY al.changed_at DESC;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await client.query(createHelperFunctionsSQL);
    logger.info("Helper functions created");
    
    // Create triggers for all tables
    const createTriggersSQL = `
      DROP TRIGGER IF EXISTS audit_residents_trigger ON residents;
      DROP TRIGGER IF EXISTS audit_households_trigger ON households;
      DROP TRIGGER IF EXISTS audit_families_trigger ON families;
      DROP TRIGGER IF EXISTS audit_family_members_trigger ON family_members;
      DROP TRIGGER IF EXISTS audit_archives_trigger ON archives;
      DROP TRIGGER IF EXISTS audit_inventories_trigger ON inventories;
      DROP TRIGGER IF EXISTS audit_pets_trigger ON pets;
      DROP TRIGGER IF EXISTS audit_requests_trigger ON requests;

      CREATE TRIGGER audit_residents_trigger
          AFTER INSERT OR UPDATE OR DELETE ON residents
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

      CREATE TRIGGER audit_households_trigger
          AFTER INSERT OR UPDATE OR DELETE ON households
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

      CREATE TRIGGER audit_families_trigger
          AFTER INSERT OR UPDATE OR DELETE ON families
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

      CREATE TRIGGER audit_family_members_trigger
          AFTER INSERT OR UPDATE OR DELETE ON family_members
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

      CREATE TRIGGER audit_archives_trigger
          AFTER INSERT OR UPDATE OR DELETE ON archives
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

      CREATE TRIGGER audit_inventories_trigger
          AFTER INSERT OR UPDATE OR DELETE ON inventories
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

      CREATE TRIGGER audit_pets_trigger
          AFTER INSERT OR UPDATE OR DELETE ON pets
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

      CREATE TRIGGER audit_requests_trigger
          AFTER INSERT OR UPDATE OR DELETE ON requests
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    `;
    
    await client.query(createTriggersSQL);
    logger.info("Audit triggers created");
    
    logger.info("Audit system setup completed successfully");
    
  } catch (error) {
    logger.error("Error during audit system setup:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run the setup if this script is executed directly
setupAuditSystem()
  .then(() => {
    logger.info("Audit system setup completed");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Audit system setup failed:", error);
    process.exit(1);
  });

export default setupAuditSystem;
