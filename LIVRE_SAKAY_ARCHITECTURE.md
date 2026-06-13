# Libre Sakay Architecture

Citizen → Admin program application flow for the Libre Sakay government transport program.

---

## Systems

| System | Type | Repo |
|--------|------|------|
| `borongan-programs-portal` | Citizen PWA (React) | `borongan-programs-portal/` |
| `multysis-frontend` | Admin dashboard (React) | `borongan-eService-system-copy/multysis-frontend/` |
| `multysis-backend` | Express API + Prisma | `borongan-eService-system-copy/multysis-backend/` |
| Libre Sakay Supabase | Fleet/GPS data | Separate Supabase project |

---

## Data Flow

```
Citizen PWA                    Backend API                  Admin Dashboard
────────────                  ──────────                  ───────────────
ApplyModal.tsx           ───► POST /apply           ──►   ProgramApplicationsTab.tsx
LibreSakay.tsx          ───► GET /my/applications ──►   (pending list)
                             Socket.io ────────────────►   BadgeContext (live count)
                             Socket.io ────────────────►   Citizen portal (status update)
```

---

## Database

**PostgreSQL** (Prisma — shared across both systems):

```prisma
GovernmentProgramApplication {
  id            String   // UUID
  residentId    String   // FK residents.id
  programId     String   // FK government_programs.id
  status        String   // pending | approved | rejected | cancelled
  adminNotes    String?
  submittedData Json?    // Form field key-value pairs
  attachments   Json?    // Uploaded file metadata
  appliedAt     DateTime
  reviewedAt    DateTime?
  reviewedBy    String?  // eservice_users.id

  @@unique([residentId, programId])
}

BeneficiaryProgramPivot {
  beneficiaryType BeneficiaryType  // SENIOR_CITIZEN | PWD | STUDENT | SOLO_PARENT
  beneficiaryId   String          // Human-readable ID (seniorCitizenId, pwdId, etc.)
  programId       String
  status          String @default("active")

  @@unique([beneficiaryType, beneficiaryId, programId])
}
```

**Libre Sakay Supabase** (separate project — fleet management only):

```sql
libre_sakay_beneficiary {
  resident_id    String  -- Human-readable ID (or UUID fallback)
  resident_uuid  String  -- PostgreSQL resident UUID
  approved_at    String  -- ISO timestamp
  synced_at      String  -- ISO timestamp
}
```

---

## API Endpoints

### Resident (verifyResident)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/portal/programs?name=Libre+Sakay` | Program listing + eligibility + status |
| POST | `/portal/programs/:id/apply` | Submit application (multipart/form-data) |
| GET | `/portal/programs/my/applications` | List own applications |
| DELETE | `/portal/programs/my/applications/:appId` | Cancel pending application |

### Admin (verifyAdmin)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/portal/program-applications?programId=&status=` | List with filters |
| GET | `/portal/program-applications/:appId` | Full detail + resident info |
| POST | `/portal/program-applications/:appId/review` | Approve/reject + notes |

---

## Citizen Flow

```
Home (/) → LibreSakay (/libre-sakay) → ApplyModal → POST /apply
  ↓                                               ↓
GET /programs                                  Success screen
(eligible + status)                            1.5s → closes
  ↓                                               ↓
StatusBanner                              StatusBanner
|                                              "Pending Review"
├─ none:  "Apply Now" (if eligible)
├─ pending: "Cancel Application"
├─ approved: "View Details"
├─ rejected: "Apply Again"
└─ cancelled: "Apply Again"
```

### File Uploads
- Max size: **5MB**
- Allowed: **jpg, jpeg, png, gif, pdf**
- Submitted as `multipart/form-data` with `submittedData` JSON field

### Eligibility
Resident eligible if:
- Program `types` includes `'ALL'`, OR
- Program `types` includes a type where resident has **ACTIVE** beneficiary record:
  - `SENIOR_CITIZEN` → `seniorCitizenBeneficiary.status = 'ACTIVE'`
  - `PWD` → `pwdBeneficiary.status = 'ACTIVE'`
  - `STUDENT` → `studentBeneficiary.status = 'ACTIVE'`
  - `SOLO_PARENT` → `soloParentBeneficiary.status = 'ACTIVE'`

---

## Admin Flow

```
ApplicationsSection → ProgramApplicationsTab
  (initialStatus=pending, programId=gp-all-libre-sakay)
  ↓
GET /portal/program-applications?status=pending
  ↓
Table: name, barangay, program, date applied, actions
  ↓
├─ Preview: GET /portal/program-applications/:appId
│    → ResidentPreviewDialog
│    → Resident profile + all 4 beneficiary records + submitted data + attachments
│
└─ Review: POST /portal/program-applications/:appId/review
     { action: "approve" | "reject", adminNotes?: string }
```

### On Approve
1. `GovernmentProgramApplication.status → 'approved'`
2. `BeneficiaryProgramPivot` upsert per enrolled type
3. `syncLibreSakayBeneficiary()` → Libre Sakay Supabase
4. Socket emit to resident + admins

### On Reject
1. `GovernmentProgramApplication.status → 'rejected'`
2. `removeLibreSakayBeneficiary()` → delete from Libre Sakay Supabase
3. Socket emit to resident + admins

### Supabase Sync
- Fire-and-forget: errors logged, approval never blocked
- `resident_id` = human-readable `residentId` if available, else PostgreSQL UUID
- `onConflict: 'resident_id'` — upsert, never duplicate insert

---

## Real-Time (Socket.io)

| Event | Emitted By | Target | Payload |
|-------|-----------|--------|---------|
| `program-application:new` | `applyForProgram()` | `admins` room | `{ applicationId, programId, programName, residentId, appliedAt }` |
| `program-application:review` | `reviewApplicationAdmin()` | `user:{residentId}` + `admins` | `{ applicationId, programId, programName, status, adminNotes, reviewedAt }` |

No email/SMS notifications on approval/rejection.

---

## Key Files

### Citizen Portal
| File | Role |
|------|------|
| `borongan-programs-portal/src/pages/LibreSakay.tsx` | Hub — StatusBanner, Apply trigger, cancel/re-apply |
| `borongan-programs-portal/src/components/libre-sakay/ApplyModal.tsx` | Dynamic form, file upload, lightbox preview |
| `borongan-programs-portal/src/services/api/portal-programs.service.ts` | API client for citizen flow |

### Admin Dashboard
| File | Role |
|------|------|
| `multysis-frontend/src/pages/admin/libre-sakay/AdminLibreSakay.tsx` | Section router |
| `multysis-frontend/src/pages/admin/libre-sakay/ApplicationsSection.tsx` | List view wrapper |
| `multysis-frontend/src/components/social-amelioration/ProgramApplicationsTab.tsx` | Shared review UI |
| `multysis-frontend/src/services/api/portal-programs.service.ts` | Admin API client |

### Backend
| File | Role |
|------|------|
| `multysis-backend/src/routes/portal-programs.routes.ts` | 7 routes |
| `multysis-backend/src/services/portal-programs.service.ts` | Eligibility, apply, review, Supabase sync |
| `multysis-backend/src/services/socket.service.ts` | Real-time emit functions |
| `multysis-backend/prisma/schema.prisma` | Application + Pivot models |

---

## Program ID

Libre Sakay hardcoded as `'gp-all-libre-sakay'` in `governmentProgram` table. Checked by substring match on `program.name.toLowerCase().includes('libre sakay')` for Supabase sync.
