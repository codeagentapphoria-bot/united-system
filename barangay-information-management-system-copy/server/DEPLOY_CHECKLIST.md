# BIMS Server — Deployment Checklist (Unified Supabase DB)

**Target DB:** `exahyuahguriwrkkeuvm.supabase.co` (Borongan Unified System)
**Prepared:** Mar 23, 2026

---

## Pre-Deployment (One-Time Setup)

- [ ] **Copy env file**
  ```bash
  cp server/env.unified server/.env
  ```
  Then fill in the real values (DB password is already set in `env.unified`).

- [ ] **Verify `.env` has the correct Supabase values**
  | Variable | Expected value |
  |---|---|
  | `PG_USER` | `postgres.exahyuahguriwrkkeuvm` |
  | `PG_HOST` | `aws-1-ap-south-1.pooler.supabase.com` |
  | `PG_DATABASE` | `postgres` |
  | `PG_PORT` | `6543` |
  | `PG_SSL` | `true` |

- [ ] **Install dependencies**
  ```bash
  cd server && npm install
  ```

- [ ] **Confirm Supabase schema is applied**
  The following tables must exist: `municipalities`, `barangays`, `bims_users`, `residents`, `gis_municipality`, `gis_barangay`
  ```bash
  psql "postgresql://postgres.exahyuahguriwrkkeuvm:<pass>@aws-1-ap-south-1.pooler.supabase.com:6543/postgres" \
    -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
  ```

- [ ] **Confirm GIS data is seeded** (should be 23 municipalities, 607 barangays)
  ```bash
  psql "..." -c "SELECT 'municipalities', COUNT(*) FROM gis_municipality UNION ALL SELECT 'barangays', COUNT(*) FROM gis_barangay;"
  ```

- [ ] **Seed initial municipality and admin user** via the setup flow on first launch
  (BIMS uses a setup wizard on first run — this creates the municipality, barangays, and first admin account)

---

## Deployment Steps

1. **Stop the old server** (if running against old `bims_production` DB)

2. **Copy env**
   ```bash
   cp server/env.unified server/.env
   ```

3. **Start the server**
   ```bash
   cd server && node server.js
   # or with PM2:
   pm2 start ecosystem.config.cjs
   ```

4. **Watch the startup logs** — confirm:
   ```
   PostgreSQL connected successfully
   ```
   If you see a connection error, check `PG_PASSWORD` for special characters (`&`, `@`, `?`) — they must be unescaped in the `.env` file (the env file uses raw values, unlike URL encoding).

---

## Smoke Tests

After starting the server, verify these endpoints respond correctly:

| Method | Endpoint | Expected |
|---|---|---|
| `GET` | `/api/public/geojson/municipalities` | GeoJSON with 23 features |
| `GET` | `/api/public/geojson/barangays/all` | GeoJSON with 607 features |
| `POST` | `/api/auth/login` | 401 (no users yet — expected on fresh DB) |
| `GET` | `/api/public/geojson/city` | GeoJSON from `gis_municipality` |

---

## Changes Made to BIMS Backend (Summary)

These files were updated as part of the unified DB migration:

| File | Change |
|---|---|
| `src/queries/auth.queries.js` | `users` → `bims_users` (5 queries) |
| `src/queries/user.queries.js` | `users` → `bims_users` (6 queries) |
| `src/services/userServices.js` | `users` → `bims_users` (6 inline SQL strings) |
| `src/controllers/userControllers.js` | Constraint name `users_email_key` → `bims_users_email_key` |
| `src/routes/gisRoute.js` | `gis_borongan` → `gis_municipality` (line 26 — table didn't exist) |
| `src/scripts/unifiedMigration.js` | `users` → `bims_users` (3 refs) |
| `src/scripts/completeMigration.js` | `users` → `bims_users` (4 refs) |
| `src/scripts/setupAuditSystem.js` | `users` → `bims_users` (4 refs) |
| `src/scripts/rollbackMigration.js` | `users` → `bims_users` (2 refs) |
| `src/scripts/seedDatabase.js` | `users` → `bims_users` (table, indexes, trigger, queries) |
| `src/scripts/cleanupOrphanedFiles.js` | `users` → `bims_users` (1 ref) |
| `src/scripts/investigateOrphanedClassifications.js` | `users` → `bims_users` (1 ref) |
| `src/config/db.js` | `connectionTimeoutMillis` 2000 → 10000 (for Supabase cloud latency) |
| `server/env.unified` | New file — Supabase connection template |

---

## Rollback

If something goes wrong after deployment:

1. Restore old `.env`:
   ```bash
   cp server/env.example server/.env
   # Set PG_* vars back to original bims_production values
   ```

2. Restart the server — it will reconnect to the original `bims_production` DB.

The unified Supabase DB is unaffected by a rollback; it stays live for the E-Services backend.
