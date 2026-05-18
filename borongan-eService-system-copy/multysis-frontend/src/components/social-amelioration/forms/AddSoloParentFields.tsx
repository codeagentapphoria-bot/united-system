// React imports
import React from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';
import Select from 'react-select';

// UI Components (shadcn/ui)
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';
import { CitizenSelector } from '../shared';
import { createReactSelectStyles } from '../shared';

// Types and Schemas
import type { SoloParentInput } from '@/validations/beneficiary.schema';

// Hooks
import { useClassificationOptions } from '@/hooks/useClassificationOptions';

interface AddSoloParentFieldsProps {
  onAddNewCitizen: () => void;
  isLoadingCitizens: boolean;
  localSearchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCitizen: any;
  onCitizenSelect: (citizen: any) => void;
  filteredCitizens: any[];
  reactSelectStyles: any;
  categoryOptions: string[];
  isLoadingCategories?: boolean;
}

export const AddSoloParentFields: React.FC<AddSoloParentFieldsProps> = ({
  onAddNewCitizen,
  isLoadingCitizens,
  localSearchQuery,
  onSearchChange,
  selectedCitizen,
  onCitizenSelect,
  filteredCitizens,
  reactSelectStyles: _reactSelectStyles,
  categoryOptions,
  isLoadingCategories,
}) => {
  const form = useFormContext<SoloParentInput>();

  const categoryReactSelectStyles = createReactSelectStyles(!!form.formState.errors.category);

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
                value={categoryOptions.find(option => option === field.value) ?? null}
                onChange={selectedOption => field.onChange((selectedOption as any)?.value ?? '')}
                options={categoryOptions.map(opt => ({ value: opt, label: opt }))}
                placeholder="Select Category"
                className="mt-1"
                classNamePrefix="react-select"
                isSearchable={true}
                isDisabled={isLoadingCategories}
                isLoading={isLoadingCategories}
                styles={categoryReactSelectStyles}
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
