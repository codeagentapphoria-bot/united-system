# Citizen Registration & Management Refactoring

## Overview

This document outlines the plan for refactoring the citizen registration and management system to eliminate conflicts and clarify data ownership.

---

## Current State

### Two Confirmation Flows

| Feature | Registration Workflow (New) | Admin Citizens (Legacy) |
|---------|---------------------------|------------------------|
| **Purpose** | Self-registration via portal | Manual admin management |
| **Subscriber created?** | ✅ Yes + credentials | ❌ No |
| **residentId generated?** | ✅ Yes | ❌ No |
| **Credentials sent?** | ✅ Yes (email) | ❌ No |
| **Citizen list visibility** | Shows all (PENDING included) | Shows all |

### Document Storage

#### Citizen Table
| Field | Type | Notes |
|-------|------|-------|
| `proofOfIdentification` | String? | ID document URL |
| `idType` | String? | e.g., "PhilHealth", "Passport" |
| `proofOfResidency` | String? | **TO BE REMOVED** |
| `citizenPicture` | String? | Profile photo |

#### CitizenRegistrationRequest Table
| Field | Type | Notes |
|-------|------|-------|
| `idDocumentType` | String | e.g., "PhilHealth", "Passport" |
| `idDocumentNumber` | String | ID number |
| `idDocumentUrl` | String | Uploaded ID image URL |
| `selfieUrl` | String? | Selfie verification |

### Current Document Conflict

Both tables store similar ID information:
```
CitizenRegistrationRequest          Citizen Table
├── idDocumentType       ←───→      ├── idType
├── idDocumentUrl        ←───→      ├── proofOfIdentification
└── idDocumentNumber    (only here)

                              Citizen Table Only
                              ├── proofOfResidency     ← REMOVE
                              └── citizenPicture
```

---

## Decisions Made

- [ ] **Keep both flows?** - Registration Workflow + Admin Citizens
- [ ] **Admin Citizens list filter** - Exclude PENDING citizens linked to registration requests
- [ ] **Remove proofOfResidency** - Drop field from Citizen table

---

## Proposed Changes

### 1. Filter Admin Citizens List

**Goal:** Admin Citizens page should only show:
- Admin-created citizens
- Approved self-registered citizens (ACTIVE status)

**Exclude:**
- PENDING citizens linked to registration requests

**Implementation:**
```typescript
// In AdminCitizens.tsx or API
const citizens = await prisma.citizen.findMany({
  where: {
    // Exclude PENDING citizens that are linked to registration requests
    OR: [
      { residencyStatus: { not: 'PENDING' } },
      { citizenRegistrationRequest: null }  // Admin-created citizens
    ]
  }
});
```

### 2. Remove proofOfResidency Field

**Schema Change:**
```prisma
model Citizen {
  // Remove: proofOfResidency String?
  // Keep: proofOfIdentification String?
}
```

**Migration:**
- Remove `proofOfResidency` column from `citizens` table
- Update `AddCitizenModal` (remove residency upload field)

### 3. Document Storage Strategy

**Options:**

#### Option A: RegistrationRequest is Source of Truth
- Keep ALL document fields in `CitizenRegistrationRequest` only
- Drop `idType` and `proofOfIdentification` from `Citizen` table
- Citizen table stores only citizen info, not documents

#### Option B: Citizen is Source of Truth
- Keep `idType` and `proofOfIdentification` in `Citizen` table
- Drop `idDocumentType` and `idDocumentUrl` from `CitizenRegistrationRequest`
- RegistrationRequest stores only workflow status

#### Option C: Both Tables Store Documents (Current)
- Keep both for redundancy
- RegistrationRequest for audit trail
- Citizen for quick access
- **Downside:** Data duplication, potential conflicts

#### Option D: Hybrid Approach (Recommended)
- **RegistrationRequest:** Stores original uploaded documents (idDocumentUrl, selfieUrl)
- **Citizen:** Stores processed/reviewed documents (proofOfIdentification)
- Admin copies/confirms documents during approval
- Clear separation: uploaded vs. verified

**Decision Needed:** _______

---

## Implementation Plan

### Phase 1: Filter Admin Citizens List
- [ ] Update `getCitizens` API to filter PENDING citizens
- [ ] Update `AdminCitizens.tsx` to reflect new behavior
- [ ] Test that PENDING self-registered citizens don't appear

### Phase 2: Remove proofOfResidency
- [ ] Create Prisma migration to drop `proofOfResidency` column
- [ ] Update `AddCitizenModal` in AdminCitizens.tsx
- [ ] Update any types/interfaces

### Phase 3: Document Storage Decision
- [ ] Choose option A, B, or D
- [ ] Implement schema changes if needed
- [ ] Update registration flow
- [ ] Update admin review UI

### Phase 4: Cleanup
- [ ] Add document preview to RegistrationWorkflow detail modal
- [ ] Ensure consistent document handling across both flows
- [ ] Update any related documentation

---

## Open Questions

1. Should `AdminCitizens` approval flow also create Subscribers?
2. Should admin be able to manually add documents to approved citizens?
3. Do we need to keep a history of document changes (audit trail)?

---

## Files to Modify

### Backend
- `multysis-backend/prisma/schema.prisma`
- `multysis-backend/src/services/citizen.service.ts` (filter logic)
- `multysis-backend/prisma/migrations/` (new migration)

### Frontend
- `multysis-frontend/src/pages/admin/AdminCitizens.tsx`
- `multysis-frontend/src/pages/admin/AdminRegistrationWorkflow.tsx`
- `multysis-frontend/src/services/api/citizen-registration.service.ts`
- `multysis-frontend/src/services/api/citizen.service.ts`

---

## Notes

- RegistrationWorkflow creates: Citizen + RegistrationRequest + Subscriber (on approval)
- AdminCitizens creates: Citizen only (no Subscriber, no residentId)
- Both flows need to coexist for different use cases

