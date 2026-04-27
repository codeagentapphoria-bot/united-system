# Dynamic Page Access Control — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement dynamic sidebar filtering based on user permissions — sidebar fetches allowed pages from backend, routes no longer have hardcoded role checks, and the hardcoded `admin-resources.ts` is replaced by DB-driven data.

**Architecture:**
- `Page.resource` field added via migration — derived from `Page.path` (e.g. `/admin/libre-sakay/dashboard` → `libre-sakay-dashboard`)
- `GET /api/users/:id/allowed-pages` endpoint returns all pages whose `resource` matches the user's permission set
- `DashboardLayout` fetches allowed pages on load and filters its `menuItems` to only show accessible pages
- `ProtectedRoute` is simplified to auth-only (sidebar already hides inaccessible pages)
- `GET /api/permissions/resources` now queries distinct `Permission.resource` values from DB instead of `admin-resources.ts`
- `admin-resources.ts` is deleted

**Tech Stack:** TypeScript, Prisma, Express, React

---

## File Inventory

### Backend — Create/Modify

- `united-database/migrations/11_add_resource_to_pages.sql` — adds `resource` column, unique constraint, backfills from path
- `multysis-backend/src/services/user.service.ts` — new `getAllowedPages(userId)` function
- `multysis-backend/src/controllers/user.controller.ts` — new `getAllowedPagesController`
- `multysis-backend/src/routes/user.routes.ts` — add `GET /users/:id/allowed-pages`
- `multysis-backend/src/services/permission.service.ts` — add `getDistinctResources()` to replace hardcoded `getAdminResources()`
- `multysis-backend/src/controllers/permission.controller.ts` — update `getAdminResourcesController` to call DB
- `multysis-backend/src/routes/permission.routes.ts` — `GET /permissions/resources` unchanged (controller updated)
- `multysis-backend/src/utils/admin-resources.ts` — **DELETE**

### Frontend — Create/Modify

- `multysis-frontend/src/services/api/user.service.ts` — new `getAllowedPages(userId)` API call
- `multysis-frontend/src/components/layout/DashboardLayout.tsx` — fetch allowed pages on mount, filter `menuItems`
- `multysis-frontend/src/routes/index.tsx` — remove all `requiredRole` props from admin routes, keep only `<ProtectedRoute>`
- `multysis-frontend/src/components/common/ProtectedRoute.tsx` — simplify to auth-only guard
- `multysis-frontend/src/config/admin-resources.ts` — **DELETE**
- `multysis-frontend/src/components/admin/permissions/AddPermissionModal.tsx` — update resource dropdown to use API

---

## Task 1: DB Migration — Add `resource` to `Page`

**Files:**
- Create: `united-database/migrations/11_add_resource_to_pages.sql`

- [ ] **Step 1: Write migration**

```sql
-- Migration: 11_add_resource_to_pages
-- Adds resource column to pages table and backfills from existing paths

-- 1. Add resource column (nullable first, backfill, then add unique constraint)
ALTER TABLE "pages" ADD COLUMN "resource" TEXT;

-- 2. Backfill resource from path: /admin/libre-sakay/dashboard → libre-sakay-dashboard
-- Handles top-level paths like /admin/dashboard → dashboard
UPDATE "pages"
SET "resource" = (
  CASE
    -- If path has 3+ segments after splitting: take segments [2] and [3]
    WHEN array_length(string_to_array("path", '/'), 1) >= 4
    THEN array_to_string(array_slice(string_to_array("path", '/'), 2, 4), '-')
    -- If path has 3 segments: take segments [2] only (e.g., /admin/dashboard → dashboard)
    WHEN array_length(string_to_array("path", '/'), 1) = 3
    THEN array_to_string(array_slice(string_to_array("path", '/'), 2, 3), '-')
    ELSE "path"
  END
);

-- 3. Now make NOT NULL and add unique constraint
ALTER TABLE "pages" ALTER COLUMN "resource" SET NOT NULL;

-- 4. Add unique constraint on (system, resource)
ALTER TABLE "pages" ADD CONSTRAINT "pages_system_resource_unique" UNIQUE ("system", "resource");
```

- [ ] **Step 2: Run migration**

```bash
# Apply to local DB
psql "$DB_URL" -f united-database/migrations/11_add_resource_to_pages.sql

# Then regenerate Prisma client
cd borongan-eService-system-copy/multysis-backend && npx prisma generate
```

