# TICKET-029: Insufficient Rate Limiting on Account Setup Endpoint

**Title**: POST /api/user/complete-account-setup Lacks Endpoint-Specific Rate Limiting
**Type**: Security
**Priority**: High
**Description**: The account setup endpoint accepts a setup token and creates a password. While a global API rate limiter (100 req/15min) applies, it has no endpoint-specific rate limiting. A sensitive endpoint like account setup should have stricter limits to prevent brute-force attacks on setup tokens.
**Steps to Reproduce** (if applicable):
1. Obtain a valid setup token (from invitation email)
2. Send multiple rapid POST requests to /api/user/complete-account-setup with different passwords
3. Observe only the generic 100 req/15min global limit applies
**Expected Behavior**: Endpoint should have strict endpoint-specific rate limiting (e.g., 5 attempts per hour per IP) in addition to the global limiter.
**Actual Behavior**: userRoutes.js lines 62-105 define the endpoint with no endpoint-specific rate limiter. Only the global apiRateLimiter (100 req/15min) from app.js applies.
**Suggested Fix / Approach**: Create a specific rate limiter for account setup: const setupRateLimiter = rateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 5 }); Apply to router.post('/complete-account-setup', setupRateLimiter, ...)
**Affected Files**:
- barangay-information-management-system-copy/server/src/routes/userRoutes.js (lines 62-105)
