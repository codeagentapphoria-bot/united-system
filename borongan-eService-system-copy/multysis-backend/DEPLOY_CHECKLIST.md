# E-Services (Multysis) Backend — Deployment Checklist (Unified Supabase DB)

**Target DB:** `exahyuahguriwrkkeuvm.supabase.co` (Borongan Unified System)
**Prepared:** Mar 23, 2026

---

## Pre-Deployment (One-Time Setup)

- [ ] **Copy env file**
  ```bash
  cp .env.unified .env
  ```

- [ ] **Verify `.env` has the correct Supabase values**
  | Variable | Expected value |
  |---|---|
  | `DATABASE_URL` | `postgres://postgres.exahyuahguriwrkkeuvm:...@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
  | `DIRECT_URL` | `postgres://postgres.exahyuahguriwrkkeuvm:...@aws-1-ap-south-1.pooler.supabase.com:5432/postgres` |

  > **Note:** Special characters in the password (`&`, `@`, `?`) must be **percent-encoded** in the URL:
  > - `&` → `%26`
  > - `@` → `%40`
  > - `?` → `%3F`
  >
  > The `.env.unified` file already has these encoded correctly.

- [ ] **Install dependencies**
  ```bash
  npm install
  ```

- [ ] **Generate Prisma client** (already done once — re-run if schema changes)
  ```bash
  npx prisma generate
  # or using the pinned v5 CLI:
  /tmp/prisma-cli/node_modules/.bin/prisma generate
  ```

  > **Important:** Do NOT run `prisma db push` or `prisma migrate deploy` against the unified DB.
  > The schema was already applied via `united-database/schema.sql`.
  > Prisma would try to alter/drop tables that belong to BIMS, causing data loss.

- [ ] **Confirm Supabase schema is applied** — key E-Services tables must exist:
  ```bash
  psql "$DIRECT_URL" -c "
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public'
    AND table_name IN ('citizens','transactions','services','eservice_users','subscribers')
  ORDER BY table_name;"
  ```

---

## Deployment Steps

1. **Copy env**
   ```bash
   cp .env.unified .env
   ```

2. **Install and generate**
   ```bash
   npm install
   npx prisma generate
   ```

3. **Build TypeScript** (if applicable)
   ```bash
   npm run build
   ```

4. **Start the server**
   ```bash
   npm start
   # or with PM2:
   pm2 start ecosystem.config.js
   ```

5. **Watch startup logs** — confirm:
   ```
   Connected to database
   Server running on port 3000
   ```

---

## Smoke Tests

After starting the server, verify these endpoints:

| Method | Endpoint | Expected |
|---|---|---|
| `GET` | `/api/health` or `/api/ping` | 200 OK |
| `POST` | `/api/auth/login` | 401 (no admin users yet — expected on fresh DB) |
| `GET` | `/api/services` | 200 with empty array (no services seeded yet) |
| `GET` | `/api/faqs` | 200 with 5 FAQ records (from seed.sql) |

---

## Changes Made to E-Services Backend (Summary)

These files were updated as part of the unified DB migration:

| File | Change |
|---|---|
| `prisma/schema.prisma` | `@@map("users")` → `@@map("eservice_users")` on `User` model |
| `prisma/schema.prisma` | Added `@map("snake_case")` to **278 camelCase scalar fields** across all models — maps Prisma's camelCase field names to the PostgreSQL snake_case column names in the unified DB |
| `prisma/schema.prisma` | Added `@@map("snake_case")` to **19 enum declarations** — maps Prisma's PascalCase enum names to the PostgreSQL lowercase enum type names |
| `src/services/admin.service.ts` | Fixed 5 `$queryRaw` SQL strings — changed quoted camelCase column names (`"residencyStatus"`, `"serviceId"`, etc.) to unquoted snake_case (`residency_status`, `service_id`, etc.) to match the unified DB schema |
| `.env.unified` | New file — Supabase connection template with `DATABASE_URL` (pooled) and `DIRECT_URL` |

---

## Why `prisma db push` Is NOT Used

The unified DB was created directly from `united-database/schema.sql`, which:
- Uses snake_case column names (PostgreSQL convention)
- Includes BIMS tables that Prisma doesn't know about
- Has pre-existing seed data (GIS, RBAC, FAQs)

Running `prisma db push` would try to:
- Drop BIMS-owned tables (`bims_users`, `residents`, etc.)
- Alter column types and nullability
- Rename constraints

Instead, `prisma generate` is used — it builds the TypeScript client that understands the `@map` decorators, without touching the DB.

---

## Rollback

If something goes wrong:

1. Restore old `.env`:
   ```bash
   # Point DATABASE_URL back to the original multysis DB
   DATABASE_URL=postgresql://postgres:pass@localhost:5432/multysis
   DIRECT_URL=postgresql://postgres:pass@localhost:5432/multysis
   ```

2. Regenerate the Prisma client for the old schema:
   ```bash
   git stash  # revert schema.prisma changes
   npx prisma generate
   ```

3. Restart the server — it will reconnect to the original `multysis` DB.
