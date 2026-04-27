# Access Control Enforcement — URL Bypass Prevention

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent authenticated users from accessing admin pages by typing URLs directly. Three layers: role guard on routes, page-level permission gate, and backend `X-Page-Path` header enforcement on API calls.

**Architecture:**
- Layer 1: `RequireAdmin` — route wrapper checking `user.role === 'admin'`, replaces `ProtectedRoute` alone on admin routes
- Layer 2: `AccessControlGate` — component inside `DashboardLayout` that checks the current page path against `allowedPaths` fetched by the layout
- Layer 3: `requirePageAccess` backend middleware reading `X-Page-Path` header set by an axios interceptor

**Tech Stack:** React Router v6, axios interceptors, Express middleware, Prisma

---

## File Map

### New Files (Create)

| File | Purpose |
|---|---|
| `multysis-frontend/src/components/common/RequireAdmin.tsx` | Role guard — redirects non-admins |
| `multysis-frontend/src/components/common/AccessDenied.tsx` | "Access Denied" UI card |
| `multysis-frontend/src/components/common/AccessControlGate.tsx` | Permission gate — wraps page content |
| `multysis-frontend/src/context/AllowedPagesContext.tsx` | React context to share `allowedPaths` from `DashboardLayout` to pages |
| `multysis-backend/src/middleware/pageAccess.ts` | `requirePageAccess` middleware factory |

### Modified Files

| File | Change |
|---|---|
| `multysis-frontend/src/routes/index.tsx` | Wrap all `/admin/*` routes with `<RequireAdmin>` |
| `multysis-frontend/src/services/api/auth.service.ts` | Add axios interceptor injecting `X-Page-Path` header |
| `multysis-frontend/src/components/layout/DashboardLayout.tsx` | Provide `allowedPaths` via `AllowedPagesContext` |
| `multysis-backend/src/middleware/auth.ts` | Export `requirePageAccess` from `auth.ts` (add to existing file) |
| `multysis-backend/src/index.ts` | Apply `requirePageAccess` after `verifyAdmin` on admin route group |
| `multysis-frontend/src/pages/admin/AdminDashboard.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/AdminCitizens.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/AdminRegistrationWorkflow.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/AdminSubscribers.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/AdminRoleManagement.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/AdminPermissionsManagement.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/AdminUserManagement.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/AdminPageManagement.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/AdminSmartCityServices.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/AdminGovernmentPrograms.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/AdminAddresses.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/AdminAppointments.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/AdminFAQs.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/TaxProfiles.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/SocialAmelioration.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/EGovReports.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/ServicePage.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/AdminLibreMedisina.tsx` | Wrap content with `AccessControlGate` |
| `multysis-frontend/src/pages/admin/AdminLibreSakay.tsx` | Wrap content with `AccessControlGate` |

---

## Task 1: AllowedPagesContext — Share allowedPaths from DashboardLayout to pages

**Files:**
- Create: `multysis-frontend/src/context/AllowedPagesContext.tsx`
- Modify: `multysis-frontend/src/components/layout/DashboardLayout.tsx` (add provider)

- [ ] **Step 1: Create AllowedPagesContext**

Create `multysis-frontend/src/context/AllowedPagesContext.tsx`:

```tsx
import { createContext, useContext, type ReactNode } from 'react';

interface AllowedPagesContextValue {
  allowedPaths: Set<string>;
  isLoading: boolean;
}

export const AllowedPagesContext = createContext<AllowedPagesContextValue>({
  allowedPaths: new Set(),
  isLoading: true,
});

export const useAllowedPages = () => useContext(AllowedPagesContext);

interface AllowedPagesProviderProps {
  children: ReactNode;
  allowedPaths: Set<string>;
  isLoading: boolean;
}

export const AllowedPagesProvider: React.FC<AllowedPagesProviderProps> = ({
  children,
  allowedPaths,
  isLoading,
}) => {
  return (
    <AllowedPagesContext.Provider value={{ allowedPaths, isLoading }}>
      {children}
    </AllowedPagesContext.Provider>
  );
};
```

- [ ] **Step 2: Update DashboardLayout to provide context**

In `multysis-frontend/src/components/layout/DashboardLayout.tsx`, add the import and wrap `{children}` with the provider. The `allowedPaths` Set and `isLoading` boolean (derived from "have we received a response from getAllowedPagePaths?") are already available in the component — add `AllowedPagesProvider` around `{children}`:

```tsx
import { AllowedPagesProvider } from '../../context/AllowedPagesContext';
// ... inside DashboardLayout return:
<AllowedPagesProvider allowedPaths={allowedPaths} isLoading={/* derived: allowedPaths.size === 0 && !!user.id */}>
  {children}
</AllowedPagesProvider>
```

