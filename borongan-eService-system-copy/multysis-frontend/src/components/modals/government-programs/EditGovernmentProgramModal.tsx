// React imports
import React, { useEffect } from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Select from 'react-select';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Types
import type { GovernmentProgram, UpdateGovernmentProgramInput } from '@/hooks/social-amelioration/useGovernmentPrograms';

// Utils
import { createReactSelectStyles } from '@/components/social-amelioration/shared';
import { cn } from '@/lib/utils';
import { governmentProgramSchema, type GovernmentProgramInput } from '@/validations/government-program.schema';

const typeOptions = [
  { value: 'SENIOR_CITIZEN', label: 'Senior Citizen' },
  { value: 'PWD', label: 'PWD' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'SOLO_PARENT', label: 'Solo Parent' },
  { value: 'ALL', label: 'All Beneficiaries' },
];

interface EditGovernmentProgramModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: UpdateGovernmentProgramInput) => void;
  governmentProgram: GovernmentProgram | null;
  isLoading?: boolean;
}

export const EditGovernmentProgramModal: React.FC<EditGovernmentProgramModalProps> = ({
  open,
  onClose,
  onSubmit,
  governmentProgram,
  isLoading = false,
}) => {
  const form = useForm<GovernmentProgramInput>({
    resolver: zodResolver(governmentProgramSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'SENIOR_CITIZEN',
      isActive: true,
    },
  });

  useEffect(() => {
    if (governmentProgram) {
      form.reset({
        name: governmentProgram.name,
        description: governmentProgram.description || '',
        type: governmentProgram.type,
        isActive: governmentProgram.isActive,
      });
    }
  }, [governmentProgram, form]);

  const handleFormSubmit = (data: GovernmentProgramInput) => {
    if (governmentProgram) {
      onSubmit(governmentProgram.id, data);
      form.reset();
      onClose();
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn('max-w-2xl')}>
        <DialogHeader>
          <DialogTitle className={cn('text-xl font-semibold text-primary-600')}>
            Edit Government Program
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program Name <span className="text-red-500">required</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Enter program name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beneficiary Type <span className="text-red-500">required</span></FormLabel>
                  <FormControl>
                    <Select
                      value={typeOptions.find(option => option.value === field.value)}
                      onChange={(selectedOption) => field.onChange(selectedOption?.value || 'SENIOR_CITIZEN')}
                      options={typeOptions}
                      placeholder="Select beneficiary type"
                      className="mt-1"
                      classNamePrefix="react-select"
                      isSearchable={false}
                      styles={createReactSelectStyles(!!form.formState.errors.type)}
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
                    <Textarea
                      placeholder="Enter description (optional)"
                      rows={3}
                      {...field}
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
              <Button
                type="submit"
                className="bg-primary-600 hover:bg-primary-700"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Government Program'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

