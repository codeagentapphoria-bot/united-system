# Dynamic eService Office RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make eGovernment service requests dynamic for citizens while enforcing office-scoped service access across admin UI, APIs, notifications, and sockets.

**Architecture:** Reuse the existing `Service`, `Transaction`, `Page`, and `RolePage` models. Add shared page/service access helpers, apply them at backend object boundaries, mirror path matching in the frontend, and revive the existing dynamic citizen service browser with guest-safe restrictions.

**Tech Stack:** Express, TypeScript, Prisma, React, Vite, Socket.IO, Jest, React Router.

---

## File Map

| File | Purpose |
|---|---|
| `multysis-backend/src/utils/adminPath.ts` | Pure path normalization, dynamic matching, and service code/path conversion. |
| `multysis-backend/src/services/service-access.service.ts` | DB-backed role-page service access checks and middleware helpers. |
| `multysis-backend/src/routes/service.routes.ts` | Apply service/page access to service metadata and management writes. |
| `multysis-backend/src/routes/service-fields.routes.ts` | Apply service-id access to field metadata. |
| `multysis-backend/src/routes/transaction.routes.ts` | Apply service access to service-code, transaction-id, and note routes. |
| `multysis-backend/src/controllers/transaction.controller.ts` | Pass user-scoped appointment access and keep resident owner checks. |
| `multysis-backend/src/services/transaction.service.ts` | Filter resident internal notes and service-scoped appointments. |
| `multysis-backend/src/routes/payment.routes.ts` | Apply transaction/payment access. |
| `multysis-backend/src/routes/tax-reassessment.routes.ts` | Apply transaction/computation access. |
| `multysis-backend/src/routes/tax-preview.routes.ts` | Apply admin service access for preview. |
| `multysis-backend/src/routes/exemption.routes.ts` | Apply transaction/exemption access. |
| `multysis-backend/src/controllers/admin.controller.ts` | Pass admin user id into notification counts. |
| `multysis-backend/src/services/admin.service.ts` | Filter admin notification counts by allowed services. |
| `multysis-backend/src/socket/socket.ts` | Gate socket transaction subscriptions, notes, and typing. |
| `multysis-backend/src/services/socket.service.ts` | Emit service transaction events to scoped rooms. |
| `multysis-backend/src/services/service.service.ts` | Create/update exact service page rows. |
| `multysis-frontend/src/utils/page-access.ts` | Frontend path matching and service path helpers. |
| `multysis-frontend/src/components/common/AccessControlGate.tsx` | Use dynamic path matching. |
| `multysis-frontend/src/components/layout/DashboardLayout.tsx` | Keep submenu parents when children are allowed. |
| `multysis-frontend/src/pages/portal/PortalEGovernment.tsx` | Replace hardcoded cards with cleaned dynamic service browser. |
| `multysis-frontend/src/pages/portal/PortalGuestApply.tsx` | Render guest-safe dynamic fields and block file/appointment services. |
| `multysis-frontend/src/routes/index.tsx` | Redirect `/portal/e-services` to `/portal/e-government`. |
| `multysis-frontend/src/components/layout/PortalFooter.tsx` | Remove duplicate E-Services destination. |

## Task 1: Backend Path Helpers

**Files:**
- Create: `multysis-backend/src/utils/adminPath.ts`
- Create: `multysis-backend/src/utils/adminPath.test.ts`

- [ ] Write tests for normalization, exact matching, dynamic segment matching, service code to path, and path to service code.
- [ ] Implement the smallest pure helper module.
- [ ] Run `npx jest src/utils/adminPath.test.ts --runInBand` from `multysis-backend`.

Expected helper signatures:

```ts
export const normalizeAdminPath = (path: string): string;
export const matchesAllowedPath = (path: string, allowedPaths: string[]): boolean;
export const serviceCodeToAdminPath = (serviceCode: string): string;
export const adminPathToServiceCode = (path: string): string | null;
```

## Task 2: Backend Service Access Service

**Files:**
- Create: `multysis-backend/src/services/service-access.service.ts`
- Create: `multysis-backend/src/services/__tests__/service-access.service.test.ts`

- [ ] Write tests for exact service grant, wildcard service grant, no grant, page-path grant, and middleware deny behavior.
- [ ] Implement `getAllowedServiceAccess`, `canAccessServiceCode`, `canAccessPagePath`, and Express middleware helpers.
- [ ] Implement transaction/payment/tax/exemption resolver checks in one service to avoid copy-paste SQL.
- [ ] Run `npx jest src/services/__tests__/service-access.service.test.ts --runInBand` from `multysis-backend`.

Expected exported functions:

```ts
export type AllowedServiceAccess = { all: boolean; codes: string[] };
export const getAllowedServiceAccess: (userId: string) => Promise<AllowedServiceAccess>;
export const canAccessServiceCode: (userId: string, serviceCode: string) => Promise<boolean>;
export const canAccessPagePath: (userId: string, pagePath: string) => Promise<boolean>;
export const requireServiceCodeAccess: (paramName: string) => ExpressMiddleware;
export const requireServiceIdAccess: (paramName: string) => ExpressMiddleware;
export const requirePagePathAccess: (pagePath: string) => ExpressMiddleware;
export const requireTransactionServiceAccess: (paramName: string) => ExpressMiddleware;
export const requirePaymentServiceAccess: (paramName: string) => ExpressMiddleware;
export const requireTaxComputationServiceAccess: (paramName: string) => ExpressMiddleware;
export const requireExemptionServiceAccess: (paramName: string) => ExpressMiddleware;
```

