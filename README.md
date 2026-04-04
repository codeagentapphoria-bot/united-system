# United Systems

A unified digital governance platform combining the **Barangay Information Management System (BIMS)** and the **E-Services portal (Multysis)** into a single integrated solution backed by a shared PostgreSQL database.

> **Architecture:** v2 (March 2026 overhaul). See [`OVERHAUL.md`](./OVERHAUL.md) for the full plan, implementation status, and detailed technical specifications.

---

## Systems

### BIMS — Barangay Information Management System

Used by **barangay and municipal staff** to:

- Review and approve resident registration requests (submitted via portal)
- View and search resident records and households
- Manage barangay officials, records, inventories, archives, pets
- Set up the municipality via interactive GeoMap (auto-creates barangays from PSGC GeoJSON)
- Bulk download / print resident ID cards as PDF
- Process barangay certificate requests (walk-in and portal submissions in a unified queue)
- Manage certificate templates (HTML-based, uploaded per municipality)

### E-Services — Multysis Portal

A **citizen-facing portal** where residents:

- Register themselves with a username/password or Google account
- Track registration request status
- Apply for government services online (certificates, permits, and 60+ more)
- Apply as a **guest** (no account required — tracked by reference number)
- View their resident ID card
- Manage their household
- Access social amelioration and government programs

---

## What Changed in v2 (March 2026)

### Removed

| Removed | Replaced By |
|---|---|
| `citizens`, `non_citizens`, `subscribers` tables | Unified `residents` table |
| `citizen_resident_mapping` bridge table | N/A — no longer two person stores |
| `puroks` address tier | Barangay + street address (2-tier) |
| `eservices` table | `services` table (handles both systems) |
| `otp_verifications` table | N/A — OTP login dropped |
| Phone/OTP portal login | Username + password |
| Flutter mobile app (`mobile_app/bimsApp/`) | Registration centralized to portal — sync no longer needed |

### Added

| Addition | Details |
|---|---|
| Unified `residents` table | Single source of truth for all persons across both systems |
| Username + password portal login | For residents without a Google account |
| Guest application flow (AC2) | Non-residents can apply for services; tracked by reference number, no account needed |
| Unified certificate queue (AC3) | Walk-in (BIMS counter) and portal requests handled in the same queue |
| Template-based certificate generation (AC4) | Admins upload HTML templates with `{{ placeholder }}` tokens; PDFs generated via Puppeteer |
| GeoJSON municipality setup | Admin selects municipality on map; barangays auto-created from PSGC GeoJSON |

See [`OVERHAUL.md § 3–4`](./OVERHAUL.md) for full rationale behind each decision.

---

## Repository Structure

```
united-systems/
│
├── barangay-information-management-system-copy/
│   ├── client/          ← BIMS Frontend  (React + Vite + shadcn/ui)
│   └── server/          ← BIMS Backend   (Node.js + Express + raw SQL)
│
├── borongan-eService-system-copy/
│   ├── multysis-frontend/  ← E-Services Frontend (React + Vite + shadcn/ui)
│   └── multysis-backend/   ← E-Services Backend  (TypeScript + Express + Prisma)
│
├── united-database/
│   ├── schema.sql       ← Unified schema v2 (source of truth)
│   ├── seed.sql         ← Base seed (roles, permissions, default data)
│   └── seed_gis.sql     ← GIS geometry data (Eastern Samar — required for GeoMap + portal)
│
├── archive/             ← Original unmodified codebases (reference only, do not modify)
│
├── OVERHAUL.md          ← Detailed architecture plan, requirements, decisions, API reference
├── DEPLOYMENT.md        ← DevOps deployment guide
├── REPORTS.md           ← QA validation report and fix checklist
└── README.md            ← This file
```

---

## Tech Stack

| Layer | BIMS | E-Services |
|---|---|---|
| **Frontend** | React + Vite + shadcn/ui | React + Vite + shadcn/ui |
| **Backend** | Node.js + Express + raw SQL | TypeScript + Express + Prisma |
| **Database** | PostgreSQL (unified, shared) | PostgreSQL (unified, shared) |
| **Auth** | JWT (httpOnly cookies) | JWT (httpOnly cookies) |
| **Portal auth** | — | Username/password + Google OAuth |
| **Real-time** | — | Socket.io |
| **Email** | Nodemailer | Nodemailer |
| **Maps / GIS** | PostGIS + Leaflet | — |
| **File uploads** | Multer | Multer |
| **PDF generation** | Puppeteer | — |

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ with PostGIS extension
- `psql` CLI for running schema/seed files

### 1. Install dependencies

```bash
# BIMS Backend
cd barangay-information-management-system-copy/server && npm install && cd ../..

# BIMS Frontend
cd barangay-information-management-system-copy/client && npm install && cd ../..

# E-Services Backend
cd borongan-eService-system-copy/multysis-backend && npm install && cd ../..

# E-Services Frontend
cd borongan-eService-system-copy/multysis-frontend && npm install && cd ../..
```

### 2. Configure environment variables

