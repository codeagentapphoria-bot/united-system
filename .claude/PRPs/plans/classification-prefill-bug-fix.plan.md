# Plan: Fix Classification Prefill Bug in ResidentClassificationsForm

## Summary
After admin approves a registration, the classification dialog's BIMS detail fields (e.g., "Course" for "College Student") appear empty despite `ameliorationData` having been submitted. The bug is a race condition in `ResidentClassificationsForm.tsx` where the form's `useEffect` populates itself from `resident.classifications` before `localClassificationOptions` has loaded from the API, causing `normalizeClassificationValue` to return raw values (e.g., `"College Student"`) instead of normalized option keys (e.g., `"College_Student"`). The form stores detail values under the wrong key, so when detail inputs render they find no data.

## User Story
As an admin, after I approve a resident registration with social amelioration data (e.g., College Student + Computer Science), I want the classification dialog to pre-fill the BIMS detail fields correctly, so I don't have to re-enter information the resident already provided.

## Problem → Solution
**Current**: `useEffect` fires when `resident` loads with `classifications`, but `localClassificationOptions` is still `[]` → `normalizeClassificationValue` returns raw value → `form.reset` stores details under wrong key → detail inputs read `undefined`.
**Fixed**: `useEffect` guards against empty `localClassificationOptions` — early returns if options aren't ready, so `form.reset` only fires with both data AND options available. Second effect (options loading) triggers correct normalization.

## Metadata
- **Complexity**: Small
- **Source PRD**: N/A
- **PRD Phase**: N/A (standalone bug fix)
- **Estimated Files**: 1 (`ResidentClassificationsForm.tsx`)
- **No database changes**: This fix is purely frontend state/logic — no migrations needed

---

## UX Design

### Before (bug)
```
Admin clicks "Approve" → Approval succeeds
  → getResident() returns freshResident with classifications
  → Classification dialog opens
  → ALL detail fields are EMPTY (e.g., "Course" field for "College Student")
  → Admin must re-type: "Computer Science"
```

### After (fixed)
```
Admin clicks "Approve" → Approval succeeds
  → getResident() returns freshResident with classifications
  → Classification dialog opens
  → Detail fields PRE-FILLED correctly: "Course" = "Computer Science"
  → Admin can adjust or confirm
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Classification dialog on approval | Empty detail fields | Pre-filled detail fields | Fixed bug |

---

## Root Cause (confirmed)

In `ResidentClassificationsForm.tsx`:

```
Time 0: component mounts, localClassificationOptions = []
Time 1: resident prop arrives WITH classifications from getResident()
Time 1: useEffect fires (dep changed: resident)
Time 1: localClassificationOptions is STILL [] (useClassificationTypes not done)
Time 1: normalizeClassificationValue("College Student", []) → "College Student" (no match)
Time 1: form.reset({ classifications: ["College Student"], classificationDetails: { "College Student": { courseField: "Computer Science" } } })
Time 1: Form renders — checkboxes for key "College Student" (non-normalized) vs option key "College_Student" → checkbox NOT checked
Time 1: Detail inputs NOT rendered (selectedClassifications=["College Student"] but checkboxes use normalized key)
Time 2: useClassificationTypes resolves → localClassificationOptions populated
Time 2: useEffect fires AGAIN (dep changed: localClassificationOptions) — NOW options exist
Time 2: normalizeClassificationValue("College Student", [...]) → "College_Student" (match found!)
Time 2: form.reset({ classifications: ["College_Student"], classificationDetails: { "College_Student": { courseField: "Computer Science" } } })
Time 2: BUT: selectedClassifications already computed as ["College Student"] from form.watch() BEFORE this reset
Time 2: Checkbox still shows "College Student" checked? NO — key mismatch
Time 2: Detail inputs render but classificationDetails["College_Student"] is UNDEFINED → EMPTY FIELD
```

The bug is that when the second `form.reset` fires, the `selectedClassifications` variable (computed from `form.watch()` BEFORE the reset takes effect) still holds the non-normalized `["College Student"]`, so the detail inputs either don't render or read from the wrong key.

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 (critical) | `ResidentClassificationsForm.tsx` | 158-204 | The buggy useEffect and its dependencies |
| P0 (critical) | `ResidentClassificationsForm.tsx` | 100-160 | Form initialization and options loading |
| P1 (important) | `AdminRegistrationWorkflow.tsx` | 165-200 | Where classifyResident is set after approval |
| P1 (important) | `useClassificationTypes.ts` | all | Where localClassificationOptions comes from |

---

## Patterns to Mirror

### FORM_RESET_IN_EFFECT (from ResidentClassificationsForm.tsx:199-202)
// SOURCE: ResidentClassificationsForm.tsx:199-202
```typescript
form.reset({
  classifications: currentClassifications,
  classificationDetails: classificationDetails,
});
```

### NORMALIZE_CLASSIFICATION_VALUE (from ResidentClassificationsForm.tsx:150-157)
// SOURCE: ResidentClassificationsForm.tsx:150-157
```typescript
const normalizeClassificationValue = (value: string, options: ClassificationTypeOption[]): string => {
  if (!value) return '';
  const normalizedValue = value.toLowerCase();
  const matchingOption = options.find(
    (opt) => opt.key.toLowerCase() === normalizedValue || opt.label.toLowerCase() === normalizedValue
  );
  return matchingOption ? matchingOption.key : value;
};
```

### USE_CLASSIFICATION_TYPES_HOOK (from ResidentClassificationsForm.tsx:117)
// SOURCE: ResidentClassificationsForm.tsx:117
```typescript
const { classificationTypes, loading: typesLoading } = useClassificationTypes(municipalityId);
```

### FORM_WATCH_READ (from ResidentClassificationsForm.tsx:226, 249)
// SOURCE: ResidentClassificationsForm.tsx:226, 249
```typescript
const currentClassifications = form.watch('classifications') ?? [];
const currentValue = currentDetails[classification]?.[detail.key];
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `multysis-frontend/src/components/ui/ResidentClassificationsForm.tsx` | UPDATE | Fix race condition in useEffect (lines 159-204) |