## Task 3: Apply Backend Route Guards

**Files:**
- Modify: `multysis-backend/src/routes/service.routes.ts`
- Modify: `multysis-backend/src/routes/service-fields.routes.ts`
- Modify: `multysis-backend/src/routes/transaction.routes.ts`
- Modify: `multysis-backend/src/routes/payment.routes.ts`
- Modify: `multysis-backend/src/routes/tax-reassessment.routes.ts`
- Modify: `multysis-backend/src/routes/tax-preview.routes.ts`
- Modify: `multysis-backend/src/routes/exemption.routes.ts`

- [ ] Add route middleware for service-code routes.
- [ ] Add route middleware for transaction-id routes.
- [ ] Add route middleware for payment, tax computation, and exemption id routes.
- [ ] Add direct `/admin/general-settings/smart-city-services` page check to service write routes.
- [ ] Run `npm run build` from `multysis-backend`.

## Task 4: Transaction Detail and Appointments

**Files:**
- Modify: `multysis-backend/src/services/transaction.service.ts`
- Modify: `multysis-backend/src/controllers/transaction.controller.ts`

- [ ] Fix `getTransaction` so `resident` users do not receive internal notes.
- [ ] Add allowed service access filtering to admin appointments.
- [ ] Preserve resident owner checks and public tracking behavior.
- [ ] Run `npm run build` from `multysis-backend`.

## Task 5: Notification Counts and Sockets

**Files:**
- Modify: `multysis-backend/src/controllers/admin.controller.ts`
- Modify: `multysis-backend/src/services/admin.service.ts`
- Modify: `multysis-backend/src/services/socket.service.ts`
- Modify: `multysis-backend/src/socket/socket.ts`

- [ ] Make admin notification counts user-aware and service-filtered.
- [ ] Do not use global admin notification cache for scoped users.
- [ ] Join scoped admin sockets to service rooms based on role-page access.
- [ ] Emit service transaction events to scoped rooms instead of only `admins`.
- [ ] Gate `subscribe:transaction`, `transaction:note`, and `transaction:typing` by service access or resident ownership.
- [ ] Run `npm run build` from `multysis-backend`.

## Task 6: Service Page Row Upsert

**Files:**
- Modify: `multysis-backend/src/services/service.service.ts`

- [ ] On service create, create exact `/admin/e-government/<code>` page if missing.
- [ ] On service code update, move the exact service page if present and fail on conflict.
- [ ] Keep wildcard page untouched because it is seed/config data.
- [ ] Run `npm run build` from `multysis-backend`.

## Task 7: Frontend Access Matching

**Files:**
- Create: `multysis-frontend/src/utils/page-access.ts`
- Modify: `multysis-frontend/src/components/common/AccessControlGate.tsx`
- Modify: `multysis-frontend/src/components/layout/DashboardLayout.tsx`

- [ ] Add frontend matcher mirroring backend path semantics.
- [ ] Use matcher in `AccessControlGate`.
- [ ] Change sidebar filtering so submenu parents stay visible when at least one child is allowed.
- [ ] Run `npm run build` from `multysis-frontend`.

## Task 8: Dynamic Citizen eGovernment Page

**Files:**
- Modify: `multysis-frontend/src/pages/portal/PortalEGovernment.tsx`
- Modify: `multysis-frontend/src/routes/index.tsx`
- Modify: `multysis-frontend/src/components/layout/PortalFooter.tsx`

- [ ] Replace hardcoded service cards with dynamic active services grouped by category.
- [ ] Preserve resident `RequestServiceModal` flow.
- [ ] Route guests to `/portal/apply-as-guest?serviceId=<id>`.
- [ ] Redirect `/portal/e-services` to `/portal/e-government`.
- [ ] Remove duplicate footer destination.
- [ ] Run `npm run build` from `multysis-frontend`.

## Task 9: Guest-Safe Dynamic Form

**Files:**
- Modify: `multysis-frontend/src/pages/portal/PortalGuestApply.tsx`

- [ ] Render supported guest dynamic fields: text, number, select, date, textarea, checkbox.
- [ ] Block barangay certificate, file-required, and appointment-required services with login/walk-in guidance.
- [ ] Submit `serviceData` for supported dynamic fields.
- [ ] Keep reference-number success and tracking flow.
- [ ] Run `npm run build` from `multysis-frontend`.

## Task 10: Final Verification

**Files:**
- No new files expected.

- [ ] Run backend targeted tests added in Tasks 1 and 2.
- [ ] Run `npm run build` from `multysis-backend`.
- [ ] Run `npm run build` from `multysis-frontend`.
- [ ] Run `git diff --check` from repo root.
- [ ] Review `git diff` to confirm no unrelated changes are included.

## Self-Review

- Covers the approved spec, including socket gates, service-management guard, resident internal-note filtering, guest appointment/file blocking, tax preview, scoped notifications, and centralized code/path conversion.
- Avoids Prisma migrations and new ownership tables.
- Keeps the first implementation pass minimal by deferring guest uploads and guest appointment booking.
