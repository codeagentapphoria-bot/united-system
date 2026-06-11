# Healthcare Worker in Registration Wizard — Design Spec
**Date:** 2026-06-12
**Status:** Approved

---

## 1. Goal

Allow residents to self-identify as Healthcare Workers during the 4-step registration wizard. On BIMS admin approval, the classification triggers creation of a `healthcare_worker_beneficiaries` record, enabling Libre Sakay eligibility.

---

## 2. Pattern

Same as PWD (`hasDisability` checkbox + fields) and Solo Parent. Checkbox triggers conditional fields, values stored in `ameliorationData`, processed by `autoClassifyResident()` on approval.

---

## 3. Changes

### 3a. Frontend — `ResidentRegister.tsx` (Step 1)

**Location:** Employment section in Step 1 of the 4-step wizard.

**Add:**
- `hasHealthcareWorker` checkbox — "I am a Healthcare Worker"
- When checked, show: `healthcareWorkerOccupation` (text, "Occupation") + `healthcareWorkerWorkplace` (text, "Workplace / Facility")
- Store in `ameliorationData.healthcareWorker`:
  ```typescript
  ameliorationData: {
    // ... existing fields
    healthcareWorker?: {
      occupation?: string;
      workplace?: string;
    };
  }
  ```
- Add types to `ameliorationData` interface in the component

**Style:** Match existing conditional field patterns (PWD, Solo Parent). Labels and placeholders should be user-friendly (not technical jargon).

### 3b. Backend — `portal-registration.service.ts`

**File:** `multysis-backend/src/services/portal-registration.service.ts`

**1. Update `ameliorationData` type signature** (around line 487):
```typescript
ameliorationData?: {
  seniorCitizen?: { pensionTypes?: string[] };
  pwd?: { disabilityType?: string; disabilityLevel?: string };
  student?: { gradeLevel?: string; courseField?: string; ncLevel?: string };
  soloParent?: { category?: string };
  voter?: { voterType?: string };
  healthcareWorker?: { occupation?: string; workplace?: string }; // NEW
}
```

**2. Add Healthcare Worker block in `autoClassifyResident()`** (after Solo Parent block, around line 581):
```typescript
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

### 3c. Backend — `classification.service.ts`

**File:** `multysis-backend/src/services/classification.service.ts`

**Add case to `normalizeDetails()`** (after Solo Parent case, around line 180):
```typescript
case 'Healthcare Worker':
  return {
    occupation: (details.occupation as string) ?? null,
    workplace: (details.workplace as string) ?? null,
    remarks: (details.remarks as string) ?? null,
  };
```

### 3d. Existing Integration (Already Done)

`syncBeneficiaryOnInsert()` in `classification.service.ts` already handles `Healthcare Worker`:
- BENEFICIARY_SYNC_MAP entry ✅
- generateBeneficiaryId UNION ✅
- 3 switch cases (check/reactivate/create) ✅

No changes needed there.

---

## 4. Data Flow

```
ResidentRegister.tsx (checkbox checked)
  → ameliorationData.healthcareWorker = { occupation, workplace }
  → POST /api/portal-registration/submit
    → registrationRequest.ameliorationData JSON stored

BIMS admin approves registration
  → reviewRegistrationRequest() calls autoClassifyResident()
    → toInsert.push({ type: 'Healthcare Worker', details: { occupation, workplace, remarks } })
    → INSERT resident_classifications (classification_type='Healthcare Worker')
    → syncBeneficiaryOnInsert() called
      → HealthcareWorkerBeneficiary.create({ residentId, healthcareWorkerId, status })
      → Socket emit → dashboard updates
```

---

## 5. Files to Change

| File | Change |
|---|---|
| `multysis-frontend/src/pages/portal/ResidentRegister.tsx` | Add HW checkbox + fields, update interface |
| `multysis-backend/src/services/portal-registration.service.ts` | Update type, add autoClassify block |
| `multysis-backend/src/services/classification.service.ts` | Add normalizeDetails case |

---

## 6. Testing Checklist

- [ ] Checkbox appears and toggles occupation/workplace fields
- [ ] Empty fields do not block submission (optional)
- [ ] On approval: `resident_classifications` row created with correct details JSON
- [ ] On approval: `healthcare_worker_beneficiaries` record created (HW-YYYY-####)
- [ ] Dashboard beneficiary count increments
- [ ] Resident login response includes `healthcareWorker` field
