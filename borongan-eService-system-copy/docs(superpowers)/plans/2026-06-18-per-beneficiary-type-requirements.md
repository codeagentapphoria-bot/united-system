# Per-Beneficiary-Type Requirements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow each beneficiary type to have its own requirements list, with optional sub-types (e.g., Student → College / Senior High School). Admins toggle between "Shared" (one list for all) and "Per-Type" (different per type) mode in the settings UI.

**Architecture:** Replace the flat `requirements: RequirementItem[]` JSON with a nested `settings: RequirementsConfig` JSON stored in the same `governmentProgram` table. The settings JSON encodes: mode (`shared` | `per_type`), shared fallback list, per-type configs with optional sub-types, and per-sub-type requirement lists. Both admin settings UI and citizen application form are updated to read/write this structure.

**Tech Stack:** React, React Hook Form, Zod, TypeScript, Node.js/Express, Prisma ORM, PostgreSQL

---

## Files to Modify

| # | File | Change |
|---|---|---|
| 1 | `multysis-frontend/src/validations/government-program.schema.ts` | Add `RequirementsConfig` Zod schema; keep `RequirementItem` schema |
| 2 | `multysis-frontend/src/services/api/libre-sakay.service.ts` | Update `LibreSakayProgramSettings` type to use `RequirementsConfig` |
| 3 | `multysis-backend/src/controllers/libre-sakay.controller.ts` | Backend already stores full `requirements` JSON as-is — no controller changes needed |
| 4 | `multysis-frontend/src/pages/admin/libre-sakay/ProgramSettingsSection.tsx` | Replace flat requirements builder with mode toggle + type-tabbed per-type editor |
| 5 | `borongan-programs-portal/src/components/libre-sakay/ApplyModal.tsx` | Update `parseRequirements` to read `RequirementsConfig`, add sub-type dropdown |
| 6 | `borongan-programs-portal/src/components/modals/ApplyForProgramModal.tsx` | Same as ApplyModal — update `parseRequirements` |
| 7 | `borongan-programs-portal/src/services/api/portal-programs.service.ts` | Update `PortalProgram` type to use `RequirementsConfig` |
| 8 | — | Build verification |

---

## Data Model

### New `RequirementsConfig` JSON structure

```typescript
// Mode: "shared" — all types use the same list
interface SharedMode {
  mode: 'shared';
  shared: RequirementItem[];
}

// Mode: "per_type" — each type has its own list, with optional sub-types
interface PerTypeMode {
  mode: 'per_type';
  by_type: Record<BeneficiaryType, TypeRequirements>;
}

interface TypeRequirements {
  sub_types_enabled: boolean;
  sub_types: string[];           // e.g. ["College", "Senior High School"]
  default: RequirementItem[];    // used when no sub-type selected, or fallback
  requirements: Record<string, RequirementItem[]>;  // key = sub-type name, e.g. "College"
}

interface RequirementItem {
  type: string;      // 'text' | 'file' | 'textarea' | etc.
  label: string;     // Human-readable label
  required: boolean;
}
```

### Cascade logic (used at application time)
```
1. Read mode from config
2. If mode === 'shared' → return shared list
3. If mode === 'per_type':
   a. Look up by_type[applicantType]
   b. If applicant picked a sub_type → return requirements[sub_type]
   c. Else → return default
   d. If default is empty → return []
```

---

## Task 1: Update Zod Schema

**Files:**
- Modify: `borongan-eService-system-copy/multysis-frontend/src/validations/government-program.schema.ts`

**Existing code (lines 5–11):**
```typescript
const requirementItemSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  label: z.string().min(1, 'Label is required'),
  required: z.boolean().default(false),
});

export type RequirementItem = z.infer<typeof requirementItemSchema>;
```

**After:**
```typescript
const requirementItemSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  label: z.string().min(1, 'Label is required'),
  required: z.boolean().default(false),
});

export type RequirementItem = z.infer<typeof requirementItemSchema>;

// ── Per-type requirements config ──────────────────────────────────────────────

const requirementItemListSchema = z.array(requirementItemSchema);

const sharedModeSchema = z.object({
  mode: z.literal('shared'),
  shared: requirementItemListSchema,
});

const perTypeEntrySchema = z.object({
  sub_types_enabled: z.boolean(),
  sub_types: z.array(z.string()),
  default: requirementItemListSchema,
  requirements: z.record(z.string(), requirementItemListSchema),
});

const perTypeModeSchema = z.object({
  mode: z.literal('per_type'),
  by_type: z.record(z.string(), perTypeEntrySchema),
});

export const requirementsConfigSchema = z.discriminatedUnion('mode', [
  sharedModeSchema,
  perTypeModeSchema,
]);

export type RequirementsConfig = z.infer<typeof requirementsConfigSchema>;
```

