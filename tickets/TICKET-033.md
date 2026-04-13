# TICKET-033: Migration Scripts Reference Dropped v1 Schema Tables

**Title**: Multiple Migration Scripts Reference Tables Removed in v2 Schema
**Type**: Bug
**Priority**: High
**Description**: Migration scripts reference tables that no longer exist in the v2 schema (citizens, non_citizens, puroks, subscribers, citizen_resident_mapping). Running these scripts against a v2 database will fail.
**Steps to Reproduce** (if applicable):
1. Run rollback.sql against v2 database
2. Observe errors about missing tables
**Expected Behavior**: All migration scripts should be compatible with v2 schema or clearly marked as v1-only.
**Actual Behavior**: rollback.sql lines 36,74-76,111,128 reference dropped tables. 04_verify_integrity.sql lines 38-40,50-52 check puroks integrity. 01_migrate_bims.sql lines 107-122 insert into puroks table.
**Suggested Fix / Approach**: Update rollback.sql to remove references to v1-only tables. Update 04_verify_integrity.sql to remove puroks checks. Mark 01_migrate_bims.sql as v1-only or remove entirely. Update prepare.sh line 266 to not count puroks table.
**Affected Files**:
- united-database/migrations/rollback.sql (lines 36,74-76,111,128)
- united-database/migrations/04_verify_integrity.sql (lines 38-40,50-52)
- united-database/migrations/01_migrate_bims.sql (lines 107-122,244-259)
- united-database/prepare.sh (line 266)