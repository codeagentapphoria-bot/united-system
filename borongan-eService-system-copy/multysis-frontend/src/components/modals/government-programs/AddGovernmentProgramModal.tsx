// React imports
import React from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Select from 'react-select';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Types
import type { CreateGovernmentProgramInput } from '@/hooks/social-amelioration/useGovernmentPrograms';
import type { GovernmentProgramType } from '@/services/api/government-program.service';

// Utils
import { createReactSelectStyles } from '@/components/social-amelioration/shared';
import { cn } from '@/lib/utils';
import {
  governmentProgramSchema,
  type GovernmentProgramInput,
  type RequirementItem,
} from '@/validations/government-program.schema';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

const typeOptions: { value: GovernmentProgramType; label: string }[] = [
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
      requirements: [],
      types: ['SENIOR_CITIZEN'],
      isActive: true,
    },
  });

  const handleFormSubmit = async (data: GovernmentProgramInput) => {
    try {
      const submitData: CreateGovernmentProgramInput = {
        ...data,
        requirements: data.requirements?.length ? JSON.stringify(data.requirements) : undefined,
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
                      value={typeOptions.filter(option => field.value?.includes(option.value))}
                      onChange={selected => {
                        const values = selected.map(s => s.value);
                        if (values.includes('ALL') && !field.value?.includes('ALL')) {
                          field.onChange(['ALL']);
                        } else if (field.value?.includes('ALL') && values.length > 1) {
                          field.onChange(values.filter(v => v !== 'ALL'));
                        } else {
                          field.onChange(values);
                        }
                      }}
                      options={typeOptions}
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
                              item.required ? 'bg-red-50 text-red-600 border-red-300' : 'text-gray-400 border-gray-200'
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
                        onClick={() => field.onChange([...items, { type: 'text', label: '', required: false }])}
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
