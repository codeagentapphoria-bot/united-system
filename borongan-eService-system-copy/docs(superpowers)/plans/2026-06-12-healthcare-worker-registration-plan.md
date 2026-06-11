# Healthcare Worker Registration — Implementation Plan

**Date:** 2026-06-12
**Based on:** `2026-06-12-healthcare-worker-registration-design.md`
**Status:** Ready for Implementation

---

## Overview

This plan implements the Healthcare Worker self-identification feature in the resident registration wizard and admin management interface. The pattern follows existing amelioration types (PWD, Solo Parent).

**Files to modify (11):**
1. `united-database/migrations/38_add_healthcare_worker_classification_type.sql` (NEW)
2. `multysis-frontend/src/pages/portal/ResidentRegister.tsx`
3. `multysis-backend/src/services/portal-registration.service.ts`
4. `multysis-backend/src/services/classification.service.ts`
5. `multysis-frontend/src/components/social-amelioration/HealthcareWorkersTab.tsx` (NEW)
6. `multysis-frontend/src/components/social-amelioration/forms/AddHealthcareWorkerFields.tsx` (NEW)
7. `multysis-frontend/src/components/social-amelioration/forms/EditHealthcareWorkerFields.tsx` (NEW)
8. `multysis-frontend/src/components/modals/social-amelioration/EditHealthcareWorkerModal.tsx` (NEW)
9. `multysis-frontend/src/components/social-amelioration/index.ts`
10. `multysis-frontend/src/pages/admin/SocialAmelioration.tsx`

---

## Task A: Database Migration — Add Healthcare Worker Classification Type

### A1. Create Migration File

**File:** `united-database/migrations/38_add_healthcare_worker_classification_type.sql`

**Change:** Add Healthcare Worker to classification_types:

```sql
-- Add Healthcare Worker classification type for all municipalities
INSERT INTO classification_types (municipality_id, name, description, color, details)
SELECT
  m.id,
  'Healthcare Worker',
  'Individuals working in healthcare facilities (hospitals, clinics, RHUs)',
  '#14B8A6',
  '[{"key":"occupation","label":"Occupation","type":"text"},{"key":"workplace","label":"Workplace / Facility","type":"text"},{"key":"remarks","label":"Remarks","type":"text"}]'
FROM municipalities m
ON CONFLICT (municipality_id, name) DO NOTHING;
```

**Done when:** Migration runs successfully, Healthcare Worker appears in classification_types

---

### A2. Verify Seed.sql (Optional)

**File:** `united-database/seed_bims.sql`

**Change:** Verify Healthcare Worker is NOT already present. If not in migration, add to seed:

```sql
-- After line 47 in seed_bims.sql, add:
('Healthcare Worker',  'Individuals working in healthcare facilities','#14B8A6', '[{"key":"occupation","label":"Occupation","type":"text"},{"key":"workplace","label":"Workplace / Facility","type":"text"},{"key":"remarks","label":"Remarks","type":"text"}]'),
```

**Done when:** Healthcare Worker exists in database after migration/seed

---

## Task 1: Frontend — ResidentRegister.tsx

### 1a. Add Schema Field

**File:** `multysis-frontend/src/pages/portal/ResidentRegister.tsx`
**Location:** Around line 113 (after `hasChildren`)

**Change:** Add `hasHealthcareWorker` boolean field to `step1Schema`:

```typescript
// In step1Schema, add after hasChildren (around line 113):
hasHealthcareWorker: z.boolean().optional(),
```

**Done when:** Schema accepts `hasHealthcareWorker: true/false/undefined`

---

### 1b. Add Watched Variable

**File:** `ResidentRegister.tsx`
**Location:** Around line 372 (after `watchedHasChildren`)

**Change:** Add watched variable for the checkbox:

```typescript
// Add after watchedHasChildren (around line 372):
const watchedHasHealthcareWorker = step1Form.watch('hasHealthcareWorker');
```

**Done when:** `watchedHasHealthcareWorker` reflects checkbox state

---

### 1c. Add Checkbox in Additional Status Section

**File:** `ResidentRegister.tsx`
**Location:** After `hasChildren` checkbox (around line 1169)

**Change:** Insert Healthcare Worker checkbox before the closing `</div>`:

