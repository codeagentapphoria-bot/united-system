# Dynamic eService Requests and Office-Scoped Dashboards Design

Date: 2026-07-16

## Status

Approved for specification after design review. Implementation not started.

## Problem

The eService app already has a generic `Service` catalog, dynamic `formFields`, and generic `Transaction` records, but citizens cannot reliably complete dynamic requests from the public portal and office staff are not safely isolated to their own service queues.

The current `/portal/e-government` page is hardcoded. The dynamic version exists in the same file but is commented out. The admin service pages already route through `/admin/e-government/:serviceCode`, but role/page permissions are currently UI-oriented and do not enforce object-level service access across APIs, notifications, transaction notes, tax/payment/exemption routes, or sockets.

## Goals

- Citizens can browse active services from the database and submit requests online.
- Residents use the full dynamic service form, appointment flow, file upload flow, tax preview, and tracking where configured.
- Guests can submit online applications without an account for services that do not require file uploads or appointments, using the same service catalog and supported dynamic fields.
- Superadmin controls office access through existing `pages` and `role_pages`, not a new ownership table.
- Exact service page paths grant access to one service queue.
- `/admin/e-government/:serviceCode` grants access to all dynamic service queues.
- Office staff cannot list, view, mutate, message, or receive notifications for transactions outside their assigned service access.
- No Prisma schema migration is required.

## Non-Goals

- Do not redesign the visual system.
- Do not replace the existing `Service` or `Transaction` models.
- Do not build a new service ownership table.
- Do not merge dedicated modules like City Population or Libre Sakay into generic eGovernment services.
- Do not run or create migrations.
- Do not solve unrelated legacy admin pages unless they directly expose service transactions.
- Do not add guest file uploads or guest appointment booking in the first pass; block those guest-only cases safely instead.

## Current Evidence

Relevant existing implementation:

| Area | Existing file | Current behavior |
|---|---|---|
| Service catalog | `multysis-backend/prisma/schema.prisma` | `Service` has `formFields`, `paymentStatuses`, `displayInSidebar`, `displayInSubscriberTabs`, appointment flags, and generic `Transaction` relation. |
| Active public services | `multysis-backend/src/routes/service.routes.ts` | `/api/services/active` and `/api/services/categories` are public. |
| Citizen e-government | `multysis-frontend/src/pages/portal/PortalEGovernment.tsx` | Dynamic implementation exists but is commented; active implementation is hardcoded cards. |
| Resident request modal | `multysis-frontend/src/components/portal/RequestServiceModal.tsx` | Supports dynamic fields, appointments, uploads, submission, and tax preview for authenticated residents. |
| Guest flow | `multysis-frontend/src/pages/portal/PortalGuestApply.tsx` | Supports guest applicant info and generic purpose only; does not render service `formFields` or required appointments. |
| Admin service page | `multysis-frontend/src/pages/admin/ServicePage.tsx` | Generic dashboard/applications tabs by `serviceCode`. |
| Dynamic menu | `multysis-frontend/src/utils/dynamic-menu.ts` | Builds `/admin/e-government/<service-code-kebab>` sidebar links from active services. |
| Frontend page gate | `multysis-frontend/src/components/common/AccessControlGate.tsx` | Exact `allowedPaths.has(pagePath)` only. |
| Sidebar filtering | `multysis-frontend/src/components/layout/DashboardLayout.tsx` | Exact path filter hides parent if parent path itself is not allowed. |
| Backend page gate | `multysis-backend/src/middleware/pageAccess.ts` | Dynamic matching exists, but middleware is only mounted under `/api/admin`. |
| Service transactions | `multysis-backend/src/routes/transaction.routes.ts` | List/stat routes are service-code based, but mutation/detail/note/tax routes are mostly `verifyAdmin` or `verifyToken` only. |
| Notifications | `multysis-backend/src/services/admin.service.ts` and `src/services/socket.service.ts` | Counts and socket events are global for all admins. |

## Authorization Model

Use existing RBAC pages as service queue grants.

| Page path assigned to role | Meaning |
|---|---|
| `/admin/e-government/bpls` | Role can access only the `BPLS` service queue and transaction objects. |
| `/admin/e-government/birth-certificate` | Role can access only the `BIRTH_CERTIFICATE` service queue and transaction objects. |
| `/admin/e-government/:serviceCode` | Role can access all dynamic service queues. |
| `/admin/general-settings/smart-city-services` | Role can manage service definitions; this should remain superadmin/config-admin only. |

Rules:

