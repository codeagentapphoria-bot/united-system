# TICKET-024: N+1 Query Problem in Social Amelioration Service

**Title**: N+1 Query - Each Beneficiary Triggers Separate Program Query
**Type**: Performance
**Priority**: Critical
**Description**: The getSeniorBeneficiaries function and similar beneficiary queries call formatSeniorBeneficiary for each record, which itself calls getBeneficiaryPrograms(). This results in N+1 queries - 1 for beneficiaries plus 1 per beneficiary for programs.
**Steps to Reproduce** (if applicable):
1. Query 100 senior beneficiaries
2. Observe 100+ database queries (1 main + 100 for programs)
**Expected Behavior**: Programs should be fetched in a single JOIN query or batched include.
**Actual Behavior**: social-amelioration.service.ts lines 128-130, 435 show Promise.all(items.map(formatSeniorBeneficiary)) where each formatXxxBeneficiary calls getBeneficiaryPrograms(id) separately.
**Suggested Fix / Approach**: Use Prisma include with beneficiaryProgramPivot relation in the initial findMany query instead of fetching programs per-record. Modify formatXxxBeneficiary to use pre-loaded data.
**Affected Files**:
- borongan-eService-system-copy/multysis-backend/src/services/social-amelioration.service.ts (lines 88, 128-130, 148-150, 168-170, 188-190, 406, 435, 554, 698, 834)