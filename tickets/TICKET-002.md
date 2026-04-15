# TICKET-002: Hardcoded Credentials in Archive Scripts

**Title**: Hardcoded Database Credentials Exposed in Archive Test Scripts
**Type**: Bug
**Priority**: Critical
**Description**: Archive test scripts contain hardcoded database credentials (password=1234) exposed in plain text. This is a security vulnerability as credentials are committed to the repository.
**Steps to Reproduce** (if applicable):
1. Navigate to archive/barangay-information-management-system-original/server/src/scripts/testOgr2ogr.js
2. Observe the hardcoded password=1234 at line 25
3. Check convertShapefileToSQL.js for same pattern with fallback default
**Expected Behavior**: All credentials should be loaded from environment variables or a secure secrets manager. No credentials should be hardcoded in source code.
**Actual Behavior**: testOgr2ogr.js line 25 contains hardcoded password=1234 in an ogr2ogr command. convertShapefileToSQL.js line 41 uses `process.env.PG_PASSWORD || '1234'` as a fallback default, with the password embedded in shell commands at lines 47 and 64.
**Suggested Fix / Approach**: Remove the hardcoded credentials from the scripts. Replace with environment variable references that fail if not set. Add pre-commit hook to prevent credentials from being committed. Run git-secrets or similar tool to scan for credentials in history.
**Affected Files**:
- archive/barangay-information-management-system-original/server/src/scripts/testOgr2ogr.js (line 25 - password=1234)
- archive/barangay-information-management-system-original/server/src/scripts/convertShapefileToSQL.js (line 41 - fallback '1234', lines 47, 64 - used in commands)
