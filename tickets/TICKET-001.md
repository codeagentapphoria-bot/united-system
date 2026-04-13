# TICKET-001: Authentication Disabled in ProtectedRoute and BlockPortalUsers

**Title**: Authentication Disabled in ProtectedRoute and BlockPortalUsers
**Type**: Bug
**Priority**: Critical
**Description**: Authentication checks are explicitly disabled in two critical frontend components with TODO comments stating "Re-enable authentication before production". This means any user can access protected routes without authentication in production.
**Steps to Reproduce** (if applicable):
1. Navigate to any protected route in the E-Services frontend
2. Observe that access is granted without login
3. Check the console for TODO comments indicating disabled auth
**Expected Behavior**: All protected routes should require valid authentication (JWT token or session). Unauthenticated requests should be redirected to login.
**Actual Behavior**: ProtectedRoute.tsx line 20 and BlockPortalUsers.tsx line 22 have authentication checks commented out or bypassed with TODO markers.
**Suggested Fix / Approach**: Remove the TODO comments and re-enable the authentication logic in both files. Add integration tests to verify authentication is enforced. Consider adding a CI check that fails if auth bypass code is detected.
**Affected Files**:
- borongan-eService-system-copy/multysis-frontend/src/components/common/ProtectedRoute.tsx (line 20)
- borongan-eService-system-copy/multysis-frontend/src/components/common/BlockPortalUsers.tsx (line 22)