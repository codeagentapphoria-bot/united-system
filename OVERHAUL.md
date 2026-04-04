# United Systems — Architecture Overhaul Plan

> **Document type:** Living technical specification  
> **Started:** March 2026  
> **Status:** In progress

---

## 1. Background

The United Systems platform was originally built as two separate systems for the **City of Borongan, Eastern Samar**:

- **BIMS** (Barangay Information Management System) — used by barangay and city hall staff to manage residents, households, barangay officials, and records.
- **E-Services / Multysis** — a citizen-facing portal where residents apply for government services online.

The two systems shared a database but tracked persons in separate, incompatible tables (`residents` in BIMS, `citizens`/`non_citizens`/`subscribers` in E-Services). Registration happened independently in each system. The mobile app (Flutter) synced BIMS data offline.

Over time, this divergence created serious data integrity and workflow problems that required a ground-up architectural overhaul.

---

## 2. Requirements (User-Defined)

The following six requirements were explicitly stated for this overhaul:

### R1 — Unified Residents Table
> *"The system should have a unified residents/citizens table. Not separate table."*

A single `residents` table replaces `citizens`, `non_citizens`, and `subscribers`. It is the single source of truth for all persons in both systems.

### R2 — Centralized Registration via Portal
> *"No resident and household registration in BIMS. All registration will happen in the front-facing portal."*

Residents register themselves via the E-Services portal. BIMS can only **view** and **approve** — it never creates resident or household records directly. This eliminates duplicate data entry and conflicting records.

### R3 — Multi-Municipality Reusability
> *"System reusability, the system can be used in different other municipality."*

All Borongan-specific hardcoding is removed. Municipality is a runtime configuration — each deployment selects its municipality during initial setup. The system is not tied to any particular city or province.

### R4 — GeoJSON-Based Municipality Setup
> *"In BIMS on the municipality setup, admin selects a municipality on the GeoMap, the GeoJSON has a complete GeoJSON of the whole province with municipality and the barangays of the municipality."*

During BIMS initial setup, the admin selects their municipality on an interactive map. Barangays are **auto-created** from official PSGC GeoJSON data — no manual entry. Puroks are removed from the address model (can be reintroduced later if needed).

### R5 — Username + Password + Google OAuth
> *"Not all residents have Gmail, so we have to create a way to add an option to login as username/password and also Google auth (current)."*

The portal login supports two methods:
- **Username + password** — for residents without a Google account
- **Google OAuth** — existing flow, unchanged

Phone/OTP login is removed entirely.

### R6 — Resident ID in Portal + Bulk Download in BIMS
> *"The resident ID should be located in the resident portal so they can view it. Then the BIMS municipality admin can bulk download the ID (in PDF) or bulk print."*

- Residents see their generated ID card in the portal (My ID page).
- BIMS admin can filter residents and bulk-download/print IDs as a PDF.
- ID format: `{PREFIX}-{YEAR}-{7-digit-counter}` (e.g., `RES-2025-0000001`), scoped per municipality per year.

---

## 3. Systems Removed

### Mobile App (Flutter)
The BIMS Flutter mobile app (`mobile_app/bimsApp/`) has been **removed entirely**. Its primary function was syncing residents and households between field staff and the BIMS database. With registration now centralized to the portal, this sync mechanism is no longer needed or appropriate. The mobile app directory has been deleted from the repository.

---

## 4. Architecture Decisions

| Decision | Rationale |
|---|---|
| Table name `residents` (not `persons` or `citizens`) | Consistent with BIMS terminology; Filipino government context |
| Auth credentials in separate `resident_credentials` table | Clean separation between identity data and auth data; credentials are optional (residents approved by staff have no credentials until they claim their account) |
| UUID as primary key for `residents` | Globally unique, safe to expose in API responses |
| Human-readable `resident_id` for display | Format `{PREFIX}-{YEAR}-{7-digit}` — easy for staff to read, scoped per municipality |
| Households self-registered via portal | Residents declare their own household; BIMS staff review. Eliminates house-to-house enumeration dependency |
| Puroks removed | Not universally used in other municipalities; barangay + street address is sufficient for v2 |
| GeoJSON auto-creates barangays | Uses official PSGC data; eliminates manual barangay entry; ensures accuracy |
| Username + password (not phone OTP) | Phone OTP requires SMS gateway cost and infrastructure; not all residents have active phone numbers |
| `subscriber` role renamed to `resident` | Clearer, consistent with unified terminology |
| `citizen`/`nonCitizen`/`subscriber` models removed | Obsolete after unification; replaced by `resident` + `resident_credentials` |
| OTP verification table removed | OTP flow dropped; no longer needed |
| `citizen_resident_mapping` bridge table removed | No longer two separate systems to bridge |
| Address: `barangayId` (FK) + `streetAddress` (free text) | Replaces the old `addresses` lookup table; cascading dropdown in portal |

