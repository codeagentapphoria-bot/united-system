# TICKET-015: Hardcoded "Borongan" Municipality Name

**Title**: Hardcoded "Borongan" Municipality Name Violates Multi-Municipality Reusability
**Type**: Improvement
**Priority**: Medium
**Description**: The municipality name "Borongan" is hardcoded in 20+ locations throughout the codebase. This violates the R2 architecture requirement that the system should be reusable across different municipalities.
**Steps to Reproduce** (if applicable):
1. Search for "Borongan" string in codebase
2. Observe hardcoded references in UI labels, error messages, database seeds
**Expected Behavior**: Municipality name should be configurable via environment variable or database configuration, not hardcoded.
**Actual Behavior**: "Borongan" appears in 20+ locations as a string literal.
**Suggested Fix / Approach**: Replace all hardcoded "Borongan" references with configuration lookup. Add MUNICIPALITY_NAME to environment variables. Update all UI labels, error messages, and database seeds to use the configured value.
**Affected Files**:
- Multiple files in barangay-information-management-system-copy/ (search for "Borongan")
- Multiple files in borongan-eService-system-copy/ (search for "Borongan")
- Database seed files