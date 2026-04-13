# TICKET-004: Error Handler Returns Without Calling next(error)

**Title**: Error Handler Returns Without Calling next(error) - Endpoint Hangs
**Type**: Bug
**Priority**: Critical
**Description**: An error handler in barangayControllers.js returns an error response directly instead of calling next(error). This causes the endpoint to hang because Express's error middleware is never invoked.
**Steps to Reproduce** (if applicable):
1. Make a request that triggers the error condition
2. Observe the request hangs and eventually times out
3. No error response is returned to the client
**Expected Behavior**: When an error occurs, next(error) should be called to invoke Express's error handling middleware.
**Actual Behavior**: At line 710, the code returns res.status(400).json(error) without calling next(error), breaking the error handling chain.
**Suggested Fix / Approach**: Change line 710 to call next(error) instead of directly returning. The error should propagate to Express's error middleware for consistent error formatting. Add a comment explaining why next(error) is used.
**Affected Files**:
- archive/barangay-information-management-system-original/server/src/controllers/barangayControllers.js (line 710)