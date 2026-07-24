# United Systems — V2 Architecture (Canonical Spec)

> **Status:** Design reference for the V2 program. Source of truth for V2 goals/agents.
> **Scope:** Monorepo — BIMS (barangay management), Multysis E-Services, Citizen Programs PWA, on one Supabase Postgres.
> **Companion:** presentation version at `.deck-artifacts/united-v2-architecture.html` (ephemeral, do not rely on for execution).
> **Derived from:** the graphify map of the live monorepo + the V1 audit findings below.

---

## 0. Thesis

Push integrity and authorization **down into Postgres** (RLS + transactions), consolidate **schema ownership** (one ORM, ideally one backend), and **share the frontend** — so most of V1's defects (dead RBAC, silent failures, type drift) disappear *structurally* rather than being patched route-by-route.

**Strangle, not rewrite.** The domain logic is sound; the gaps are structural. Every change below is reachable from today's code without a green-field restart.

---

## 1. V1 findings that force the redesign

These are verified against the live code (file:line where relevant). They are the *why* behind every V2 decision.

| # | Finding | Evidence | V2 fix |
|---|---------|----------|--------|
| F1 | **Authorization is a façade.** RBAC tables, `permission.service`, role-assignment UI all exist, but backend gates only on JWT `type==='admin'`. `requirePermission()` defined, invoked **0×** across all 30 route files. | `multysis-backend/src/middleware/auth.ts:375` (defined); zero callers | RLS + wire `requirePermission` (§4) |
| F2 | **Two ORMs, one DB.** BIMS = raw `pg` pool (JS/Express 5); E-Services = Prisma (TS/Express 4). Same Supabase instance; `users` renamed `bims_users`/`eservice_users` to dodge collision. | `barangay-…/server/src/config/db.js` vs `multysis-backend` Prisma | Single ORM = Prisma (§3) |
| F3 | **Non-atomic writes.** Registration-approval does multi-step writes without a transaction → ghost counters, half-approved residents, status lockouts. | Audit reports R-1 / R-3 / R-5 | `$transaction` + outbox (§3) |
| F4 | **Dead realtime path.** `subscribeToSubscriber` / `unsubscribeFromSubscriber` exposed, **0 callers**; backend still emits `subscriber:update`/`subscriber:new` to an empty room with no listener. ~40 lines both ends. | `SocketContext.tsx:231-241`; `socket.service.ts:138,172` | Delete; NOTIFY-source realtime (§5) |
| F5 | **Frontend drift.** Three apps re-implement resident/classification/program types, forms, tables independently. | graphify communities 1,2,17,40 etc. | `@united/ui` + `@united/types` (§7) |
| F6 | **Hardcoded/exposed secrets.** | Tickets 021 / 034 / 035 | Vault + rotate (§6, P0) |
| F7 | **Migration plan self-contradiction** (resolved in doc). `citizen_resident_mapping` dropped in v2 but Phase 1/2/4 still populate it. | `united-database/MIGRATION_PLAN.md` (now annotated) | Bridge = `resident_classifications` |

**Keep (already good):** single Socket.IO hub with role rooms + reconnect-rejoin; Schema v2 unified `residents` + `resident_classifications`; refresh-token rotation; per-module maintenance mode; `React.lazy` route splitting; PWA service worker; Vercel/Railway/Supabase/Upstash stack.

---

## 2. Target topology

```
CLIENTS (Vercel edge)
  BIMS Staff Console · Multysis E-Service · Citizen Programs PWA
  └── shared: @united/ui, @united/types
        │
   API Gateway / BFF  — rate-limit · JWT verify · tenant resolve · merge-port
        │
MODULAR MONOLITH (Railway · Express + Prisma)
  Identity&RBAC · Residents&HH · Classifications · Social Amelioration
  Services&Tax · Transactions · Gov Programs · Libre Sakay
  Outbox Worker + Job Queue (BullMQ) · Realtime Hub · Certificates/PDF
        │
DATA PLANE
  Supabase Postgres  — RLS · transactions · triggers · PostGIS · pg_trgm · audit_logs
  Upstash Redis (cache + queue) · Supabase Storage
  Postgres LISTEN/NOTIFY ──► Realtime Hub  (decoupled from controllers)
```

Single backend, **modular inside** (domain folders / Nest-style modules — *not* network boundaries). Same DB + same team + same cadence ⇒ microservices buy nothing but distributed-transaction pain.

---

## 3. Data plane & schema ownership

- **Prisma = single schema source of truth.** BIMS migrates off raw `pg` table-by-table behind unchanged APIs.
- Merge `bims_users` + `eservice_users` → one `users` with `user_kind ∈ {staff, citizen, dev}` + `municipality_id`.
- **PK:** UUID `gen_random_uuid()` everywhere. **Tenant:** `municipality_id` on every row.
- **Bridge:** `resident_classifications` (PWD/senior/student/solo-parent; status CONFIRMED/PENDING/NEEDS_REVIEW/NO_MATCH). The old `citizen_resident_mapping` is dead.
- **Geo:** PostGIS (`gis_municipality`, `gis_barangay`). **Match:** `pg_trgm` as a **scheduled reconcile job**, never inline.

**Atomicity (fixes F3):**
```ts
await prisma.$transaction(async (tx) => {
  const resident = await tx.resident.update({ where:{id}, data:{ status:'APPROVED' }});
  await tx.residentCounter.increment({ municipalityId });   // no ghost counters
  await tx.outbox.create({ data:{ topic:'resident.approved', payload: resident }});
});
// side effects (email, beneficiary sync, socket emit) drain from outbox — never a floating promise
```