---

## 5. New Database Schema

### 5.1 Schema Version

File: `united-database/schema.sql` (v2, March 2026)

### 5.2 Tables by Group

#### Geography / Administrative
| Table | Description |
|---|---|
| `municipalities` | One row per deployed municipality; holds setup status, logos, ID backgrounds |
| `barangays` | All barangays under a municipality; auto-created from GeoJSON |
| `gis_municipality` | PostGIS polygon for the municipality boundary |
| `gis_barangay` | PostGIS polygon per barangay (used in GeoMap setup) |

#### Unified Person Records (BIMS + E-Services shared)
| Table | Description |
|---|---|
| `residents` | **Single source of truth.** All persons: portal registrants + BIMS-approved records |
| `resident_credentials` | Portal auth credentials (username, hashed password, Google ID). 1-to-1 with `residents`. Optional — staff-created residents have no credentials until they register |
| `registration_requests` | Portal registration submissions awaiting BIMS admin approval |
| `resident_counters` | Per-municipality, per-year atomic counter for `resident_id` generation |
| `resident_classifications` | Tags on a resident (e.g., senior citizen, PWD, solo parent, voter) |
| `classification_types` | Lookup for classification categories |

#### Households / Families (BIMS)
| Table | Description |
|---|---|
| `households` | A physical dwelling; self-registered by a resident via portal |
| `families` | A family group within a household |
| `family_members` | Residents linked to a family |

#### BIMS Features
| Table | Description |
|---|---|
| `officials` | Barangay officials |
| `requests` | Barangay-level service requests (certificates, etc.) |
| `inventories` | Barangay inventory items |
| `archives` | Document archive entries |
| `pets` | Registered pets |
| `vaccines` | Vaccination records for pets |

#### BIMS Auth
| Table | Description |
|---|---|
| `bims_users` | Staff accounts for barangay and municipality staff |
| `api_keys` | API keys for Open API (third-party) access |
| `audit_logs` | Full audit trail of data changes in BIMS |

#### E-Services Auth
| Table | Description |
|---|---|
| `eservice_users` | Admin accounts for the E-Services backend |
| `roles` / `permissions` / `role_permissions` / `user_roles` | RBAC system |
| `refresh_tokens` | JWT refresh tokens (resident and admin) |
| `sessions` | Active login sessions (idle/absolute timeout tracking) |

#### E-Services — Services & Transactions
| Table | Description |
|---|---|
| `services` | Available government services (business permits, certificates, etc.) |
| `eservices` | Extended e-government service listings |
| `transactions` | A resident's application for a service. FK: `resident_id` |
| `transaction_notes` | Chat messages between admin and resident on a transaction |
| `appointment_notes` | Admin notes on appointment scheduling |

#### E-Services — Tax
| Table | Description |
|---|---|
| `tax_profiles` | Tax computation configurations |
| `tax_profile_versions` | Versioned tax rate configurations |
| `tax_computations` | Computed tax for a transaction |
| `exemptions` | Tax exemption applications |
| `payments` | Payment records for transactions |

#### E-Services — Social Amelioration
| Table | Description |
|---|---|
| `social_amelioration_settings` | Lookup values for pension types, disability types, grade levels, etc. |
| `senior_citizen_beneficiaries` | Senior citizen beneficiary records. FK: `resident_id` |
| `pwd_beneficiaries` | PWD beneficiary records. FK: `resident_id` |
| `student_beneficiaries` | Student beneficiary records. FK: `resident_id` |
| `solo_parent_beneficiaries` | Solo parent beneficiary records. FK: `resident_id` |
| `government_programs` | Government assistance programs |
| `beneficiary_program_pivots` | Many-to-many: beneficiary ↔ program |

#### Other
| Table | Description |
|---|---|
| `faqs` | Frequently asked questions for the portal |

### 5.3 Key Relationships

```
municipalities 1──* barangays 1──* residents 1──1 resident_credentials
                                      │
                                      ├──* transactions 1──* transaction_notes
                                      ├──1 senior_citizen_beneficiaries
                                      ├──1 pwd_beneficiaries
                                      ├──1 student_beneficiaries
                                      ├──1 solo_parent_beneficiaries
                                      └──* registration_requests

municipalities 1──* gis_barangay (spatial, read-only)
```

### 5.4 Removed Tables

The following tables from the old schema are **gone** in v2:

| Removed Table | Replaced By |
|---|---|
| `citizens` | `residents` |
| `non_citizens` | `residents` |
| `subscribers` | `residents` + `resident_credentials` |
| `citizen_registration_requests` | `registration_requests` |
| `citizen_resident_mapping` | N/A — no longer two person stores to bridge |
| `otp_verifications` | N/A — OTP login removed |
| `addresses` (lookup) | `barangays` FK + `street_address` free text |
| `place_of_birth` | Inline fields on `residents` |
| `mother_info` | Inline fields on `residents` |
| `puroks` | Removed (can be reintroduced later) |

