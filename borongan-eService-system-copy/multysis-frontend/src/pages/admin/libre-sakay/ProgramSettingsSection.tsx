import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import { FiEdit2, FiPlus, FiSave, FiTrash2, FiX, FiCheck, FiClock } from 'react-icons/fi';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createReactSelectStyles } from '@/components/social-amelioration/shared';
import { cn } from '@/lib/utils';
import {
  governmentProgramSchema,
  type GovernmentProgramInput,
  type RequirementItem,
} from '@/validations/government-program.schema';
import type {
  GovernmentProgramTypeEnum,
  LibreSakayProgramSettings,
} from '@/services/api/libre-sakay.service';
import { libreSakayService } from '@/services/api/libre-sakay.service';

const TYPE_OPTIONS: { value: GovernmentProgramTypeEnum; label: string }[] = [
  { value: 'SENIOR_CITIZEN', label: 'Senior Citizen' },
  { value: 'PWD', label: 'PWD' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'SOLO_PARENT', label: 'Solo Parent' },
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
  ALL: 'All Residents',
};

const TYPE_COLOR: Record<GovernmentProgramTypeEnum, string> = {
  SENIOR_CITIZEN: 'bg-amber-50 text-amber-700 border-amber-200',
  PWD: 'bg-violet-50 text-violet-700 border-violet-200',
  STUDENT: 'bg-blue-50 text-blue-700 border-blue-200',
  SOLO_PARENT: 'bg-pink-50 text-pink-700 border-pink-200',
  ALL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const parseRequirements = (raw?: string | null | RequirementItem[]): RequirementItem[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw as string);
    if (Array.isArray(parsed)) return parsed.map(item => ({ required: false, ...item }));
  } catch {}
  return [{ type: 'text', label: raw as string, required: false }];
};

// ── View Mode ────────────────────────────────────────────────────────────────

interface RequirementRowProps {
  req: RequirementItem;
  idx: number;
}

const RequirementRow: React.FC<RequirementRowProps> = ({ req }) => (
  <li className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
    <span className="mt-1.5 w-2 h-2 rounded-full bg-primary-200 shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100">
          {INPUT_TYPE_OPTIONS.find(o => o.value === req.type)?.label ?? req.type}
        </span>
        <span className="text-sm font-medium text-gray-900">{req.label || <span className="text-gray-400 italic">Untitled</span>}</span>
        {req.required && (
          <span className="flex items-center gap-0.5 text-xs text-red-500 font-medium">
            <FiClock size={10} /> Required
          </span>
        )}
      </div>
    </div>
  </li>
);

interface ViewModeProps {
  settings: LibreSakayProgramSettings;
  onEdit: () => void;
}

