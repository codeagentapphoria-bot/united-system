# Libre Sakay — Program Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Program Settings" section inside Libre Sakay admin so Libre Sakay admins can edit the `GovernmentProgram` record (`gp-all-libre-sakay`) — name, description, eligibility types, requirements, and active/inactive status — without accessing the generic Government Programs admin page.

**Architecture:** A new `ProgramSettingsSection` component in `libre-sakay/` backed by two new backend endpoints (`GET /api/libre-sakay/program-settings` and `PATCH /api/libre-sakay/program-settings`). The E-Services Prisma client queries the `GovernmentProgram` table directly, hardcoding `gp-all-libre-sakay` as the program ID. The frontend reuses the existing `governmentProgramSchema` validation and requirement-list rendering from `EditGovernmentProgramModal` with a simple read/edit toggle.

**Tech Stack:** React + TypeScript (frontend), Express + Prisma (backend), Zod validation, React Hook Form, shadcn/ui components.

---

## File Map

### Backend (create / modify)
- `multysis-backend/src/routes/libre-sakay.routes.ts` — add two new routes
- `multysis-backend/src/controllers/libre-sakay.controller.ts` — add two new controller functions

### Frontend (create / modify)
- `multysis-frontend/src/services/api/libre-sakay.service.ts` — add `getProgramSettings()` and `updateProgramSettings()` methods
- `multysis-frontend/src/pages/admin/libre-sakay/ProgramSettingsSection.tsx` — **create** — new section component
- `multysis-frontend/src/pages/admin/libre-sakay/index.ts` — export the new section
- `multysis-frontend/src/pages/admin/libre-sakay/shared.tsx` — add `'settings': 'Program Settings'` to `SECTION_TITLES`
- `multysis-frontend/src/config/libre-sakay-menu.tsx` — add menu item `{ path: '/admin/libre-sakay/settings', label: 'Program Settings', icon: <FiSettings /> }`
- `multysis-frontend/src/components/layout/Sidebar.tsx` — add `'/admin/libre-sakay/settings'` to `implementedRoutes`
- `multysis-frontend/src/pages/admin/AdminLibreSakay.tsx` — import `ProgramSettingsSection`, add `case 'settings': return <ProgramSettingsSection />`

---

## Backend Tasks

### Task 1: Add program settings controller functions

**Files:**
- Modify: `multysis-backend/src/controllers/libre-sakay.controller.ts` (append to end)

**Context to read first:** The existing `verifyResidentController` at the bottom of the file — same pattern (async, `AuthRequest`, `Response`, `prisma` usage).

The program ID `gp-all-libre-sakay` is the hardcoded target. Import `GovernmentProgramType` from `@prisma/client` if needed for type narrowing.

- [ ] **Step 1: Add `getProgramSettingsController`**

Append this to `libre-sakay.controller.ts`:

```typescript
export const getProgramSettingsController = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const program = await prisma.governmentProgram.findFirst({
      where: { id: 'gp-all-libre-sakay' },
      select: {
        id: true,
        name: true,
        description: true,
        requirements: true,
        types: { select: { type: true } },
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!program) {
      res.status(404).json({ status: 'error', message: 'Libre Sakay program not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        ...program,
        types: program.types.map(t => t.type),
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
```

- [ ] **Step 2: Add `updateProgramSettingsController`**

```typescript
export const updateProgramSettingsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, requirements, types, isActive } = req.body as {
      name?: string;
      description?: string;
      requirements?: string;
      types?: string[];
      isActive?: boolean;
    };

    // Upsert types — delete existing and recreate
    if (types !== undefined) {
      await prisma.$transaction([
        prisma.governmentProgramType.deleteMany({ where: { governmentProgramId: 'gp-all-libre-sakay' } }),
        ...types.map((type: string) =>
          prisma.governmentProgramType.create({
            data: { governmentProgramId: 'gp-all-libre-sakay', type },
          })
        ),
      ]);
    }

    const updated = await prisma.governmentProgram.update({
      where: { id: 'gp-all-libre-sakay' },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(requirements !== undefined && { requirements }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        requirements: true,
        types: { select: { type: true } },
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        ...updated,
        types: updated.types.map(t => t.type),
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
```

- [ ] **Step 3: TypeScript check**