```typescript
// Insert after hasChildren checkbox (after line 1169, before </div>):
<FormField
  control={step1Form.control}
  name="hasHealthcareWorker"
  render={({ field }) => (
    <label
      htmlFor="hasHealthcareWorker"
      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer"
    >
      <FormControl>
        <Checkbox
          id="hasHealthcareWorker"
          checked={!!field.value}
          onCheckedChange={field.onChange}
          className="mt-0.5"
        />
      </FormControl>
      <div>
        <FormLabel className="cursor-pointer font-normal">Healthcare Worker</FormLabel>
        <FormDescription>
          Check if you work in a hospital, clinic, or other healthcare facility. Enables access to Libre Sakay and other healthcare worker benefits.
        </FormDescription>
      </div>
    </label>
  )}
/>
```

**Done when:** Checkbox renders with label and description

---

### 1d. Add Conditional Card for HW Details

**File:** `ResidentRegister.tsx`
**Location:** After Solo Parent card (around line 1453)

**Change:** Insert Healthcare Worker details card:

```typescript
// After Solo Parent card (after line 1453):
{watchedHasHealthcareWorker && (
  <Card className="border-teal-200 bg-teal-50">
    <CardHeader className="pb-4">
      <CardTitle className="text-lg text-teal-800">Healthcare Worker Information</CardTitle>
      <p className="text-sm text-teal-700">
        Please provide your occupation and workplace to help process your benefits.
      </p>
    </CardHeader>
    <CardContent className="space-y-4">
      <FormField
        control={step1Form.control}
        name="healthcareWorkerOccupation"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Occupation</FormLabel>
            <FormControl>
              <Input {...field} placeholder="e.g., Nurse, Doctor, Midwife, Medical Technologist" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={step1Form.control}
        name="healthcareWorkerWorkplace"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Workplace / Facility</FormLabel>
            <FormControl>
              <Input {...field} placeholder="e.g., Borongan District Hospital, Rural Health Unit" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </CardContent>
  </Card>
)}
```

**Done when:** Card appears when checkbox is checked, fields accept text input

---

### 1e. Add Schema Fields for Sub-fields

**File:** `ResidentRegister.tsx`
**Location:** Around line 121 (after `soloParentCategoryId`)

**Change:** Add sub-field schemas:

```typescript
// After soloParentCategoryId (around line 121):
healthcareWorkerOccupation: z.string().max(200).optional().or(z.literal('')),
healthcareWorkerWorkplace: z.string().max(200).optional().or(z.literal('')),
```

**Done when:** Form validates the sub-fields

---

### 1f. Update handleStep1 to Build ameliorationData

**File:** `ResidentRegister.tsx`
**Location:** Around line 492 (after `voter` block)

**Change:** Add Healthcare Worker to ameliorationData building:

```typescript
// After voter block (around line 492):
if (data.hasHealthcareWorker && data.healthcareWorkerOccupation) {
  ameliorationData.healthcareWorker = {
    occupation: data.healthcareWorkerOccupation,
    workplace: data.healthcareWorkerWorkplace || undefined,
  };
}
```

**Done when:** `ameliorationData.healthcareWorker` is included in POST payload

---

## Task 2: Backend — portal-registration.service.ts

### 2a. Update ameliorationData Type

**File:** `multysis-backend/src/services/portal-registration.service.ts`
**Location:** Around line 79-85 (ameliorationData interface)

**Change:** Add healthcareWorker to type:

```typescript
// In ResidentRegistrationData.ameliorationData (around line 84):
healthcareWorker?: { occupation?: string; workplace?: string };
```

**Done when:** TypeScript accepts healthcareWorker in ameliorationData

---

### 2b. Add autoClassifyResident Block

**File:** `portal-registration.service.ts`
**Location:** After Solo Parent block (around line 581)

**Change:** Add Healthcare Worker classification block:

```typescript
// After Solo Parent block (after line 581):
// Social amelioration: Healthcare Worker
if (ameliorationData?.healthcareWorker) {
  toInsert.push({
    type: 'Healthcare Worker',
    details: {
      occupation: ameliorationData.healthcareWorker.occupation || '',
      workplace: ameliorationData.healthcareWorker.workplace || '',
      remarks: '',
    },
  });
}
```