---

## 6. Authentication Flow

### 6.1 Portal Login (Residents)

Two methods supported:

**Username + Password**
```
POST /api/auth/portal/login
Body: { username, password }
→ Looks up resident_credentials by username
→ Validates bcrypt password hash
→ Returns JWT access token + refresh token (httpOnly cookies)
```

**Google OAuth**
```
GET  /api/auth/portal/google          → Redirects to Google consent screen
GET  /api/auth/portal/google/callback → Exchanges code for Google profile
POST /api/auth/portal/google/supabase → Frontend-initiated (Supabase token exchange)
→ Finds resident_credentials by googleId
→ If not found → returns 404 NOT_REGISTERED
→ Returns JWT tokens
```

**JWT Token Payload (resident)**
```json
{
  "id": "<resident UUID>",
  "username": "<username>",
  "role": "resident",
  "type": "resident"
}
```

### 6.2 Admin Login (E-Services Staff)

```
POST /api/auth/admin/login
Body: { email, password }
→ Looks up eservice_users by email
→ Validates bcrypt hash
→ Returns JWT tokens
```

### 6.3 BIMS Staff Login

Handled separately by the BIMS backend (Express + raw SQL). BIMS uses `bims_users` table, not shared with E-Services admin accounts.

---

## 7. Registration Flow

The new flow eliminates any BIMS-side resident creation:

```
1. Resident visits E-Services portal
2. Clicks "Register" → fills out multi-step wizard
   - Personal info (name, DOB, sex, civil status, etc.)
   - Address (municipality dropdown → barangay dropdown → street address)
   - Contact details
   - Creates username + password
   - Optionally: uploads proof of residency / ID photo
3. Registration request saved to registration_requests (status: PENDING)
4. BIMS admin receives notification in Registration Approvals page
5. BIMS admin reviews → APPROVE or REJECT
   - On APPROVE:
     a. Resident record created in `residents` (status: active)
     b. Resident credentials created in `resident_credentials`
     c. `resident_id` generated atomically using `resident_counters`
     d. Household auto-created if address provided
     e. Email notification sent to resident
   - On REJECT:
     a. registration_requests.status = 'rejected'
     b. Email notification with reason sent
6. Resident can log in after approval
7. Resident views their ID card in My ID page
```

---

## 8. Resident ID

### Format
```
{PREFIX}-{YEAR}-{7-digit-zero-padded-counter}
Example: RES-2025-0000001
```

### Generation
- Counter stored in `resident_counters` table (scoped per `municipality_id` + `year`)
- Uses PostgreSQL `ON CONFLICT DO UPDATE` for atomic increment
- Assigned only when BIMS admin **approves** a registration request
- Shown in portal (My ID page) and used for bulk PDF download/print in BIMS

### Bulk Download / Print (BIMS)
- BIMS admin accesses **Residents → Bulk ID** page
- Can filter by barangay, status, date range
- Downloads a PDF with one ID card per resident (front + back)
- ID card design uses municipality's `id_background_front_path` and `id_background_back_path` images

---

## 9. GeoJSON Municipality Setup

### Flow
```
1. BIMS admin opens Setup → Municipality Setup
2. GeoMap loads (Leaflet + PostGIS GeoJSON from gis_municipality / gis_barangay)
3. Admin clicks their municipality on the map
4. System reads the GeoJSON feature properties (PSGC code, name)
5. Inserts/updates municipalities record
6. Auto-creates all barangays from the GeoJSON barangay features
7. Municipality status set to 'active'
```

### API Endpoints (BIMS Backend)
```
POST /api/setup/municipality        — Create municipality from GeoJSON selection
GET  /api/setup/barangays           — List auto-created barangays
GET  /api/gis/municipality          — Serve GeoJSON for the map
GET  /api/gis/barangays/:muniCode   — Serve barangay GeoJSON for a municipality
```

### Address in Portal
After setup, the portal's registration wizard fetches:
```
GET /api/addresses/municipalities          → Dropdown of active municipalities
GET /api/addresses/barangays?municipalityId=1 → Cascading barangay dropdown
```

---

## 10. Implementation Status

### ✅ Completed

#### Database
- [x] `united-database/schema.sql` — Full schema v2 rewrite
- [x] `united-database/seed.sql` — Updated seed data