---

## NOT Building

- Any backend changes (no migrations, no API changes)
- Any changes to `autoClassifyResident` or `reviewRegistration`
- Any changes to `useClassificationTypes` or `useAmeliorationSettings` hooks
- Any new test files (none exist for this component currently)
- Changes to the admin registration workflow component

---

## Step-by-Step Tasks

### Task 1: Fix the Race Condition in `ResidentClassificationsForm.tsx`

- **ACTION**: Modify the `useEffect` at lines 159-204 to early-return when `localClassificationOptions` is empty
- **IMPLEMENT**: Add a guard immediately after the first `if` check:
  ```typescript
  useEffect(() => {
    if (!resident || !resident.classifications || resident.classifications.length === 0) return;

    // GUARD: Don't populate form until options have loaded from API
    // Without this, normalizeClassificationValue returns raw values (no match),
    // form.reset stores details under wrong keys, and detail inputs appear empty
    if (localClassificationOptions.length === 0) return;

    const currentClassifications = (resident.classifications as Array<{ classification_type?: string; classification?: string }>).map((c) => {
      const classificationValue = c.classification_type || c.classification || (c as unknown as string);
      return normalizeClassificationValue(classificationValue, localClassificationOptions);
    });

    // Extract classification details (same as existing code, no changes below this line)
    const classificationDetails: Record<string, Record<string, unknown>> = {};
    (resident.classifications as Array<{ classification_type?: string; classification?: string; classification_details?: string | Record<string, unknown> }>).forEach((c) => {
      const classificationKey = c.classification_type || c.classification || (c as unknown as string);
      const normalizedKey = normalizeClassificationValue(classificationKey, localClassificationOptions);

      if (c.classification_details) {
        if (typeof c.classification_details === 'string') {
          const detailsArray = c.classification_details.split('|').map((s) => s.trim());
          const option = localClassificationOptions.find((opt) => opt.key === normalizedKey);
          if (option?.details) {
            option.details.forEach((detail, index) => {
              if (detailsArray[index]) {
                if (!classificationDetails[normalizedKey]) {
                  classificationDetails[normalizedKey] = {};
                }
                classificationDetails[normalizedKey][detail.key] = detailsArray[index];
              }
            });
          }
        } else if (typeof c.classification_details === 'object') {
          if (!classificationDetails[normalizedKey]) {
            classificationDetails[normalizedKey] = {};
          }
          Object.assign(classificationDetails[normalizedKey], c.classification_details);
        }
      }
    });

    form.reset({
      classifications: currentClassifications,
      classificationDetails: classificationDetails,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resident, localClassificationOptions]);
  ```
