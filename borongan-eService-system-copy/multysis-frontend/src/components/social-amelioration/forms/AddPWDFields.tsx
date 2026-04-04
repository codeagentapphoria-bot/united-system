// React imports
import React from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';
import Select from 'react-select';

// UI Components (shadcn/ui)
import {
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';
import { CitizenSelector, createReactSelectStyles } from '../shared';

// Types and Schemas
import type { PWDInput } from '@/validations/beneficiary.schema';

// Hooks
import { useDisabilityTypes } from '@/hooks/social-amelioration/useDisabilityTypes';

interface AddPWDFieldsProps {
  onAddNewCitizen: () => void;
  isLoadingCitizens: boolean;
  localSearchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCitizen: any;
  onCitizenSelect: (citizen: any) => void;
  programOptions: Array<{ value: string; label: string }>;
  reactSelectStyles: any;
}

export const AddPWDFields: React.FC<AddPWDFieldsProps> = ({
  onAddNewCitizen,
  isLoadingCitizens,
  localSearchQuery,
  onSearchChange,
  selectedCitizen,
  onCitizenSelect,
  programOptions,
  reactSelectStyles,
}) => {
  const form = useFormContext<PWDInput>();
  const { activeDisabilityTypes } = useDisabilityTypes();

  const disabilityTypeOptions = activeDisabilityTypes.map(dt => ({
    value: dt.id, // Use ID instead of name
    label: dt.name,
    description: dt.description,
  }));

  const disabilityLevelOptions = [
    { value: 'Mild', label: 'Mild' },
    { value: 'Moderate', label: 'Moderate' },
    { value: 'Severe', label: 'Severe' },
    { value: 'Profound', label: 'Profound' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Citizen Selection */}
      <CitizenSelector
        localSearchQuery={localSearchQuery}
        onSearchChange={onSearchChange}
        selectedCitizen={selectedCitizen}
        onCitizenSelect={onCitizenSelect}
        onAddNewCitizen={onAddNewCitizen}
        isLoading={isLoadingCitizens}
      />

      <Separator />

      {/* 2. Disability Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-600">Disability Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="disabilityType"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel required>Disability Type</CustomFormLabel>
                <Select
                  value={disabilityTypeOptions.find(option => option.value === field.value)}
                  onChange={(selectedOption) => field.onChange(selectedOption?.value || '')}
                  options={disabilityTypeOptions}
                  placeholder="Select Disability Type"
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
                  styles={createReactSelectStyles(!!form.formState.errors.disabilityType)}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="disabilityLevel"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel required>Disability Level</CustomFormLabel>
                <Select
                  value={disabilityLevelOptions.find(option => option.value === field.value)}
                  onChange={(selectedOption) => field.onChange(selectedOption?.value || '')}
                  options={disabilityLevelOptions}
                  placeholder="Select Disability Level"
                  className="mt-1"
                  classNamePrefix="react-select"
                  isSearchable={false}
                  styles={createReactSelectStyles(!!form.formState.errors.disabilityLevel)}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <Separator />

      {/* 3. Government Programs */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-600">Government Programs</h3>
        
        <FormField
          control={form.control}
          name="governmentPrograms"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel>Select Government Programs</CustomFormLabel>
              <Select
                isMulti
                value={programOptions.filter(option => field.value?.includes(option.value))}
                onChange={(selectedOptions) => {
                  field.onChange(selectedOptions ? selectedOptions.map(option => option.value) : []);
                }}
                options={programOptions}
                placeholder="Select government programs (optional)"
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