#### E-Services Backend (`borongan-eService-system-copy/multysis-backend/`)
- [x] `prisma/schema.prisma` — Full rewrite for unified schema
- [x] `npx prisma generate` — Client regenerated
- [x] `src/services/auth.service.ts` — Portal login (username/password) + admin login
- [x] `src/services/oauth.service.ts` — Google OAuth for portal
- [x] `src/services/refreshToken.service.ts` — Updated for `residentId` FK
- [x] `src/services/address.service.ts` — New: municipality + barangay lookups
- [x] `src/services/resident.service.ts` — New: admin-side resident CRUD
- [x] `src/services/portal-registration.service.ts` — New: registration request workflow
- [x] `src/services/email-templates/resident-notifications.ts` — New: approval/rejection emails
- [x] `src/services/transaction.service.ts` — `subscriber` → `resident` field updates
- [x] `src/services/transaction-note.service.ts` — `SUBSCRIBER` → `RESIDENT`, `subscriberId` → `residentId`
- [x] `src/services/admin.service.ts` — Dashboard statistics updated for unified schema
- [x] `src/services/social-amelioration.service.ts` — Fixed `...resident` spread typos
- [x] `src/services/socket.service.ts` — All emit functions updated (`subscriberId`/`citizenId` → `residentId`)
- [x] `src/controllers/auth.controller.ts` — Portal + admin login controllers
- [x] `src/controllers/portal-registration.controller.ts` — New: registration request CRUD
- [x] `src/controllers/address.controller.ts` — New: municipality/barangay endpoints
- [x] `src/controllers/admin.controller.ts` — Role check fix (`subscriber` → `resident`)
- [x] `src/controllers/transaction.controller.ts` — Role checks + filter updates
- [x] `src/controllers/transaction-note.controller.ts` — Sender type fix
- [x] `src/controllers/social-amelioration.controller.ts` — No changes needed (uses `any` types)
- [x] `src/middleware/auth.ts` — Updated JWT type (`subscriber` → `resident`)
- [x] `src/middleware/sessionTimeout.ts` — Updated for `resident` type
- [x] `src/routes/auth.routes.ts` — Portal + admin login routes
- [x] `src/routes/portal-registration.routes.ts` — New: registration workflow routes
- [x] `src/routes/address.routes.ts` — New: address hierarchy routes
- [x] `src/types/socket.types.ts` — All `subscriberId`/`citizenId` → `residentId`, `SUBSCRIBER` → `RESIDENT`
- [x] `src/socket/socket.ts` — Socket auth updated for `resident` type
- [x] `src/index.ts` — Routes registered
- [x] **TypeScript build: `tsc --noEmit` passes with 0 errors**

Dead files suppressed with `// @ts-nocheck` (obsolete, replaced by unified schema):
- [x] `src/services/citizen.service.ts`
- [x] `src/services/citizen-registration.service.ts`
- [x] `src/services/otp.service.ts`
- [x] `src/services/subscriber.service.ts`
- [x] `src/controllers/citizen.controller.ts`
- [x] `src/controllers/subscriber.controller.ts`
- [x] `src/database/seeds/address.seed.ts`
- [x] `src/database/seeds/sample-data.seed.ts`

#### E-Services Frontend (`borongan-eService-system-copy/multysis-frontend/`)
- [x] `src/pages/portal/PortalLogin.tsx` — Username/password + Google OAuth tabs
- [x] `src/pages/portal/ResidentRegister.tsx` — New: multi-step registration wizard
- [x] `src/pages/portal/RegistrationStatus.tsx` — Updated: shows approval status
- [x] `src/pages/portal/PortalMyID.tsx` — New: resident ID card view
- [x] `src/pages/portal/PortalMyHousehold.tsx` — New: household members view
- [x] `src/services/api/auth.service.ts` — Updated for username/password login
- [x] `src/context/AuthContext.tsx` — Updated for `resident` type
- [x] `src/routes/index.tsx` — Routes updated

#### BIMS Backend (`barangay-information-management-system-copy/server/`)
- [x] `app.js` — Routes registered
- [x] `src/routes/residentRoutes.js` — Read-only (no create/update/delete)
- [x] `src/routes/householdRoutes.js` — Read-only
- [x] `src/routes/barangayRoutes.js` — Puroks removed
- [x] `src/routes/setupRoutes.js` — New: municipality GeoJSON setup
- [x] `src/routes/portalHouseholdRoutes.js` — New: portal-initiated household routes
- [x] `src/controllers/residentControllers.js` — Rewritten (view-only)
- [x] `src/services/residentServices.js` — Rewritten
- [x] `src/queries/resident.queries.js` — Rewritten

#### BIMS Frontend (`barangay-information-management-system-copy/client/`)
- [x] `src/App.jsx` — Routes updated
- [x] `src/pages/admin/municipality/GeoSetupPage.jsx` — New: GeoJSON municipality setup
- [x] `src/pages/admin/municipality/BulkIDPage.jsx` — New: bulk resident ID download/print
- [x] `src/pages/admin/shared/RegistrationApprovalsPage.jsx` — New: portal registration review

#### Mobile App
- [x] `mobile_app/bimsApp/` — **Deleted entirely**

---

### ⏳ Remaining / Not Yet Verified

#### E-Services Frontend
- [ ] Build check (`npm run build`) — not yet run
- [ ] Test portal registration wizard end-to-end
- [ ] Test username/password login
- [ ] Test Google OAuth login
- [ ] Test My ID page renders correctly
- [ ] Test My Household page

