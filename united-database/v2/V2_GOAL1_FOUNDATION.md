# V2 Goal 1 — Security & Integrity Foundation (Implementation Spec)

> **This is the authoritative, hallucination-proof spec for V2 Goal 1.** Every file path, line number, symbol, and table name below was verified against the live codebase. **Do not invent names.** If something here does not match what you find in the code, STOP and report the mismatch — do not improvise a substitute.
>
> **Parent spec:** [`V2_ARCHITECTURE.md`](./V2_ARCHITECTURE.md) (§1 findings, §3 data, §4 authz, §6 security, §8 step 0–2).
> **Scope:** Migration Steps 0–2 only. No public API contract changes. No ORM swap (that's Goal 3). No frontend changes.
> **Backend under change:** `borongan-eService-system-copy/multysis-backend/` unless stated otherwise.

---

## ⛔ GLOBAL GUARDRAILS — read before any edit

1. **Migrations are developer-owned (repo `CLAUDE.md`).** You may **author** SQL / RLS / Prisma migration files into `united-database/` and `multysis-backend/prisma/migrations/` for review. You **must NOT** run `prisma migrate`, `prisma db push`, `psql`, `supabase db`, or any statement that writes to a database. Stop at "files ready for review."
2. **Do not echo real secret values** into any committed file, log, commit message, or PR. Reference them by `file:line` and redact.
3. **One DB, two backends, shared JWT.** `barangay-…/server` (raw `pg`) and `multysis-backend` (Prisma) point at the **same** Supabase Postgres and **sign JWTs with the same `JWT_SECRET`**. Any JWT_SECRET rotation breaks both simultaneously — coordinate, never rotate one alone.
4. **Verify before claiming done.** Each work item has acceptance checks. Run them; paste output. No "should work."

---

## Work Item A — Secrets remediation (P0, finding F6, tickets 021/034/035)

### A.1 — Live committed secrets (CRITICAL — leaked in git history)

`borongan-eService-system-copy/multysis-backend/.env` **is tracked by git** (`git ls-files` confirms). It contains REAL production secrets:

| Location | Secret (redacted) | Action |
|---|---|---|
| `.env:2` | `DATABASE_URL` (Supabase pooler pw) | **rotate DB password** in Supabase |
| `.env:3` | `DIRECT_URL` (same pw) | rotate (same) |
| `.env:6` | `JWT_SECRET` (96-char hex) | **rotate — coordinated** (breaks BIMS too, see Guardrail 3) |
| `.env:31` | `SMTP_PASS` (Gmail app password) | revoke + reissue Gmail app password |
| `.env:40` | `SUPABASE_SERVICE_ROLE_KEY` (JWT) | **rotate service-role key** in Supabase |

**Same `JWT_SECRET` literal is also committed in BOTH `.env.example` files:**
- `borongan-eService-system-copy/multysis-backend/.env.example:11`
- `barangay-information-management-system-copy/server/.env.example:25`

**Required actions:**
1. Remove `.env` from tracking: `git rm --cached <path>`; ensure it is in `.gitignore` (verify; add if missing).
2. Replace both `.env.example` `JWT_SECRET=<real value>` with a placeholder, e.g. `JWT_SECRET=<generate-with-openssl-rand-hex-48>`. Audit every `.env.example` for any other real value (SMTP, Supabase, DB) and placeholder them.
3. **Rotation is an operator task, not an agent task.** Produce `united-database/v2/SECRET_ROTATION_RUNBOOK.md` listing each key, where it lives (Railway/Vercel/Supabase dashboards), the rotation step, and the coordinated JWT_SECRET cutover (both services redeploy together). Do NOT attempt to rotate keys yourself.
4. History scrub (note for operator in the runbook): the secrets remain in git history after `git rm`; recommend `git filter-repo` / BFG + force-push as a follow-up, and treat all four secrets as compromised regardless.

### A.2 — Hardcoded password fallback `|| '123'` (TICKET-034)

Exact offenders (all in `barangay-information-management-system-copy/server/src/scripts/`):
- `unifiedMigration.js:44` — `password: process.env.PG_PASSWORD || '123',`
- `migrateDB.js:113` — same
- `rollbackMigration.js:30` — same
- `addGisCodeMigration.js:19` — same
- `completeMigration.js:43` — same

**Fix:** remove the `|| '123'` fallback; fail fast if `PG_PASSWORD` unset (`throw new Error('PG_PASSWORD required')`). Note: `unifiedMigration.js`/`completeMigration.js`/`migrateDB.js`/`rollbackMigration.js` are already marked **DEPRECATED (v1 only)** in their headers — fixing the fallback is still required (defense in depth) even though they shouldn't run on v2.

### A.3 — Test credentials (TICKET-035)
- `united-database/seed.sql:97-101` — bcrypt hash of `Admin1234!`. Keep for local dev seed, but the seed must NOT run against production. Add a guard / separate `seed.dev.sql`, and document that prod seeding excludes default-credential rows.
- `united-database/test_mutations_eservice.sh:118`, `test_mutations_bims.sh:169,178` — plaintext `Test1234!`. Move to env vars read at runtime; no plaintext defaults.

### A.3 — Acceptance
- `git ls-files | grep -E '/\.env$'` → empty.
- `grep -rn "|| '123'" barangay-…/server/src/scripts/` → empty.
- No real secret literal in any tracked `.env.example` (manual review + `gitleaks`/`trufflehog` scan passes in CI).
- `SECRET_ROTATION_RUNBOOK.md` exists and lists all 4 keys + coordinated JWT cutover.

---

## Work Item B — Transactional registration approval (finding F3 / audit R-1, R-3, R-5)

**Files:**
- `multysis-backend/src/services/portal-registration.service.ts` (primary)
- `multysis-backend/src/services/classification.service.ts` (classification + beneficiary sync)
- `multysis-backend/src/controllers/portal-registration.controller.ts` (`reviewRegistrationController`, lines 228-253)

### B.1 — Current write sequence (verified, exact line numbers)

`reviewRegistrationRequest()` in `portal-registration.service.ts` (≈ lines 640-767):

| Order | Write | Location | In txn today? |
|---|---|---|---|
| 1 | counter increment `INSERT … resident_counters … ON CONFLICT DO UPDATE SET counter = counter + 1` | `generateResidentId()` → `portal-registration.service.ts:887-891` (called at ~`:664`) | ❌ commits immediately (R-3 ghost counter) |
| 2 | `prisma.resident.update` (residentId, status='active', remarks) | `:668-675` | ✅ inside `$transaction([...])` at `:667-685` |
| 3 | `prisma.registrationRequest.update` (status='approved', reviewedBy/At) | `:676-684` | ✅ same txn |
| 4 | classification inserts — parallel `$executeRaw` INTO `resident_classifications` | `autoClassifyResident()` `:613-617` (called after commit `:692-703`) | ❌ after commit (R-1) |
| 5 | beneficiary sync upsert | fire-and-forget `:635` → `classification.service.ts:416-490` | ❌ detached, swallows errors |
| 6 | approval email | fire-and-forget IIFE `:717-726` → `sendEmailSafely` (`email.service.ts:175`) | ❌ detached |

### B.2 — Target design

**Atomic core (inside one `prisma.$transaction(async (tx) => {…})`):** writes 1, 2, 3, 4.
- Refactor `generateResidentId()` to accept a `tx` client and do the counter `INSERT … ON CONFLICT` **inside** the transaction (pass `tx` through, do not call the standalone version).
- Refactor the classification inserts (`autoClassifyResident` `:613-617`) to run on `tx`, inside the same transaction. If any classification insert fails, the whole approval rolls back — no active-but-unclassified resident.

**Deferred side effects (writes 5, 6) → outbox (Work Item D), not fire-and-forget:** inside the transaction, instead of calling email/sync, `INSERT` an `outbox` row (`topic='resident.approved'`, payload). The worker drains it post-commit. If the txn rolls back, the outbox row is never written → no email, no sync. Remove the `:717-726` email IIFE and the `:635` `syncBeneficiaryOnInsertAsync` call from this path.

### B.3 — Also fix R-5 (resubmit status lockout)

`portal-registration.service.ts:834-849` (resubmit flow): the `prisma.resident.update` at `:846-848` sets `proofOfIdentification` but **omits `status`**, leaving a rejected resident as `'rejected'` → blocked from login by `auth.service.ts` (~`:172-174`). **Add `status: 'pending'`** to that update, inside the existing `$transaction([...])`.

### B.4 — Acceptance
- Induced failure mid-flow (e.g. force the classification insert to throw): resident is NOT 'active', registration_request is NOT 'approved', `resident_counters` is NOT incremented, no email queued. Verify by inspecting state after a simulated throw (unit/integration test with a rollback).
- `generateResidentId` no longer performs a standalone commit; counter increment is inside the approval transaction.
- Resubmit sets `resident.status='pending'` (R-5) — rejected resident can log in after resubmit.
- No `syncBeneficiaryOnInsertAsync` / email IIFE remain in the approval path (replaced by outbox insert).

---

## Work Item C — Wire `requirePermission` on mutating routes (finding F1)

### C.1 — The middleware is REAL, not a stub

`multysis-backend/src/middleware/auth.ts:375-422` — `requirePermission(resource, action: 'read' | 'all')`. It:
- 403s if `req.user.type !== 'admin'`,
- loads the user with `userRoles → role → rolePermissions → permission`,
- grants if any permission row matches `permission.resource === resource` AND (`permission.action === 'ALL'` OR (`action==='read'` AND `permission.action==='READ'`)).
- It is **exported but used 0×.** Wiring is purely additive: append it to route handler chains after the existing `verifyAdmin`.

`AuthRequest.user` shape (`auth.ts:6-14`): `{ id, email?, username?, role, type: 'admin'|'resident'|'dev' }`.

### C.2 — Permission resources that ACTUALLY EXIST (seed.sql:35-50)

Only these 8 resources are seeded in `permissions` (with actions `ALL` and/or `READ`):
```
residents · transactions · services · tax_profiles · reports(READ only) · users · beneficiaries · registrations
```
**You may only pass one of these to `requirePermission` UNLESS you also add the permission row.** Do not invent resource strings — `requirePermission('pages','all')` against a non-existent `pages` permission will deny every admin (no row matches). 

### C.3 — Route → resource mapping

**Group 1 — wire to EXISTING resources** (route file → `requirePermission(resource, action)`; `action='all'` for POST/PUT/PATCH/DELETE, `'read'` for GET that you also choose to gate):

| Route file | Mutating routes | Resource |
|---|---|---|
| `resident.routes.ts` | PUT `/:id`, PATCH `/:id/{activate,deactivate,deceased,moved-out}`, DELETE `/:id` | `residents` |
| `transaction.routes.ts` | PUT `/:id`, POST `/:id/admin-request-update`, `/:id/review-update-request`, `/:id/compute-tax` | `transactions` |
| `service.routes.ts` | POST `/`, PUT `/:id`, PATCH `/:id/{activate,deactivate}`, DELETE `/:id` | `services` |
| `tax-profile.routes.ts` | POST `/`, PUT `/:id`, DELETE `/:id`, POST `/:id/versions`, PUT `/versions/:id`, PATCH `/versions/:id/activate` | `tax_profiles` |
| `tax-reassessment.routes.ts` | POST `/:transactionId` | `tax_profiles` (or `transactions` — pick, document) |
| `user.routes.ts` | POST `/`, PUT `/:id`, DELETE `/:id`, PATCH `/:id/password` | `users` |
| `social-amelioration.routes.ts` | all POST/PUT/DELETE (5 beneficiary types) | `beneficiaries` |
| `government-program.routes.ts` | POST/PUT/PATCH/DELETE | `beneficiaries` (programs are beneficiary-domain) — document choice |
| `portal-registration.routes.ts` | PATCH `/requests/:id/under-review`, POST `/requests/:id/review`, `/requests/:id/request-docs` | `registrations` |
| `medicine-request.routes.ts` | PATCH `/:id/status` | `beneficiaries` (or new `medicine_requests`, see C.4) |
| `exemption.routes.ts` | PATCH `/:id/{approve,reject}` | `transactions` (exemptions are txn-scoped) — document |
| `payment.routes.ts` | POST `/` | `transactions` — document |

**Group 2 — admin resources with NO seeded permission.** These route files manage RBAC/config and have no matching resource: `role.routes.ts`, `permission.routes.ts`, `page.routes.ts`, `system.routes.ts`, `faq.routes.ts`, `classification.routes.ts`, `libre-sakay.routes.ts`. Two options — **pick C.4-a (recommended)**:

### C.4 — Decision required (do not guess)
- **C.4-a (recommended):** ADD permission rows for the uncovered admin resources in `seed.sql` (mirroring the `resource/action` pattern at `seed.sql:35-50`) and assign them to the `admin` role (`seed.sql:68`): add `roles`, `permissions`, `pages`, `systems`, `faqs`, `classifications`, `libre_sakay`, `government_programs`, `medicine_requests`, `exemptions`, `payments` as needed. Then wire `requirePermission` everywhere. This is a **seed/data change → developer-owned migration → author file, do not run.**
- **C.4-b:** Scope Goal 1 to the 8 existing resources only (Group 1), and leave Group 2 on `verifyAdmin`-only with a tracked TODO. Smaller, but leaves RBAC partial.

State which you chose at the top of the PR. Default to C.4-a for completeness.

### C.5 — Do NOT touch
- Resident-facing routes guarded by `verifyResident` (portal-household, portal-classification, portal-programs citizen routes) — `requirePermission` is admin-only by construction (it 403s non-admins). Leave them; RLS (Work Item E) covers their data scope.
- Public/no-auth routes (address stubs, `/track/:ref`, login, registration submit) — unchanged.

### C.6 — Acceptance
- CI assertion: every `router.{post,put,patch,delete}` in an admin route file (Group 1, + Group 2 if C.4-a) has a `requirePermission(...)` in its handler chain. (Write a test that parses the route files or a runtime check.)
- A restricted admin (role with only `residents:READ`) is 403'd on `POST /api/services` but allowed `GET /api/residents`.
- No existing endpoint path/verb changed; frontends unaffected.

---

## Work Item D — Outbox + worker (finding F3 side-effects)

### D.1 — Schema (author migration; do NOT run)
Add `outbox` table (Prisma model + migration file in `multysis-backend/prisma/migrations/`):
```prisma
model Outbox {
  id          String    @id @default(uuid())
  topic       String                       // e.g. 'resident.approved'
  payload     Json
  status      String    @default("PENDING") // PENDING | PROCESSING | DONE | FAILED
  attempts    Int       @default(0)
  lastError   String?   @map("last_error")
  createdAt   DateTime  @default(now()) @map("created_at")
  processedAt DateTime? @map("processed_at")
  @@index([status, createdAt])
  @@map("outbox")
}
```

### D.2 — Producer
Inside the approval `$transaction` (Work Item B), replace the detached email + beneficiary-sync calls with `tx.outbox.create({ data: { topic:'resident.approved', payload:{ residentId, classifications, email } } })`.

### D.3 — Consumer (worker)
A worker (poll the outbox, or BullMQ backed by the existing Upstash Redis — confirm Redis client exists before choosing) that:
- claims PENDING rows (`status='PROCESSING'` with a `FOR UPDATE SKIP LOCKED` pattern),
- runs the side effects: `sendEmailSafely` (`email.service.ts:175`) + beneficiary upsert (`classification.service.ts` logic, made idempotent via the existing `upsert`) + socket emit (`socket.service.ts emitBeneficiaryNew`),
- marks `DONE`, or increments `attempts` + `lastError` on failure (retry with backoff; cap → `FAILED` + alert).
- **Idempotency:** consumers must tolerate re-delivery (the beneficiary sync already uses `upsert` — keep that; make email idempotent via a sent-marker or accept rare duplicate on crash).

### D.4 — Acceptance
- Approval commits → outbox row created → worker delivers email + beneficiary record + socket event.
- Kill the worker mid-drain → on restart the un-acked row is reprocessed; no duplicate beneficiary (upsert), at-most-one extra email tolerated.
- Approval rolls back → no outbox row → zero side effects.

---

## Work Item E — Row-Level Security (finding F1 backstop, §4)

### ⚠️ E.0 — Tenant-column reality (CRITICAL — prevents the #1 hallucination)

**Most tables do NOT have a `municipality_id` column.** Verified from `schema.prisma`:
- **Has `municipalityId` (Int):** `Barangay`, `CertificateTemplate`, `ClassificationType` only.
- **Resident** (`residents`): has `barangayId`, **no** `municipalityId`. Tenant = via `barangays.municipality_id`.
- **Beneficiaries** (senior/pwd/student/solo-parent/healthcare-worker), `MedicineRequest`, `GovernmentProgramApplication`: scope via `residentId → residents`.
- **Transaction, Payment, Exemption, TaxComputation, AppointmentNote, TransactionNote**: scope via `residentId` (nullable on Transaction!) → `residents`.
- **User, Role, Permission, RolePermission, UserRole, Service, TaxProfile, Faq, System**: **no tenant column at all** — system-wide config / global admin tables.

**Do NOT write `USING (municipality_id = current_setting(...))` on a table that has no `municipality_id`.** That column does not exist and the policy will error.

### E.1 — Decision required (do not guess)
- **E.1-a (recommended for V2):** denormalize `municipality_id` onto core tenant tables (`residents`, beneficiaries, `transactions`) via migration + backfill, then RLS is a simple column check. Higher migration cost, simplest policies. **Author migration + backfill SQL; do NOT run.**
- **E.1-b:** RLS via subquery joins (e.g. residents policy: `barangay_id IN (SELECT id FROM barangays WHERE municipality_id = current_setting('app.municipality_id')::int)`). No schema change, heavier policies. Note `Barangay.id`/`Municipality.id` are **Int**, `residents.id` is **text UUID** — cast carefully.

Pick one, document it in the PR. For Goal 1, **E.1-b is acceptable** to avoid a large backfill; flag E.1-a as a Goal-3 follow-up.

### E.2 — Session context
The gateway/middleware must set per request (after `verifyToken`): `set_config('app.user_id', …)`, `set_config('app.municipality_id', …)`, `set_config('app.caps', …)`. **Where does `municipality_id` come from?** It is NOT in the JWT today (`TokenPayload` = `{id,email?,username?,role,type}`, `jwt.ts:21-27`). Options: (a) add `municipalityId` to the admin JWT payload at sign time (`auth.controller.ts:375`), or (b) look it up per request from the user's barangay/role scope. **Decide and document.** Until municipality is resolvable, scope RLS to user-ownership policies (citizen sees own resident rows) and defer tenant-isolation policies — do not ship a policy referencing a setting that is never populated.

### E.3 — Policy set (author as SQL migration in `united-database/`; do NOT run)
- Enable RLS + `FORCE ROW LEVEL SECURITY` on: `residents`, beneficiary tables, `transactions`, `resident_classifications`, `households` (BIMS table), and `users`.
- **Ownership policy** (works today, no municipality needed): citizen reads own resident via `resident_credentials`/`refresh_tokens` link → `residents.id = current_setting('app.user_id')` mapping. Verify the exact citizen→resident id linkage in code before writing.
- **Capability policy:** mutations require `current_setting('app.caps') LIKE '%<resource>:all%'`.
- **Connection caveat:** RLS only bites if the app connects as a **non-superuser, non-BYPASSRLS** role. Supabase's default pooler role may bypass RLS — the runbook must specify creating/using a restricted DB role for the app connection. Document this; it's a common silent no-op.

### E.4 — Acceptance
- With RLS on and a citizen session context set, a citizen `SELECT` returns only their own resident row.
- A mutation without the matching cap in `app.caps` is refused at the DB even if the route guard is bypassed (test by calling the model directly with a low-cap context).
- App connects as a non-BYPASSRLS role (verified).
- All policies authored as review-ready `.sql` files; nothing applied.

---

## Deliverables checklist
- [ ] `.env` untracked + `.gitignore`; `.env.example` placeheldered; `SECRET_ROTATION_RUNBOOK.md`.
- [ ] `|| '123'` fallbacks removed; test creds env-ized.
- [ ] Approval flow fully transactional (counter+resident+request+classifications); R-5 status fix.
- [ ] `outbox` model + migration (unrun); producer in approval txn; worker consumer.
- [ ] `requirePermission` wired across Group 1 (+ Group 2 if C.4-a); permission seed rows added if C.4-a.
- [ ] RLS policies authored (E.1-b), session-context middleware, restricted DB role documented.
- [ ] CI: secret scan + requirePermission-coverage assertion.
- [ ] All DB-writing artifacts are **files for review** — nothing run against any database.

## Decisions to surface in the PR (do not silently pick)
1. C.4-a vs C.4-b (RBAC coverage scope).
2. E.1-a (denormalize municipality_id) vs E.1-b (join policies).
3. E.2 — source of `municipality_id` for session context (JWT claim vs per-request lookup).
4. D.3 — outbox worker: simple poller vs BullMQ/Upstash (confirm Redis client first).
