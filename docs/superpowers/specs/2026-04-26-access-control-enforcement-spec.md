# Access Control Enforcement — URL Bypass Prevention

**Date:** 2026-04-26
**Status:** Draft

---

## Problem Statement

The sidebar correctly hides pages the user has no permission to access, and the login redirect works correctly. However, a user can still directly type an admin URL (e.g. `/admin/access-control/user-management`) to bypass the sidebar restriction and access restricted pages.

**Root cause:** `ProtectedRoute` only checks `isAuthenticated` — not the user's role, not the user's allowed pages. Any authenticated user can enter any admin URL.

---

## Architecture — Option B: Two-Layer Frontend Guard + Backend Enforcement

Three enforcement layers:

| Layer | Where | What it checks |
|---|---|---|
| Role guard | `RequireAdmin` wrapping admin routes | `user.role === 'admin'` |
| Page-level gate | `AccessControlGate` wrapping page content | Current page path ∈ `getAllowedPagePaths()` |
| API enforcement | `requirePageAccess` middleware on admin API routes | `X-Page-Path` header ∈ user's allowed pages |

### Frontend Flow

```
User types /admin/access-control/user-management
  │
  ├─ ProtectedRoute:  isAuthenticated? ── No ──→ redirect /portal
  │                     Yes
  │
  ├─ RequireAdmin:   role === 'admin'? ── No ──→ redirect /portal
  │                     Yes
  │
  └─ Page mounts → DashboardLayout fetches getAllowedPagePaths()
                    │
                    └─ AccessControlGate checks: current path ∈ allowedPaths?
                           Yes → render page
                           No  → render <AccessDenied />
```

### Backend Flow

```
Admin API request with X-Page-Path: /admin/access-control/user-management
  │
  └─ requirePageAccess middleware
        │
        ├─ getAllowedPages(userId) → Set<pagePath>
        ├─ header value ∈ allowedPages? ── No ──→ 403 { error: "Access denied" }
        │                           Yes
        └─ next()
```

### X-Page-Path Header Strategy

The frontend axios interceptor automatically attaches `X-Page-Path: <current pathname>` to every request made from an admin page. This is set once when the page loads and read by the backend middleware to validate page-level access. This approach is:
- **Simple**: no per-call coding needed
- **Tamper-evident**: a user could theoretically remove the header, but then they're caught by the missing-permission response
- **Acceptable** as defense-in-depth (the primary guard is frontend, this is backup)

---

## Components to Create

### Frontend

| Component | File | Responsibility |
|---|---|---|
| `RequireAdmin` | `src/components/common/RequireAdmin.tsx` | Role guard — redirects non-admins to /portal |
| `AccessDenied` | `src/components/common/AccessDenied.tsx` | UI shown when user lacks page access |
| `AccessControlGate` | `src/components/common/AccessControlGate.tsx` | Wraps page content, checks path against allowedPaths |

### Backend

| Component | File | Responsibility |
|---|---|---|
| `requirePageAccess` | `src/middleware/auth.ts` | Reads `X-Page-Path`, validates against `getAllowedPages()` |
| Axios interceptor | `src/services/api/axios.ts` | Injects `X-Page-Path` header on all admin requests |

---

## File Changes

### Create (frontend)
- `src/components/common/RequireAdmin.tsx`
- `src/components/common/AccessDenied.tsx`
- `src/components/common/AccessControlGate.tsx`

### Modify (frontend)
- `src/routes/index.tsx` — wrap all `/admin/*` routes with `<RequireAdmin>`
- `src/services/api/auth.service.ts` — add axios interceptor for `X-Page-Path` header
- `src/components/layout/DashboardLayout.tsx` — pass `allowedPaths` to children via context or prop

### Create (backend)
- `src/middleware/pageAccess.ts` — `requirePageAccess` middleware

### Modify (backend)
- `src/middleware/auth.ts` — export `requirePageAccess` factory
- `src/index.ts` — apply `requirePageAccess` globally after `verifyAdmin` for admin routes, OR apply per-route-file

---

## Key Design Decisions

1. **`AccessControlGate` receives `allowedPaths` as a prop** from `DashboardLayout`, which already fetches `getAllowedPagePaths` on mount. No duplicate API call.
2. **Route-level vs page-level**: `RequireAdmin` is a route wrapper (JSX in router). `AccessControlGate` is a component inside the page content (inside `DashboardLayout`).
3. **`X-Page-Path` header**: The axios interceptor sets it once when the page loads. This is defense-in-depth; the primary guard is the frontend `AccessControlGate`.
4. **Backend `requirePageAccess` applied globally** on all `/api/*` routes that come after `verifyAdmin`, using `req.headers['x-page-path']`. Non-admin routes are unaffected (they don't set the header).
5. **`AccessDenied` shows a card with icon, message, and "Go to Dashboard" button**. No redirect automatically — user stays on the page they tried to access.

---

## Pages to Wrap with `AccessControlGate`

Every admin page component renders `DashboardLayout` as root. The `AccessControlGate` wraps the content *inside* `DashboardLayout`:

```tsx
// Before
<DashboardLayout>
  <PageContent />

// After
<DashboardLayout>
  <AccessControlGate pagePath="/admin/access-control/user-management">
    <PageContent />
  </AccessControlGate>
```

Pages to update (all `/admin/*` page components):
- `AdminDashboard.tsx`
- `AdminCitizens.tsx`
- `AdminRegistrationWorkflow.tsx`
- `AdminSubscribers.tsx`
- `AdminRoleManagement.tsx`
- `AdminPermissionsManagement.tsx`
- `AdminUserManagement.tsx`
- `AdminPageManagement.tsx`
- `AdminSmartCityServices.tsx`
- `AdminGovernmentPrograms.tsx`
- `AdminAddresses.tsx`
- `AdminAppointments.tsx`
- `AdminFAQs.tsx`
- `TaxProfiles.tsx`
- `SocialAmelioration.tsx`
- `EGovReports.tsx`
- `ServicePage.tsx`
- `AdminLibreMedisina.tsx`
- `AdminLibreSakay.tsx`

---

## Out of Scope

- Changing `ProtectedRoute` behavior (it stays as-is for auth-only checks)
- Backend API-level auditing of page access attempts
- Changes to `BlockPortalUsers` (it's login-page-specific and already works)