Expected: Migration applies cleanly, `resource` column exists on `pages` table with values like `dashboard`, `libre-sakay-dashboard`, etc.

- [ ] **Step 3: Commit**

```bash
git add united-database/migrations/11_add_resource_to_pages.sql
git commit -m "feat(pages): add resource column derived from path"
```

---

## Task 2: Backend — `getAllowedPages` Service + Controller + Route

**Files:**
- Modify: `multysis-backend/src/services/user.service.ts`
- Modify: `multysis-backend/src/controllers/user.controller.ts`
- Modify: `multysis-backend/src/routes/user.routes.ts`

### 2A: Add `getAllowedPages` to user.service.ts

- [ ] **Step 1: Add to user.service.ts**

After existing functions, add:

```typescript
/**
 * Get all pages accessible to a user based on their permission set.
 * A page is accessible if Page.resource matches any Permission.resource
 * that the user holds via their roles.
 */
export const getAllowedPages = async (userId: string) => {
  // Fetch user's roles and their permissions
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Collect all resource strings the user has permission for
  const allowedResources = new Set<string>();
  user.userRoles.forEach((userRole) => {
    userRole.role.rolePermissions.forEach((rp) => {
      allowedResources.add(rp.permission.resource);
    });
  });

  // Fetch all pages whose resource is in the allowed set
  const pages = await prisma.page.findMany({
    where: {
      resource: {
        in: Array.from(allowedResources),
      },
    },
    orderBy: [{ system: 'asc' }, { path: 'asc' }],
  });

  return pages;
};
```

- [ ] **Step 2: Add controller to user.controller.ts**

```typescript
export const getAllowedPagesController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Only allow users to fetch their own allowed pages, or admins can fetch any
    const targetUserId = req.params.id;
    const isAdmin = req.user?.type === 'admin';
    const isSelf = req.user?.id === targetUserId;

    if (!isAdmin && !isSelf) {
      res.status(403).json({
        status: 'error',
        message: 'You can only view your own allowed pages',
      });
      return;
    }

    const pages = await getAllowedPages(targetUserId);
    res.status(200).json({
      status: 'success',
      data: pages,
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch allowed pages',
    });
  }
};
```

- [ ] **Step 3: Add route to user.routes.ts**

Find the existing route definition and add after other user routes:

```typescript
// GET /users/:id/allowed-pages — get pages accessible to a user
router.get(
  '/:id/allowed-pages',
  verifyToken,
  requireRole('admin'),  // Only admins can check allowed pages
  getAllowedPagesController
);
```

Note: Verify the existing import of `getAllowedPagesController` is added to the controller import at the top of `user.routes.ts`.

- [ ] **Step 4: Commit**

```bash
git add multysis-backend/src/services/user.service.ts multysis-backend/src/controllers/user.controller.ts multysis-backend/src/routes/user.routes.ts
git commit -m "feat(auth): add GET /users/:id/allowed-pages endpoint"
```

---

## Task 3: Backend — Replace `getAdminResources()` with DB Query

**Files:**
- Modify: `multysis-backend/src/services/permission.service.ts`
- Modify: `multysis-backend/src/controllers/permission.controller.ts`
- Delete: `multysis-backend/src/utils/admin-resources.ts`

### 3A: Add `getDistinctResources` to permission.service.ts

- [ ] **Step 1: Add to permission.service.ts**

```typescript
/**
 * Returns all distinct resource strings from the Permission table.
 * Replaces the hardcoded getAdminResources() utility.
 */
export const getDistinctResources = async () => {
  const permissions = await prisma.permission.findMany({
    select: { resource: true },
    distinct: ['resource'],
    orderBy: { resource: 'asc' },
  });

  return permissions.map((p) => p.resource);
};
```

### 3B: Update controller to use DB

- [ ] **Step 2: Update getAdminResourcesController in permission.controller.ts**

Remove the import:
```typescript
// REMOVE this line:
// import { getAdminResources } from '../utils/admin-resources';
```

Add import:
```typescript
import { getDistinctResources } from '../services/permission.service';
```

Update the controller function:
```typescript
export const getAdminResourcesController = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const resources = await getDistinctResources();
    // Map to the ResourceOption interface that the frontend expects
    const resourceOptions = resources.map((resource) => ({
      value: resource,
      label: resource
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      description: `Resource: ${resource}`,
    }));
    res.status(200).json({
      status: 'success',
      data: resourceOptions,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch admin resources',
    });
  }
};
```

