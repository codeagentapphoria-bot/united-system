# Libre Medisina Admin Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Libre Medisina Admin role to E-Services that manages prescription requests submitted by residents via the Programs Portal.

**Architecture:** New `medicine_requests` table + `MedicineRequestStatus` enum in Prisma. New RBAC role seeded via SQL. Backend: service → controller → routes (following existing government-program pattern). Frontend: one new admin page at `/admin/libre-medisina` with role-based redirect from the existing admin login. Four existing files modified; everything else is new.

**Tech Stack:** Prisma (PostgreSQL), Express/TypeScript, React/TypeScript (Vite), TanStack Query, shadcn/ui, express-validator

**Spec:** `docs/superpowers/specs/2026-04-14-libre-medisina-admin-design.md`

---

## File Map

### New files (backend)

| File | Responsibility |
|------|---------------|
| `multysis-backend/src/services/medicine-request.service.ts` | Prisma queries: list, get, stats, status transitions |
| `multysis-backend/src/controllers/medicine-request.controller.ts` | HTTP handlers wrapping the service |
| `multysis-backend/src/validations/medicine-request.schema.ts` | express-validator chains |
| `multysis-backend/src/routes/medicine-request.routes.ts` | Route definitions, middleware wiring |

### New files (frontend)

| File | Responsibility |
|------|---------------|
| `multysis-frontend/src/services/api/medicine-request.service.ts` | API client (axios calls) |
| `multysis-frontend/src/pages/admin/AdminLibreMedisina.tsx` | The admin page (stats + table + detail modal) |

### New files (database)

| File | Responsibility |
|------|---------------|
| `united-database/seed-libre-medisina-admin.sql` | RBAC role, permissions, role-permission mappings, default user |

### Modified files

| File | Change |
|------|--------|
| `multysis-backend/prisma/schema.prisma` | Add `MedicineRequest` model, `MedicineRequestStatus` enum, `medicineRequests` relation on `Resident` |
| `multysis-backend/src/index.ts` | Import and mount medicine-request routes |
| `multysis-frontend/src/components/common/ProtectedRoute.tsx` | Add `'libre_medisina_admin'` to `requiredRole` union |
| `multysis-frontend/src/pages/admin/AdminLogin.tsx` | Role-based redirect after login |
| `multysis-frontend/src/routes/index.tsx` | Add `/admin/libre-medisina` route |
| `multysis-frontend/src/lib/query-keys.ts` | Add `medicineRequests` query keys |

---

## Task 1: Prisma Schema — MedicineRequest model + enum

**Files:**
- Modify: `borongan-eService-system-copy/multysis-backend/prisma/schema.prisma`

- [ ] **Step 1: Add `MedicineRequestStatus` enum to schema.prisma**

Add before the closing of the enums section (after the `PaymentMethod` enum, around line 853):

```prisma
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

- [ ] **Step 2: Add `MedicineRequest` model to schema.prisma**

Add after the `GovernmentProgramApplication` model section (after `@@map("government_program_applications")}`):

```prisma
// =============================================================================
// LIBRE MEDISINA — Prescription Requests
// Residents submit prescription images via Programs Portal.
// Libre Medisina admin reviews, approves/rejects, and tracks pick-up.
// =============================================================================

model MedicineRequest {
  id               String                @id @default(dbgenerated("(gen_random_uuid())::text"))
  residentId       String                @map("resident_id")
  prescriptionPath String                @map("prescription_path")
  status           MedicineRequestStatus @default(SUBMITTED)
  note             String?
  reviewedBy       String?               @map("reviewed_by")
  reviewedAt       DateTime?             @map("reviewed_at")
  preparedAt       DateTime?             @map("prepared_at")
  readyAt          DateTime?             @map("ready_at")
  pickedUpAt       DateTime?             @map("picked_up_at")
  completedAt      DateTime?             @map("completed_at")
  createdAt        DateTime              @map("created_at") @default(now())
  updatedAt        DateTime              @map("updated_at") @updatedAt

  resident Resident @relation(fields: [residentId], references: [id], onDelete: Cascade)

  @@index([residentId])
  @@index([status])
  @@index([createdAt])
  @@map("medicine_requests")
}
```

- [ ] **Step 3: Add `medicineRequests` relation to the Resident model**

In the `Resident` model relations section (around line 144, after `programApplications`), add:

```prisma
  medicineRequests         MedicineRequest[]