- Normalize exact service paths by lowercasing and stripping query strings/trailing slashes.
- Convert service codes to paths with existing convention: `BIRTH_CERTIFICATE` -> `/admin/e-government/birth-certificate`.
- Convert paths to service codes with existing convention: `/admin/e-government/birth-certificate` -> `BIRTH_CERTIFICATE`.
- All service-code/path conversion must go through the new shared helpers; controllers and components should not each invent their own uppercase/kebab-case rules.
- A dynamic segment in an allowed path matches one path segment only.
- `/admin/e-government` alone does not grant all service queues.
- Missing permission data fails closed for service-protected backend routes.

## Backend Design

### Shared Access Helper

Add a backend helper for service and transaction authorization. Keep it small and reusable.

Proposed responsibilities:

| Helper | Responsibility |
|---|---|
| `normalizeAdminPath(path)` | Lowercase, strip query string, strip trailing slash. |
| `serviceCodeToAdminPath(code)` | `BPLS` -> `/admin/e-government/bpls`. |
| `matchesAllowedPath(path, allowedPaths)` | Exact and `:param` path matching. |
| `canAccessServiceCode(userId, serviceCode)` | True when user has exact service path or wildcard service path. |
| `getAllowedServiceCodes(userId)` | Return `{ all: true }` for wildcard or exact service codes for scoped users. |
| `canAccessPagePath(userId, pagePath)` | True when a user has direct or dynamic page access. |
| `requireServiceCodeAccess(paramName)` | Express middleware for routes with service code params. |
| `requireTransactionServiceAccess(paramName)` | Express middleware for transaction-id routes. |
| `requirePagePathAccess(pagePath)` | Express middleware for non-service admin APIs such as service catalog management. |

Do not rely on `X-Page-Path`. That header is useful defense-in-depth, but users can omit or spoof it in direct API calls.

### Service Routes

Protect admin-only service metadata by service access where it is used as part of the office queue.

| Route | Access behavior |
|---|---|
| `GET /api/services/code/:code` | Admin must have access to that service code. |
| `GET /api/service-fields/:serviceId` | Admin must have access to the service resolved by `serviceId`. |
| `GET /api/services/active` | Remains public; only returns active services for citizen/admin menu discovery. |
| `POST/PUT/PATCH/DELETE /api/services...` | Must directly check `canAccessPagePath(userId, '/admin/general-settings/smart-city-services')`; intended for superadmin/config-admin only. Do not rely on `X-Page-Path`. |

### Transaction Routes

Protect all admin transaction access by service scope.

| Route | Required behavior |
|---|---|
| `GET /api/transactions/service/:serviceCode` | Admin must access `serviceCode`. |
| `GET /api/transactions/service/:serviceCode/statistics` | Admin must access `serviceCode`. |
| `GET /api/transactions/appointments` | Return only appointments for allowed services; wildcard sees all. |
| `GET /api/transactions/:id` | Residents keep owner check; admins must access transaction service. |
| `PUT /api/transactions/:id` | Admin must access transaction service. |
| `GET /api/transactions/:id/download` | Residents keep owner check; admins must access transaction service. |
| `POST /api/transactions/:id/admin-request-update` | Admin must access transaction service. |
| `POST /api/transactions/:id/review-update-request` | Admin must access transaction service. |
| `POST /api/transactions/:id/compute-tax` | Admin must access transaction service. |
| `GET/POST/PUT /api/transactions/:id/notes...` | Residents keep owner check; admins must access transaction service. |

Transaction detail must also fix the existing resident note-filter bug: internal notes are currently filtered only for `subscriber`; the implementation must filter internal notes for `resident` users as well.

### Payment, Tax, and Exemption Routes

These are transaction-derived and must use the same service access model.

| Route family | Required behavior |
|---|---|
| `/api/payments/transaction/:transactionId` | Admin must access transaction service. |
| `POST /api/payments` | Resolve `transactionId` from body and enforce service access. |
| `GET /api/payments/:id` | Resolve payment -> transaction -> service and enforce access. |
| `/api/tax-reassessment/:transactionId...` | Resolve transaction and enforce access. |
| `/api/tax-reassessment/comparison/:computationId` | Resolve computation -> transaction -> service and enforce access. |
| `/api/tax/preview` | For admin callers, resolve `serviceId` and enforce service access before returning preview data. Resident/guest preview behavior follows the public service request rules. |
| `/api/exemptions/transaction/:transactionId` | Require auth; residents must own transaction, admins must access service. |
| `/api/exemptions/pending` | Return only exemptions for allowed services. |
| `/api/exemptions/:id` and approve/reject | Resolve exemption -> transaction -> service and enforce access. |