### 3C: Delete admin-resources.ts

- [ ] **Step 3: Delete the file**

```bash
rm multysis-backend/src/utils/admin-resources.ts
```

Also check if this file is imported anywhere else:
```bash
grep -rn "admin-resources" multysis-backend/src/
```

If any other file imports it, update those imports to use `getDistinctResources()` instead.

- [ ] **Step 4: Commit**

```bash
git add multysis-backend/src/services/permission.service.ts multysis-backend/src/controllers/permission.controller.ts
git rm multysis-backend/src/utils/admin-resources.ts
git commit -m "refactor(permissions): replace hardcoded admin-resources with DB query"
```

---

## Task 4: Frontend — API Service + DashboardLayout Filtering

**Files:**
- Modify: `multysis-frontend/src/services/api/user.service.ts`
- Modify: `multysis-frontend/src/components/layout/DashboardLayout.tsx`

### 4A: Add `getAllowedPages` API to user.service.ts

- [ ] **Step 1: Add to user.service.ts**

```typescript
export const getAllowedPages = async (userId: string): Promise<string[]> => {
  const response = await api.get(`/users/${userId}/allowed-pages`);
  // Returns Page[] — extract only the paths for sidebar filtering
  return response.data.data.map((page: { path: string }) => page.path);
};
```

### 4B: Update DashboardLayout to filter menu items

- [ ] **Step 2: Modify DashboardLayout.tsx**

Replace the current `useEffect` that loads `getAdminMenuItems` with:

```typescript
import { useEffect, useState, useCallback } from 'react';
// ... existing imports ...

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, menuItems: propMenuItems }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(propMenuItems || staticMenuItems);
  const { counts } = useAdminNotifications();

  const filterMenuItemsByPermissions = useCallback(
    async (allItems: MenuItem[], userId: string) => {
      try {
        const allowedPaths = await getAllowedPages(userId);
        const allowedSet = new Set(allowedPaths);

        const filterItems = (items: MenuItem[]): MenuItem[] => {
          return items
            .map((item) => {
              // Separator items pass through
              if (item.type === 'separator') return item;

              // Check if this item's path is allowed
              const pathAllowed = !item.path || allowedSet.has(item.path);

              // Filter submenu items
              if (item.submenuItems && item.submenuItems.length > 0) {
                const filteredSubmenu = filterItems(
                  item.submenuItems.map((sub) => ({
                    ...sub,
                    path: sub.path,
                  }))
                ).filter((sub) => {
                  // Keep submenu items that either have no path (headers) or are allowed
                  return !sub.path || allowedSet.has(sub.path);
                });
                return {
                  ...item,
                  submenuItems: filteredSubmenu,
                };
              }

              return pathAllowed ? item : null;
            })
            .filter((item): item is MenuItem => item !== null);
        };

        return filterItems(allItems);
      } catch (error) {
        console.error('Failed to fetch allowed pages, showing all menu items:', error);
        return allItems; // Fallback: show all items
      }
    },
    []
  );

  useEffect(() => {
    if (propMenuItems && propMenuItems.length > 0) {
      setMenuItems(propMenuItems);
      return;
    }

    const loadMenu = async () => {
      const allItems = await getAdminMenuItems(counts);

      // Get user from auth context
      const stored = localStorage.getItem('auth_user_minimal');
      if (stored) {
        const user = JSON.parse(stored);
        if (user?.id) {
          const filtered = await filterMenuItemsByPermissions(allItems, user.id);
          setMenuItems(filtered);
          return;
        }
      }

      setMenuItems(allItems);
    };

    loadMenu();
  }, [propMenuItems, counts, filterMenuItemsByPermissions]);

  // ... rest unchanged
```

- [ ] **Step 3: Verify imports**

Ensure `getAllowedPages` is imported in DashboardLayout:
```typescript
import { getAllowedPages } from '@/services/api/user.service';
```

- [ ] **Step 4: Commit**

```bash
git add multysis-frontend/src/services/api/user.service.ts multysis-frontend/src/components/layout/DashboardLayout.tsx
git commit -m "feat(dashboard): filter sidebar menu by user's allowed pages"
```

---

## Task 5: Frontend — Remove Hardcoded `requiredRole` from Routes

**Files:**
- Modify: `multysis-frontend/src/routes/index.tsx`
- Modify: `multysis-frontend/src/components/common/ProtectedRoute.tsx`

### 5A: Simplify ProtectedRoute to auth-only