- [ ] **Step 1: Add RequirementsConfig Zod schema**

Replace the file content with the code above (keeping the existing `governmentProgramSchema` at the bottom unchanged — only ADD the new schemas above it).

---

## Task 2: Update Frontend Service Type

**Files:**
- Modify: `borongan-eService-system-copy/multysis-frontend/src/services/api/libre-sakay.service.ts`

Find the `LibreSakayProgramSettings` interface (search for it in the file) and update the `requirements` field:

Change from:
```typescript
export interface LibreSakayProgramSettings {
  id: string;
  name: string;
  description: string | null;
  requirements: RequirementItem[];   // ← flat array
  types: GovernmentProgramTypeEnum[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

To:
```typescript
export interface LibreSakayProgramSettings {
  id: string;
  name: string;
  description: string | null;
  requirements: RequirementsConfig;  // ← new config structure
  types: GovernmentProgramTypeEnum[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Also add the import at the top of the file:
```typescript
import type { RequirementsConfig } from '@/validations/government-program.schema';
```

- [ ] **Step 1: Update LibreSakayProgramSettings type**

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd borongan-eService-system-copy/multysis-frontend
npx tsc --noEmit
```
Expected: Zero errors related to libre-sakay.service.ts.

---

## Task 3: Rewrite ProgramSettingsSection — Requirements Editor

**Files:**
- Modify: `borongan-eService-system-copy/multysis-frontend/src/pages/admin/libre-sakay/ProgramSettingsSection.tsx`

This is the most complex change. The file needs a new `RequirementsEditor` sub-component that handles both modes.

### Step 1: Add import

Add after the existing imports (line 24):
```typescript
import type { RequirementsConfig } from '@/validations/government-program.schema';
import { requirementsConfigSchema } from '@/validations/government-program.schema';
```

### Step 2: Add helper functions

Add after `parseRequirements` (around line 76):

```typescript
// ── Requirements Config Helpers ───────────────────────────────────────────────

const DEFAULT_CONFIG: RequirementsConfig = {
  mode: 'shared',
  shared: [],
};

const TYPE_REQUIRED_KEYS: GovernmentProgramTypeEnum[] = [
  'SENIOR_CITIZEN',
  'PWD',
  'STUDENT',
  'SOLO_PARENT',
  'HEALTHCARE_WORKER',
];

function getEffectiveRequirements(
  config: RequirementsConfig,
  type: GovernmentProgramTypeEnum,
  subType?: string
): RequirementItem[] {
  if (config.mode === 'shared') {
    return config.shared;
  }
  const entry = config.by_type?.[type];
  if (!entry) return [];
  if (entry.sub_types_enabled && subType) {
    return entry.requirements?.[subType] ?? entry.default ?? [];
  }
  return entry.default ?? [];
}

function buildInitialConfig(raw?: string | null): RequirementsConfig {
  if (!raw) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(raw);
    const result = requirementsConfigSchema.safeParse(parsed);
    if (result.success) return result.data;
  } catch {}
  // Legacy flat array — convert to shared mode
  if (Array.isArray(parsed)) {
    return { mode: 'shared', shared: parsed.map(item => ({ required: false, ...item })) };
  }
  return DEFAULT_CONFIG;
}
```

### Step 3: Replace the requirements field in the form

In the existing `governmentProgramSchema` (used by `useForm<GovernmentProgramInput>`), the `requirements` field is typed as `RequirementItem[]`. **Change it to `RequirementsConfig`**:

Update the schema (in `government-program.schema.ts`):

Change line 16 from:
```typescript
  requirements: z.array(requirementItemSchema).optional(),
```
To:
```typescript
  requirements: requirementsConfigSchema.optional().default(DEFAULT_CONFIG),
```

### Step 4: Update defaultValues in ProgramSettingsSection

In `ProgramSettingsSection` component, change the `form.reset()` calls that set `requirements`. The existing call uses `parseRequirements(settings.requirements)`. Change it to use `buildInitialConfig(settings.requirements)` instead.

Search for all occurrences of `parseRequirements(data.requirements)` and `parseRequirements(settings.requirements)` and replace with `buildInitialConfig(settings.requirements)`.

### Step 5: Add RequirementsEditor sub-component

Add this component before the `export const ProgramSettingsSection` at the bottom of the file (around line 465):

```typescript
// ── Requirements Editor ──────────────────────────────────────────────────────

interface RequirementsEditorProps {
  value: RequirementsConfig;
  onChange: (config: RequirementsConfig) => void;
}

function RequirementsEditor({ value, onChange }: RequirementsEditorProps) {
  const [activeType, setActiveType] = useState<GovernmentProgramTypeEnum>('STUDENT');

  // Determine current mode
  const isShared = value.mode === 'shared';

  // Per-type helpers
  const byType = value.mode === 'per_type' ? value.by_type : {};
  const currentEntry = byType[activeType];

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="req-mode"
              checked={isShared}
              onChange={() => onChange({ mode: 'shared', shared: value.mode === 'shared' ? value.shared : [] })}
              className="text-primary-600"
            />
            <span className="text-sm font-medium text-gray-700">Shared requirements</span>
            <span className="text-xs text-gray-400">— all types use the same list</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="req-mode"
              checked={!isShared}
              onChange={() => {
                const existing = value.mode === 'per_type' ? value.by_type : {};
                const init: RequirementsConfig = {
                  mode: 'per_type',
                  by_type: TYPE_REQUIRED_KEYS.reduce((acc, t) => ({
                    ...acc,
                    [t]: existing[t] ?? { sub_types_enabled: false, sub_types: [], default: [], requirements: {} },
                  }), {}),
                };
                onChange(init);
              }}
              className="text-primary-600"
            />
            <span className="text-sm font-medium text-gray-700">Per-type requirements</span>
            <span className="text-xs text-gray-400">— different list per beneficiary type</span>
          </label>
        </div>
      </div>

      {/* ── Shared Mode ── */}
      {isShared && (
        <SharedRequirementsEditor
          items={value.shared}
          onChange={items => onChange({ mode: 'shared', shared: items })}
        />
      )}

      {/* ── Per-Type Mode ── */}
      {!isShared && (
        <div className="space-y-3">
          {/* Type tabs */}
          <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-0">
            {TYPE_REQUIRED_KEYS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveType(t)}
                className={cn(
                  'px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
                  activeType === t
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                )}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          {/* Type config */}
          <PerTypeRequirementsEditor
            type={activeType}
            entry={currentEntry}
            onChange={entry => {
              const existing = value.mode === 'per_type' ? value.by_type : {};
              onChange({
                mode: 'per_type',
                by_type: { ...existing, [activeType]: entry },
              });
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Shared Requirements Editor ──────────────────────────────────────────────

interface SharedRequirementsEditorProps {
  items: RequirementItem[];
  onChange: (items: RequirementItem[]) => void;
}

function SharedRequirementsEditor({ items, onChange }: SharedRequirementsEditorProps) {
  return (
    <RequirementsListBuilder
      items={items}
      onChange={onChange}
      label="All Beneficiaries"
    />
  );
}

// ── Per-Type Requirements Editor ──────────────────────────────────────────

interface PerTypeRequirementsEditorProps {
  type: GovernmentProgramTypeEnum;
  entry?: {
    sub_types_enabled: boolean;
    sub_types: string[];
    default: RequirementItem[];
    requirements: Record<string, RequirementItem[]>;
  };
  onChange: (entry: NonNullable<PerTypeRequirementsEditorProps['entry']>) => void;
}

function PerTypeRequirementsEditor({ type, entry, onChange }: PerTypeRequirementsEditorProps) {
  const subEnabled = entry?.sub_types_enabled ?? false;
  const subTypes = entry?.sub_types ?? [];
  const defaultItems = entry?.default ?? [];
  const subRequirements = entry?.requirements ?? {};

  const [activeSubType, setActiveSubType] = useState<string | null>(null);

  const currentItems = subEnabled && activeSubType
    ? (subRequirements[activeSubType] ?? [])
    : defaultItems;

  const setCurrentItems = (items: RequirementItem[]) => {
    if (subEnabled && activeSubType) {
      onChange({
        ...entry!,
        requirements: { ...subRequirements, [activeSubType]: items },
      });
    } else {
      onChange({ ...entry!, default: items });
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      {/* Sub-type toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Sub-types:</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveSubType(null);
              onChange({ ...entry!, sub_types_enabled: false, sub_types: [], requirements: {} });
            }}
            className={cn(
              'text-xs px-2.5 py-1 rounded-full border font-medium transition-colors',
              !subEnabled
                ? 'bg-primary-50 text-primary-700 border-primary-200'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            )}
          >
            Off
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...entry!, sub_types_enabled: true, sub_types: subTypes.length ? subTypes : [''] })}
            className={cn(
              'text-xs px-2.5 py-1 rounded-full border font-medium transition-colors',
              subEnabled
                ? 'bg-primary-50 text-primary-700 border-primary-200'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            )}
          >
            On
          </button>
        </div>
      </div>

      {/* Sub-type options editor */}
      {subEnabled && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Options:</span>
            <div className="flex flex-wrap gap-1.5">
              {subTypes.map((st, i) => (
                <span key={i} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={st}
                    onChange={e => {
                      const updated = [...subTypes];
                      updated[i] = e.target.value;
                      // Remove empty strings
                      const filtered = updated.filter(s => s.trim());
                      onChange({ ...entry!, sub_types: filtered });
                      if (activeSubType === st) setActiveSubType(e.target.value);
                    }}
                    className="w-32 h-7 rounded border border-gray-200 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-200"
                    placeholder="e.g. College"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const filtered = subTypes.filter((_, idx) => idx !== i);
                      onChange({ ...entry!, sub_types: filtered });
                      if (activeSubType === st) setActiveSubType(null);
                    }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <FiX size={12} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => onChange({ ...entry!, sub_types: [...subTypes, ''] })}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                + Add option
              </button>
            </div>
          </div>

          {/* Sub-type tabs */}
          {subTypes.filter(s => s.trim()).length > 0 && (
            <div className="flex gap-1 border-b border-gray-100 pb-0">
              <button
                type="button"
                onClick={() => setActiveSubType(null)}
                className={cn(
                  'px-3 py-1.5 text-xs border-b-2 -mb-px transition-colors',
                  !activeSubType
                    ? 'border-primary-400 text-primary-700 font-medium'
                    : 'border-transparent text-gray-400'
                )}
              >
                Default (fallback)
              </button>
              {subTypes.filter(s => s.trim()).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setActiveSubType(st)}
                  className={cn(
                    'px-3 py-1.5 text-xs border-b-2 -mb-px transition-colors',
                    activeSubType === st
                      ? 'border-primary-400 text-primary-700 font-medium'
                      : 'border-transparent text-gray-400'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Requirements list */}
      {subEnabled && activeSubType && (
        <p className="text-xs text-gray-500 italic">
          Requirements for: <span className="font-medium">{activeSubType}</span>
        </p>
      )}
      {subEnabled && !activeSubType && (
        <p className="text-xs text-gray-500 italic">
          Default list — used when no sub-type is selected
        </p>
      )}
      {!subEnabled && (
        <p className="text-xs text-gray-500 italic">
          Requirements for all {TYPE_LABEL[type]} applicants
        </p>
      )}

      <RequirementsListBuilder
        items={currentItems}
        onChange={setCurrentItems}
      />
    </div>
  );
}

// ── Requirements List Builder (reused from existing EditMode) ───────────────

interface RequirementsListBuilderProps {
  items: RequirementItem[];
  onChange: (items: RequirementItem[]) => void;
  label?: string;
}

function RequirementsListBuilder({ items, onChange, label }: RequirementsListBuilderProps) {
  const addItem = () => onChange([...items, { type: 'text', label: '', required: false }]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<RequirementItem>) => {
    onChange(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <select
            value={item.type}
            onChange={e => updateItem(idx, { type: e.target.value })}
            className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
          >
            {INPUT_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Input
            value={item.label}
            onChange={e => updateItem(idx, { label: e.target.value })}
            placeholder="Requirement description..."
            className="flex-1 h-9"
          />
          <button
            type="button"
            onClick={() => updateItem(idx, { required: !item.required })}
            className={cn(
              'shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border h-9 font-medium transition-colors',
              item.required
                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600'
            )}
          >
            {item.required ? <FiClock size={10} /> : null}
            {item.required ? 'Required' : 'Optional'}
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeItem(idx)}
            className="shrink-0 h-9 w-9 text-gray-400 hover:text-red-500 hover:bg-red-50"
          >
            <FiTrash2 size={14} />
          </Button>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-gray-400 italic py-2">No requirements added yet.</p>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        className="mt-1 gap-1.5 text-primary-600 border-primary-200 hover:bg-primary-50"
      >
        <FiPlus size={13} />
        Add Requirement
      </Button>
    </div>
  );
}
```

### Step 6: Replace requirements field in EditMode form

In the existing `EditMode` component, find the requirements `FormField` (around lines 349–437) and replace the entire `<FormField name="requirements" ...>` block with:

```tsx
<FormField
  control={form.control}
  name="requirements"
  render={({ field }) => (
    <FormItem>
      <FormLabel className="text-sm font-medium text-gray-700">
        Application Requirements
      </FormLabel>
      <FormControl>
        <RequirementsEditor
          value={field.value ?? DEFAULT_CONFIG}
          onChange={field.onChange}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Step 7: Update ViewMode requirements display

In `ViewMode`, the current code uses `parseRequirements(settings.requirements)` to show requirements. Update it to derive the correct list based on mode. Since `ViewMode` shows requirements without a selected type, show a summary note instead of a specific list, or show the shared list.

Change the requirements list rendering in `ViewMode` (around lines 186–203) to:

```tsx
{/* Requirements list */}
{(() => {
  const cfg = buildInitialConfig(settings.requirements as any);
  const reqs = cfg.mode === 'shared' ? cfg.shared : [];
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {cfg.mode === 'per_type' ? 'Requirements (varies by type — edit to configure)' : 'Application Requirements'}
        </h3>
        <span className="text-xs text-gray-400">{reqs.length} item{reqs.length !== 1 ? 's' : ''}</span>
      </div>
      {reqs.length > 0 ? (
        <ul className="divide-y divide-gray-100 px-4">
          {reqs.map((req, idx) => (
            <RequirementRow key={idx} req={req} idx={idx} />
          ))}
        </ul>
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-gray-400">
            {cfg.mode === 'per_type'
              ? 'Requirements are configured per beneficiary type. Click Edit to configure.'
              : 'No requirements have been set for this program.'}
          </p>
        </div>
      )}
    </div>
  );
})()}
```

### Step 8: Verify TypeScript compilation

```bash
cd borongan-eService-system-copy/multysis-frontend
npx tsc --noEmit
```
Expected: Clean compilation. Check for errors in `ProgramSettingsSection.tsx` specifically.

---

## Task 4: Update ApplyModal (borongan-programs-portal)

**Files:**
- Modify: `borongan-programs-portal/src/components/libre-sakay/ApplyModal.tsx`

### Step 1: Add types

Replace the local `RequirementItem` interface and `parseRequirements` function (lines 6–19) with:

```typescript
import type { RequirementsConfig, RequirementItem } from '@/validations/government-program.schema';

const DEFAULT_CONFIG: RequirementsConfig = {
  mode: 'shared',
  shared: [],
};

function getRequirements(config: RequirementsConfig, subType?: string): RequirementItem[] {
  if (config.mode === 'shared') return config.shared;
  return []; // Per-type mode needs backend type info — handled in Step 2
}

function parseConfig(raw?: string): RequirementsConfig {
  if (!raw) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'mode' in parsed) {
      return parsed as RequirementsConfig;
    }
    // Legacy flat array
    if (Array.isArray(parsed)) {
      return { mode: 'shared', shared: parsed };
    }
  } catch {}
  return DEFAULT_CONFIG;
}
```

### Step 2: Add sub-type selection state

In the `ApplyModal` component (line 146), add a new state variable:

```typescript
// After existing useState declarations (around line 153)
const [subType, setSubType] = useState<string>('');

const config = parseConfig(program.requirements);
const requirements = getRequirements(config, subType);
```

### Step 3: Add sub-type dropdown to the form (before the requirements list)

In the form (find the `<form onSubmit={handleSubmit}>` section, around line 267), add the sub-type selector after the opening `<form>` tag and before the first requirements check:

```tsx
{/* Sub-type selector (only shown when per_type mode has sub_types) */}
{config.mode === 'per_type' && (() => {
  const entry = config.by_type?.[/* type from program */];
  if (!entry?.sub_types_enabled || !entry.sub_types.length) return null;
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-heading-700">
        Classification Type <span className="text-red-500">*</span>
      </label>
      <select
        value={subType}
        onChange={e => setSubType(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
      >
        <option value="">— Select type —</option>
        {entry.sub_types.map(st => (
          <option key={st} value={st}>{st}</option>
        ))}
      </select>
    </div>
  );
})()}
```

Note: `/* type from program */` — if the resident's classification type is available from the authenticated user context, use it. Otherwise, this can be a placeholder that will be filled in once the backend passes the applicant's type. The critical change is that `requirements` is now derived from `config` + `subType`.

- [ ] **Step 1: Add RequirementsConfig types and helpers**

- [ ] **Step 2: Add sub-type selection state and dropdown**

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd borongan-programs-portal
npx tsc --noEmit
```

---

## Task 5: Update ApplyForProgramModal (borongan-programs-portal)

**Files:**
- Modify: `borongan-programs-portal/src/components/modals/ApplyForProgramModal.tsx`

This file is similar to `ApplyModal.tsx` but uses shadcn/ui `Dialog` components. Apply the same changes as Task 4:

1. Replace the local `RequirementItem` interface and `parseRequirements` function with the `RequirementsConfig` import and helpers
2. Add `subType` state
3. Derive `requirements` from config + subType
4. Add sub-type dropdown before the requirements form fields

The code changes are identical in structure to Task 4, just adapted to use shadcn/ui `Dialog` components.

- [ ] **Step 1: Add RequirementsConfig types and helpers**

- [ ] **Step 2: Add sub-type selection state and dropdown**

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd borongan-programs-portal
npx tsc --noEmit
```

---

## Task 6: Update PortalProgram Type

**Files:**
- Modify: `borongan-programs-portal/src/services/api/portal-programs.service.ts`

Find the `PortalProgram` interface (lines 6–18). Change:

```typescript
export interface PortalProgram {
  id: string;
  name: string;
  description?: string;
  requirements?: string;   // ← JSON string of RequirementsConfig
  types: GovernmentProgramType[];
  isActive: boolean;
  eligible: boolean;
  // ...
}
```

The `requirements` field remains a string (JSON) — it is parsed on the client. No type change needed here since `RequirementsConfig` is used in the modal, not in this service file. **This file likely needs no changes.**

Verify with:
```bash
cd borongan-programs-portal
npx tsc --noEmit
```

- [ ] **Step 1: Verify — check if PortalProgram needs changes**

If `tsc --noEmit` is clean, skip this file. If there are type errors, update `requirements` type to `string` (it's already a string — stored as JSON).

---

## Task 7: Full Build Verification

- [ ] **Step 1: Backend — TypeScript check**

```bash
cd borongan-eService-system-copy/multysis-backend
npx tsc --noEmit
```

- [ ] **Step 2: Backend — Prisma generate**

```bash
cd borongan-eService-system-copy/multysis-backend
npx prisma generate
```

- [ ] **Step 3: Admin frontend — TypeScript check**

```bash
cd borongan-eService-system-copy/multysis-frontend
npx tsc --noEmit
```

- [ ] **Step 4: Admin frontend — Vite build**

```bash
cd borongan-eService-system-copy/multysis-frontend
npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Portal frontend — TypeScript check**

```bash
cd borongan-programs-portal
npx tsc --noEmit
```

- [ ] **Step 6: Portal frontend — Vite build**

```bash
cd borongan-programs-portal
npm run build 2>&1 | tail -20
```

---

## Self-Review Checklist

- [ ] `RequirementsConfig` Zod schema covers both `shared` and `per_type` modes
- [ ] Cascade logic: shared → returns shared list; per_type → looks up type → sub_type → requirements[sub_type] or default
- [ ] Legacy flat array conversion: `buildInitialConfig` handles old data gracefully
- [ ] Admin UI: mode toggle at top, type tabs when per_type, sub-type options when enabled
- [ ] Applicant UI: sub-type dropdown appears when per_type + sub_types_enabled
- [ ] When sub-type selected, shows that sub-type's requirements; when none selected, shows default (or empty if default also empty)
- [ ] No `type: any` suppressions added
- [ ] All `npx tsc --noEmit` commands pass
- [ ] Both admin frontend and portal frontend build successfully

---

## Migration Note

Existing data in `governmentProgram.requirements` is a flat JSON array. The `buildInitialConfig` function handles this by detecting `mode` presence — if absent, it wraps the array in `{ mode: 'shared', shared: [...] }`. No database migration needed; existing data continues to work.

(End of file)
