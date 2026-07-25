# Barangay Certificate Routing to BIMS Design

Date: 2026-07-17

## Status

Approved design direction. Implementation not started.

## Problem

BIMS already owns barangay certificate issuance:

- Municipality admins manage certificate HTML templates in BIMS.
- Barangay staff create/process certificate requests in BIMS.
- BIMS preview/download/print only works when an active template exists for the selected `certificate_type` in the resident's municipality.

The task is not to remake barangay certificates in eService. The task is to move the online request entry point into eService while preserving the existing BIMS processing model.

The current eService seed contains hardcoded Barangay Certificate service rows. That can drift from BIMS templates and should not become the online certificate catalog.

## Decision

Barangay certificate requests are citizen-facing in eService but barangay-operated in BIMS.

The request should not be routed to eService admin staff for processing. eService remains the online intake and resident tracking portal. BIMS remains the sole processing workspace for barangay certificate issuance.

The barangay certificate catalog is template-driven. eService must not hardcode certificate types or maintain its own independent certificate list. It should expose only active BIMS `certificate_templates` available for the resident's municipality.

The stable integration contract is the BIMS `certificate_type` key. eService may need a `service_id` to create a `transactions` row, but that is only transport/storage plumbing. The certificate option shown to residents must come from BIMS templates, not from eService service seed data.

## Goals

- Residents request barangay certificates online from eService.
- eService shows only certificate types that have an active BIMS template for the resident's municipality.
- eService rejects guest or crafted API certificate submissions on the server, not only in the UI.
- The request reaches the resident's barangay admin/staff in BIMS.
- Barangay staff see both online and walk-in certificate requests in one BIMS queue.
- Barangay staff generate, print, and release certificates from BIMS.
- Resident status tracking in eService reflects BIMS processing status.
- eService admin queues do not invite city/service admins to process barangay certificates.
- No database migration in the first implementation pass.

## Non-Goals

- Do not move BIMS certificate PDF/template generation into eService.
- Do not create a second certificate processing queue in eService.
- Do not hardcode barangay certificate services in the eService portal or seed a fixed online certificate list that can drift from BIMS templates.
- Do not treat eService `services` rows as the source of truth for barangay certificate types.
- Do not create an eService office staff role for barangay certificate processing.
- Do not allow guest online requests for barangay certificates; certificates require a resident/barangay record.
- Do not create migrations or change shared schema without explicit approval.

## Current Evidence

| Area | File | Behavior |
|---|---|---|
| Public BIMS certificate page | `barangay-information-management-system-copy/client/src/pages/public/Certificates.jsx` | Old public request form is retired and points online users to eService. |
| BIMS certificate queue | `barangay-information-management-system-copy/client/src/pages/admin/barangay/CertificatesPage.jsx` | Shows one queue for walk-in requests and portal transactions. |
| BIMS queue API | `barangay-information-management-system-copy/server/src/routes/certificateRoutes.js` | `GET /api/certificates/queue` returns `UNION ALL` of `requests` and `transactions` where service category is `Barangay Certificate`. |
| BIMS certificate actions | `certificateRoutes.js` and `certificateService.js` | Preview/generate PDFs and update statuses for walk-in and portal sources. |
| BIMS certificate templates | `certificate_templates` via `certificateService.js` | Templates are municipality-scoped and keyed by `certificate_type`; municipal admins can create/update active templates. |
| BIMS template admin UI | `client/src/pages/admin/certificates/CertificateTemplatesPage.jsx` and `TemplateEditorPage.jsx` | Municipality admins list, create, edit, activate/deactivate, and delete certificate templates. |
| BIMS template DB model | `borongan-eService-system-copy/multysis-backend/prisma/schema.prisma` | eService Prisma already maps `certificate_templates` as `CertificateTemplate`, so eService can read the same source of truth. |
| BIMS portal bridge | `certificateRoutes.js` | Portal rows currently read certificate type from service metadata; this is the drift point to align with BIMS-style request data. |
| eService transaction API | `multysis-backend/src/routes/transaction.routes.ts` and `transaction.service.ts` | `POST /api/transactions` allows unauthenticated guest creation today; Barangay Certificate must get a category-specific server guard. |
| eService online submission | `borongan-eService-system-copy/multysis-frontend/src/components/portal/RequestServiceModal.tsx` | Residents create `transactions` through `/api/transactions`; certificate type must be selected from BIMS templates. |
| eService generic admin page | `ServicePage.tsx` and `ApplicationDetailsModal.tsx` | Generic service pages can update transaction status today; Barangay Certificate must be notice/read-only or blocked by backend mutation guards. |
| eService hardcoded seed | `united-database/seed.sql` | Current Barangay Certificate service rows hardcode certificate types in `form_fields`; this should not drive the online certificate catalog. |
| eService guest guard | `PortalGuestApply.tsx` | Guest users are blocked from barangay certificate requests. |
| Shared DB model | `borongan-eService-system-copy/multysis-backend/prisma/schema.prisma` | `Transaction` references `Service`; BIMS queries the same `transactions` table directly. |

