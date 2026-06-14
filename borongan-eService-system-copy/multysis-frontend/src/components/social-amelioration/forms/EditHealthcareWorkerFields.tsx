// React imports
import React from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';

// UI Components (shadcn/ui)
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';
import { CitizenDisplayCard } from '../shared';

// Types and Schemas
import type { HealthcareWorkerInput } from '@/validations/beneficiary.schema';

interface EditHealthcareWorkerFieldsProps {
  selectedCitizen: any;
}

export const EditHealthcareWorkerFields: React.FC<EditHealthcareWorkerFieldsProps> = ({
  selectedCitizen,
}) => {
  const form = useFormContext<HealthcareWorkerInput>();

  return (
    <div className="space-y-6">
      {/* 1. Citizen Selection (Read-only in edit mode) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-teal-600">Citizen</h3>
        <CitizenDisplayCard citizen={selectedCitizen} />
      </div>

      <Separator />

      {/* 2. Healthcare Worker Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-teal-600">Healthcare Worker Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="occupation"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel required>Occupation</CustomFormLabel>
                <Input
                  {...field}
                  placeholder="e.g., Nurse, Doctor, Midwife"
                  value={field.value ?? ''}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="workplace"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel>Workplace</CustomFormLabel>
                <Input
                  {...field}
                  placeholder="e.g., Municipal Health Center, Hospital"
                  value={field.value ?? ''}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel>Remarks</CustomFormLabel>
              <Input
                {...field}
                placeholder="Additional notes (optional)"
                value={field.value ?? ''}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator />
    </div>
  );
};
