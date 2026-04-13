# TICKET-028: Authorization Role Mismatch - Uses allUsers Instead of municipalityAdminOnly

**Title**: System Management and Counter Routes Use Incorrect Authorization Level
**Type**: Bug
**Priority**: High
**Description**: The system management routes (database export, uploads export) and counter prefix routes use allUsers authorization which includes barangay staff. These operations should be restricted to municipality-level admins only.
**Steps to Reproduce** (if applicable):
1. Log in as barangay staff (not municipality admin)
2. Call GET /api/system-management/export/database
3. Observe staff can export entire municipality database
**Expected Behavior**: Only municipality admins should be able to export databases and modify counter prefixes.
**Actual Behavior**: systemManagementRoutes.js uses allUsers instead of municipalityAdminOnly at lines 12, 19. counterRoutes.js uses allUsers instead of municipalityAdminOnly at lines 9, 12.
**Suggested Fix / Approach**: Replace allUsers with municipalityAdminOnly in the route definitions for: GET /api/system-management/export/database, GET /api/system-management/export/uploads, PUT /api/counter/prefix
**Affected Files**:
- barangay-information-management-system-copy/server/src/routes/systemManagementRoutes.js (lines 12, 19)
- barangay-information-management-system-copy/server/src/routes/counterRoutes.js (lines 9, 12)