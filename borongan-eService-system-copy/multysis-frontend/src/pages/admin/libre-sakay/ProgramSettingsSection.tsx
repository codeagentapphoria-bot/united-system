import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import { FiEdit2, FiPlus, FiSave, FiTrash2, FiX } from 'react-icons/fi';

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

const parseRequirements = (raw?: string | null | RequirementItem[]): RequirementItem[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw as string);
    if (Array.isArray(parsed)) return parsed.map(item => ({ required: false, ...item }));
  } catch {}
  return [{ type: 'text', label: raw as string, required: false }];
};

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
        setError(err?.response?.data?.message ?? err.message ?? 'Failed to load settings');
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
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-gray-500">Loading program settings...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && !settings) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-red-600 text-center">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold text-gray-900">Libre Sakay Program Settings</CardTitle>
        {!editing ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="gap-1.5 text-primary-600 border-primary-300 hover:bg-primary-50"
          >
            <FiEdit2 size={14} />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
              className="gap-1.5 text-gray-600"
            >
              <FiX size={14} />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={form.handleSubmit(handleSave)}
              disabled={saving}
              className="gap-1.5 bg-primary-600 hover:bg-primary-700"
            >
              <FiSave size={14} />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {error && editing && (
          <div className="border border-red-300 bg-red-50 rounded px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {editing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
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
                          const values = (selected as { value: GovernmentProgramTypeEnum }[]).map(
                            s => s.value
                          );
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
                render={({ field }) => {
                  const items: RequirementItem[] = field.value || [];
                  return (
                    <FormItem>
                      <FormLabel>Requirements</FormLabel>
                      <div className="space-y-2">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <select
                              value={item.type}
                              onChange={e => {
                                const updated = [...items];
                                updated[idx] = { ...item, type: e.target.value };
                                field.onChange(updated);
                              }}
                              className="h-9 rounded-md border border-input bg-background px-3 text-sm w-36 shrink-0"
                            >
                              {INPUT_TYPE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <Input
                              value={item.label}
                              onChange={e => {
                                const updated = [...items];
                                updated[idx] = { ...item, label: e.target.value };
                                field.onChange(updated);
                              }}
                              placeholder="Requirement label"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...items];
                                updated[idx] = { ...item, required: !item.required };
                                field.onChange(updated);
                              }}
                              className={cn(
                                'shrink-0 text-xs px-2 py-1 rounded border h-9',
                                item.required
                                  ? 'bg-red-50 text-red-600 border-red-300'
                                  : 'text-gray-400 border-gray-200'
                              )}
                            >
                              {item.required ? 'Required' : 'Optional'}
                            </button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => field.onChange(items.filter((_, i) => i !== idx))}
                              className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <FiTrash2 size={14} />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            field.onChange([...items, { type: 'text', label: '', required: false }])
                          }
                          className="text-primary-600 hover:bg-primary-50"
                        >
                          <FiPlus size={14} className="mr-1" />
                          Add Requirement
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-sm font-medium">Active Status</FormLabel>
                      <p className="text-xs text-gray-500 mt-0.5">
                        When inactive, residents cannot apply or ride
                      </p>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        ) : (
          /* View mode */
          <div className="space-y-4">
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status</span>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  settings?.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                )}
              >
                {settings?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Name */}
            <div>
              <p className="text-xs text-gray-500">Program Name</p>
              <p className="text-sm font-medium text-gray-900">{settings?.name ?? '—'}</p>
            </div>

            {/* Eligible Types */}
            <div>
              <p className="text-xs text-gray-500">Eligible Beneficiary Types</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {settings?.types?.length ? (
                  settings.types.map(t => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200"
                    >
                      {TYPE_LABEL[t]}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">None</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="text-xs text-gray-500">Description</p>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {settings?.description || <span className="text-gray-400">No description</span>}
              </p>
            </div>

            {/* Requirements */}
            <div>
              <p className="text-xs text-gray-500">Requirements</p>
              {(() => {
                const reqs = parseRequirements(settings?.requirements);
                return reqs.length > 0 ? (
                  <ul className="mt-1.5 space-y-1">
                    {reqs.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span
                        className={cn(
                          'mt-0.5 w-1.5 h-1.5 rounded-full shrink-0',
                          req.required ? 'bg-red-400' : 'bg-gray-300'
                        )}
                      />
                      <span className="text-gray-700">
                        <span className="font-medium text-gray-900">
                          [{INPUT_TYPE_OPTIONS.find(o => o.value === req.type)?.label ?? req.type}]
                        </span>{' '}
                        {req.label}
                        {req.required && (
                          <span className="ml-1 text-xs text-red-500">(Required)</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 mt-1">No requirements</p>
              );
              })()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
