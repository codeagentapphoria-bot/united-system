// Set current user before making chang
export const SET_CONFIG = `SELECT set_config('audit.user_id', '1', false);`;

// Get audit logs for specific barangay
export const GET_BARANGAY_LOGS = `SELECT * FROM get_barangay_audit_logs($1, 50);`; // ID , LIMIT

// Get all audit logs across all barangays
export const GET_ALL_LOGS = `SELECT * FROM get_all_audit_logs(100);`; // LIMIT

// Get history for a specific record
export const GET_LOGS_SPECIFIC = `SELECT * FROM get_record_audit_history($1, $2);`; // TABLE, ID
