// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import { FiPlus, FiTrash2, FiX, FiClock } from 'react-icons/fi';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Types
import type { CreateGovernmentProgramInput } from '@/hooks/social-amelioration/useGovernmentPrograms';
import type { GovernmentProgramTypeEnum } from '@/services/api/libre-sakay.service';

// Utils
import { createReactSelectStyles } from '@/components/social-amelioration/shared';
import { cn } from '@/lib/utils';
import {
  governmentProgramSchema,
  type GovernmentProgramInput,
  type RequirementItem,
  type RequirementsConfig,
} from '@/validations/government-program.schema';

const TYPE_OPTIONS: { value: GovernmentProgramTypeEnum; label: string }[] = [
  { value: 'SENIOR_CITIZEN', label: 'Senior Citizen' },
  { value: 'PWD', label: 'PWD' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'SOLO_PARENT', label: 'Solo Parent' },
  { value: 'HEALTHCARE_WORKER', label: 'Healthcare Worker' },
  { value: 'ALL', label: 'All Residents' },
];

const INPUT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'url', label: 'URL' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'datetime-local', label: 'Date & Time' },
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'file', label: 'File' },
];

const TYPE_LABEL: Record<GovernmentProgramTypeEnum, string> = {
  SENIOR_CITIZEN: 'Senior Citizen',
  PWD: 'PWD',
  STUDENT: 'Student',
  SOLO_PARENT: 'Solo Parent',
  HEALTHCARE_WORKER: 'Healthcare Worker',
  ALL: 'All Residents',
};

const TYPE_REQUIRED_KEYS: GovernmentProgramTypeEnum[] = [
  'SENIOR_CITIZEN',
  'PWD',
  'STUDENT',
  'SOLO_PARENT',
  'HEALTHCARE_WORKER',
];

export const DEFAULT_CONFIG: RequirementsConfig = {
  mode: 'shared',
  shared: [],
};

interface RequirementsEditorProps {
  value: RequirementsConfig;
  onChange: (config: RequirementsConfig) => void;
  programTypes: GovernmentProgramTypeEnum[];
}

function RequirementsEditor({ value, onChange, programTypes }: RequirementsEditorProps) {
  const [activeType, setActiveType] = useState<GovernmentProgramTypeEnum>(() => programTypes[0] ?? 'STUDENT');
  const isShared = value.mode === 'shared';
  const byType = value.mode === 'per_type' ? value.by_type : {};
  const currentEntry = byType[activeType];
  const availableTypes = TYPE_REQUIRED_KEYS.filter(t => programTypes.includes(t));

  useEffect(() => {
    if (availableTypes.length > 0 && !availableTypes.includes(activeType)) {
      setActiveType(availableTypes[0]);
    }
  }, [availableTypes, activeType]);

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
                  by_type: availableTypes.reduce((acc, t) => ({
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

      {/* Shared Mode */}
      {isShared && (
        <RequirementsListBuilder
          items={value.shared}
          onChange={items => onChange({ mode: 'shared', shared: items })}
          label="All Beneficiaries"
        />
      )}

      {/* Per-Type Mode */}
      {!isShared && (
        <div className="space-y-3">
          {availableTypes.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              No beneficiary types selected. Go to Eligibility above to add types.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-0">
                {availableTypes.map(t => (
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
              <PerTypeRequirementsEditor
                type={activeType}
                entry={currentEntry}
                onChange={entry => {
                  const existing = value.mode === 'per_type' ? value.by_type : {};
                  onChange({ mode: 'per_type', by_type: { ...existing, [activeType]: entry } });
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

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
      onChange({ ...entry!, requirements: { ...subRequirements, [activeSubType]: items } });
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

      {/* Current list label */}
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

      <RequirementsListBuilder items={currentItems} onChange={setCurrentItems} />
    </div>
  );
}

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
      {label && <p className="text-xs font-medium text-gray-500">{label}</p>}
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

interface AddGovernmentProgramModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGovernmentProgramInput) => Promise<void>;
  isLoading?: boolean;
}

export const AddGovernmentProgramModal: React.FC<AddGovernmentProgramModalProps> = ({
  open,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const form = useForm<GovernmentProgramInput>({
    resolver: zodResolver(governmentProgramSchema),
    defaultValues: {
      name: '',
      description: '',
      requirements: DEFAULT_CONFIG,
      types: ['SENIOR_CITIZEN'],
      isActive: true,
    },
  });

  const handleFormSubmit = async (data: GovernmentProgramInput) => {
    try {
      const submitData: CreateGovernmentProgramInput = {
        ...data,
        requirements: data.requirements ?? undefined,
      };
      await onSubmit(submitData);
      form.reset();
      onClose();
    } catch {
      // Parent handles the error toast; keep modal open so user can retry
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn('max-w-2xl max-h-[90vh] overflow-y-auto')}>
        <DialogHeader>
          <DialogTitle className={cn('text-xl font-semibold text-primary-600')}>Add Government Program</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Program Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Enter program name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="types"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Eligible Beneficiary Types <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      isMulti
                      hideSelectedOptions={false}
                      value={TYPE_OPTIONS.filter(option => field.value?.includes(option.value))}
                      onChange={selected => {
                        const values = (selected as readonly { value: GovernmentProgramTypeEnum }[]).map(s => s.value);
                        if (values.includes('ALL') && !field.value?.includes('ALL')) {
                          field.onChange(['ALL']);
                        } else if (field.value?.includes('ALL') && values.length > 1) {
                          field.onChange(values.filter(v => v !== 'ALL'));
                        } else {
                          field.onChange(values);
                        }
                      }}
                      options={TYPE_OPTIONS}
                      placeholder="Select one or more types..."
                      className="mt-1"
                      classNamePrefix="react-select"
                      styles={createReactSelectStyles(!!form.formState.errors.types)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter description (optional)" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requirements</FormLabel>
                  <FormControl>
                    <RequirementsEditor
                      value={field.value ?? DEFAULT_CONFIG}
                      onChange={field.onChange}
                      programTypes={(form.watch('types') ?? []) as GovernmentProgramTypeEnum[]}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-primary-600 hover:bg-primary-700" disabled={isLoading}>
                {isLoading ? 'Adding...' : 'Add Government Program'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