#### BIMS Backend
- [ ] Build/syntax check (`node --check`) — partially done (app.js passes)
- [ ] Test GeoSetup routes with real GeoJSON
- [ ] Test bulk ID PDF generation

#### BIMS Frontend
- [ ] Build check (`npm run build`) — not yet run
- [ ] Test GeoSetup page renders and loads GeoJSON
- [ ] Test Registration Approvals page
- [ ] Test Bulk ID page and PDF download

#### Database
- [ ] Run `schema.sql` on a fresh database
- [ ] Verify all constraints, indexes, triggers apply cleanly
- [ ] Run `seed.sql` — verify seed data loads
- [ ] Test `resident_counters` atomic increment under concurrent requests

#### Integration
- [ ] Verify BIMS ↔ E-Services share the same PostgreSQL instance
- [ ] Verify `barangayId` FK from `residents` resolves correctly via both backends
- [ ] Test registration approval flow end-to-end (portal → BIMS → email → portal ID)

---

## 11. Environment Variables Required

### E-Services Backend (`.env`)
```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=<min 32 chars>
REFRESH_TOKEN_SECRET=<min 32 chars>
CORS_ORIGIN=http://localhost:5174
PORTAL_URL=http://localhost:5174
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/portal/google/callback
EMAIL_USER=<gmail address>
EMAIL_PASS=<gmail app password>
```

### E-Services Frontend (`.env`)
```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=<from Google Cloud Console>
```

### BIMS Backend (`.env`)
```env
DB_HOST=...
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=...
JWT_SECRET=<same as E-Services>
PORT=5000
```

---

## 12. API Reference (New Endpoints)

### E-Services Backend

#### Authentication
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/admin/login` | Admin email + password login |
| `POST` | `/api/auth/portal/login` | Resident username + password login |
| `GET` | `/api/auth/portal/google` | Initiate Google OAuth redirect |
| `GET` | `/api/auth/portal/google/callback` | Google OAuth callback |
| `POST` | `/api/auth/portal/google/supabase` | Frontend-initiated Google login |
| `POST` | `/api/auth/portal/google/link` | Link Google to existing account |
| `DELETE` | `/api/auth/portal/google/unlink` | Unlink Google from account |
| `POST` | `/api/auth/logout` | Revoke tokens + clear cookies |
| `GET` | `/api/auth/me` | Get current user |
| `POST` | `/api/auth/refresh` | Rotate refresh token |

#### Portal Registration
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/portal-registration/register` | Submit registration request |
| `GET` | `/api/portal-registration/status/:username` | Check registration status |
| `GET` | `/api/portal-registration/requests` | List requests (admin) |
| `POST` | `/api/portal-registration/approve/:id` | Approve request → creates resident |
| `POST` | `/api/portal-registration/reject/:id` | Reject request |

#### Address Hierarchy
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/addresses/municipalities` | All active municipalities |
| `GET` | `/api/addresses/barangays?municipalityId=` | Barangays for a municipality |
| `GET` | `/api/addresses/barangays/:id` | Single barangay with full address |

### BIMS Backend

#### Municipality Setup
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/setup/municipality` | Create municipality from GeoJSON click |
| `GET` | `/api/setup/barangays` | List auto-created barangays |

#### Residents (Read-Only)
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/residents` | List residents (paginated, searchable) |
| `GET` | `/api/residents/:id` | Get single resident |

#### Bulk ID
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/residents/bulk-id` | Bulk download resident IDs as PDF |

