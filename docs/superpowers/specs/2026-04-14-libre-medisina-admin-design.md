# Libre Medisina Admin User Integration — E-Service

## Overview

Add a Libre Medisina Admin role to the E-Service system. This admin manages prescription requests submitted by residents through the Programs Portal. The admin can review, approve/reject, track preparation, and confirm pick-up of medicines.

**Our scope:** The admin page in E-Services + the database schema for medicine requests. The resident-facing prescription submission (Programs Portal) is handled by another team.

## Architecture Decision

**Approach:** New page inside the existing E-Services frontend (`multysis-frontend`). The Libre Medisina admin logs in at `/admin/login` (existing), gets redirected to `/admin/libre-medisina`, and is scoped to only that page — no sidebar, no access to other admin pages.

**Why this approach:** Zero changes to the auth backend. The existing RBAC, JWT, and cookie system already support adding new roles. Avoids duplicating auth infrastructure in a separate app.

---

## 1. Database Schema

### New table: `medicine_requests`

```prisma
model MedicineRequest {
  id                String                @id @default(dbgenerated("(gen_random_uuid())::text"))
  residentId        String                @map("resident_id")
  prescriptionPath  String                @map("prescription_path")  // uploaded Rx image path
  status            MedicineRequestStatus @default(SUBMITTED)
  note              String?                                          // admin notes (rejection reason, availability, etc.)
  reviewedBy        String?               @map("reviewed_by")       // eservice_users.id
  reviewedAt        DateTime?             @map("reviewed_at")
  preparedAt        DateTime?             @map("prepared_at")
  readyAt           DateTime?             @map("ready_at")
  pickedUpAt        DateTime?             @map("picked_up_at")
  completedAt       DateTime?             @map("completed_at")
  createdAt         DateTime              @map("created_at") @default(now())
  updatedAt         DateTime              @map("updated_at") @updatedAt

  resident Resident @relation(fields: [residentId], references: [id], onDelete: Cascade)

  @@index([residentId])
  @@index([status])
  @@index([createdAt])
  @@map("medicine_requests")
}

enum MedicineRequestStatus {
  SUBMITTED
  UNDER_REVIEW
  APPROVED
  REJECTED
  PREPARING
  READY_FOR_PICKUP
  PICKED_UP
  DONE

  @@map("medicine_request_status")
}
```

### Resident model addition

Add to the `Resident` model:

```prisma
medicineRequests MedicineRequest[]
```

### Key decisions

- **Timestamp per lifecycle stage** (`reviewedAt`, `preparedAt`, `readyAt`, `pickedUpAt`, `completedAt`) for full audit trail.
- **`reviewedBy`** links to `eservice_users.id` for accountability.
- **`prescriptionPath`** stores the relative file path (same pattern as `picturePath` on Resident).
- **`note`** is a single text field the admin can update at any stage (e.g., "medicine not available").
- **Standalone table** — does not reuse `GovernmentProgramApplication`. The lifecycle is more granular and purpose-specific.

---

## 2. RBAC

### New role

| Name | Description |
|------|-------------|
| `libre_medisina_admin` | Libre Medisina administrator — manages prescription requests |

### New permissions

| Resource | Action |
|----------|--------|
| `medicine_requests` | `READ` |
| `medicine_requests` | `ALL` |

### Role-permission mapping

`libre_medisina_admin` receives both `medicine_requests:READ` and `medicine_requests:ALL`.

### Default seed user

A default admin user seeded for initial access (email/password, changeable later through user management).

### No auth code changes

The existing `adminLogin` service already reads from `eservice_users` and puts the role in the JWT. Scoping happens on the frontend via `ProtectedRoute`.

---

## 3. Backend API

### New route: `/api/medicine-requests`

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `GET` | `/` | List all requests (filters: status, search, pagination) | `verifyToken` |
| `GET` | `/stats` | Dashboard counts grouped by status | `verifyToken` |
| `GET` | `/:id` | Single request detail with resident info | `verifyToken` |
| `PATCH` | `/:id/status` | Advance status + optional note | `verifyToken` |

