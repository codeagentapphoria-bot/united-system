# TICKET-014: Magic Numbers Hardcoded Instead of Constants

**Title**: Multiple Magic Numbers Scattered Throughout Codebase
**Type**: Improvement
**Priority**: Medium
**Description**: Timeout values, rate limits, and other configuration constants are hardcoded inline instead of being defined in a central constants file.
**Steps to Reproduce** (if applicable):
1. Search for numeric values like 1000, 60000, 15 * 60 in code
2. Observe magic numbers without explanation
**Expected Behavior**: All magic numbers should be named constants in a config/constants.ts file.
**Actual Behavior**: Multiple files have hardcoded numeric values.
**Suggested Fix / Approach**: Create src/config/constants.ts and extract all magic numbers. Group by category: timeouts, rate limits, pagination defaults, validation bounds.
**Affected Files**:
- borongan-eService-system-copy/multysis-backend/src/index.ts (lines 52-53 - 5 * 60 * 1000, 15 * 60 * 1000 timeout bounds)
- borongan-eService-system-copy/multysis-backend/src/index.ts (line 233 - windowMs: 15 * 60 * 1000)
- borongan-eService-system-copy/multysis-backend/src/index.ts (line 252 - max: 100)
- borongan-eService-system-copy/multysis-backend/src/index.ts (line 270 - max: 500)
- borongan-eService-system-copy/multysis-backend/src/index.ts (line 314 - timeoutMs = 30000)
- borongan-eService-system-copy/multysis-backend/src/index.ts (line 489 - CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000)
- borongan-eService-system-copy/multysis-backend/src/services/transaction.service.ts (line 80 - appointmentDuration || 30)
- borongan-eService-system-copy/multysis-backend/src/socket/socket.ts (lines 40-41 - TYPING_RESET_INTERVAL = 1000, NOTE_RESET_INTERVAL = 60000)