- **MIRROR**: Uses same `form.reset({ classifications, classificationDetails })` pattern as existing code (line 199-202), same `normalizeClassificationValue` call (line 165)
- **IMPORTS**: No new imports needed — all used types already imported
- **GOTCHA**: The `eslint-disable-next-line react-hooks/exhaustive-deps` comment already exists on line 203. The `localClassificationOptions` dep is intentionally omitted from the eslint rule because we WANT the effect to fire when either `resident` OR `localClassificationOptions` changes — this is the correct behavior.
- **VALIDATE**:
  1. Run `npx tsc --noEmit` in `multysis-frontend` — expect zero type errors
  2. Read the modified useEffect and confirm: (a) guard `if (localClassificationOptions.length === 0) return;` is present, (b) existing detail extraction logic unchanged, (c) `form.reset` unchanged

---

## Testing Strategy

### No new tests (scope limitation)
There are currently **no test files** for `ResidentClassificationsForm.tsx`. Adding tests would require setting up a test harness with mocked `useClassificationTypes` and `useForm` which is out of scope for this fix.

### Manual Validation
1. Start backend + frontend dev servers
2. Register a new resident with: Classification = "College Student", Course = "Computer Science"
3. Log in as BIMS admin
4. Go to Registrations section, find the pending request
5. Click "Approve"
6. Verify the classification dialog opens and the "Course" field shows **"Computer Science"** (not empty)
7. Repeat with "Senior Citizen" + pension type
8. Repeat with "Solo Parent" + category

### Regression Checklist
- [ ] Registration approval still works end-to-end
- [ ] Classification dialog opens after approval
- [ ] Existing checkboxes still pre-check correctly (voters, employed, etc.)
- [ ] Detail fields save correctly when admin edits and submits
- [ ] "Skip" button still works (closes dialog without saving)

---

## Validation Commands

### Static Analysis
```bash
cd borongan-eService-system-copy/multysis-frontend
npx tsc --noEmit 2>&1 | head -30
```
EXPECT: Zero TypeScript errors in the modified file

### Build
```bash
cd borongan-eService-system-copy/multysis-frontend
npm run build 2>&1 | tail -20
```
EXPECT: Build completes without errors

---

## Acceptance Criteria
- [ ] `if (localClassificationOptions.length === 0) return;` guard added to the useEffect at line 160
- [ ] No other logic changes in the useEffect body
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` completes without errors
- [ ] Manual test: College Student detail field pre-fills correctly after approval
- [ ] No database migrations needed (frontend-only change)

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Fix doesn't fully resolve blank fields | Low | Medium | If blank fields persist, the issue may be in `form.watch()` reactivity — second layer of defense is ensuring `handleClassificationSave` sends correct normalized keys regardless |
| Existing behavior regresses (checkboxes not pre-checking) | Low | High | The fix only adds an early return guard when options are empty — it cannot break the case where options ARE loaded |
| TypeScript error if `localClassificationOptions` type doesn't have `.length` | Very Low | Medium | `localClassificationOptions` is explicitly typed as `ClassificationTypeOption[]` which has `.length` |

---

## Notes

### Why not also fix the fallback data issue?
If `getResident` fails after approval (line 180 of AdminRegistrationWorkflow.tsx), the code falls back to `selectedRequest.resident` which has **no classifications at all** (classifications are created on the backend during approval). This is a separate issue — the user opted for Option A (fix race condition only, defer fallback issue).

### The eslint-disable is intentional
Line 203 has `// eslint-disable-next-line react-hooks/exhaustive-deps` because the effect MUST fire when EITHER `resident` OR `localClassificationOptions` changes. Adding both to the dep array would be correct (no need for the eslint disable), but that's a separate refactor — the guard fix is sufficient.

### No database migration
**This fix requires NO database migration.** It is purely a frontend React state/logic fix in one useEffect hook.
