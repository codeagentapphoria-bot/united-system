# Social Amelioration Sync — Feature Documentation

## Overview

This update connects the **E-Services self-registration form** (multysis) with the **BIMS classification system**, so that social amelioration sub-field data collected during resident self-registration automatically flows through to:

1. The BIMS **Resident Classifications** modal (pre-filled sub-fields on approval)
2. The BIMS **Social Amelioration** beneficiary tables (disability type, grade level, category, pension types)

Previously, these two systems stored overlapping data independently. Now E-Services is the source of truth for the 4 overlapping classification types: **Senior Citizen, Person with Disability, Student / College Student, Solo Parent**.

---

## Data Flow

```
Self-Registration Form (E-Services)
  └─ amelioration_data stored in registration_requests.amelioration_data (JSONB)
        │
        ▼ on admin approval (BIMS)
  ┌─────────────────────────────────────────────────────┐
  │ autoClassifyResident()                              │
  │   buildClassificationDetails(type, ameliorationData)│
  │   → INSERT into resident_classifications            │
  │     .classification_details (JSONB)                 │
  └─────────────────────────────────────────────────────┘
        │
        ▼ after commit (async)
  ┌─────────────────────────────────────────────────────┐
  │ autoSyncBeneficiaries()                             │
  │   → INSERT/UPDATE beneficiary tables                │
  │     pwd_beneficiaries.disability_type_id            │
  │     student_beneficiaries.grade_level_id            │
  │     solo_parent_beneficiaries.category_id           │
  │     senior_citizen_pension_type_pivots              │
  └─────────────────────────────────────────────────────┘
        │
        ▼ post-approval modal (BIMS frontend)
  ┌─────────────────────────────────────────────────────┐
  │ GET /:residentId/resident                           │
  │   → full profile with classification_details        │
  │   → ResidentClassificationsForm pre-fills           │
  │     pension types, disability type, grade level,    │
  │     solo parent category, voter type                │
  └─────────────────────────────────────────────────────┘
```

---

## Changes by System

### E-Services Backend (`multysis-backend`)

#### `prisma/schema.prisma`
- Added `ameliorationData Json? @map("amelioration_data")` to `RegistrationRequest` model

#### `src/services/portal-registration.service.ts`
- Extended `ResidentRegistrationData` interface with `ameliorationData` field
- `submitRegistration()` now saves `ameliorationData` to `registration_requests`

#### `src/routes/portal-registration.routes.ts`
- Added public route: `GET /portal-registration/amelioration-settings?type=<TYPE>`
  - No auth required (used by the registration form)
  - Accepts `type`: `PENSION_TYPE`, `DISABILITY_TYPE`, `GRADE_LEVEL`, `SOLO_PARENT_CATEGORY`

#### `src/controllers/portal-registration.controller.ts`
- Added `getPublicAmeliorationSettingsController` to serve settings to the registration form

---

### E-Services Frontend (`multysis-frontend`)

#### `src/pages/portal/ResidentRegister.tsx`
Added conditional social amelioration cards in Step 1 that appear automatically based on resident info:

| Card | Trigger | Fields |
|------|---------|--------|
| Senior Citizen | Age ≥ 60 (auto-detected from birthdate) | Pension / Benefit Types (multi-select) |
| Person with Disability | "I have a disability" checkbox | Type of Disability, Disability Level |
| Student | Employment status = Student | Grade Level (non-college) or Course / Field of Study (college) |
| Solo Parent | Widowed/Separated/Divorced/Annulled + "I have children" checkbox | Solo Parent Category |
| Voter Type | Is Voter = yes | Regular / SK selector (age-gated) |

All sub-field values are bundled as `ameliorationData` and included in the registration API payload.

---

### BIMS Backend (`barangay-information-management-system-copy/server`)

#### `src/routes/registrationRoutes.js`
- `autoClassifyResident()` now accepts `ameliorationData` and uses it to populate `classification_details` for each type via `buildClassificationDetails()`
- Auto-classifies PWD and Solo Parent from `ameliorationData` (not just flat resident fields)
- `buildClassificationDetails()` key mapping:

| Classification Type | Keys stored in `classification_details` |
|--------------------|-----------------------------------------|
| Senior Citizen | `pensionTypes` (array of setting IDs), `remarks` |
| Person with Disability | `disabilityType` (setting ID), `disabilityLevel`, `remarks` |
| Student | `gradeLevel` (setting ID), `remarks` |
| College Student | `courseField` (free text), `remarks` |
| Solo Parent | `category` (setting ID), `remarks` |
| Voter | `typeOfVoter` (`Regular` or `SK`) |

#### `src/services/residentServices.js`
- Added `normalizeDetails(classificationType, raw)` — maps BIMS form output keys to beneficiary table column keys
- `insertClassification()` and `updateClassification()` now silently sync to beneficiary tables with normalized detail values

---

### BIMS Frontend (`barangay-information-management-system-copy/client`)

#### `src/pages/admin/shared/RegistrationApprovalsPage.jsx`
- After approval, fetches the full resident profile (`GET /:residentId/resident`) before opening the classification modal
- Previously used a client-assembled stub (no `classification_details`) which left all sub-fields blank

#### `src/features/barangay/residents/components/ResidentClassificationsForm.jsx`
- `renderDetailField` respects `filterIds` on `amelioration_select` fields to narrow dropdown options

---

## Database Migrations

### `united-database/migrate_classification_details.sql`
Run once to:
1. Add `amelioration_data JSONB NULL` column to `registration_requests`
2. Update `classification_types.details` for Senior Citizen, Person with Disability, Student, College Student, Solo Parent with the structured field descriptors that drive the dynamic form in BIMS

### `united-database/backfill_classification_details.sql`
Run once to patch residents who were approved before this feature was deployed. Updates `resident_classifications.classification_details` from the stored `amelioration_data` for all types.

```bash
# Run both in order
psql -d <your_db> -f united-database/migrate_classification_details.sql
psql -d <your_db> -f united-database/backfill_classification_details.sql
```

---

## Classification Types — `details` Schema Reference

The `classification_types.details` JSONB column defines the dynamic sub-fields rendered in the BIMS classification dialog. Each entry in the array is a field descriptor:

```json
{
  "key": "fieldKey",
  "label": "Display Label",
  "type": "amelioration_select | amelioration_multiselect | select | text",
  "settingType": "PENSION_TYPE | DISABILITY_TYPE | GRADE_LEVEL | SOLO_PARENT_CATEGORY",
  "options": ["Option A", "Option B"],
  "filterIds": ["id1", "id2"]
}
```

| `type` | Description |
|--------|-------------|
| `amelioration_select` | Single dropdown loaded from `social_amelioration_settings` |
| `amelioration_multiselect` | Checkbox list loaded from `social_amelioration_settings` |
| `select` | Static dropdown — uses `options` array |
| `text` | Free-text input |

---

## Key Lookup Tables

| Table | Purpose |
|-------|---------|
| `social_amelioration_settings` | Lookup values for PENSION_TYPE, DISABILITY_TYPE, GRADE_LEVEL, SOLO_PARENT_CATEGORY |
| `classification_types` | Defines classification names, colors, and dynamic sub-field descriptors |
| `resident_classifications` | Per-resident type assignments + stored sub-field values (`classification_details`) |
| `senior_citizen_beneficiaries` | Program enrollment for senior citizens (with pension type pivots) |
| `pwd_beneficiaries` | Program enrollment for PWD (with disability_type_id, disability_level) |
| `student_beneficiaries` | Program enrollment for students (with grade_level_id) |
| `solo_parent_beneficiaries` | Program enrollment for solo parents (with category_id) |