Remove the `filteredMenuItems` logic from `DashboardLayout` scope — the consumer components (`Sidebar`) already receive the menu items prop. The context just provides `allowedPaths`.

- [ ] **Step 3: Commit**

```bash
cd borongan-eService-system-copy/multysis-frontend
git add src/context/AllowedPagesContext.tsx src/components/layout/DashboardLayout.tsx
git commit -m "feat(rbac): add AllowedPagesContext to share allowedPaths from DashboardLayout"
```

---

## Task 2: RequireAdmin — Role guard for admin routes

**Files:**
- Create: `multysis-frontend/src/components/common/RequireAdmin.tsx`

- [ ] **Step 1: Create RequireAdmin component**

Create `multysis-frontend/src/components/common/RequireAdmin.tsx`:

```tsx
import { cn } from '@/lib/utils';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface RequireAdminProps {
  children: React.ReactNode;
}

export const RequireAdmin: React.FC<RequireAdminProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center')}>
        <div className={cn('animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600')}></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
};
```

- [ ] **Step 2: Commit**

```bash
cd borongan-eService-system-copy/multysis-frontend
git add src/components/common/RequireAdmin.tsx
git commit -m "feat(rbac): add RequireAdmin role guard component"
```

---

## Task 3: AccessDenied — UI for denied page access

**Files:**
- Create: `multysis-frontend/src/components/common/AccessDenied.tsx`

- [ ] **Step 1: Create AccessDenied component**

Create `multysis-frontend/src/components/common/AccessDenied.tsx`:

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldOff } from 'lucide-react';