```

- [ ] **Step 4: Generate Prisma client and create migration**

Run:
```bash
cd borongan-eService-system-copy/multysis-backend && npx prisma migrate dev --name add_medicine_requests
```

Expected: Migration created successfully, Prisma client regenerated.

- [ ] **Step 5: Verify the generated migration SQL**

Run:
```bash
ls -la borongan-eService-system-copy/multysis-backend/prisma/migrations/ | tail -1
```

Check that the latest migration contains `CREATE TABLE "medicine_requests"` and `CREATE TYPE "medicine_request_status"`.

- [ ] **Step 6: Commit**

```bash
git add borongan-eService-system-copy/multysis-backend/prisma/schema.prisma borongan-eService-system-copy/multysis-backend/prisma/migrations/
git commit -m "$(cat <<'EOF'
feat: add MedicineRequest model and MedicineRequestStatus enum (LIBRE-MEDISINA)
EOF
)"
```

---

## Task 2: RBAC Seed — Role, permissions, default user

**Files:**
- Create: `united-database/seed-libre-medisina-admin.sql`

- [ ] **Step 1: Create the seed SQL file**

Create `united-database/seed-libre-medisina-admin.sql`:

```sql
-- =============================================================================
-- SEED: Libre Medisina Admin — Role, Permissions, Default User
-- =============================================================================
-- Run after the main seed.sql has been applied.
-- Idempotent: Uses INSERT ... ON CONFLICT DO NOTHING throughout.
--
-- HOW TO RUN:
--   psql "$UNIFIED_DB_URL" -f seed-libre-medisina-admin.sql
-- =============================================================================

SET search_path TO public;