#### Portal Household
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/portal/household/my` | Get household for logged-in resident |
| `POST` | `/api/portal/household/register` | Register a household (portal-initiated) |

---

## 13. Naming Conventions

| Old Term | New Term | Notes |
|---|---|---|
| `citizen` / `non_citizen` / `subscriber` | `resident` | Unified term |
| `subscriberId` | `residentId` | All FK references |
| `citizenId` | `residentId` | In beneficiary tables |
| `SUBSCRIBER` (sender type) | `RESIDENT` | In transaction notes |
| `'subscriber'` (JWT role/type) | `'resident'` | In JWT payload and middleware |
| `prisma.subscriber` | `prisma.resident` | Prisma client accessor |
| `prisma.citizen` | `prisma.resident` | Prisma client accessor |
| Phone/OTP login | Username/password | Portal auth method |
| `purok` | *(removed)* | Address hierarchy simplified |
| `isResidentOfBorongan` | `isLocalResident` | Generic, not city-specific |

---

## 14. Additional Changes (Round 2)

The following four changes were added after the initial overhaul plan was documented.

---

### AC1 — Remove `eservices` Table, Use Only `services`

**Reason:** `eservices` and `services` are redundant. `services` is the richer table — it has every column `eservices` has, plus `form_fields` (JSONB), `payment_statuses` (JSONB), `requires_appointment`, `appointment_duration`, `display_in_sidebar`, `display_in_subscriber_tabs`. Maintaining two tables that do the same job causes confusion and double maintenance.

**Action:**
- `eservices` table removed from `schema.sql`
- `EService` model removed from `prisma/schema.prisma`
- `eservice.routes.ts` removed; all portal service listing now served via `service.routes.ts`
- `eservices` import removed from `index.ts`
- `src/database/seeds/eservices.seed.ts` suppressed with `@ts-nocheck` (seed data should be migrated to `services`)

The `services` table already handles everything the portal needs. The `GET /api/services/active` endpoint serves the portal's service listing.

---

### AC2 — Non-Resident (Guest) Support for E-Services

**Reason:** Not everyone who applies for a government service is a resident of the municipality. For example, a business permit applicant may be from another city. These applicants should still be able to submit applications without creating a resident account.

**Decision:** Guest submission — no account required. Applicant fills out their basic info per application and receives a reference number to track status.

**Schema changes to `transactions`:**
- `resident_id` → **nullable** (was `NOT NULL`)
- `ON DELETE CASCADE` changed to `ON DELETE SET NULL`
- Four new columns added:
  - `applicant_name TEXT` — full name for non-resident applicants
  - `applicant_contact TEXT` — contact number
  - `applicant_email TEXT` — email for status notifications
  - `applicant_address TEXT` — free-text address
- Check constraint: `resident_id IS NOT NULL OR applicant_name IS NOT NULL` (a transaction must have either a logged-in resident or guest info)

**Portal flow for non-residents:**
```
Non-resident visits portal → clicks "Apply as Guest"
→ Fills in name, contact, email, address
→ Selects service, fills form fields
→ Submits → receives reference number
→ Tracks status at /track?ref=TXN-2025-XXXXX (no login required)
```

**Access control changes:**
- Resident-owned transactions: still protected by `residentId === req.user.id`
- Guest transactions: accessible publicly via `referenceNumber` (no auth)
- Admin transactions list: shows both, with a `isGuest` flag

---

### AC3 — Certificate Requests: Both Portal and Walk-In Flows

**Decision:** Both flows are kept in parallel.

| Flow | Where | Table | Who submits |
|---|---|---|---|
| Portal request | E-Services portal | `transactions` (service category = `certificate`) | Resident or guest, online |
| Walk-in request | BIMS barangay counter | `requests` (type = `certificate`) | Staff enters on behalf of walk-in |

BIMS staff process **both** from the **barangay** certificates queue (`/admin/barangay/certificates`).

**Implemented:**
- `GET /api/certificates/queue` — unified SQL query (CTE UNION ALL) returning walk-in + portal rows, filtered by `barangay_id`, with status/source filters and pagination
- `PUT /api/certificates/queue/walkin/:id/status` — update walk-in request status
- `PUT /api/certificates/queue/portal/:id/status` — update portal transaction status
- `CertificatesPage.jsx` — barangay-role frontend: unified list, status updates, Generate & Download PDF per row
- Guest portal transactions are excluded from the queue (guests have no `barangay_id` → cannot be routed to a specific barangay)

---

### AC4 — Template-Based Certificate Generation

**Reason:** The old system had HTML/PDF templates **hardcoded** in the BIMS source code. This makes it impossible for other municipalities to use the system without modifying source code. A template upload system where placeholders reference live database fields solves this.

**How it works:**

1. BIMS admin (municipality level) uploads an HTML certificate template via BIMS admin UI
2. Template contains `{{ placeholder }}` tokens that reference real database fields
3. When staff generates a certificate, the system:
   - Fetches the request/transaction data + resident data + official data
   - Resolves all `{{ ... }}` tokens against the database
   - Renders the HTML to PDF via **Puppeteer** (Node.js headless Chrome)
   - Returns the PDF for download or print

**Template file format:** HTML (uploaded as `.html` file or pasted inline)

**Template scope:** Per certificate type, municipality-wide. One template per certificate type shared across all barangays. Barangay-specific data (e.g., captain name) is resolved from the database at render time, not hardcoded in the template.

**Supported placeholder tokens:**

| Token | Source | Example output |
|---|---|---|
| `{{ resident.firstName }}` | `residents.first_name` | `Juan` |
| `{{ resident.middleName }}` | `residents.middle_name` | `Santos` |
| `{{ resident.lastName }}` | `residents.last_name` | `Dela Cruz` |
| `{{ resident.fullName }}` | Computed | `Juan Santos Dela Cruz` |
| `{{ resident.birthdate }}` | `residents.birthdate` | `January 1, 1990` |
| `{{ resident.age }}` | Computed from birthdate | `35` |
| `{{ resident.sex }}` | `residents.sex` | `Male` |
| `{{ resident.civilStatus }}` | `residents.civil_status` | `Single` |
| `{{ resident.address }}` | Resolved from barangay + street | `Purok 1, Brgy. Alang-alang` |
| `{{ resident.residentId }}` | `residents.resident_id` | `RES-2025-0000001` |
| `{{ barangay.name }}` | `barangays.name` | `Alang-alang` |
| `{{ municipality.name }}` | `municipalities.name` | `City of Borongan` |
| `{{ municipality.province }}` | `municipalities.province` | `Eastern Samar` |
| `{{ officials.captain }}` | `officials` where `position = 'captain'` | `Hon. Jose Reyes` |
| `{{ officials.kagawad1 }}` through `{{ officials.kagawad7 }}` | `officials` ordered by position | `Hon. Maria Santos` |
| `{{ officials.secretary }}` | `officials` where `position = 'secretary'` | `Hon. Pedro Cruz` |
| `{{ officials.treasurer }}` | `officials` where `position = 'treasurer'` | `Hon. Ana Lim` |
| `{{ request.purpose }}` | `requests.purpose` or `transactions.service_data.purpose` | `Local employment` |
| `{{ request.date }}` | Date of generation | `March 25, 2026` |
| `{{ request.referenceNumber }}` | `requests.uuid` or `transactions.reference_number` | `TXN-2025-000001` |
| `{{ request.orNumber }}` | Payment OR number (if applicable) | `OR-2025-0001` |

**New table: `certificate_templates`**

```sql
CREATE TABLE public.certificate_templates (
    id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    municipality_id  integer NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    certificate_type text NOT NULL,     -- e.g. 'barangay_clearance', 'indigency', 'residency'
    name             text NOT NULL,     -- display name, e.g. 'Barangay Clearance'
    description      text,
    html_content     text NOT NULL,     -- the HTML template with {{ placeholder }} tokens
    is_active        boolean NOT NULL DEFAULT true,
    created_by       text,              -- FK → bims_users(id), nullable
    created_at       timestamp DEFAULT now(),
    updated_at       timestamp DEFAULT now(),
    UNIQUE (municipality_id, certificate_type)
);
```

**New BIMS backend routes:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/certificates/templates` | List templates for the municipality |
| `POST` | `/api/certificates/templates` | Upload/create a new template |
| `PUT` | `/api/certificates/templates/:id` | Update template content |
| `DELETE` | `/api/certificates/templates/:id` | Delete a template |
| `POST` | `/api/certificates/generate/:requestId` | Generate PDF for a request (walk-in) |
| `POST` | `/api/certificates/generate/transaction/:transactionId` | Generate PDF for a portal transaction |

