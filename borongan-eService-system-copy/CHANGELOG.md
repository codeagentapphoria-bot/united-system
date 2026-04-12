# Changelog — eugene branch

All notable changes made on the `eugene` branch relative to `main`.

---

## Features

### Government Programs Portal (Resident Self-Application)
- Added a full **Portal Programs** page (`/portal/programs`) where residents can browse, search, and apply for active government programs.
- Residents can apply directly from the portal; applications are tracked with statuses (`PENDING`, `APPROVED`, `REJECTED`, `WITHDRAWN`).
- Residents can withdraw a pending application and re-apply.
- Program cards show eligibility status, application status badge, and requirement badges.
- Search and pagination support for the programs list.

### Dynamic Application Form
- Admin can define **requirements** per government program (label, input type, required/optional toggle).
- Input types supported: text, textarea, number, email, phone, URL, date, time, date & time, month, week, file.
- When a resident clicks **Apply Now**, a modal renders a live form generated from the program's requirements.
- Required field validation with inline error messages before submission.
- Non-file fields are submitted as `submittedData` (JSON); file uploads are stored as `attachments` with label, filename, URL, MIME type, and size.
- Admins see submitted data and downloadable attachment links in the **Review Application** dialog.

### Program Application Notifications
- Real-time socket notifications delivered to residents when their application status changes (approved/rejected).
- Notifications appear in the portal header bell dropdown with unread count badge.
- Admin receives a socket notification when a new application is submitted.
- Notifications persist in the bell dropdown and can be dismissed.

### Resident Preview in Program Applications Tab
- Admin can click a resident name in the Program Applications tab to open a **Resident Preview** dialog.
- Preview shows identity card (avatar, name, contact), personal info, address, application details, submitted requirements, attachments, and existing beneficiary records.
- Dialog design is consistent with other admin modals (primary-600 title, bordered section groups, footer close button).

### Profile — Programs Tab
- Added a **Programs** tab to the resident portal profile page (`/portal/profile`).
- Shows all government programs the resident has applied for, with status badges and application details.

### Social Amelioration — Pre-fill from Self-Registration
- When adding a beneficiary in social amelioration, relevant fields are pre-filled from the resident's existing self-registration amelioration data.

---

## Fixes

### Resident Search Not Displaying Results
- Fixed a hook isolation bug in `CitizenSelector`: the component was calling `useCitizenSearch()` internally, creating a disconnected state instance that never received the parent's search results.
- Fix: removed the internal hook call; `filteredCitizens` is now passed as a prop from each modal (`AddSeniorCitizenModal`, `AddPWDModal`, `AddStudentModal`, `AddSoloParentModal`) down through the fields component to `CitizenSelector`.

### Attachment URL Normalization
- `fixAttachmentUrl()` exported from `AttachmentPreview.tsx` normalizes Windows absolute paths stored in the database (e.g. `C:\Users\...\uploads\...`) to a proper relative URL (`/uploads/...`) for both new and legacy records.
- Applied to resident avatar (`picturePath`) and all program application attachments.

### Duplicate Socket Handlers / Toast Self-Cancellation
- Prevented duplicate socket event handlers from being registered on re-renders, which caused notification toasts to immediately cancel themselves.

### File Upload Security
- Added magic-byte validation (`validateFileContent`) for all program application file uploads after multer saves the file.
- Added a `files: 20` limit to prevent disk-exhaustion DoS via unlimited file uploads.
- Malformed or missing `submittedData` JSON now returns HTTP 400 with a descriptive error instead of silently saving empty data.
- All uploaded files are deleted if any single file fails validation.

### Broken Input Types in Requirement Builder
- Removed `password`, `checkbox`, `range`, and `color` from the requirement type options — these produce broken or confusing form fields for residents.

### Various UI Fixes
- Fixed `cn` import error in portal pages.
- Fixed wrong socket room name causing notifications to not be delivered.
- Fixed portal programs UI inconsistency between applied/not-applied states.

---

## UI / Responsive

### Tabs Overflow on Small Screens
- **Social Amelioration admin page**: tab bar now scrolls horizontally (`overflow-x-auto`) instead of overflowing the layout. Tab labels hidden on mobile (icon-only), visible on `sm` breakpoint and wider. Padding reduced to `px-3` on mobile, `px-6` on `sm+`.
- **Portal Profile page**: same fix applied — `overflow-x-auto` wrapper, `w-max min-w-full` on `TabsList`, labels hidden below `sm` breakpoint.

---

## Database

### Migration — Program Application Submission Data
**File:** `united-database/migrate_program_application_submission_v1.sql`

Adds two columns to `government_program_applications`:
```sql
ALTER TABLE "government_program_applications"
  ADD COLUMN IF NOT EXISTS "submitted_data" JSONB,
  ADD COLUMN IF NOT EXISTS "attachments"    JSONB;
```

### Schema Changes
- `GovernmentProgramApplication` model: added `submittedData Json?` and `attachments Json?` fields.
- `GovernmentProgram` model: added `requirements Json?` field for storing the dynamic form definition.
- Added `GovernmentProgramApplication` relation to `Citizen` and `GovernmentProgram` models.

---

## New Files

| File | Description |
|------|-------------|
| `multysis-backend/src/controllers/portal-programs.controller.ts` | Portal-facing program and application endpoints |
| `multysis-backend/src/services/portal-programs.service.ts` | Business logic for resident program browsing and applications |
| `multysis-backend/src/routes/portal-programs.routes.ts` | Routes for portal programs API |
| `multysis-frontend/src/pages/portal/PortalPrograms.tsx` | Resident-facing programs browse/apply page |
| `multysis-frontend/src/components/modals/government-programs/ApplyForProgramModal.tsx` | Dynamic application form modal for residents |
| `multysis-frontend/src/components/common/AttachmentPreview.tsx` | Reusable attachment/file preview component with URL normalization |
| `united-database/migrate_program_application_submission_v1.sql` | Migration adding submitted_data and attachments columns |
