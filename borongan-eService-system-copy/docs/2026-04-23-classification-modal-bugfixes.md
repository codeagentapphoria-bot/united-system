# Classification Modal Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 bugs in multysis-frontend AdminRegistrationWorkflow.tsx that cause duplicate classification POSTs, missing pre-fill on fetch failure, and missing formId prop.

**Architecture:** Single-file surgical fixes in AdminRegistrationWorkflow.tsx. No architecture changes. No new dependencies.

**Tech Stack:** TypeScript, React, React Query.

---

## Files to Modify

- `multysis-frontend/src/pages/admin/AdminRegistrationWorkflow.tsx` (Tasks 1, 2)
- `multysis-frontend/src/services/api/citizen-registration.service.ts` (Task 4)

---

### Task 1: Fix duplicate POST — use newClassifications instead of data.classifications

**Modify:** `AdminRegistrationWorkflow.tsx` — `handleClassificationSave` function (lines 202-238)

The bug: `newClassifications` is computed to filter out auto-created types, but `data.classifications` (all items) is what gets saved. Every save POSTs duplicates.

Current problematic code (lines 207-217):
```typescript
await Promise.all(
  data.classifications.map((cls) =>   // BUG: saves ALL, not filtered
    classificationTypeService.insertClassification({
      residentId: classifyResident.id,
      classificationType: cls.type,
      classificationDetails: cls.details ?? undefined,
    })
  )
);
```

- [ ] **Step 1: Apply the fix**

Replace the Promise.all block (lines 209-216) with:

```typescript
// Filter out types already auto-created on approval to avoid duplicates
const autoCreatedTypes = new Set(
  (classifyResident.classifications ?? []).map(
    (c: { classification_type?: string; classification?: string }) =>
      c.classification_type || c.classification
  )
);
const newClassifications = data.classifications.filter(
  (cls) => !autoCreatedTypes.has(cls.type)
);

// Guard: if no new classifications to save, close modal and refresh
if (newClassifications.length === 0) {
  setIsClassifyModalOpen(false);
  setClassifyResident(null);
  fetchRequests();
  return;
}

await Promise.all(
  newClassifications.map((cls) =>
    classificationTypeService.insertClassification({
      residentId: classifyResident.id,
      classificationType: cls.type,
      classificationDetails: cls.details ?? undefined,
    })
  )
);
```

Also update the early-return guard at line 205. Current:
```typescript
if (!classifyResident) return;
```

Change to:
```typescript
if (!classifyResident) return;

// Guard: if no classifications selected at all, close modal and refresh
if (data.classifications.length === 0) {
  setIsClassifyModalOpen(false);
  setClassifyResident(null);
  fetchRequests();
  return;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit` in multysis-frontend
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/AdminRegistrationWorkflow.tsx
git commit -m "fix: prevent duplicate classification POSTs on approval save"
```

---

### Task 2: Add fallback to autoClassified when resident fetch fails after approval

**Modify:** `AdminRegistrationWorkflow.tsx` — `handleReviewSubmit` function (lines 142-198)

The bug: if `residentService.getResident()` fails after approval, the fallback uses `selectedRequest.resident` which has no `classifications` field — form opens empty instead of pre-checking auto-classified types.

Root cause: `reviewRegistration` response contains `autoClassified: string[]` (from backend), but multysis discards it (`void result;`).

Fix approach:
1. Store `lastApprovalResult` in state when approval succeeds
2. In the catch block, use `lastApprovalResult.autoClassified` to pre-populate

- [ ] **Step 1: Add lastApprovalResult state**

Find state declarations around line 59. Add:

```typescript
const [lastApprovalResult, setLastApprovalResult] = useState<any>(null);
```

- [ ] **Step 2: Store approval result on success**

At line 162, change `void result;` to:

```typescript
setLastApprovalResult(result);
```

In the catch block (around line 189), add:

```typescript
setLastApprovalResult(null);
```

- [ ] **Step 3: Update the catch block to use lastApprovalResult**

Replace the catch block inside the approval block (around lines 178-181):

Current:
```typescript
} catch (err) {
  logger.warn('Failed to fetch fresh resident for classification pre-fill', err);
  setClassifyResident(selectedRequest.resident as unknown as ResidentInfo);
}
```

Change to:
```typescript
} catch (err) {
  logger.warn('Failed to fetch fresh resident for classification pre-fill', err);
  if (lastApprovalResult?.autoClassified && lastApprovalResult.autoClassified.length > 0) {
    setClassifyResident({
      ...selectedRequest.resident,
      classifications: lastApprovalResult.autoClassified.map((type: string) => ({
        classification_type: type,
      })),
    } as unknown as ResidentInfo);
  } else {
    setClassifyResident(selectedRequest.resident as unknown as ResidentInfo);
  }
}
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit` in multysis-frontend
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/AdminRegistrationWorkflow.tsx
git commit -m "fix: add autoClassified fallback when resident fetch fails after approval"
```

---

### Task 3: Pass formId to ResidentClassificationsForm

**Status:** Already present at line 738. No change needed. Skipping.

---

### Task 4: Add autoClassified to RegistrationRequestResponse type

**Modify:** `multysis-frontend/src/services/api/citizen-registration.service.ts`

- [ ] **Step 1: Add autoClassified field to type**

Find `RegistrationRequestResponse` interface. Add `autoClassified?: string[]` field.

```typescript
export interface RegistrationRequestResponse {
  id: string;
  citizen: ResidentInfo;
  status: string;
  // ... existing fields
  autoClassified?: string[];  // ADD THIS
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit` in multysis-frontend
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/api/citizen-registration.service.ts
git commit -m "fix: add autoClassified field to RegistrationRequestResponse type"
```

---

## Self-Review

1. **Spec coverage:** All 3 bugs addressed. Task 3 is N/A (already fixed).
2. **Placeholder scan:** No TBD/TODO. All code shown inline.
3. **Type consistency:** `classifyResident` typed as `ResidentInfo`, `autoClassified` as `string[]`, `classification_type` matches existing schema.

## Final Verification

After all tasks complete:
```bash
cd multysis-frontend && npm run build 2>&1 | Select-String "error"
```
Expected: No errors.