### Notification Counts

Change admin notification counts to be user-aware.

Requirements:

- `getAdminNotificationCounts` accepts `userId`.
- Pending applications by service includes only allowed service codes unless wildcard is assigned.
- `pendingApplications` totals only visible services.
- `pendingUpdateRequests` totals only visible service transactions.
- `unreadMessages` totals only visible service transactions.
- Module-level counts like pending citizens or program applications are zero unless the user has the corresponding module page access.
- Cache key must include the user id or allowed-service signature. A global `admin:notificationCounts` cache is not safe for scoped users.
- First-pass implementation may skip admin-count caching for scoped admins. If scoped counts are cached, invalidation must remove all affected per-user or signature keys, not only `admin:notificationCounts`.

### Socket Events

Do not send service transaction events to the global `admins` room.

Requirements:

- On admin socket connection, compute allowed service access.
- Wildcard admins join an all-service transaction room.
- Scoped admins join rooms for each exact allowed service code.
- `transaction:new`, `transaction:update`, `appointment:new`, `appointment:update`, and transaction-note count events emit only to matching service rooms and the all-service room.
- Keep non-service global events separate from service transaction events.
- `subscribe:transaction` must verify admin service access or resident transaction ownership before joining `transaction:<id>`.
- `transaction:note` must verify the sender can access the transaction before creating or broadcasting a note.
- `transaction:typing` must verify transaction access before broadcasting typing state.
- Transaction-room note broadcasts are safe only after subscription is gated; do not let admins subscribe to arbitrary transaction rooms by id.

This prevents data leakage through event payloads, not just through rendered UI.

### Service Page Rows

When a service is created, ensure the exact admin page exists.

Example:

| Service code | Page row |
|---|---|
| `BPLS` | `system = core`, `path = /admin/e-government/bpls`, `name = BPLS` or service name |

When a service code changes, update the existing exact service page path if it exists so existing `role_pages` assignments stay attached. If no old page exists, create the new page. If the new path conflicts with an existing page, fail the service code update.

The wildcard page `/admin/e-government/:serviceCode` is seed/config data. This implementation does not create migrations for it.

## Frontend Design

### Shared Page Matcher

Add one frontend matcher that mirrors backend path matching.

Use it in:

- `AccessControlGate`
- `DashboardLayout` sidebar item filtering
- Any redirect/access helper that checks allowed paths

Sidebar parent behavior:

- Keep a submenu parent when at least one child is allowed.
- Do not require `/admin/e-government` to be assigned just to show allowed service children.
- Category headers remain visible only when at least one service in that category is visible.

### Dynamic Citizen eGovernment Page

Replace the hardcoded `PortalEGovernment` implementation with a cleaned version of the existing dynamic implementation.

Requirements:

- Fetch `/api/services/active?displayInSubscriberTabs=true` through `serviceService.getActiveServices`.
- Group by `category` and sort by service `order`.
- Search by service name and description.
- Show `Track Application` action.
- For signed-in residents, open `RequestServiceModal` and submit a real transaction.
- For guests, offer `Apply as Guest` and pass the selected `serviceId`.
- Keep socket refresh for `service:update` if it is already stable, but avoid unused state/imports from the commented code.
- Preserve current portal visual language.

### Guest Application Flow

Make guest applications use the same dynamic service configuration for fields that are safe without authentication.

Requirements:

- `PortalGuestApply` loads the selected service and its `formFields`.
- Guest form captures applicant info and dynamic service data.
- Dynamic fields supported for guests: `text`, `number`, `select`, `date`, `textarea`, `checkbox`.
- If the service requires appointments, guests cannot submit it in the first pass because appointment availability currently requires auth. Show a clear login/walk-in message.
- If service dynamic fields include `file`, guests cannot submit it in the first pass. Show a clear login/walk-in message instead of allowing an incomplete submission.
- Barangay Certificate guest restriction remains: guests cannot apply for barangay certificates online.

### `/portal/e-services`

Avoid keeping a dead public path.

Behavior:

- Redirect `/portal/e-services` to `/portal/e-government`.
- Remove or update footer wording so users do not see two separate request-flow destinations.

## Data Flow

### Resident Request