**BIMS frontend pages (additions):**
- `src/pages/admin/certificates/CertificateTemplatesPage.jsx` — list, upload, edit, preview templates
- `src/pages/admin/certificates/TemplateEditorPage.jsx` — HTML editor with placeholder reference panel and live preview

---

## 15. Files With `@ts-nocheck`

The following files are **obsolete** (their functionality has been replaced by the unified schema) but are retained in the repository for reference. They are suppressed from TypeScript compilation:

| File | Replaced By |
|---|---|
| `src/services/citizen.service.ts` | `src/services/resident.service.ts` |
| `src/services/citizen-registration.service.ts` | `src/services/portal-registration.service.ts` |
| `src/services/otp.service.ts` | Username/password auth (no OTP) |
| `src/services/subscriber.service.ts` | Functionality split into `auth.service.ts` + `resident.service.ts` |
| `src/controllers/citizen.controller.ts` | `src/controllers/portal-registration.controller.ts` |
| `src/controllers/subscriber.controller.ts` | Removed (no subscriber-specific endpoints) |
| `src/database/seeds/address.seed.ts` | Old `addresses` table removed |
| `src/database/seeds/sample-data.seed.ts` | Uses old `subscriberId` FK |

These files should be **deleted** once the system is verified working end-to-end.

---

## 15. Next Steps (Ordered)

### Schema & Backend
1. **[x] E-Services backend TypeScript** — `tsc --noEmit` passes with 0 errors
2. **[x] Remove `eservices` from schema + Prisma + routes** (AC1)
3. **[x] Make `transactions.resident_id` nullable; add guest applicant columns** (AC2)
4. **[x] Add `certificate_templates` table to schema** (AC4)
5. **[x] Run `prisma generate`** after Prisma schema changes
6. **[x] Fix transaction service/controller for nullable `residentId`** (AC2)
7. **[x] Add BIMS certificate template routes + service + PDF generation** (AC4)
8. **[x] BIMS build check** — `node --check` server; `npm run build` client

