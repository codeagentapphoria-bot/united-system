# TICKET-035: Well-Known Test Credentials in Seed and Test Scripts

**Title**: Hardcoded Test Credentials in Seeds and Test Scripts Could Be Guessed
**Type**: Security
**Priority**: Medium
**Description**: Seed files and test scripts contain well-known test credentials (Admin1234!, Test1234!, Staff1234!) that could be guessed by attackers if they gain access to the system or documentation.
**Steps to Reproduce** (if applicable):
1. Check seed.sql for password hashes
2. Check test_mutations_*.sh for plaintext credentials
**Expected Behavior**: All test credentials should be random, unique per environment, and documented only in secure internal documentation.
**Actual Behavior**: bcrypt hash of Admin1234! in seed.sql. Test1234!, Staff1234!, TestMut1234! in test scripts.
**Suggested Fix / Approach**: 1) Change all default credentials before deployment 2) Use environment variables for test credentials 3) Remove plaintext credentials from test scripts 4) Document that these are test-only credentials and must be changed in production
**Affected Files**:
- united-database/seed.sql (lines 702-716, 724-734)
- united-database/test_mutations_eservice.sh (lines 118, 363)
- united-database/test_mutations_bims.sh (lines 169, 178, 882, 529, 538)
- borongan-eService-system-copy/multysis-backend/README.md (default credentials)