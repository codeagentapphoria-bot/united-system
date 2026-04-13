# TICKET-008: Console.log in Production Hot Paths

**Title**: Inappropriate Console Logging in Performance-Critical Code
**Type**: Improvement
**Priority**: High
**Description**: Console.log and console.error are used in production hot paths (middleware, services) instead of structured logging. This pollutes logs and can impact performance.
**Steps to Reproduce** (if applicable):
1. Check sessionTimeout.ts line 184 - console.error in middleware
2. Check sessionTimeout.ts line 206 - console.error in session deletion
3. These fire on every relevant request/transaction
**Expected Behavior**: Production code should use structured logging (winston) with appropriate log levels. Console.log should be avoided in production.
**Actual Behavior**: ~102 backend files and ~81 frontend files use console.log/error/warn directly instead of structured logging.
**Suggested Fix / Approach**: Replace console.log/error with winston logger calls. Example: console.error(err) -> logger.error('Session timeout error', { error: err }). Create a logger utility in frontend that can be toggled per environment. Consider adding ESLint rule to warn on console.log in production code.
**Affected Files**:
- borongan-eService-system-copy/multysis-backend/src/middleware/sessionTimeout.ts (lines 184, 206)
- ~100 other backend files
- ~80 frontend files