interface AccessDeniedProps {
  pagePath?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ pagePath }) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldOff className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription>
            {pagePath
              ? `You don't have permission to access this page.`
              : `You don't have permission to view this content.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => navigate('/admin/dashboard')} variant="default">
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
cd borongan-eService-system-copy/multysis-frontend
git add src/components/common/AccessDenied.tsx
git commit -m "feat(rbac): add AccessDenied UI component"
```

---

## Task 4: AccessControlGate — Page-level permission gate

**Files:**
- Create: `multysis-frontend/src/components/common/AccessControlGate.tsx`

- [ ] **Step 1: Create AccessControlGate component**

Create `multysis-frontend/src/components/common/AccessControlGate.tsx`:

```tsx
import React from 'react';
import { useAllowedPages } from '../../context/AllowedPagesContext';
import { AccessDenied } from './AccessDenied';
import { cn } from '@/lib/utils';

interface AccessControlGateProps {
  children: React.ReactNode;
  pagePath: string;
}

export const AccessControlGate: React.FC<AccessControlGateProps> = ({ children, pagePath }) => {
  const { allowedPaths, isLoading } = useAllowedPages();

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center min-h-[40vh]')}>
        <div className={cn('animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600')}></div>
      </div>
    );
  }

  if (!allowedPaths.has(pagePath)) {
    return <AccessDenied pagePath={pagePath} />;
  }

  return <>{children}</>;
};
```

- [ ] **Step 2: Commit**

```bash
cd borongan-eService-system-copy/multysis-frontend
git add src/components/common/AccessControlGate.tsx
git commit -m "feat(rbac): add AccessControlGate page-level permission component"
```

---

## Task 5: Update routes/index.tsx — Add RequireAdmin to all admin routes

**Files:**
- Modify: `multysis-frontend/src/routes/index.tsx`

- [ ] **Step 1: Add RequireAdmin import**

Add to the import list at the top of `routes/index.tsx`:

```tsx
import { RequireAdmin } from '../components/common/RequireAdmin';
```

- [ ] **Step 2: Update every admin route element**

For every admin route entry (the JSX inside `element: <ProtectedRoute>...`), change from:

```tsx
element: (
  <ProtectedRoute>
    <LazyWrapper>
      <SomePage />
    </LazyWrapper>
  </ProtectedRoute>
),
```

To:

```tsx
element: (
  <RequireAdmin>
    <ProtectedRoute>
      <LazyWrapper>
        <SomePage />
      </ProtectedRoute>
    </RequireAdmin>
  </ProtectedRoute>
),
```

Apply this change to ALL admin child routes under the `/admin` path and the `/dev` path.

**Important:** Keep `<BlockPortalUsers>` on the `/admin/login` route — it's still needed to redirect already-authenticated admins away from the login page.

- [ ] **Step 3: Commit**

```bash
cd borongan-eService-system-copy/multysis-frontend
git add src/routes/index.tsx
git commit -m "feat(rbac): wrap all admin routes with RequireAdmin role guard"
```

---

## Task 6: Axios interceptor — Inject X-Page-Path header on admin requests

**Files:**
- Modify: `multysis-frontend/src/services/api/auth.service.ts`

- [ ] **Step 1: Add X-Page-Path interceptor**

In `multysis-frontend/src/services/api/auth.service.ts`, after the existing axios instance is created, add an interceptor. Find the existing interceptor section (or create one after the instance export) and add:

```ts
// Attach current page path to every admin API request for backend page-level validation
api.interceptors.request.use((config) => {
  // Only set on admin routes (not portal, not dev)
  if (window.location.pathname.startsWith('/admin')) {
    config.headers['X-Page-Path'] = window.location.pathname;
  }
  return config;
});
```

- [ ] **Step 2: Commit**

```bash
cd borongan-eService-system-copy/multysis-frontend
git add src/services/api/auth.service.ts
git commit -m "feat(rbac): add X-Page-Path header interceptor for admin API requests"
```

---

## Task 7: Backend requirePageAccess middleware

**Files:**
- Create: `multysis-backend/src/middleware/pageAccess.ts`
- Modify: `multysis-backend/src/middleware/auth.ts` (export from there)
- Modify: `multysis-backend/src/index.ts` (apply to admin routes)

- [ ] **Step 1: Create pageAccess.ts middleware**

Create `multysis-backend/src/middleware/pageAccess.ts`:

```ts
import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';
import { getAllowedPages } from '../services/user.service';

/**
 * Factory that creates a page-access middleware.
 * Applied after verifyAdmin — checks that the X-Page-Path header
 * matches one of the pages in the user's allowedPages set.
 */
export const requirePageAccess = () => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const pagePath = req.headers['x-page-path'] as string | undefined;

    // If no X-Page-Path header, skip (public or non-page routes)
    if (!pagePath) {
      next();
      return;
    }

    if (!req.user?.id) {
      // Should not happen — verifyAdmin already ran before this
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    try {
      const allowedPages = await getAllowedPages(req.user.id);
      const allowedPaths = new Set(allowedPages.map((p) => p.path));

      if (!allowedPaths.has(pagePath)) {
        res.status(403).json({
          status: 'error',
          message: 'Access denied: you do not have permission to access this page',
        });
        return;
      }

      next();
    } catch (err) {
      console.error('requirePageAccess error:', err);
      res.status(500).json({ status: 'error', message: 'Error checking page access' });
    }
  };
};
```

- [ ] **Step 2: Export from auth.ts**

In `multysis-backend/src/middleware/auth.ts`, add at the bottom:

```ts
export { requirePageAccess } from './pageAccess';
```

- [ ] **Step 3: Apply globally to admin routes in index.ts**

Read `multysis-backend/src/index.ts` around lines 120–180 (the route registration section). Find where admin routes are mounted:

```ts
// Example (actual lines may differ — search for 'router.use(verifyAdmin)' pattern):
app.use('/api/users', verifyAdmin, userRoutes);
app.use('/api/roles', verifyAdmin, roleRoutes);
// etc.
```

After `verifyAdmin` on each admin route, add `requirePageAccess()`:

```ts
app.use('/api/users', verifyAdmin, requirePageAccess(), userRoutes);
app.use('/api/roles', verifyAdmin, requirePageAccess(), roleRoutes);
```

Apply to all admin routes: `user.routes`, `role.routes`, `permission.routes`, `page.routes`, `resident.routes`, `service.routes`, `transaction.routes`, `government-program.routes`, `social-amelioration.routes`, `social-amelioration-setting.routes`, `faq.routes`, `exemption.routes`, `medicine-request.routes`, `classification.routes`, `payment.routes`, `tax-profile.routes`, `tax-reassessment.routes`, `libre-sakay.routes`, `upload.routes`, `admin.routes`.

**Note:** The `requirePageAccess()` is added AFTER `verifyAdmin` — so admin auth is confirmed first, then page-level check runs.

- [ ] **Step 4: Commit**

```bash
cd borongan-eService-system-copy/multysis-backend
git add src/middleware/pageAccess.ts src/middleware/auth.ts
git add src/index.ts
git commit -m "feat(rbac): add requirePageAccess middleware for API-level page enforcement"
```

---

## Task 8: Wrap admin pages with AccessControlGate

**Files:** (all 19 admin page components listed in the File Map above)

For each page component, the pattern is the same. Example using `AdminDashboard.tsx`:

- [ ] **Step: Update AdminDashboard.tsx**

Change:

```tsx
<DashboardLayout menuItems={adminMenuItems}>
  <div className="space-y-6">
    ...
  </div>
</DashboardLayout>
```

To:

```tsx
<DashboardLayout menuItems={adminMenuItems}>
  <AccessControlGate pagePath="/admin/dashboard">
    <div className="space-y-6">
      ...
    </div>
  </AccessControlGate>
</DashboardLayout>
```

**Page path mappings:**

| Page Component | pagePath prop |
|---|---|
| `AdminDashboard` | `/admin/dashboard` |
| `AdminCitizens` | `/admin/citizens` |
| `AdminRegistrationWorkflow` | `/admin/registration-workflow` |
| `AdminSubscribers` | `/admin/subscribers` |
| `AdminRoleManagement` | `/admin/access-control/role-management` |
| `AdminPermissionsManagement` | `/admin/access-control/permissions` |
| `AdminUserManagement` | `/admin/access-control/user-management` |
| `AdminPageManagement` | `/admin/access-control/page-management` |
| `AdminSmartCityServices` | `/admin/general-settings/smart-city-services` |
| `AdminGovernmentPrograms` | `/admin/general-settings/government-program` |
| `AdminAddresses` | `/admin/general-settings/address` |
| `AdminAppointments` | `/admin/general-settings/appointment` |
| `AdminFAQs` | `/admin/general-settings/faq` |
| `TaxProfiles` | `/admin/general-settings/tax-profiles` |
| `SocialAmelioration` | `/admin/e-government/social-amelioration` |
| `EGovReports` | `/admin/e-government/reports` |
| `ServicePage` | `/admin/e-government/:serviceCode` (dynamic — use `useLocation()` to get pathname) |
| `AdminLibreMedisina` | `/admin/libre-medisina` |
| `AdminLibreSakay` | `/admin/libre-sakay` |

**Special case — ServicePage.tsx:** This page uses a dynamic route `:serviceCode`. Instead of a static `pagePath`, use `window.location.pathname` from within the component:

```tsx
import { useLocation } from 'react-router-dom';
// inside component:
const location = useLocation();
// wrap: <AccessControlGate pagePath={location.pathname}>
```

**Special case — AdminLibreSakay.tsx:** Uses nested routes. Wrap the rendered child (not the `:section` route param content) with `AccessControlGate` using `location.pathname`.

- [ ] **Step: Commit after updating each page**

```bash
cd borongan-eService-system-copy/multysis-frontend
git add src/pages/admin/AdminDashboard.tsx
git commit -m "feat(rbac): wrap AdminDashboard with AccessControlGate"
```

Repeat for each page component. Commit after each page for clear checkpoint history.

---

## Task 9: Build verification

**Files:** (all modified frontend and backend files)

- [ ] **Step 1: Backend build**

```bash
cd borongan-eService-system-copy/multysis-backend
npm run build 2>&1 | tail -30
```

Expected: TypeScript compiles clean with zero errors.

- [ ] **Step 2: Frontend build**

```bash
cd borongan-eService-system-copy/multysis-frontend
npm run build 2>&1 | tail -30
```

Expected: TypeScript compiles clean with zero errors.

- [ ] **Step 3: Commit final build fix if needed**

If either build has errors, fix them and commit:

```bash
git add -A
git commit -m "fix(rbac): resolve build errors in access control implementation"
```

---

## Task 10: Integration test — Verify the URL bypass is blocked

Manual browser test to verify the fix works:

1. Log in as a non-admin user (resident/portal user)
2. Type `http://localhost:5174/admin/access-control/user-management` directly in the browser
3. Expected: redirected to `/portal` by `RequireAdmin` — OR if logged in as admin but the role has no pages assigned, see `AccessDenied` card

4. Log in as admin with full access
5. Type `http://localhost:5174/admin/access-control/user-management`
6. Expected: page renders correctly

7. As admin, attempt to call an API endpoint for a page not in your role's allowed pages (via DevTools → Network → replay request with modified `X-Page-Path` header)
8. Expected: API returns `403 { "status": "error", "message": "Access denied: you do not have permission to access this page" }`

---

## Self-Review Checklist

- [ ] All 19 admin pages wrapped with `AccessControlGate`
- [ ] `RequireAdmin` added to ALL admin routes in routes/index.tsx (not just some)
- [ ] `AccessDenied` renders when `allowedPaths` hasn't loaded yet — shows spinner, not blank page
- [ ] `X-Page-Path` header is set by axios interceptor before admin API requests
- [ ] `requirePageAccess` applied to ALL admin route groups in `index.ts`
- [ ] `DashboardLayout` provides `allowedPaths` via `AllowedPagesContext` without breaking existing `Sidebar` menu filtering
- [ ] `ServicePage` uses dynamic `location.pathname` for `pagePath`
- [ ] Both backend and frontend builds pass cleanly