**Outbox pattern:** the recent fire-and-forget detaches (approval email, beneficiary sync) become rows in an `outbox` table drained by a worker. Commit ⇒ side effect guaranteed; rollback ⇒ nothing leaks. At-least-once delivery, idempotent consumers.

---

## 4. Authentication & Authorization

Two layers, defense in depth:

1. **Capability resolution (app).** JWT carries identity + `municipality_id` only — **never** permissions. Per request the gateway resolves caps from `roles`/`role_permissions`, injects into Postgres session vars via `set_config('app.caps', …)`.
2. **Enforcement (DB).** RLS policies are the real boundary — a forgotten app check no longer means an open endpoint.

```sql
-- gateway sets per-request context
SELECT set_config('app.user_id', $1, true),
       set_config('app.municipality_id', $2, true),
       set_config('app.caps', $3, true);   -- caps = csv of resource:action

ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON residents
  USING (municipality_id = current_setting('app.municipality_id')::uuid);

CREATE POLICY staff_write ON residents FOR UPDATE
  USING  (current_setting('app.caps') LIKE '%residents:all%')
  WITH CHECK (municipality_id = current_setting('app.municipality_id')::uuid);
```

- `requirePermission(resource, action)` finally wired on **every** mutating route (belt over the RLS suspenders).
- Refresh-token rotation **+ reuse detection** (revoke token family on replay).
- Tamper-evident `audit_logs` via DB triggers, app-immutable.

---

## 5. Realtime

- **Keep** the single Socket.IO hub: role rooms (`admins`, `user:<id>`) at connect; per-resource `transaction:<id>` opt-in with clean unsubscribe; reconnect rejoins rooms.
- **Change:** emit via Postgres `LISTEN/NOTIFY` (or Supabase Realtime). Controllers write the row; the DB notifies; the hub fans out. Any write — API, job, migration — reaches subscribers consistently.
- **Delete** the dead `subscriber:` room API (F4). CI lint rule asserts unsubscribe-on-unmount in every spoke hook.

---

## 6. Security posture

- **P0 (now):** secrets out of source (F6); remove fallback passwords + prod test-seed creds; rotate leaked keys.
- **P1 (V2 core):** RLS on all tenant tables; `requirePermission` wired; refresh reuse-detection; trigger-based audit.
- **P2 (hardening):** edge input validation (zod/express-validator); per-identity rate-limit; CSP + signed Storage URLs; dependency + secret scanning in CI.
- **Top threat:** Broken Access Control (OWASP A01) — closed by RLS **and** wired `requirePermission`, two independent layers.

---

## 7. Performance & Usability

**Performance** (LGU scale = thousands, optimize read latency + correctness-under-load, not raw QPS):
- Audit Prisma `include` graphs for N+1 on the beneficiary/transaction/service list hot paths (`buildHWWhere`, paginated). Cursor pagination over offset; project only needed columns.
- Cache reference data in Upstash Redis (classification types, services catalog, FAQs, GIS polygons) — TTL + invalidate-on-write.
- BullMQ jobs for heavy writes/exports (bulk beneficiary export, PDF certs, fuzzy reconcile, email).
- Keep `React.lazy` split; add hover-prefetch on admin nav; bundle budget in CI; Supabase pooler (PgBouncer).

**Usability:**
- `@united/ui` (one component lib) + `@united/types` (DTOs generated from Prisma) across all three apps — kills F5 drift. One a11y baseline (WCAG AA).
- **Resident 360:** citizen self-service, staff record, and transactions resolve to one resident with a single status timeline, driven by `resident_classifications`.
- **Offline-first PWA** (spotty LGU connectivity): registration submissions queue locally, sync on reconnect, idempotent via client-generated UUID.
- Keep per-module maintenance mode; unify realtime notifications into one cross-module inbox; async bulk staff actions with progress.

---

## 8. Migration path (strangler — each step ships independently)

| Step | Work | Note |
|------|------|------|
| 0 | **Secrets remediation** (F6) | P0, parallel, blocks nothing |
| 1 | **RLS + transactions + outbox** on existing schema | No API change; fixes F1+F3 |
| 2 | **Wire `requirePermission`** across ~30 route files | Mechanical; middleware exists |
| 3 | **BIMS raw-`pg` → Prisma**, table by table | Behind unchanged APIs; merges user tables (F2) |
| 4 | **Extract `@united/ui` + `@united/types`** | Stops frontend drift (F5) |
| 5 | **Realtime → NOTIFY-sourced**; delete dead `subscriber:` path (F4) | Decouple emission |
| 6 | **Consolidate to one backend** | Only if two-service overhead is proven to hurt |

**Goal 1 of the V2 program = Steps 0–2** (the safety foundation). Steps 3–6 are separate later goals, each gated on the prior.

---

## 9. Architecture decisions

**Decided:** modular monolith over microservices · RLS as primary authz · single ORM (Prisma) · outbox + queue for all side effects · shared frontend packages · strangler migration.

**Rejected:** microservices (network latency + distributed-txn pain for a problem you don't have) · green-field rewrite (logic is sound) · GraphQL (REST + typed client fits this scale) · app-only authz (V1's open-endpoint model) · inline fuzzy match on the hot path.
