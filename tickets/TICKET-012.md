# TICKET-012: Extensive `any` Type Usage Defeats TypeScript Purpose

**Title**: 1272+ `any` Type Occurrences Defeat TypeScript Type Safety
**Type**: Improvement
**Priority**: Medium
**Description**: TypeScript's type safety is bypassed through extensive use of `any` type. This introduces runtime errors that TypeScript should catch at compile time.
**Steps to Reproduce** (if applicable):
1. Search for `: any` in codebase
2. Observe 1272+ occurrences across 282 files
**Expected Behavior**: All variables should have specific types. `any` should only be used as a last resort with clear justification.
**Actual Behavior**: Critical files use `any` extensively for parameters, return types, and variable declarations.
**Suggested Fix / Approach**: Replace `any` with proper interfaces or unknown with type guards. Focus on critical files first: auth.service.ts, transaction.service.ts, tax-engine.service.ts. Create shared type definitions for common patterns.
**Affected Files**:
- borongan-eService-system-copy/multysis-backend/src/services/auth.service.ts (line 353 - formatResidentResponse resident: any)
- borongan-eService-system-copy/multysis-backend/src/services/transaction.service.ts (lines 695-700 - txns: any[], transaction: any)
- borongan-eService-system-copy/multysis-backend/src/services/tax-engine.service.ts (line 179 - let value: any)
- borongan-eService-system-copy/multysis-backend/src/services/social-amelioration.service.ts (lines 133-135 - programs.map((p: any))
- 282 total files with any usage