**Done when:** Classification inserts `Healthcare Worker` type on approval

---

### 2c. Update autoClassifyResident Parameter Type

**File:** `portal-registration.service.ts`
**Location:** Around line 487-493 (function parameter)

**Change:** Add healthcareWorker to parameter type:

```typescript
// In autoClassifyResident parameter (around line 492):
healthcareWorker?: { occupation?: string; workplace?: string };
```

**Done when:** Function accepts healthcareWorker in ameliorationData

---

## Task 3: Backend — classification.service.ts

### 3a. Add normalizeDetails Case

**File:** `multysis-backend/src/services/classification.service.ts`
**Location:** Around line 181 (after Solo Parent case, before Senior Citizen case)

**Change:** Add Healthcare Worker normalization:

```typescript
// After Solo Parent case (around line 181):
case 'Healthcare Worker':
  return {
    occupation: (details.occupation as string) ?? null,
    workplace: (details.workplace as string) ?? null,
    remarks:  (details.remarks  as string) ?? null,
  };
```

**Done when:** normalizeDetails returns occupation/workplace/remarks for Healthcare Worker

---

## Task B: HealthcareWorkersTab.tsx

### B1. Create HealthcareWorkersTab Component

**File:** `multysis-frontend/src/components/social-amelioration/HealthcareWorkersTab.tsx`

**Reference:** Use `PWDTab.tsx` as template

**Structure:**
- Import `HealthcareWorkerBeneficiary` type (or use `any`)
- Table/query for `healthcareWorkerBeneficiaries` from API
- Modal for Add/Edit (AddHealthcareWorkerModal, EditHealthcareWorkerModal)
- Status badge: ACTIVE/PENDING/INACTIVE
- Display fields: name, healthcareWorkerId, status, createdAt
- Search by name
- Link to government programs (use existing program link pattern)

**Key differences from PWDTab:**
- Replace PWD-specific fields (disabilityType, disabilityLevel) with Healthcare Worker fields (occupation, workplace)
- Replace `pwdId` with `healthcareWorkerId`
- Use teal color scheme instead of pink

**Done when:** Component renders, shows table, supports add/edit/delete

---

## Task C: AddHealthcareWorkerFields.tsx

### C1. Create AddHealthcareWorkerFields Component

**File:** `multysis-frontend/src/components/social-amelioration/forms/AddHealthcareWorkerFields.tsx`

**Reference:** Use `AddPWDFields.tsx` as template (or similar pattern)

**Fields:**
- occupation (text input, required)
- workplace (text input, optional)
- remarks (textarea, optional)

**Done when:** Form renders all fields with proper validation

---

## Task D: EditHealthcareWorkerFields.tsx

### D1. Create EditHealthcareWorkerFields Component

**File:** `multysis-frontend/src/components/social-amelioration/forms/EditHealthcareWorkerFields.tsx`

**Reference:** Use `EditPWDFields.tsx` as template

**Fields:**
- occupation (text input)
- workplace (text input)
- remarks (textarea)
- CitizenDisplayCard at top (read-only)

**Done when:** Form renders with citizen selection and edit fields

---

## Task E: EditHealthcareWorkerModal.tsx

### E1. Create EditHealthcareWorkerModal Component

**File:** `multysis-frontend/src/components/modals/social-amelioration/EditHealthcareWorkerModal.tsx`

**Reference:** Use `EditPWDModal.tsx` or `EditSoloParentModal.tsx` as template

**Structure:**
- Dialog wrapper
- EditHealthcareWorkerFields inside
- Form submission handler
- API call to update beneficiary

**Note:** Does NOT exist - create from scratch using existing modal patterns

**Done when:** Modal opens, submits updates successfully

---

### E2. (Optional) AddHealthcareWorkerModal.tsx

If Add modal is needed:

**File:** `multysis-frontend/src/components/modals/social-amelioration/AddHealthcareWorkerModal.tsx`

**Reference:** Use `AddPWDModal.tsx` as template

**Done when:** Can add new Healthcare Worker beneficiaries

---

## Task F: Update social-amelioration/index.ts

### F1. Add Export

**File:** `multysis-frontend/src/components/social-amelioration/index.ts`

**Change:** Add export for HealthcareWorkersTab:

```typescript
export { HealthcareWorkersTab } from './HealthcareWorkersTab';
```

**Done when:** Export is available to parent components

---

## Task G: Update SocialAmelioration.tsx

### G1. Add Import

**File:** `multysis-frontend/src/pages/admin/SocialAmelioration.tsx`
**Location:** Around line 12-19 (imports)

**Change:** Add import for HealthcareWorkersTab:

```typescript
import {
  DashboardTab,
  HealthcareWorkersTab,
  PWDTab,
  SeniorCitizenTab,
  SettingsTab,
  SoloParentsTab,
  StudentsTab,
} from '@/components/social-amelioration';
```

**Done when:** Import compiles without error

---

### G2. Add TabsTrigger

**File:** `SocialAmelioration.tsx`
**Location:** After `solo-parents` TabsTrigger (around line 95)

**Change:** Add Healthcare Worker tab trigger:

```typescript
<TabsTrigger
  value="healthcare-workers"
  className={cn(
    'flex items-center gap-2 px-3 sm:px-6 py-4 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:border-b-2 data-[state=active]:border-primary-600'
  )}
>
  <FiUserCheck size={18} />
  <span className="hidden sm:inline">Healthcare Workers</span>
</TabsTrigger>
```

**Done when:** Tab appears in tab list

---

### G3. Add TabsContent

**File:** `SocialAmelioration.tsx`
**Location:** After `solo-parents` TabsContent (around line 128)

**Change:** Add Healthcare Worker tab content:

```typescript
<TabsContent value="healthcare-workers" className={cn('mt-0')} forceMount hidden={activeTab !== 'healthcare-workers'}>
  <HealthcareWorkersTab />
</TabsContent>
```

**Done when:** Tab content renders when tab is selected

---

## Verification Checklist

Run these checks after implementation:

| # | Check | Command |
|---|-------|---------|
| 1 | Frontend compiles | `cd multysis-frontend && npm run build` |
| 2 | Backend compiles | `cd multysis-backend && npm run build` |
| 3 | TypeScript strict | `npm run typecheck` (backend) |
| 4 | Migration runs | `psql -f 38_add_healthcare_worker_classification_type.sql` |
| 5 | Checkbox renders | Navigate to /portal/register, step 1 |
| 6 | Fields show when checked | Toggle checkbox, card appears |
| 7 | Submission includes HW data | Check network request payload |
| 8 | Approval creates classification | BIMS approve, check resident_classifications |
| 9 | Beneficiary record created | Check healthcare_worker_beneficiaries table |
| 10 | Admin tab shows | Navigate to /admin/city-population/social-amelioration?tab=healthcare-workers |
| 11 | Table loads | Healthcare Workers tab shows list |
| 12 | Add/edit works | Test adding a Healthcare Worker |

---

## Dependencies

| Task | Dependencies |
|------|---------------|
| Task A | None (database migration) |
| Task 1 | None (frontend - can start first) |
| Task 2 | Depends on Task 1 (payload structure) |
| Task 3 | Can be implemented independently |
| Task B | Depends on Task A (classification type exists) |
| Task C | None (form fields component) |
| Task D | Depends on Task C (uses AddHealthcareWorkerFields pattern) |
| Task E | Depends on Task D (modal wrapper) |
| Task F | Depends on Task B (export needs component) |
| Task G | Depends on Task F (import needs export) |

**Recommended order:**
1. Task A (database) — enables everything else
2. Task 1, 2, 3 (registration wizard flow) — existing plan
3. Task B (HealthcareWorkersTab) — admin management
4. Task C, D, E (forms and modals) — supporting components
5. Task F, G (integration) — wire everything together

---

## Notes

- The `syncBeneficiaryOnInsert()` in classification.service.ts already handles Healthcare Worker (BENEFICIARY_SYNC_MAP entry at line 142) — but Task 3 adds the normalizeDetails case
- Schema already supports healthcare_worker_beneficiaries table — no new table needed
- Empty occupation/workplace fields should NOT block submission (optional fields, like PWD)
- Use teal color scheme (#14B8A6) for Healthcare Worker UI elements
- Labels use user-friendly language, not technical jargon
- Icon for tab: FiUserCheck or FiHeart (same as PWD/Solo Parent)

---

(End of file)