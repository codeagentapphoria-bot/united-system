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
import { CitizenDisplayCard } from '../shared';
import { createReactSelectStyles } from '../shared';

// Types and Schemas
import type { SoloParentInput } from '@/validations/beneficiary.schema';

// Hooks
import { useSoloParentCategories } from '@/hooks/social-amelioration/useSoloParentCategories';

interface EditSoloParentFieldsProps {
  selectedCitizen: any;
  programOptions: Array<{ value: string; label: string }>;
  reactSelectStyles: any;
}

export const EditSoloParentFields: React.FC<EditSoloParentFieldsProps> = ({ 
  selectedCitizen,
  programOptions,
  reactSelectStyles,
}) => {
  const form = useFormContext<SoloParentInput>();
  const { activeSoloParentCategories } = useSoloParentCategories();

  const categoryOptions = activeSoloParentCategories.map(cat => ({
    value: cat.id, // Use ID instead of name
    label: cat.name,
    description: cat.description,
  }));

  const categoryReactSelectStyles = createReactSelectStyles(!!form.formState.errors.category);

  return (
    <div className="space-y-6">
      {/* 1. Citizen Selection (Read-only in edit mode) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-600">Citizen</h3>
        <CitizenDisplayCard citizen={selectedCitizen} />
      </div>

      <Separator />

      {/* 2. Category */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-600">Solo Parent Information</h3>
        
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel required>Category</CustomFormLabel>
              <Select
                value={categoryOptions.find(option => option.value === field.value)}
                onChange={(selectedOption) => field.onChange(selectedOption?.value || '')}
                options={categoryOptions}
                placeholder="Select Category"
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
                styles={categoryReactSelectStyles}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator />

      {/* 3. Assistance Programs */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-600">Assistance Programs</h3>
        
        <FormField
          control={form.control}
          name="assistancePrograms"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel>Select Assistance Programs</CustomFormLabel>
              <Select
                isMulti
                value={programOptions.filter(option => field.value?.includes(option.value))}
                onChange={(selectedOptions) => {
                  field.onChange(selectedOptions ? selectedOptions.map(option => option.value) : []);
                }}
                options={programOptions}
                placeholder="Select assistance programs (optional)"
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