```bash
# BIMS Backend
cp barangay-information-management-system-copy/server/.env.example \
   barangay-information-management-system-copy/server/.env

# E-Services Backend
cp borongan-eService-system-copy/multysis-backend/.env.example \
   borongan-eService-system-copy/multysis-backend/.env

# E-Services Frontend
cp borongan-eService-system-copy/multysis-frontend/.env.example \
   borongan-eService-system-copy/multysis-frontend/.env
```

Minimum required variables per service are documented in [`OVERHAUL.md § 11`](./OVERHAUL.md).

### 3. Set up the database

```bash
export DB_URL="postgresql://<user>:<password>@<host>:5432/postgres"

# Apply schema
psql "$DB_URL" -f united-database/schema.sql

# Load seed data
psql "$DB_URL" -f united-database/seed.sql

# Load GIS geometry data (required for GeoMap setup and portal registration)
psql "$DB_URL" -f united-database/seed_gis.sql
```

> `seed_gis.sql` contains Eastern Samar province geometry. For a different province, see [`DEPLOYMENT.md — Deploying to a Different Province`](./DEPLOYMENT.md).

### 4. Generate Prisma client

```bash
cd borongan-eService-system-copy/multysis-backend
npx prisma generate
```

### 5. Start all services

```bash
# Terminal 1 — BIMS Backend (port 5000)
cd barangay-information-management-system-copy/server && node server.js

# Terminal 2 — BIMS Frontend (port 5173)
cd barangay-information-management-system-copy/client && npm run dev

# Terminal 3 — E-Services Backend (port 3000)
cd borongan-eService-system-copy/multysis-backend && npm run dev

# Terminal 4 — E-Services Frontend (port 5174)
cd borongan-eService-system-copy/multysis-frontend && npm run dev
```

| Service | URL |
|---|---|
| BIMS Frontend | http://localhost:5173 |
| BIMS Backend API | http://localhost:5000/api |
| E-Services Frontend | http://localhost:5174 |
| E-Services Backend API | http://localhost:3000/api |

### 6. First-time BIMS setup

After starting the system, a BIMS admin must complete the **Municipality Setup**:

1. Log in to BIMS → **Setup → Municipality Setup**
2. Click your municipality on the GeoMap
3. Confirm — barangays are auto-created from PSGC GeoJSON data

Until setup is complete, the portal address dropdowns will be empty.

---

## Key Workflows

### Resident Registration
```
Portal → Register (wizard) → BIMS admin reviews → Approve/Reject → Resident notified
```
Registration only happens via the portal. BIMS staff never create resident records manually.

### Guest Application
```
Portal → Apply as Guest → Fill name/contact/email → Submit → Reference number issued
→ Track status at /portal/track?ref=TXN-XXXX (no login required)
```

### Portal Login
Two supported methods:
- **Username + password** — for residents without a Google account
- **Google OAuth** — sign in with Google

### Certificate Requests
Both flows feed the same barangay certificate queue in BIMS:
- **Walk-in** — BIMS staff enters at the counter (`requests` table)
- **Portal** — resident submits online (`transactions` table)

### Certificate Generation
BIMS admins upload HTML templates with `{{ placeholder }}` tokens (e.g. `{{ resident.fullName }}`, `{{ officials.captain }}`). PDFs are generated on demand via Puppeteer. See [`OVERHAUL.md § 14`](./OVERHAUL.md) for the full token reference.

### Resident ID
- Assigned when BIMS admin approves registration
- Format: `RES-{YEAR}-{7-digit}` (e.g., `RES-2025-0000001`), per municipality
- Viewable by resident in the portal (My ID page)
- Bulk downloadable as PDF by BIMS admin

---

## Project Status

| Component | Status |
|---|---|
| Database schema v2 | ✅ Written — v2 clean, puroks removed, FKs/triggers/indexes verified |
| E-Services backend | ✅ TypeScript compiles clean — QA fixes applied (2026-03-25) |
| E-Services frontend | ✅ QA fixes applied (2026-03-25) — build not yet formally verified |
| BIMS backend | ✅ QA fixes applied (2026-03-25) — build not yet formally verified |
| BIMS frontend | ✅ QA fixes applied (2026-03-25) — build not yet formally verified |
| Database migration (fresh DB) | ⏳ Not yet run against Supabase production |
| End-to-end registration test | ⏳ Not yet run |
| Guest transaction test | ⏳ Not yet run |
| Certificate template test | ⏳ Not yet run |
| GeoJSON setup test | ⏳ Not yet run |
| Bulk ID test | ⏳ Not yet run |

> **Pending cleanup:** E-Services backend contains legacy `@ts-nocheck` files (`citizen.service.ts`, `subscriber.service.ts`, etc.) that are obsolete but retained for reference. These should be deleted once end-to-end testing confirms the system is working. See [`OVERHAUL.md § 15`](./OVERHAUL.md).

See [`OVERHAUL.md § 10`](./OVERHAUL.md) for the full implementation checklist.

---

## Documentation

| File | Contents |
|---|---|
| [`OVERHAUL.md`](./OVERHAUL.md) | Full architecture plan, requirements, decisions, implementation status, API reference |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | DevOps deployment guide (env vars, GIS setup, province configuration) |
| [`REPORTS.md`](./REPORTS.md) | QA validation report and fix checklist (2026-03-25) |

---

*United Systems — Built March 2026*