## Target UX Flow

### Resident

1. Resident logs into eService.
2. eService resolves the resident's barangay and municipality.
3. Resident opens `/portal/e-government` and sees only active BIMS certificate templates for their municipality.
4. Resident chooses one certificate template and submits the request form.
5. eService shows a reference number and tracking status.
6. Resident tracks the request from eService; status changes come from the shared transaction row updated by BIMS.

### Barangay Staff

1. Staff logs into BIMS.
2. Staff opens `/admin/barangay/certificates`.
3. Staff sees walk-in requests and online portal requests for their barangay in one queue.
4. Staff previews, prints/downloads, and updates the certificate status in BIMS.

### eService Admin

1. eService admins should not process barangay certificate requests.
2. Barangay certificate services may remain visible in citizen-facing eService.
3. Barangay certificate services should be hidden or blocked from normal eService admin processing pages.

## Data Flow

```text
Resident eService portal
  -> fetch active certificate_templates for resident.municipality_id
  -> resident selects template.certificate_type and enters purpose
  -> POST /api/transactions with service_data.certificate_type and service_data.purpose
  -> BIMS GET /api/certificates/queue filters by resident.barangay_id
  -> BIMS queue resolves certificate_type from transactions.service_data
  -> BIMS staff updates transactions.status
  -> eService tracking reads the same transaction status
```

Walk-ins continue using the existing BIMS flow:

```text
BIMS staff counter
  -> POST /api/public/requests/certificate
  -> requests row with type = 'certificate'
  -> same BIMS certificate queue
```

## Access Model

### BIMS

- Barangay certificate processing is controlled by BIMS user scope.
- `bims_users.target_type = 'barangay'` and `target_id = <barangay id>` should see only that barangay's queue.
- Municipality users may supervise barangays under their municipality where BIMS already allows it.

### eService

- eService service-page grants remain useful for city/office services.
- Barangay Certificate services should not be assigned to ordinary eService office staff.
- If an eService admin directly opens `/admin/e-government/<barangay-certificate-service>`, the UI should show a notice/read-only diagnostic view instead of the generic applications queue.
- Backend eService admin mutation routes must reject Barangay Certificate transactions even if an admin has generic service RBAC.
- Super Admin may retain visibility for diagnostics, but the primary processing CTA should not appear there for barangay certificates.

## Minimal Implementation Design

### 1. Keep Online Intake in eService

Online intake remains in eService, but the certificate list must come from BIMS templates.

- Add or use an eService resident-authenticated read path for active `CertificateTemplate` rows scoped by the logged-in resident's municipality.
- Replace hardcoded barangay certificate cards with template-backed entries.
- Scope template-backed entries to the logged-in resident's municipality.
- Submit the selected BIMS `certificate_type` with the online transaction request data.
- Store request data in the same practical shape BIMS needs for portal rows: `service_data.certificate_type`, `service_data.purpose`, resident id, and created timestamp.
- Align BIMS portal queue resolution to read the submitted portal certificate type, with fallback for existing legacy rows.
- Keep guest blocking for barangay certificates.
- Ensure success/tracking copy tells residents their barangay will process the request.

### Resident Template Endpoint

Add an eService backend endpoint for the portal, scoped from the authenticated resident:

- Auth: authenticated resident only.
- Input: no municipality id from the client; derive `municipality_id` from `resident.barangay_id -> barangays.municipality_id`.
- Query: `certificate_templates` where `municipality_id = residentMunicipalityId` and `is_active = true`, ordered by `name`.
- Response fields only: `id`, `name`, `description`, `certificateType`.
- Do not return `htmlContent`, `createdBy`, or internal template metadata.
- If the resident has no `barangay_id`, return an actionable error and no templates.

### Create Transaction Guard

Barangay Certificate validation must be enforced in the eService backend transaction creation path.

When the target service has `category = 'Barangay Certificate'` or is the canonical barangay-certificate transport service:

- Reject unauthenticated requests.
- Reject non-resident authenticated users.
- Reject guest applicant fields as a substitute for resident identity.
- Require `residentId === req.user.id`.
- Load the resident and require `resident.barangayId`.
- Resolve the resident municipality through `barangays.municipality_id`.
- Require `serviceData.certificate_type`.
- Reject unless an active `CertificateTemplate` exists for `(residentMunicipalityId, serviceData.certificate_type)`.
- Require `serviceData.purpose` because BIMS templates use `{{ request.purpose }}`.
- Create the transaction only after those checks pass.

This prevents invisible crafted rows: current BIMS queue excludes portal transactions with `resident_id IS NULL`, so guest Barangay Certificate transactions must never be accepted by the API.

### Portal Transaction Shape

- `transactions.resident_id`: logged-in resident id.
- `transactions.service_id`: one canonical active Barangay Certificate transport service id used only to satisfy the existing `transactions` schema and keep the row visible to the BIMS portal queue. This service metadata must not be the resident-facing certificate catalog.
- `transactions.service_data.certificate_type`: selected `certificate_templates.certificate_type`.
- `transactions.service_data.purpose`: purpose entered by the resident.
- `transactions.status`: processing status updated by BIMS.

BIMS already reads `transactions.service_data` in `certificateService.js` for portal request placeholders such as `request.purpose` and `request.orNumber`. Reading `certificate_type` from the same JSON keeps portal transactions aligned with BIMS request data instead of hardcoded service metadata.

### Transport Service

Use one canonical active eService `Service` row for barangay-certificate transport, for example `code = 'BRGY_CERTIFICATE'` and `category = 'Barangay Certificate'`.

- The row exists to satisfy `transactions.service_id`, reference-number generation, and BIMS queue filtering.
- It should not be used as the resident-facing certificate list.
- It should not display as a normal eService admin processing queue.
- It can be hidden from subscriber tabs/sidebar if the portal uses the template endpoint directly.
- Existing per-certificate eService service rows are legacy compatibility/fallback only until cleaned up; they must not drive new resident choices.
- Creating/updating this service row is a data/seed operation, not a schema migration, and requires explicit approval in production.

### Template Catalog Contract

- Source of truth: active rows in `certificate_templates` for the resident's municipality.
- Display label: template `name`.
- Submitted value: template `certificate_type`.
- Availability: if a municipal admin disables or removes a template in BIMS, it disappears from eService without code changes.
- Empty state: if no active templates exist for the resident's municipality, eService shows no certificate options.
- BIMS admin auth is not reused for the resident portal. eService should read the shared DB through its own backend/auth boundary.

### Existing BIMS Enforcement

- `getTemplateByType(municipalityId, certificateType)` requires `is_active = true`.
- Preview endpoints query `certificate_templates` with `municipality_id`, `certificate_type`, and `is_active = true`.
- Generate endpoints call the same template lookup before PDF generation.
- Therefore a request can exist with a stale or invalid `certificate_type`, but print/download must fail until an active matching template exists. eService should prevent that earlier by only offering active templates.

### Known Drift To Fix, Not Copy

- `united-database/seed.sql` currently hardcodes multiple Barangay Certificate eService services. Do not use those rows as the resident certificate catalog.
- `CertificatesPage.jsx` and older `RequestsPage.jsx` contain hardcoded certificate dropdowns/labels. If touched, align them to active templates too; do not copy those lists into eService.
- `certificateRoutes.js` currently resolves portal certificate type from service metadata for portal rows. Update it to prefer `transactions.service_data->>'certificate_type'`, with service-metadata fallback only for existing legacy transactions.

### 2. Make BIMS the Staff Destination

Use the existing BIMS queue as the staff destination.

- Verify `/admin/barangay/certificates` shows online requests for the resident's barangay.
- Verify status changes in BIMS are reflected in eService tracking.
- Create or use BIMS barangay staff/admin accounts, not eService office accounts, for certificate processing.

### 3. Remove eService Admin Processing for Barangay Certificates

Sidebar hiding is not enough. The first pass must include backend mutation protection.

- Hide `category = 'Barangay Certificate'` services from the eService admin sidebar for non-super-admins.
- If a user reaches the page directly, show a notice instead of the generic applications queue.
- Reject eService admin status/payment updates for Barangay Certificate transactions through generic routes such as `PUT /api/transactions/:id`.
- Reject generic eService admin update-request/review flows for Barangay Certificate transactions.
- Keep BIMS as the only writer for Barangay Certificate processing status.
- Do not create a new schema table for this guard.