-- Role
INSERT INTO public.roles (id, name, description, created_at, updated_at) VALUES
    ('role-libre-medisina-admin', 'libre_medisina_admin', 'Libre Medisina administrator — manages prescription requests', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Permissions
INSERT INTO public.permissions (id, resource, action, created_at, updated_at) VALUES
    ('perm-medicine-requests-all',  'medicine_requests', 'ALL',  now(), now()),
    ('perm-medicine-requests-read', 'medicine_requests', 'READ', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Role <-> Permission mappings
INSERT INTO public.role_permissions (id, role_id, permission_id, created_at) VALUES
    ('rp-lm-med-all',  'role-libre-medisina-admin', 'perm-medicine-requests-all',  now()),
    ('rp-lm-med-read', 'role-libre-medisina-admin', 'perm-medicine-requests-read', now())
ON CONFLICT (id) DO NOTHING;

-- Default Libre Medisina Admin user
-- Password: Admin1234! (same bcrypt hash as the default E-Service admin)
INSERT INTO public.eservice_users (id, email, password, name, role, created_at, updated_at) VALUES
    ('user-libre-medisina-admin',
     'medisina@eservice.gov.ph',
     '$2b$10$y3QB5FpC8AWOLcfLbrij6eWCM0zJ8/t37k5Bj/UiKcNq6uf7yjoLe',
     'Libre Medisina Admin',
     'libre_medisina_admin',
     now(), now())
ON CONFLICT (email) DO NOTHING;

-- Assign role to the default user
INSERT INTO public.user_roles (id, user_id, role_id, created_at) VALUES
    ('ur-lm-admin', 'user-libre-medisina-admin', 'role-libre-medisina-admin', now())
ON CONFLICT (id) DO NOTHING;

-- Also give super_admin access to medicine_requests
INSERT INTO public.role_permissions (id, role_id, permission_id, created_at) VALUES
    ('rp-sa-med-all', 'role-super-admin', 'perm-medicine-requests-all', now())
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '=== Libre Medisina Admin seed applied ===';
    RAISE NOTICE '  Role: libre_medisina_admin';
    RAISE NOTICE '  Default user: medisina@eservice.gov.ph / Admin1234!';
END$$;
```

- [ ] **Step 2: Commit**

```bash
git add united-database/seed-libre-medisina-admin.sql
git commit -m "$(cat <<'EOF'
feat: add Libre Medisina admin RBAC seed (role, permissions, default user)
EOF
)"
```

---

## Task 3: Backend Service — medicine-request.service.ts

**Files:**
- Create: `borongan-eService-system-copy/multysis-backend/src/services/medicine-request.service.ts`

- [ ] **Step 1: Create the service file**

Create `borongan-eService-system-copy/multysis-backend/src/services/medicine-request.service.ts`:

```typescript
import { MedicineRequestStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';

// =============================================================================
// TYPES
// =============================================================================

export interface MedicineRequestFilters {
  status?: MedicineRequestStatus;
  search?: string;
  page?: number;
  limit?: number;
}

// Valid status transitions — enforced server-side
const VALID_TRANSITIONS: Record<MedicineRequestStatus, MedicineRequestStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['PREPARING'],
  REJECTED: [],
  PREPARING: ['READY_FOR_PICKUP'],
  READY_FOR_PICKUP: ['PICKED_UP'],
  PICKED_UP: ['DONE'],
  DONE: [],
};

// Map status -> timestamp field to stamp on transition
const STATUS_TIMESTAMP_FIELD: Partial<Record<MedicineRequestStatus, string>> = {
  UNDER_REVIEW: 'reviewedAt',
  APPROVED: 'reviewedAt',
  REJECTED: 'reviewedAt',
  PREPARING: 'preparedAt',
  READY_FOR_PICKUP: 'readyAt',
  PICKED_UP: 'pickedUpAt',
  DONE: 'completedAt',
};

// =============================================================================
// LIST (paginated, filterable)
// =============================================================================

export const getMedicineRequests = async (filters: MedicineRequestFilters) => {
  const { status, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.MedicineRequestWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.resident = {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const [data, total] = await Promise.all([
    prisma.medicineRequest.findMany({
      where,
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            username: true,
            contactNumber: true,
            email: true,
            barangay: {
              select: {
                barangayName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.medicineRequest.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

// =============================================================================
// GET BY ID
// =============================================================================

export const getMedicineRequest = async (id: string) => {
  const request = await prisma.medicineRequest.findUnique({
    where: { id },
    include: {
      resident: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          extensionName: true,
          username: true,
          contactNumber: true,
          email: true,
          picturePath: true,
          barangay: {
            select: {
              barangayName: true,
            },
          },
        },
      },
    },
  });

  if (!request) {
    throw new Error('Medicine request not found');
  }

  return request;
};

// =============================================================================
// STATS (dashboard counts)
// =============================================================================

export const getMedicineRequestStats = async () => {
  const counts = await prisma.medicineRequest.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const statusMap: Record<string, number> = {};
  for (const row of counts) {
    statusMap[row.status] = row._count.id;
  }

  return {
    total: Object.values(statusMap).reduce((a, b) => a + b, 0),
    pendingReview: (statusMap.SUBMITTED || 0) + (statusMap.UNDER_REVIEW || 0),
    approvedPreparing: (statusMap.APPROVED || 0) + (statusMap.PREPARING || 0),
    readyForPickup: statusMap.READY_FOR_PICKUP || 0,
    completed: (statusMap.PICKED_UP || 0) + (statusMap.DONE || 0),
    rejected: statusMap.REJECTED || 0,
  };
};

// =============================================================================
// UPDATE STATUS (with transition validation)
// =============================================================================

export const updateMedicineRequestStatus = async (
  id: string,
  newStatus: MedicineRequestStatus,
  adminId: string,
  note?: string
) => {
  const request = await prisma.medicineRequest.findUnique({ where: { id } });

  if (!request) {
    throw new Error('Medicine request not found');
  }

  const allowed = VALID_TRANSITIONS[request.status];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: ${request.status} → ${newStatus}`
    );
  }

  const updateData: Prisma.MedicineRequestUpdateInput = {
    status: newStatus,
  };

  // Stamp the relevant timestamp
  const timestampField = STATUS_TIMESTAMP_FIELD[newStatus];
  if (timestampField) {
    (updateData as any)[timestampField] = new Date();
  }

  // Set reviewedBy on first review action
  if (
    (newStatus === 'UNDER_REVIEW' || newStatus === 'APPROVED' || newStatus === 'REJECTED') &&
    !request.reviewedBy
  ) {
    updateData.reviewedBy = adminId;
  }

  // Update note if provided
  if (note !== undefined) {
    updateData.note = note;
  }

  return prisma.medicineRequest.update({
    where: { id },
    data: updateData,
    include: {
      resident: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          username: true,
          contactNumber: true,
          email: true,
          barangay: {
            select: {
              barangayName: true,
            },
          },
        },
      },
    },
  });
};
```

- [ ] **Step 2: Commit**

```bash
git add borongan-eService-system-copy/multysis-backend/src/services/medicine-request.service.ts
git commit -m "$(cat <<'EOF'
feat: add medicine-request service (list, get, stats, status transitions)
EOF
)"
```

---

## Task 4: Backend Validation — medicine-request.schema.ts

**Files:**
- Create: `borongan-eService-system-copy/multysis-backend/src/validations/medicine-request.schema.ts`

- [ ] **Step 1: Create the validation file**

Create `borongan-eService-system-copy/multysis-backend/src/validations/medicine-request.schema.ts`:

```typescript
import { param, query, body, ValidationChain } from 'express-validator';

const validStatuses = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'DONE',
] as const;

export const getMedicineRequestsValidation: ValidationChain[] = [
  query('status')
    .optional()
    .isIn(validStatuses)
    .withMessage(`status must be one of: ${validStatuses.join(', ')}`),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

export const getMedicineRequestValidation: ValidationChain[] = [
  param('id').notEmpty().withMessage('Invalid medicine request ID'),
];

export const updateMedicineRequestStatusValidation: ValidationChain[] = [
  param('id').notEmpty().withMessage('Invalid medicine request ID'),
  body('status')
    .isIn(validStatuses)
    .withMessage(`status must be one of: ${validStatuses.join(', ')}`),
  body('note').optional().trim(),
];
```

- [ ] **Step 2: Commit**

```bash
git add borongan-eService-system-copy/multysis-backend/src/validations/medicine-request.schema.ts
git commit -m "$(cat <<'EOF'
feat: add medicine-request validation schemas
EOF
)"
```

---

## Task 5: Backend Controller — medicine-request.controller.ts

**Files:**
- Create: `borongan-eService-system-copy/multysis-backend/src/controllers/medicine-request.controller.ts`

- [ ] **Step 1: Create the controller file**

Create `borongan-eService-system-copy/multysis-backend/src/controllers/medicine-request.controller.ts`:

```typescript
import { Response } from 'express';
import { MedicineRequestStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import {
  getMedicineRequests,
  getMedicineRequest,
  getMedicineRequestStats,
  updateMedicineRequestStatus,
} from '../services/medicine-request.service';

export const getMedicineRequestsController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const status = req.query.status as MedicineRequestStatus | undefined;
    const search = req.query.search as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await getMedicineRequests({ status, search, page, limit });

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch medicine requests',
    });
  }
};

export const getMedicineRequestController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const request = await getMedicineRequest(id);

    res.status(200).json({
      status: 'success',
      data: request,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Medicine request not found',
    });
  }
};

export const getMedicineRequestStatsController = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const stats = await getMedicineRequestStats();

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch medicine request stats',
    });
  }
};

export const updateMedicineRequestStatusController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status: newStatus, note } = req.body;
    const adminId = req.user!.id;

    const updated = await updateMedicineRequestStatus(
      id,
      newStatus as MedicineRequestStatus,
      adminId,
      note
    );

    res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (error: any) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to update medicine request status',
    });
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add borongan-eService-system-copy/multysis-backend/src/controllers/medicine-request.controller.ts
git commit -m "$(cat <<'EOF'
feat: add medicine-request controller (list, get, stats, update status)
EOF
)"
```

---

## Task 6: Backend Routes + Mount in index.ts

**Files:**
- Create: `borongan-eService-system-copy/multysis-backend/src/routes/medicine-request.routes.ts`
- Modify: `borongan-eService-system-copy/multysis-backend/src/index.ts`

- [ ] **Step 1: Create the routes file**

Create `borongan-eService-system-copy/multysis-backend/src/routes/medicine-request.routes.ts`:

```typescript
import { Router } from 'express';
import {
  getMedicineRequestsController,
  getMedicineRequestController,
  getMedicineRequestStatsController,
  updateMedicineRequestStatusController,
} from '../controllers/medicine-request.controller';
import { verifyAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  getMedicineRequestsValidation,
  getMedicineRequestValidation,
  updateMedicineRequestStatusValidation,
} from '../validations/medicine-request.schema';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

// Dashboard stats
router.get('/stats', getMedicineRequestStatsController);

// List all requests (paginated, filterable)
router.get('/', validate(getMedicineRequestsValidation), getMedicineRequestsController);

// Get single request
router.get('/:id', validate(getMedicineRequestValidation), getMedicineRequestController);

// Update request status
router.patch(
  '/:id/status',
  validate(updateMedicineRequestStatusValidation),
  updateMedicineRequestStatusController
);

export default router;
```

- [ ] **Step 2: Mount routes in index.ts**

In `borongan-eService-system-copy/multysis-backend/src/index.ts`, add the import after the other route imports (around line 385, after `import userRoutes`):

```typescript
import medicineRequestRoutes from './routes/medicine-request.routes';
```

Then add the route mount after the other `app.use` calls (around line 425, after the `app.use('/api/tax'` line):

```typescript
app.use('/api/medicine-requests', apiLimiter, medicineRequestRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add borongan-eService-system-copy/multysis-backend/src/routes/medicine-request.routes.ts borongan-eService-system-copy/multysis-backend/src/index.ts
git commit -m "$(cat <<'EOF'
feat: add medicine-request routes and mount at /api/medicine-requests
EOF
)"
```

---

## Task 7: Frontend — ProtectedRoute + AdminLogin redirect + route registration

**Files:**
- Modify: `borongan-eService-system-copy/multysis-frontend/src/components/common/ProtectedRoute.tsx`
- Modify: `borongan-eService-system-copy/multysis-frontend/src/pages/admin/AdminLogin.tsx`
- Modify: `borongan-eService-system-copy/multysis-frontend/src/routes/index.tsx`

- [ ] **Step 1: Add `libre_medisina_admin` to ProtectedRoute**

In `ProtectedRoute.tsx`, change line 8:

```typescript
// Before:
  requiredRole?: 'admin' | 'user' | 'developer' | 'resident';
// After:
  requiredRole?: 'admin' | 'user' | 'developer' | 'resident' | 'libre_medisina_admin';
```

- [ ] **Step 2: Add role-based redirect in AdminLogin**

In `AdminLogin.tsx`, change the `onSubmit` function (lines 47-66). Replace:

```typescript
  const onSubmit = async (data: AdminLoginInput) => {
    setIsLoading(true);

    try {
      await login({ email: data.email, password: data.password }, true);
      toast({
        title: 'Success',
        description: 'Welcome back, Admin!',
      });
      navigate('/admin/dashboard');
```

With:

```typescript
  const onSubmit = async (data: AdminLoginInput) => {
    setIsLoading(true);

    try {
      const user = await login({ email: data.email, password: data.password }, true);
      toast({
        title: 'Success',
        description: 'Welcome back, Admin!',
      });
      if (user?.role === 'libre_medisina_admin') {
        navigate('/admin/libre-medisina');
      } else {
        navigate('/admin/dashboard');
      }
```

- [ ] **Step 3: Add the `/admin/libre-medisina` route**

In `routes/index.tsx`, add the lazy import at the top with the other admin pages (around line 37, after `SocialAmelioration`):

```typescript
const AdminLibreMedisina = lazy(() =>
  import('../pages/admin/AdminLibreMedisina').then(m => ({ default: m.AdminLibreMedisina }))
);
```

Then add the route inside the admin children array (after the `e-government/:serviceCode` route, around line 267):

```typescript
      {
        path: 'libre-medisina',
        element: (
          <ProtectedRoute requiredRole="libre_medisina_admin">
            <LazyWrapper>
              <AdminLibreMedisina />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
```

- [ ] **Step 4: Commit**

```bash
git add borongan-eService-system-copy/multysis-frontend/src/components/common/ProtectedRoute.tsx borongan-eService-system-copy/multysis-frontend/src/pages/admin/AdminLogin.tsx borongan-eService-system-copy/multysis-frontend/src/routes/index.tsx
git commit -m "$(cat <<'EOF'
feat: add libre_medisina_admin role to ProtectedRoute, login redirect, and route
EOF
)"
```

---

## Task 8: Frontend — API service + query keys

**Files:**
- Create: `borongan-eService-system-copy/multysis-frontend/src/services/api/medicine-request.service.ts`
- Modify: `borongan-eService-system-copy/multysis-frontend/src/lib/query-keys.ts`

- [ ] **Step 1: Create the API service**

Create `borongan-eService-system-copy/multysis-frontend/src/services/api/medicine-request.service.ts`:

```typescript
import api from './auth.service';

export type MedicineRequestStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'DONE';

export interface MedicineRequestResident {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  username: string | null;
  contactNumber: string | null;
  email: string | null;
  barangay: { barangayName: string } | null;
}

export interface MedicineRequest {
  id: string;
  residentId: string;
  prescriptionPath: string;
  status: MedicineRequestStatus;
  note: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  preparedAt: string | null;
  readyAt: string | null;
  pickedUpAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  resident: MedicineRequestResident;
}

export interface MedicineRequestStats {
  total: number;
  pendingReview: number;
  approvedPreparing: number;
  readyForPickup: number;
  completed: number;
  rejected: number;
}

export interface MedicineRequestListResponse {
  data: MedicineRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const medicineRequestService = {
  async getAll(
    status?: MedicineRequestStatus,
    search?: string,
    page?: number,
    limit?: number
  ): Promise<MedicineRequestListResponse> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = `/medicine-requests${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return { data: response.data.data, pagination: response.data.pagination };
  },

  async getById(id: string): Promise<MedicineRequest> {
    const response = await api.get(`/medicine-requests/${id}`);
    return response.data.data;
  },

  async getStats(): Promise<MedicineRequestStats> {
    const response = await api.get('/medicine-requests/stats');
    return response.data.data;
  },

  async updateStatus(
    id: string,
    status: MedicineRequestStatus,
    note?: string
  ): Promise<MedicineRequest> {
    const response = await api.patch(`/medicine-requests/${id}/status`, { status, note });
    return response.data.data;
  },
};
```

- [ ] **Step 2: Add query keys**

In `borongan-eService-system-copy/multysis-frontend/src/lib/query-keys.ts`, add after the `notifications` block (before the closing `};`):

```typescript

  medicineRequests: {
    all: ['medicineRequests'] as const,
    list: (filters: Record<string, unknown>) => ['medicineRequests', 'list', filters] as const,
    detail: (id: string) => ['medicineRequests', 'detail', id] as const,
    stats: ['medicineRequests', 'stats'] as const,
  },
```

- [ ] **Step 3: Commit**

```bash
git add borongan-eService-system-copy/multysis-frontend/src/services/api/medicine-request.service.ts borongan-eService-system-copy/multysis-frontend/src/lib/query-keys.ts
git commit -m "$(cat <<'EOF'
feat: add medicine-request API service and query keys
EOF
)"
```

---

## Task 9: Frontend — AdminLibreMedisina page

**Files:**
- Create: `borongan-eService-system-copy/multysis-frontend/src/pages/admin/AdminLibreMedisina.tsx`

This is the largest task. The page has: header bar, stat cards, request table with filters, and a detail dialog.

- [ ] **Step 1: Create the page component**

Create `borongan-eService-system-copy/multysis-frontend/src/pages/admin/AdminLibreMedisina.tsx`:

```tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  medicineRequestService,
  type MedicineRequest,
  type MedicineRequestStatus,
} from '@/services/api/medicine-request.service';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

// =============================================================================
// STATUS HELPERS
// =============================================================================

const STATUS_LABELS: Record<MedicineRequestStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for Pick-up',
  PICKED_UP: 'Picked Up',
  DONE: 'Done',
};

const STATUS_COLORS: Record<MedicineRequestStatus, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PREPARING: 'bg-orange-100 text-orange-800',
  READY_FOR_PICKUP: 'bg-purple-100 text-purple-800',
  PICKED_UP: 'bg-indigo-100 text-indigo-800',
  DONE: 'bg-gray-100 text-gray-800',
};

const NEXT_ACTIONS: Record<MedicineRequestStatus, { label: string; status: MedicineRequestStatus }[]> = {
  SUBMITTED: [{ label: 'Start Review', status: 'UNDER_REVIEW' }],
  UNDER_REVIEW: [
    { label: 'Approve', status: 'APPROVED' },
    { label: 'Reject', status: 'REJECTED' },
  ],
  APPROVED: [{ label: 'Mark Preparing', status: 'PREPARING' }],
  REJECTED: [],
  PREPARING: [{ label: 'Mark Ready for Pick-up', status: 'READY_FOR_PICKUP' }],
  READY_FOR_PICKUP: [{ label: 'Mark Picked Up', status: 'PICKED_UP' }],
  PICKED_UP: [{ label: 'Mark Done', status: 'DONE' }],
  DONE: [],
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function residentName(r: MedicineRequest['resident']): string {
  return [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ');
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AdminLibreMedisina: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [statusFilter, setStatusFilter] = useState<MedicineRequestStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Detail dialog
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  // Queries
  const statsQuery = useQuery({
    queryKey: queryKeys.medicineRequests.stats,
    queryFn: medicineRequestService.getStats,
    refetchInterval: 30_000,
  });

  const listQuery = useQuery({
    queryKey: queryKeys.medicineRequests.list({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search,
      page,
    }),
    queryFn: () =>
      medicineRequestService.getAll(
        statusFilter === 'ALL' ? undefined : statusFilter,
        search || undefined,
        page,
        20
      ),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.medicineRequests.detail(selectedId || ''),
    queryFn: () => medicineRequestService.getById(selectedId!),
    enabled: !!selectedId,
  });

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: MedicineRequestStatus; note?: string }) =>
      medicineRequestService.updateStatus(id, status, note),
    onSuccess: () => {
      toast({ title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: queryKeys.medicineRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.medicineRequests.stats });
      if (selectedId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.medicineRequests.detail(selectedId) });
      }
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update status',
      });
    },
  });

  const handleStatusChange = (id: string, newStatus: MedicineRequestStatus) => {
    statusMutation.mutate({ id, status: newStatus, note: noteInput || undefined });
  };

  const openDetail = (id: string) => {
    setSelectedId(id);
    setNoteInput('');
  };

  const stats = statsQuery.data;
  const requests = listQuery.data?.data || [];
  const pagination = listQuery.data?.pagination;
  const detail = detailQuery.data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-colored.svg" alt="Logo" className="h-8 w-auto" />
          <h1 className="text-xl font-semibold text-heading-700">Libre Medisina</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold">{stats?.total ?? '-'}</p>
              <p className="text-xs text-gray-500 mt-1">Total Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats?.pendingReview ?? '-'}</p>
              <p className="text-xs text-gray-500 mt-1">Pending Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats?.approvedPreparing ?? '-'}</p>
              <p className="text-xs text-gray-500 mt-1">Approved / Preparing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats?.readyForPickup ?? '-'}</p>
              <p className="text-xs text-gray-500 mt-1">Ready for Pick-up</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats?.completed ?? '-'}</p>
              <p className="text-xs text-gray-500 mt-1">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search by resident name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val as MedicineRequestStatus | 'ALL');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resident</TableHead>
                <TableHead>Barangay</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                    {listQuery.isLoading ? 'Loading...' : 'No requests found'}
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow
                    key={req.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => openDetail(req.id)}
                  >
                    <TableCell className="font-medium">{residentName(req.resident)}</TableCell>
                    <TableCell>{req.resident.barangay?.barangayName || '-'}</TableCell>
                    <TableCell>{formatDate(req.createdAt)}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', STATUS_COLORS[req.status])}>
                        {STATUS_LABELS[req.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{req.note || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDetail(req.id); }}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prescription Request</DialogTitle>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : detail ? (
            <div className="space-y-6">
              {/* Resident Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Resident</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name: </span>
                    <span className="font-medium">{residentName(detail.resident)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Barangay: </span>
                    <span>{detail.resident.barangay?.barangayName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Contact: </span>
                    <span>{detail.resident.contactNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email: </span>
                    <span>{detail.resident.email || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Prescription Image */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Prescription</h3>
                <img
                  src={detail.prescriptionPath}
                  alt="Prescription"
                  className="max-w-full rounded border cursor-zoom-in"
                  onClick={() => window.open(detail.prescriptionPath, '_blank')}
                />
              </div>

              {/* Status + Timeline */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Status</h3>
                <Badge className={cn('text-sm', STATUS_COLORS[detail.status])}>
                  {STATUS_LABELS[detail.status]}
                </Badge>
                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <div>Submitted: {formatDate(detail.createdAt)}</div>
                  {detail.reviewedAt && <div>Reviewed: {formatDate(detail.reviewedAt)}</div>}
                  {detail.preparedAt && <div>Prepared: {formatDate(detail.preparedAt)}</div>}
                  {detail.readyAt && <div>Ready: {formatDate(detail.readyAt)}</div>}
                  {detail.pickedUpAt && <div>Picked Up: {formatDate(detail.pickedUpAt)}</div>}
                  {detail.completedAt && <div>Completed: {formatDate(detail.completedAt)}</div>}
                </div>
              </div>

              {/* Note */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Note</h3>
                {detail.note && (
                  <p className="text-sm text-gray-700 mb-2">{detail.note}</p>
                )}
                <Textarea
                  placeholder="Add a note (optional)..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Actions */}
              {NEXT_ACTIONS[detail.status].length > 0 && (
                <div className="flex gap-2 pt-2">
                  {NEXT_ACTIONS[detail.status].map((action) => (
                    <Button
                      key={action.status}
                      variant={action.status === 'REJECTED' ? 'destructive' : 'default'}
                      disabled={statusMutation.isPending}
                      onClick={() => handleStatusChange(detail.id, action.status)}
                    >
                      {statusMutation.isPending ? 'Updating...' : action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

- [ ] **Step 2: Verify the build compiles**

Run:
```bash
cd borongan-eService-system-copy/multysis-frontend && npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add borongan-eService-system-copy/multysis-frontend/src/pages/admin/AdminLibreMedisina.tsx
git commit -m "$(cat <<'EOF'
feat: add AdminLibreMedisina page (stats, table, detail dialog)
EOF
)"
```

---

## Task 10: Smoke test — end-to-end verification

**Files:** None (verification only)

- [ ] **Step 1: Run the seed SQL**

```bash
psql "$UNIFIED_DB_URL" -f united-database/seed-libre-medisina-admin.sql
```

Expected: "Libre Medisina Admin seed applied" notice.

- [ ] **Step 2: Start the backend and verify the API**

```bash
cd borongan-eService-system-copy/multysis-backend && npm run dev
```

In another terminal:

```bash
# Login as the Libre Medisina admin
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"medisina@eservice.gov.ph","password":"Admin1234!"}'

# Get stats (should return all zeros)
curl -s -b cookies.txt http://localhost:3000/api/medicine-requests/stats

# Get list (should return empty array)
curl -s -b cookies.txt http://localhost:3000/api/medicine-requests
```

Expected: Login returns `{ status: "success", data: { user: { role: "libre_medisina_admin" } } }`. Stats and list return success with empty data.

- [ ] **Step 3: Start the frontend and verify the page**

```bash
cd borongan-eService-system-copy/multysis-frontend && npm run dev
```

Navigate to `http://localhost:5174/admin/login`. Log in with `medisina@eservice.gov.ph` / `Admin1234!`.

Expected: Redirected to `/admin/libre-medisina`. Page shows header with "Libre Medisina", stat cards (all zeros), empty table with "No requests found".

- [ ] **Step 4: Verify role scoping**

While logged in as the Libre Medisina admin, manually navigate to `http://localhost:5174/admin/dashboard`.

Expected: Redirected to `/portal` (ProtectedRoute blocks access because role is not `admin`).

- [ ] **Step 5: Final commit (if any fixes were needed)**

```bash
git add -A && git commit -m "fix: address smoke test issues"
```

Only run if fixes were needed. Skip if everything passed.