### Frontend
9. **[x] E-Services frontend build check** — `npm run build` on multysis-frontend
10. **[x] Add guest application flow to portal** (AC2) — `PortalGuestApply.tsx` at `/portal/apply-as-guest`
11. **[x] Add public transaction tracker page** (AC2) — `PortalTrack.tsx` at `/portal/track`
12. **[x] Add certificate template pages to BIMS frontend** (AC4) — `CertificateTemplatesPage.jsx` + `TemplateEditorPage.jsx`
13. **[x] Rewrite `PortalProfile.tsx`** — now uses `residentService.getMyProfile()`
14. **[x] Audit + fix `AdminSubscribers` and `AdminCitizens` pages** — both rewritten; `AdminCitizens` redirects to `/admin/subscribers`

### Database
15. **[x] Apply updated `schema.sql` to local test database** — passed all 8 functional tests
16. **[x] Run `seed.sql`** — loaded cleanly (4 roles, 15 permissions, 22 SA settings, etc.)
17. **[ ] Apply to Supabase production database** — after further testing
18. **[x] Migrate certificate service entries into `services` table** — 9 barangay certificate services added to `seed.sql`

### Infrastructure
19. **[x] Install Puppeteer in BIMS server** — required for certificate PDF generation
20. **[ ] Update `DEPLOYMENT.md`** — New env vars, Puppeteer requirement, fresh DB setup

### Testing
21. **[ ] End-to-end registration test** — Portal → wizard → BIMS approval → portal ID
22. **[ ] Guest transaction test** — Non-resident submits, tracks by reference number
23. **[ ] Certificate template test** — Upload HTML, generate PDF with live DB data
24. **[ ] GeoJSON setup test** — BIMS GeoMap → select municipality → barangays auto-created
25. **[ ] Bulk ID test** — BIMS Bulk ID page generates valid PDF

### Cleanup
26. **[x] Delete `@ts-nocheck` files** — 14 obsolete files deleted (10 `@ts-nocheck` + 4 orphaned dependents)
27. **[ ] Update `DEPLOYMENT.md`** — New env vars and deployment steps

---

## 16. Local Database Migration Test Results

**Date:** March 2026  
**Database:** `united_systems_test` (local PostgreSQL 18, no Supabase)  
**Result:** PASS — schema and seed both applied cleanly after 3 fixes

### What was tested

```
psql -U postgres -d united_systems_test -f united-database/schema.sql
psql -U postgres -d united_systems_test -f united-database/seed.sql
```

8 functional tests run against the local DB:

| Test | Description | Result |
|---|---|---|
| 1 | Title-case `sex`/`civil_status` accepted (case-insensitive CHECK) | PASS |
| 2 | `resident_credentials` inserts correctly via `resident_fk` column | PASS |
| 3 | Resident-owned transaction inserts | PASS |
| 4 | Guest transaction (no `resident_id`) inserts | PASS |
| 5 | Resident hard-delete blocked by `RESTRICT`; deactivation via `status` works | PASS |
| 6 | Empty transaction (no resident, no applicant) blocked by `chk_transaction_applicant` | PASS |
| 7 | Duplicate `certificate_type` per municipality blocked by unique constraint | PASS |
| 8 | `resident_counters` atomic `ON CONFLICT DO UPDATE` increment works | PASS |

### Fixes applied during migration test

**Fix A — Case-insensitive CHECK constraints on `residents`**

The `sex`, `civil_status`, `employment_status`, and `status` columns had strict lowercase CHECK constraints (`'male'`, `'female'`, etc.). The portal and BIMS send title case (`'Male'`, `'Single'`), which would have been rejected silently.

Changed all four constraints to use `lower(column) IN (...)`:

```sql
-- Before
CONSTRAINT residents_sex_check CHECK (sex IN ('male', 'female'))

-- After
CONSTRAINT residents_sex_check CHECK (lower(sex) IN ('male', 'female'))
```

Same fix applied to `pets.sex`.

---

**Fix B — `transactions.resident_id` changed from `ON DELETE SET NULL` to `ON DELETE RESTRICT`**

`ON DELETE SET NULL` conflicted with the `chk_transaction_applicant` constraint: when a resident was deleted, both `resident_id` and `applicant_name` became NULL, violating the constraint.

Root cause: residents in this system are **never hard-deleted**. The correct workflow is to deactivate via `status = 'deceased'` or `'moved_out'`. Hard delete is only appropriate for test data cleanup.

Changed to `ON DELETE RESTRICT` — attempting to delete a resident who has transactions raises an error, forcing the correct workflow.

Prisma schema updated to match: `onDelete: Restrict` on `Transaction.resident` relation.

---

**Fix C — `resident_credentials` column naming clarification (no schema change)**

The FK column on `resident_credentials` is named `resident_fk` (not `resident_id`). The `username` field lives on the `residents` table itself, not on `resident_credentials`. The Prisma model correctly reflects this. No schema change required — test data was using wrong column names.

### Seed data loaded

```
Roles:                        4
Permissions:                  15
Role-Permission mappings:     27
Social amelioration settings: 22
Government programs:          8
FAQs:                         7
```

---

*United Systems Architecture Overhaul — March 2026*