### 4. Preserve Shared Status

Do not duplicate status fields.

- BIMS updates `transactions.status` for portal certificate rows.
- eService tracking reads the same `transactions.status`, `payment_status`, and timestamps.
- Status labels may need mapping in the eService tracking UI because BIMS portal statuses use values like `PENDING`, `PROCESSING`, `FOR_RELEASE`, `RELEASED`, `CANCELLED`, and `REJECTED`.
- Resident application filters and badges must include/map `PROCESSING`, `FOR_RELEASE`, `RELEASED`, `CANCELLED`, and `REJECTED`; do not rely only on title-case legacy filters like `Pending` and `Completed`.

## Error Handling

- If the resident's municipality has no active BIMS certificate templates, show an empty state instead of fallback hardcoded certificates.
- If a resident has no `barangay_id`, block barangay certificate submission with a clear message to contact their barangay or complete registration approval.
- If an unauthenticated user or guest payload targets a Barangay Certificate service, reject with 403/400 and do not create a transaction.
- If BIMS cannot resolve `municipality_id` for a transaction, show an operational error in BIMS and do not generate a certificate.
- If the selected template is disabled before submission, reject submission and ask the resident to choose another certificate.
- If an eService admin tries a generic transaction mutation on a Barangay Certificate transaction, reject and direct them to BIMS.
- If a BIMS staff user has no barangay scope, deny access to the certificate queue.
- If an eService admin tries to process a barangay certificate, show a clear message: `Barangay certificates are processed in BIMS by barangay staff.`

## Rollout Plan

1. Add the resident template endpoint with projected fields only.
2. Add the Barangay Certificate server-side transaction create guard.
3. Define or configure the canonical Barangay Certificate transport service row after production approval if needed.
4. Update BIMS queue to prefer `transactions.service_data->>'certificate_type'` for portal rows.
5. Add eService admin mutation guards for Barangay Certificate transactions.
6. Verify active BIMS templates for the resident's municipality are the only certificate options shown in eService.
7. Verify the same request appears in BIMS `/admin/barangay/certificates` for the resident's barangay.
8. Create a BIMS barangay staff account for the target barangay after approval.
9. Smoke test resident submission, BIMS processing, PDF generation, status update, and eService tracking.

## Testing

- Resident can submit a template-backed barangay certificate from eService.
- API rejects unauthenticated or guest Barangay Certificate transaction creation.
- API rejects resident certificate creation when `residentId` does not match the authenticated resident.
- API rejects certificate creation when the resident has no barangay or the selected template is inactive/missing for the resident's municipality.
- Resident template endpoint returns only `id`, `name`, `description`, and `certificateType`, never `htmlContent`.
- eService certificate options match active BIMS templates for the resident's municipality.
- eService does not show inactive templates or certificate types that exist only in hardcoded seed data.
- Municipal admin-created BIMS templates become requestable online without code changes.
- BIMS queue resolves portal certificate type from `transactions.service_data.certificate_type`, not hardcoded eService service metadata.
- eService generic admin transaction update endpoints reject Barangay Certificate transactions.
- Resident application status UI displays/filters BIMS statuses: `PROCESSING`, `FOR_RELEASE`, `RELEASED`, `CANCELLED`, and `REJECTED`.
- Guest cannot submit barangay certificate requests online.
- BIMS barangay staff sees only certificate requests for their barangay.
- BIMS queue includes both `source = 'walkin'` and `source = 'portal'` rows.
- BIMS can preview/generate a certificate PDF for a portal transaction.
- Updating portal request status in BIMS changes the eService tracking result.
- Normal eService office staff do not see or process barangay certificate queues.

## Open Operational Choice

Before implementation, confirm these production data choices. Each production write requires explicit approval:

- Canonical Barangay Certificate transport service row: create one if missing, or identify the existing row to use.
- BIMS staff account details and target barangay for certificate processing smoke tests.

## Self-Review

- No schema migration is required for the first pass.
- Single processing owner is explicit: BIMS.
- Certificate catalog source of truth is explicit: active BIMS templates.
- The spec distinguishes BIMS reality from current hardcoded drift points.
- API guards cover guest/crafted submissions and eService admin mutation bypasses.
- Resident intake remains in eService.
- Staff workflow avoids duplicate queues.
- Remaining production writes are limited to approved data setup: transport service selection/creation if needed, and BIMS staff account creation.
