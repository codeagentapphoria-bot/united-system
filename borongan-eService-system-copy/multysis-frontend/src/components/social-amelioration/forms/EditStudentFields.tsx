// React imports
import React from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';
import Select from 'react-select';

// UI Components (shadcn/ui)
import {
    FormField,
    FormItem,
    FormMessage
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';
import { CitizenDisplayCard } from '../shared';

// Types and Schemas
import type { StudentInput } from '@/validations/beneficiary.schema';

interface EditStudentFieldsProps {
  selectedCitizen: any | null;
  gradeLevelOptions: Array<{ value: string; label: string; description?: string }>;
  programOptions: Array<{ value: string; label: string }>;
  reactSelectStyles: any;
}

export const EditStudentFields: React.FC<EditStudentFieldsProps> = ({
  selectedCitizen,
  gradeLevelOptions,
  programOptions,
  reactSelectStyles,
}) => {
  const form = useFormContext<StudentInput>();

  return (
    <div className="space-y-6">
      {/* 1. Citizen Information (Read-only) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-600">Citizen Information</h3>
        <CitizenDisplayCard citizen={selectedCitizen} />
      </div>

      <Separator />

      {/* 2. Grade Level */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-600">Student Information</h3>
        
        <FormField
          control={form.control}
          name="gradeLevel"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel required>Grade Level</CustomFormLabel>
              <Select
                value={gradeLevelOptions.find(option => option.value === field.value)}
                onChange={(selectedOption) => field.onChange(selectedOption?.value || '')}
                options={gradeLevelOptions}
                placeholder="Select Grade Level"
                className="mt-1"
                classNamePrefix="react-select"
                isSearchable={true}
                formatOptionLabel={(option) => (
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-gray-500 mt-1">{option.description}</span>
                    )}
                  </div>
                )}
                styles={reactSelectStyles}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator />

      {/* 3. Programs */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-600">Programs</h3>
        
        <FormField
          control={form.control}
          name="programs"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel>Select Programs</CustomFormLabel>
              <Select
                isMulti
                value={programOptions.filter(option => field.value?.includes(option.value))}
                onChange={(selectedOptions) => {
                  field.onChange(selectedOptions ? selectedOptions.map(option => option.value) : []);
                }}
                options={programOptions}
                placeholder="Select programs (optional)"
                className="mt-1"
                classNamePrefix="react-select"
                isSearchable={true}
                styles={reactSelectStyles}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

