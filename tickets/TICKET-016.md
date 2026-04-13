# TICKET-016: Mixed Logging (console.log + winston)

**Title**: Mixed Console.log and Winston Logger Usage Should Be Standardized
**Type**: Improvement
**Priority**: Medium
**Description**: The codebase uses both console.log/error and a winston logger. This inconsistency makes log filtering and management difficult in production.
**Steps to Reproduce** (if applicable):
1. Search for console.log in backend files
2. Search for winston logger usage
3. Observe both patterns in use simultaneously
**Expected Behavior**: All logging should use the structured winston logger consistently across all files.
**Actual Behavior**: 72 backend files and 13 frontend files use console.log directly instead of the winston logger.
**Suggested Fix / Approach**: Replace all console.log/error calls with structured winston logger calls. Create a logger utility in frontend that wraps console in development and can be disabled in production. Add ESLint rule to warn on console.log usage.
**Affected Files**:
- borongan-eService-system-copy/multysis-backend/src/index.ts (lines 459-462 - server startup logs)
- borongan-eService-system-copy/multysis-backend/src/services/email.service.ts (lines 41,43,49,55)
- borongan-eService-system-copy/multysis-backend/src/services/cache.service.ts (lines 10,22,39,49)
- 68+ other backend files with console usage
