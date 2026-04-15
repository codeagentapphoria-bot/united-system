# TICKET-010: Deprecated v1 Migration Scripts Reference Dropped Schema

**Title**: Migration Scripts Still Reference Citizens, Non-Citizens, Puroks Tables
**Type**: Chore
**Priority**: Medium
**Description**: Several migration scripts are marked as DEPRECATED and reference tables that no longer exist in v2 schema (citizens, non_citizens, puroks). These scripts will fail and could confuse developers.
**Steps to Reproduce** (if applicable):
1. Try to run any migration script
2. Observe errors about missing tables
**Expected Behavior**: Deprecated scripts should be removed or clearly marked as incompatible with v2.
**Actual Behavior**: Scripts reference dropped v1 tables and are marked DEPRECATED but not removed.
**Suggested Fix / Approach**: Move deprecated scripts to archive/deprecated-migrations/ folder. Add a README explaining these are for v1 only. Or delete them entirely if v1 rollback is no longer needed.
**Affected Files**:
- barangay-information-management-system-copy/server/src/scripts/unifiedMigration.js (line 2 - DEPRECATED v1 only)
- barangay-information-management-system-copy/server/src/scripts/seedDatabase.js (line 2 - DEPRECATED)
- barangay-information-management-system-copy/server/src/scripts/rollbackMigration.js (line 2 - DEPRECATED)
- barangay-information-management-system-copy/server/src/scripts/migrateDB.js (references dropped entities)