Run: `cmd /c "cd borongan-eService-system-copy\multysis-backend && npx tsc --noEmit 2>&1"`

Expected: no errors (only new function signatures, no new imports needed)

- [ ] **Step 4: Commit**

```bash
git add multysis-backend/src/controllers/libre-sakay.controller.ts
git commit -m "feat(libre-sakay): add get/update program settings controllers"
```

---

### Task 2: Wire up the routes

**Files:**
- Modify: `multysis-backend/src/routes/libre-sakay.routes.ts` (read current imports and route registrations)

**Context to read first:** The top import block and the existing `verifyResidentController` route registration pattern near the bottom.

- [ ] **Step 1: Add imports**

At the top of `libre-sakay.routes.ts`, find the destructured imports from `'../controllers/libre-sakay.controller'` and add:

```typescript
  getProgramSettingsController,
  updateProgramSettingsController,
```

- [ ] **Step 2: Add routes**

After the existing `verifyResident` route, add:

```typescript
// Program Settings
router.get(
  '/program-settings',
  verifyAdmin,
  errorHandler(getProgramSettingsController)
);

router.patch(
  '/program-settings',
  verifyAdmin,
  errorHandler(updateProgramSettingsController)
);
```

- [ ] **Step 3: TypeScript check**

Run: `cmd /c "cd borongan-eService-system-copy\multysis-backend && npx tsc --noEmit 2>&1"`

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add multysis-backend/src/routes/libre-sakay.routes.ts
git commit -m "feat(libre-sakay): add GET/PATCH /program-settings routes"
```

---

## Frontend Tasks

### Task 3: Add service methods

**Files:**
- Modify: `multysis-frontend/src/services/api/libre-sakay.service.ts` (append before the closing `};`)

**Context to read first:** The end of the file around `verifyResident` to confirm the trailing comma pattern and the `BASE = '/libre-sakay'` constant.

- [ ] **Step 1: Add types and service methods**

Append before the closing `};`:

```typescript
// Program Settings
export interface LibreSakayProgramSettings {
  id: string;
  name: string;
  description: string | null;
  requirements: string | null;
  types: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

async getProgramSettings(): Promise<LibreSakayProgramSettings> {
  const response = await api.get(`${BASE}/program-settings`);
  return response.data.data;
}

async updateProgramSettings(data: {
  name?: string;
  description?: string;
  requirements?: string;
  types?: string[];
  isActive?: boolean;
}): Promise<LibreSakayProgramSettings> {
  const response = await api.patch(`${BASE}/program-settings`, data);
  return response.data.data;
}
```

- [ ] **Step 2: TypeScript check**

Run: `cmd /c "cd borongan-eService-system-copy\multysis-frontend && npx tsc --noEmit 2>&1"`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add multysis-frontend/src/services/api/libre-sakay.service.ts
git commit -m "feat(libre-sakay): add getProgramSettings and updateProgramSettings to service"
```

---

### Task 4: Create ProgramSettingsSection component

**Files:**
- Create: `multysis-frontend/src/pages/admin/libre-sakay/ProgramSettingsSection.tsx`

**Context to read first:**
- `multysis-frontend/src/components/modals/government-programs/EditGovernmentProgramModal.tsx` — for the requirement list rendering and form field structure
- `multysis-frontend/src/pages/admin/libre-sakay/VerificationSection.tsx` — for a simple section style reference (read/edit toggle pattern)

This component has two modes:
1. **Read mode** — displays name, description, type badges, requirements list, status
2. **Edit mode** — inline form with React Hook Form + Zod

**Requirement items** are parsed from the JSON `requirements` string. Use the same `parseRequirements` logic from `EditGovernmentProgramModal` (copy it inline — don't extract to a shared util to keep it self-contained).

- [ ] **Step 1: Write the component**

Create `ProgramSettingsSection.tsx` with the following structure:

```tsx
// Imports
import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FiEdit2, FiSave, FiX } from 'react-icons/fi';
import { libreSakayService, type LibreSakayProgramSettings } from '@/services/api/libre-sakay.service';
import { governmentProgramSchema, type GovernmentProgramInput } from '@/validations/government-program.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const typeLabels: Record<string, string> = {
  SENIOR_CITIZEN: 'Senior Citizen',
  PWD: 'PWD',
  STUDENT: 'Student',
  SOLO_PARENT: 'Solo Parent',
  ALL: 'All Residents',
};

const typeBadgeColors: Record<string, string> = {
  SENIOR_CITIZEN: 'bg-blue-100 text-blue-800',
  PWD: 'bg-purple-100 text-purple-800',
  STUDENT: 'bg-green-100 text-green-800',
  SOLO_PARENT: 'bg-orange-100 text-orange-800',
  ALL: 'bg-gray-100 text-gray-800',
};

const parseRequirements = (raw?: string | null) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((item: any) => ({ required: false, ...item }));
  } catch {}
  return [{ type: 'text', label: raw, required: false }];
};

export const ProgramSettingsSection: React.FC = () => {
  const [program, setProgram] = useState<LibreSakayProgramSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<GovernmentProgramInput>({
    resolver: zodResolver(governmentProgramSchema),
    defaultValues: { name: '', description: '', requirements: [], types: ['ALL'], isActive: true },
  });

  const fetchProgram = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await libreSakayService.getProgramSettings();
      setProgram(data);
      form.reset({
        name: data.name,
        description: data.description || '',
        requirements: parseRequirements(data.requirements),
        types: data.types as any,
        isActive: data.isActive,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err.message ?? 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProgram(); }, []);

  const onSubmit = async (values: GovernmentProgramInput) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: values.name,
        description: values.description,
        requirements: JSON.stringify(values.requirements ?? []),
        types: values.types,
        isActive: values.isActive,
      };
      const updated = await libreSakayService.updateProgramSettings(payload);
      setProgram(updated);
      setEditMode(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  if (error && !program) {
    return <div className="text-sm text-red-600">Error: {error}</div>;
  }

  const reqs = parseRequirements(program?.requirements);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{program?.name ?? 'Libre Sakay'}</h2>
          <p className="text-sm text-gray-500">Program configuration and eligibility settings</p>
        </div>
        {!editMode ? (
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
            <FiEdit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditMode(false); fetchProgram(); }}>
              <FiX className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={form.handleSubmit(onSubmit)} disabled={saving}>
              <FiSave className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 rounded px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Read mode */}
      {!editMode && program && (
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Status:</span>
            <span className={cn('text-sm font-medium px-2 py-0.5 rounded', program.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600')}>
              {program.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Description */}
          <div>
            <p className="text-sm text-gray-500 mb-1">Description</p>
            <p className="text-sm">{program.description || <span className="text-gray-400 italic">No description</span>}</p>
          </div>

          {/* Eligibility Types */}
          <div>
            <p className="text-sm text-gray-500 mb-2">Eligible Types</p>
            <div className="flex flex-wrap gap-2">
              {program.types.map(type => (
                <span key={type} className={cn('text-xs px-2 py-1 rounded font-medium', typeBadgeColors[type] ?? 'bg-gray-100 text-gray-800')}>
                  {typeLabels[type] ?? type}
                </span>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div>
            <p className="text-sm text-gray-500 mb-2">Requirements ({reqs.length})</p>
            {reqs.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No requirements configured</p>
            ) : (
              <ul className="space-y-1">
                {reqs.map((req: any, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span>{req.label}</span>
                    <span className="text-xs text-gray-400">({req.type})</span>
                    {req.required && <span className="text-xs text-red-500">Required</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Edit mode */}
      {editMode && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-gray-700">Program Name</label>
            <Input {...form.register('name')} className="mt-1" />
            {form.formState.errors.name && <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <Textarea {...form.register('description')} className="mt-1" rows={3} />
          </div>

          {/* Eligibility Types */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2">Eligible Types</label>
            <div className="flex flex-wrap gap-2">
              {(['SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT', 'ALL'] as const).map(type => (
                <label key={type} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    value={type}
                    checked={form.watch('types')?.includes(type)}
                    onChange={e => {
                      const current = form.getValues('types') as string[];
                      if (e.target.checked) {
                        form.setValue('types', [...current.filter(t => t !== 'ALL'), type], { shouldValidate: true });
                      } else {
                        form.setValue('types', current.filter(t => t !== type), { shouldValidate: true });
                      }
                    }}
                    className="rounded"
                  />
                  {typeLabels[type]}
                </label>
              ))}
            </div>
            {form.formState.errors.types && <p className="text-xs text-red-500 mt-1">{String(form.formState.errors.types.message)}</p>}
          </div>

          {/* Is Active */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              {...form.register('isActive')}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
          </div>
        </form>
      )}
    </div>
  );
};
```

- [ ] **Step 2: TypeScript check**

Run: `cmd /c "cd borongan-eService-system-copy\multysis-frontend && npx tsc --noEmit 2>&1"`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add multysis-frontend/src/pages/admin/libre-sakay/ProgramSettingsSection.tsx
git commit -m "feat(libre-sakay): add ProgramSettingsSection component"
```

---

### Task 5: Wire section into Libre Sakay admin

**Files (in order):**

1. `multysis-frontend/src/pages/admin/libre-sakay/index.ts` — export the new section
2. `multysis-frontend/src/pages/admin/libre-sakay/shared.tsx` — add to SECTION_TITLES
3. `multysis-frontend/src/config/libre-sakay-menu.tsx` — add menu item
4. `multysis-frontend/src/components/layout/Sidebar.tsx` — add route to whitelist
5. `multysis-frontend/src/pages/admin/AdminLibreSakay.tsx` — add case

**Context to read first:** Each file as noted in the File Map section above.

- [ ] **Step 1: Export from index.ts**

In `multysis-frontend/src/pages/admin/libre-sakay/index.ts`, find the existing exports and add:

```typescript
export { ProgramSettingsSection } from './ProgramSettingsSection';
```

- [ ] **Step 2: Add to SECTION_TITLES**

In `shared.tsx`, add to `SECTION_TITLES`:

```typescript
'settings': 'Program Settings',
```

Place it second (after `dashboard`).

- [ ] **Step 3: Add menu item**

In `libre-sakay-menu.tsx`, add after the Dashboard entry:

```typescript
{ path: '/admin/libre-sakay/settings', label: 'Program Settings', icon: <FiSettings /> },
```

Import `FiSettings` from `react-icons/fi` (add to existing import).

- [ ] **Step 4: Add to implementedRoutes**

In `Sidebar.tsx`, find `implementedRoutes` array and add:

```typescript
'/admin/libre-sakay/settings',
```

Place it after `'/admin/libre-sakay/dashboard'`.

- [ ] **Step 5: Add route case in AdminLibreSakay.tsx**

Add to imports:

```typescript
import { ProgramSettingsSection } from './libre-sakay';
```

Add case:

```typescript
case 'settings':
  return <ProgramSettingsSection />;
```

Place after `case 'verification':`.

- [ ] **Step 6: TypeScript check**

Run: `cmd /c "cd borongan-eService-system-copy\multysis-frontend && npx tsc --noEmit 2>&1"`

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add multysis-frontend/src/pages/admin/libre-sakay/index.ts \
  multysis-frontend/src/pages/admin/libre-sakay/shared.tsx \
  multysis-frontend/src/config/libre-sakay-menu.tsx \
  multysis-frontend/src/components/layout/Sidebar.tsx \
  multysis-frontend/src/pages/admin/AdminLibreSakay.tsx
git commit -m "feat(libre-sakay): wire Program Settings section into admin"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Backend GET endpoint for program settings | Task 1 |
| Backend PATCH endpoint for program settings | Task 1 |
| Program ID hardcoded to `gp-all-libre-sakay` | Task 1 |
| Frontend service methods | Task 3 |
| ProgramSettingsSection with read/edit toggle | Task 4 |
| Displays name, description, types, requirements, status | Task 4 |
| Edit form for all fields | Task 4 |
| Wire into Libre Sakay admin (menu, sidebar, router) | Task 5 |
| `verifyAdmin` middleware protection | Task 2 (routes use `verifyAdmin`) |

## Self-Review

1. **Placeholder scan:** All steps have actual code. No "TBD", "TODO", or "implement later" found.
2. **Type consistency:** `LibreSakayProgramSettings` interface in service matches what `getProgramSettingsController` returns. `GovernmentProgramInput` used in form matches `governmentProgramSchema` from existing validation.
3. **Spec gaps:** None — all requirements from the approved design are covered.

---

**Plan complete.** 5 tasks, ~25 steps total.
