# TICKET-021: Live Production Secrets Exposed in .env Files

**Title**: Live Production Secrets Exposed in .env Files - Immediate Rotation Required
**Type**: Security
**Priority**: Critical
**Description**: The .env file in multysis-backend contains live production secrets including database credentials, JWT secret, Gmail app password, and Supabase service role key. These secrets are committed to the repository and must be rotated immediately.
**Steps to Reproduce** (if applicable):
1. Navigate to borongan-eService-system-copy/multysis-backend/.env
2. Observe exposed credentials
**Expected Behavior**: All secrets should be loaded from environment variables that are not committed to git.
**Actual Behavior**: DATABASE_URL, JWT_SECRET, SMTP_PASS, and SUPABASE_SERVICE_ROLE_KEY are hardcoded in .env file.
**Suggested Fix / Approach**: 1) Rotate all exposed credentials immediately 2) Use .env.vault or proper secrets manager 3) Add .env to .gitignore if not already 4) Never commit secrets to repository
**Affected Files**:
- borongan-eService-system-copy/multysis-backend/.env (lines 2-3, 6, 31, 40)
- barangay-information-management-system-copy/server/.env (similar exposures)