1. Portal loads active services with `displayInSubscriberTabs=true`.
2. Resident selects a service.
3. `RequestServiceModal` renders configured `formFields`.
4. Files upload through authenticated transaction-document upload.
5. Appointment availability loads if required.
6. Submission creates a generic `Transaction` with `residentId`, `serviceId`, `serviceData`, payment amount, and appointment date.
7. Admin office queue receives the new transaction only if assigned to that service.

### Guest Request

1. Guest selects service or arrives with `serviceId` query param.
2. Guest fills applicant info and dynamic service fields.
3. If appointments or file uploads are required, guest submission is blocked with login/walk-in guidance.
4. Submission creates a generic `Transaction` with applicant fields and no `residentId`.
5. Guest receives a reference number and can track at `/portal/track`.

### Office Queue Access

1. Admin logs in.
2. Frontend fetches allowed pages.
3. Sidebar shows exact service links or all dynamic links when wildcard is assigned.
4. Backend independently resolves allowed services for every service/transaction route.
5. Admin can only see/mutate objects tied to allowed services.
6. Notifications and sockets only include allowed services.

## Error Handling

| Case | Behavior |
|---|---|
| Admin lacks service access | Return `403` with `SERVICE_ACCESS_DENIED`. |
| Service not found | Return `404`. |
| Access helper database failure | Fail closed with `500`; do not silently allow access. |
| No allowed service codes | Return empty queues/counts where list-style endpoint makes sense; return `403` for object/action endpoint. |
| Guest selects file-required or appointment-required service | Block submit and explain login/walk-in requirement. |
| Service code update conflicts with existing page path | Reject update with clear conflict message. |

## Testing Plan

Backend checks:

- Unit-test path normalization and dynamic path matching.
- Unit-test service-code path conversion in both directions.
- Unit-test exact service grant, wildcard grant, and denied service grant.
- Route-test `GET /transactions/service/:serviceCode` for allowed and denied admins.
- Route-test `PUT /transactions/:id` for allowed and denied admins.
- Route-test transaction notes for allowed and denied admins.
- Route-test payment or tax route access by transaction id.
- Route-test `/api/services` write APIs require `/admin/general-settings/smart-city-services` role-page access.
- Route-test resident transaction detail does not include internal notes.
- Route-test `/api/tax/preview` denies admins without service access.
- Test admin notification counts are filtered by allowed services.
- Test scoped admin notification counts are not served from a global cache.
- Socket-test admin cannot subscribe to, type in, or send notes to an unauthorized transaction room.

Frontend checks:

- Typecheck/build after changes.
- Verify wildcard allowed path unlocks `/admin/e-government/bpls` in `AccessControlGate`.
- Verify exact service allowed path keeps the E-government parent menu visible with only that service child.
- Verify dynamic eGovernment page renders services from API, opens resident request modal, and routes guest apply with `serviceId`.
- Verify `/portal/e-services` no longer presents disabled dead cards.

Manual smoke checks:

- Resident submits a dynamic service request and receives a reference number.
- Guest submits a non-barangay, non-file, non-appointment service request and can track it.
- Guest sees login/walk-in guidance for file-required or appointment-required services.
- Scoped admin sees only assigned service menu, queue, stats, and notifications.
- Scoped admin receives socket updates only for assigned service.
- Scoped admin cannot directly call another service queue or transaction id.
- Wildcard admin sees all dynamic services.

## Rollout Notes

- No migration is planned.
- Existing exact service page rows can be created automatically on service create/update going forward.
- Existing services may need a one-time script or admin action to create exact page rows if scoped roles are needed immediately. Do not run DB writes without approval.
- Existing broad roles that already have `/admin/e-government/:serviceCode` will continue to see all dynamic services after frontend matcher support is added.
- Assign `/admin/general-settings/smart-city-services` only to users allowed to configure the service catalog.

## Decisions

- Guest uploads are deferred; file-required guest services are blocked with login/walk-in guidance.
- Guest appointment booking is deferred; appointment-required guest services are blocked with login/walk-in guidance.
- Service notification sockets use scoped rooms in the first implementation pass because office isolation is otherwise leaky.
- `/portal/e-services` redirects to `/portal/e-government`.

## Spec Review

- No placeholders remain.
- Scope stays within existing `Service`, `Transaction`, `Page`, and `RolePage` models.
- The design avoids schema migrations.
- The design explicitly covers the gaps found in frontend wildcard matching, sidebar parent visibility, backend object authorization, service-management API access, notifications, sockets, guest dynamic forms, resident internal-note filtering, transaction notes, tax preview, and transaction-adjacent tax/payment/exemption routes.
