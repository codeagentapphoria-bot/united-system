# TICKET-036: Deprecated v1 Migration Scripts Still Present

**Title**: v1-Only Migration Scripts Not Removed After Schema Upgrade
**Type**: Chore
**Priority**: Medium
**Description**: Deprecated migration scripts that reference v1 schema (citizens, non_citizens, puroks, subscribers) are still present in the codebase. These scripts are marked DEPRECATED but not removed, which could cause confusion or accidental execution.
**Steps to Reproduce** (if applicable):
1. Navigate to barangay-information-management-system-copy/server/src/scripts/
2. Observe scripts marked DEPRECATED that reference dropped tables
**Expected Behavior**: Deprecated scripts should be removed or moved to archive/deprecated-migrations/ to prevent accidental use.
**Actual Behavior**: Scripts marked DEPRECATED still reference v1-only tables and will fail on v2 schema.
**Suggested Fix / Approach**: Move deprecated scripts to archive/deprecated-migrations/ folder. Add README explaining these are for v1 only. Or delete entirely if v1 rollback is no longer needed.
**Affected Files**:
- barangay-information-management-system-copy/server/src/scripts/unifiedMigration.js (marked DEPRECATED v1 only)
- barangay-information-management-system-copy/server/src/scripts/seedDatabase.js (marked DEPRECATED)
- barangay-information-management-system-copy/server/src/scripts/rollbackMigration.js (marked DEPRECATED)
- barangay-information-management-system-copy/server/src/scripts/migrateDB.js (references dropped entities)