### Status transition rules (server-side enforced)

```
SUBMITTED        -> UNDER_REVIEW
UNDER_REVIEW     -> APPROVED | REJECTED
APPROVED         -> PREPARING
PREPARING        -> READY_FOR_PICKUP
READY_FOR_PICKUP -> PICKED_UP
PICKED_UP        -> DONE
```

- Invalid transitions return `400`.
- Each transition stamps the relevant timestamp field and sets `reviewedBy` on the first review action.
- No `POST` endpoint — request creation is handled by the Programs Portal team inserting into `medicine_requests` with status `SUBMITTED`.

---

## 4. Frontend

### ProtectedRoute change

Add `'libre_medisina_admin'` to the `requiredRole` union type:

```typescript
requiredRole?: 'admin' | 'user' | 'developer' | 'resident' | 'libre_medisina_admin';
```

### Post-login redirect

In `AdminLogin`, after successful login:
- If role is `libre_medisina_admin` -> redirect to `/admin/libre-medisina`
- Otherwise -> redirect to `/admin/dashboard` (existing behavior)

### New route

```tsx
{
  path: 'libre-medisina',
  element: (
    <ProtectedRoute requiredRole="libre_medisina_admin">
      <LazyWrapper>
        <AdminLibreMedisina />
      </LazyWrapper>
    </ProtectedRoute>
  ),
}
```

### Page layout: `AdminLibreMedisina`

Single page, no sidebar. Header bar with app title ("Libre Medisina"), admin name, logout button.

**Top section — Dashboard stat cards:**
- Total Requests
- Pending Review (SUBMITTED + UNDER_REVIEW)
- Approved / Preparing
- Ready for Pick-up
- Completed (PICKED_UP + DONE)

**Bottom section — Request table:**
- Columns: Resident Name, Date Submitted, Status, Note (truncated), Actions
- Filterable by status (dropdown), searchable by resident name
- Row click or action button opens a modal/drawer showing:
  - Resident info (name, barangay, contact)
  - Prescription image (viewable/zoomable)
  - Current status with timeline of timestamps
  - Note field (editable)
  - Context-sensitive action buttons based on current status:
    - SUBMITTED -> "Start Review"
    - UNDER_REVIEW -> "Approve" / "Reject"
    - APPROVED -> "Mark Preparing"
    - PREPARING -> "Mark Ready for Pick-up"
    - READY_FOR_PICKUP -> "Mark Picked Up"
    - PICKED_UP -> "Mark Done"

---

## 5. Changes to existing files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `MedicineRequest` model, `MedicineRequestStatus` enum, add `medicineRequests` relation to `Resident` |
| `ProtectedRoute.tsx` | Add `'libre_medisina_admin'` to `requiredRole` union type |
| `AdminLogin.tsx` | Add role-based redirect after login |
| `routes/index.tsx` | Add `/admin/libre-medisina` route |

## 6. New files

| File | Purpose |
|------|---------|
| `pages/admin/AdminLibreMedisina.tsx` | The admin page component |
| `routes/medicine-request.routes.ts` | API route definitions |
| `controllers/medicine-request.controller.ts` | Request handlers |
| `services/medicine-request.service.ts` | Business logic (queries, status transitions) |
| Prisma migration | Generated from schema changes (`MedicineRequest` model + enum) |
| Seed SQL | New role, permissions, role-permission mappings, default user (follows `united-database/seed.sql` pattern) |

## 7. What we do NOT change

- Auth service (`auth.service.ts`)
- Auth controller (`auth.controller.ts`)
- Auth middleware (`auth.ts`)
- JWT utils (`jwt.ts`)
- Cookie handling (`cookies.ts`)
- Any existing admin pages or portal pages
