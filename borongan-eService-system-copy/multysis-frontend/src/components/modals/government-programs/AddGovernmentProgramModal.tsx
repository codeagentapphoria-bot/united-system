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
import { governmentProgramSchema, type GovernmentProgramInput } from '@/validations/government-program.schema';

const typeOptions: { value: GovernmentProgramType; label: string }[] = [
  { value: 'SENIOR_CITIZEN', label: 'Senior Citizen' },
  { value: 'PWD', label: 'PWD' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'SOLO_PARENT', label: 'Solo Parent' },
  { value: 'ALL', label: 'All Residents' },
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
      requirements: '',
      types: ['SENIOR_CITIZEN'],
      isActive: true,
    },
  });

  const handleFormSubmit = async (data: GovernmentProgramInput) => {
    try {
      await onSubmit(data);
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
      <DialogContent className={cn('max-w-2xl')}>
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
                      value={typeOptions.filter(option => field.value?.includes(option.value))}
                      onChange={selected => field.onChange(selected.map(s => s.value))}
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requirements</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="List the requirements to qualify for this program (optional)"
                      rows={4}
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
