# TICKET-005: Multiple Files Reference Removed puroks Table (v2 Schema Breaking)

**Title**: Multiple Files Reference Removed puroks Table - Will Crash with v2 Schema
**Type**: Bug
**Priority**: Critical
**Description**: The v2 schema overhaul removed the puroks table, but multiple files in BIMS still query this table. These files will crash at runtime when deployed with the v2 schema.
**Steps to Reproduce** (if applicable):
1. Deploy v2 schema (without puroks table)
2. Attempt to load dashboard data
3. Observe database errors for missing table
**Expected Behavior**: All code should be compatible with v2 schema where puroks have been replaced with PSGC geographic hierarchies.
**Actual Behavior**: Multiple files have active JOINs and queries to the removed puroks table.
**Suggested Fix / Approach**: Update statisticsServices.js - remove 6 purok JOINs (lines 380, 1119, 1194, 1236, 1269, 1312). Update barangayServices.js:2106 - fix household import queries. Update HouseholdLocationForm.jsx and HouseholdForm.jsx - purokId is required but table doesn't exist. Update useDashboardData.js - per-purok API calls will fail. Update ResidentIDCard.jsx:470-471 - accesses purok_name.toUpperCase() which will be null.
**Affected Files**:
- barangay-information-management-system-copy/server/src/services/statisticsServices.js (lines 380, 1119, 1194, 1236, 1269, 1312)
- barangay-information-management-system-copy/server/src/services/barangayServices.js (line 2106)
- barangay-information-management-system-copy/client/src/pages/admin/HouseholdLocationForm.jsx
- barangay-information-management-system-copy/client/src/pages/admin/HouseholdForm.jsx
- barangay-information-management-system-copy/client/src/hooks/useDashboardData.js
- barangay-information-management-system-copy/client/src/components/resident/ResidentIDCard.jsx (lines 470-471)