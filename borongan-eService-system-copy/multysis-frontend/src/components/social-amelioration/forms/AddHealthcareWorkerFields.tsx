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
import { CitizenSelector } from '../shared';

// Types and Schemas
import type { HealthcareWorkerInput } from '@/validations/beneficiary.schema';

interface AddHealthcareWorkerFieldsProps {
  onAddNewCitizen: () => void;
  isLoadingCitizens: boolean;
  localSearchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCitizen: any;
  onCitizenSelect: (citizen: any) => void;
  filteredCitizens: any[];
}

export const AddHealthcareWorkerFields: React.FC<AddHealthcareWorkerFieldsProps> = ({
  onAddNewCitizen,
  isLoadingCitizens,
  localSearchQuery,
  onSearchChange,
  selectedCitizen,
  onCitizenSelect,
  filteredCitizens,
}) => {
  const form = useFormContext<HealthcareWorkerInput>();

  return (
    <div className="space-y-6">
      {/* 1. Citizen Selection */}
      <CitizenSelector
        localSearchQuery={localSearchQuery}
        onSearchChange={onSearchChange}
        selectedCitizen={selectedCitizen}
        onCitizenSelect={onCitizenSelect}
        onAddNewCitizen={onAddNewCitizen}
        filteredCitizens={filteredCitizens}
        isLoading={isLoadingCitizens}
      />

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