const ViewMode: React.FC<ViewModeProps> = ({ settings, onEdit }) => {
  const reqs = parseRequirements(settings.requirements);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{settings.name}</h2>
          {settings.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{settings.description}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="gap-1.5 shrink-0 text-primary-600 border-primary-200 hover:bg-primary-50 hover:text-primary-700"
        >
          <FiEdit2 size={13} />
          Edit Settings
        </Button>
      </div>

      {/* Status */}
      <div className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 border',
        settings.isActive
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-gray-50 border-gray-200'
      )}>
        {settings.isActive ? (
          <FiCheck className="text-emerald-600 shrink-0" size={15} />
        ) : (
          <FiX className="text-gray-400 shrink-0" size={15} />
        )}
        <span className={cn(
          'text-sm font-medium',
          settings.isActive ? 'text-emerald-700' : 'text-gray-500'
        )}>
          {settings.isActive ? 'Program is active — residents can apply and ride' : 'Program is inactive — closed to new applicants and riders'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Eligibility */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Eligible Beneficiaries</h3>
          <div className="flex flex-wrap gap-1.5">
            {settings.types?.length ? (
              settings.types.map(t => (
                <span
                  key={t}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded-full border font-medium',
                    TYPE_COLOR[t]
                  )}
                >
                  {TYPE_LABEL[t]}
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-400 italic">None specified</p>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Requirements</h3>
          <p className="text-2xl font-bold text-gray-900">{reqs.length}</p>
          <p className="text-xs text-gray-500">
            {reqs.filter(r => r.required).length} required · {reqs.filter(r => !r.required).length} optional
          </p>
        </div>
      </div>

      {/* Requirements list */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Application Requirements</h3>
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
            <p className="text-sm text-gray-400">No requirements have been set for this program.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Edit Mode ───────────────────────────────────────────────────────────────

interface EditModeProps {
  form: ReturnType<typeof useForm<GovernmentProgramInput>>;
  saving: boolean;
  error: string | null;
  onSave: (data: GovernmentProgramInput) => void;
  onCancel: () => void;
}

const EditMode: React.FC<EditModeProps> = ({ form, saving, error, onSave, onCancel }) => (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSave)} className="space-y-6">

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
          <FiX className="text-red-500 shrink-0 mt-0.5" size={14} />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Program Info */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Program Information</h3>
        </div>
        <div className="p-4 space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Program Name <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Libre Sakay — Borongan City"
                    {...field}
                    className="h-9"
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
                <FormLabel className="text-sm font-medium text-gray-700">Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Brief description of the Libre Sakay program..."
                    rows={3}
                    {...field}
                    className="resize-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Eligibility */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Eligibility & Status</h3>
        </div>
        <div className="p-4 space-y-4">
          <FormField
            control={form.control}
            name="types"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Eligible Beneficiary Types <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                      <Select
                        isMulti
                        hideSelectedOptions={false}
                        menuShouldScrollIntoView={false}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        menuPosition="fixed"
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
                        placeholder="Select beneficiary types..."
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
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm font-medium text-gray-700 cursor-pointer">Activate Program</FormLabel>
                  <p className="text-xs text-gray-500">Inactive programs are hidden from residents</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-medium', field.value ? 'text-emerald-600' : 'text-gray-400')}>
                    {field.value ? 'Active' : 'Inactive'}
                  </span>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Requirements */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Application Requirements</h3>
        </div>
        <div className="p-4 space-y-3">
          <FormField
            control={form.control}
            name="requirements"
            render={({ field }) => {
              const items: RequirementItem[] = field.value || [];
              return (
                <FormItem>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {/* Input type selector */}
                        <select
                          value={item.type}
                          onChange={e => {
                            const updated = [...items];
                            updated[idx] = { ...item, type: e.target.value };
                            field.onChange(updated);
                          }}
                          className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
                        >
                          {INPUT_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>

                        {/* Label */}
                        <Input
                          value={item.label}
                          onChange={e => {
                            const updated = [...items];
                            updated[idx] = { ...item, label: e.target.value };
                            field.onChange(updated);
                          }}
                          placeholder="Requirement description..."
                          className="flex-1 h-9"
                        />

                        {/* Required toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...items];
                            updated[idx] = { ...item, required: !item.required };
                            field.onChange(updated);
                          }}
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

                        {/* Delete */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => field.onChange(items.filter((_, i) => i !== idx))}
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
                      onClick={() => field.onChange([...items, { type: 'text', label: '', required: false }])}
                      className="mt-1 gap-1.5 text-primary-600 border-primary-200 hover:bg-primary-50"
                    >
                      <FiPlus size={13} />
                      Add Requirement
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
          className="gap-1.5 h-9 text-gray-600 border-gray-300 hover:bg-gray-50"
        >
          <FiX size={13} />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="gap-1.5 h-9 bg-primary-600 hover:bg-primary-700"
        >
          <FiSave size={13} />
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </form>
  </Form>
);

// ── Main Component ────────────────────────────────────────────────────────────

export const ProgramSettingsSection: React.FC = () => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<LibreSakayProgramSettings | null>(null);

  const form = useForm<GovernmentProgramInput>({
    resolver: zodResolver(governmentProgramSchema),
    defaultValues: {
      name: '',
      description: '',
      requirements: [],
      types: ['ALL'],
      isActive: true,
    },
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await libreSakayService.getProgramSettings();
        setSettings(data);
        form.reset({
          name: data.name,
          description: data.description || '',
          requirements: parseRequirements(data.requirements),
          types: data.types,
          isActive: data.isActive,
        });
      } catch (err: any) {
        setError(err?.response?.data?.message ?? err.message ?? 'Failed to load program settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [form]);

  const handleSave = async (data: GovernmentProgramInput) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await libreSakayService.updateProgramSettings({
        name: data.name,
        description: data.description,
        requirements: data.requirements,
        types: data.types,
        isActive: data.isActive,
      });
      setSettings(updated);
      setEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (settings) {
      form.reset({
        name: settings.name,
        description: settings.description || '',
        requirements: parseRequirements(settings.requirements),
        types: settings.types,
        isActive: settings.isActive,
      });
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading program settings…</p>
        </CardContent>
      </Card>
    );
  }

  if (error && !settings) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <FiX className="text-red-500" size={18} />
          </div>
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold text-gray-900">Libre Sakay Program</CardTitle>
            <p className="text-xs text-gray-500">
              {editing ? 'Editing program settings' : 'Manage program details, eligibility, and requirements'}
            </p>
          </div>
          {!editing && settings && (
            <span className={cn(
              'text-xs px-2.5 py-1 rounded-full border font-medium',
              settings.isActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-100 text-gray-500 border-gray-200'
            )}>
              {settings.isActive ? '● Active' : '○ Inactive'}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {editing ? (
          <EditMode
            form={form}
            saving={saving}
            error={error}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : settings ? (
          <ViewMode settings={settings} onEdit={() => setEditing(true)} />
        ) : null}
      </CardContent>
    </Card>
  );
};