- [ ] **Step 1: Update ProtectedRoute.tsx**

```tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  // requiredRole and requireActiveStatus removed — sidebar now handles visibility
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/portal" replace />;

  // No role check — sidebar already hides pages user can't access
  return <>{children}</>;
};
```

### 5B: Remove `requiredRole` from all admin routes

- [ ] **Step 2: Update routes/index.tsx**

Remove `requiredRole="admin"` from ALL admin routes. Every route should look like:

```tsx
// BEFORE:
<ProtectedRoute requiredRole="admin">
  <LazyWrapper><AdminDashboard /></LazyWrapper>
</ProtectedRoute>

// AFTER:
<ProtectedRoute>
  <LazyWrapper><AdminDashboard /></LazyWrapper>
</ProtectedRoute>
```

Routes to update (all admin routes under `/admin`):
- `/admin/dashboard`
- `/admin/citizens`
- `/admin/registration-workflow`
- `/admin/subscribers`
- `/admin/access-control/role-management`
- `/admin/access-control/permissions`
- `/admin/access-control/user-management`
- `/admin/access-control/page-management`
- `/admin/general-settings/smart-city-services`
- `/admin/general-settings/government-program`
- `/admin/general-settings/address`
- `/admin/general-settings/appointment`
- `/admin/general-settings/faq`
- `/admin/general-settings/tax-profiles`
- `/admin/e-government/social-amelioration`
- `/admin/e-government/reports`
- `/admin/e-government/:serviceCode`
- `/admin/libre-medisina` (already had special handling — remove `requiredRole="libre_medisina_admin"`)

**Keep `requiredRole="developer"`** only for `/dev/dashboard` (dev routes).

**Keep NO role** for `/admin/libre-sakay/:section` (already had no role check).

- [ ] **Step 3: Commit**

```bash
git add multysis-frontend/src/routes/index.tsx multysis-frontend/src/components/common/ProtectedRoute.tsx
git commit -m "refactor(routes): remove hardcoded requiredRole from admin routes"
```

---

## Task 6: Frontend — Remove Hardcoded Admin Resources

**Files:**
- Delete: `multysis-frontend/src/config/admin-resources.ts` (if it exists — check)
- Modify: `multysis-frontend/src/components/admin/permissions/AddPermissionModal.tsx`

- [ ] **Step 1: Check if admin-resources.ts exists in frontend**

```bash
ls multysis-frontend/src/config/admin-resources.ts 2>/dev/null && echo "EXISTS" || echo "NOT_FOUND"
```

If it exists, delete it.

- [ ] **Step 2: Update AddPermissionModal to use API**

The `AddPermissionModal` should already be using `GET /api/permissions/resources`. If it was updated in a previous session (as mentioned in the progress notes), verify it calls the endpoint and not the local file. The resource dropdown should populate from `response.data.data` which now comes from the DB.

- [ ] **Step 3: Commit**

```bash
git add multysis-frontend/src/config/
git rm multysis-frontend/src/config/admin-resources.ts 2>/dev/null || true
git commit -m "refactor(frontend): remove hardcoded admin-resources, use API"
```

---

## Self-Review Checklist

### Spec Coverage
- [ ] DB migration adds `resource` column to `Page` — Task 1
- [ ] `GET /api/users/:id/allowed-pages` returns accessible pages — Task 2
- [ ] `GET /api/permissions/resources` now returns DB-driven resources — Task 3
- [ ] `admin-resources.ts` deleted on both backend and frontend — Tasks 3 & 6
- [ ] Sidebar filters based on allowed pages — Task 4
- [ ] Routes have no hardcoded role checks — Task 5
- [ ] `ProtectedRoute` simplified to auth-only — Task 5

### Placeholder Scan
- [ ] No "TBD", "TODO", or incomplete sections
- [ ] All file paths are exact and real
- [ ] All function/variable names match existing code conventions

### Type Consistency
- [ ] `getAllowedPages` return type `Page[]` from Prisma matches frontend `getAllowedPages` return type `string[]`
- [ ] `MenuItem` interface in DashboardLayout matches the one in `admin-menu.tsx`
- [ ] `AuthRequest` type used consistently in all controller signatures
- [ ] `ResourceOption` interface preserved in `getAdminResourcesController` response shape

### Completeness
- [ ] Migration is reversible (can add `DOWN` migration)
- [ ] Error handling present in all new endpoints
- [ ] Fallback behavior if `getAllowedPages` fails (sidebar shows all items)
