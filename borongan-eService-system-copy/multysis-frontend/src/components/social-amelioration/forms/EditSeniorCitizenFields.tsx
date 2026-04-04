// React imports
import React, { useMemo } from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';
import Select from 'react-select';

// UI Components (shadcn/ui)
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';
import { CitizenDisplayCard, createReactSelectStyles } from '../shared';

// Types and Schemas
import type { SeniorCitizenInput } from '@/validations/beneficiary.schema';

// Hooks
import { usePensionTypes } from '@/hooks/social-amelioration/usePensionTypes';

interface EditSeniorCitizenFieldsProps {
  selectedCitizen: any;
  initialData?: any;
  existingBeneficiaries?: any[];
  programOptions: Array<{ value: string; label: string }>;
  reactSelectStyles: any;
}

export const EditSeniorCitizenFields: React.FC<EditSeniorCitizenFieldsProps> = ({
  selectedCitizen,
  initialData,
  existingBeneficiaries = [],
  programOptions,
  reactSelectStyles: _reactSelectStyles,
}) => {
  const form = useFormContext<SeniorCitizenInput>();
  const { activePensionTypes } = usePensionTypes();

  // Get existing pension types for the selected citizen (excluding current beneficiary)
  const existingPensionTypes = useMemo(() => {
    if (!selectedCitizen || !initialData) return [];
    const currentBeneficiaryId = initialData.id;
    return existingBeneficiaries
      .filter(b => 
        b.id !== currentBeneficiaryId && // Exclude current beneficiary
        (b.citizenId === selectedCitizen.id || (b.citizen && b.citizen.id === selectedCitizen.id))
      )
      .flatMap(b => b.pensionTypes || [])
      .filter(Boolean);
  }, [selectedCitizen?.id, existingBeneficiaries, initialData?.id]);

  const pensionTypeOptions = activePensionTypes
    .filter(pt => !existingPensionTypes.includes(pt.id)) // Filter out already assigned pensions by ID
    .map(pt => ({
      value: pt.id, // Use ID instead of name
      label: pt.name,
      description: pt.description,
    }));

  const pensionReactSelectStyles = createReactSelectStyles(!!form.formState.errors.pensionTypes);
  const programReactSelectStyles = createReactSelectStyles(!!form.formState.errors.governmentPrograms);

  return (
    <div className="space-y-6">
      {/* 1. Citizen Selection (Read-only in edit mode) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-600">Citizen</h3>
        <CitizenDisplayCard citizen={selectedCitizen} />
      </div>

      <Separator />

      {/* 2. Pension Types (Multiple) */}
      <FormField
        control={form.control}
        name="pensionTypes"
        render={({ field }) => (
          <FormItem>
            <CustomFormLabel required>Pension Types</CustomFormLabel>
            {selectedCitizen && existingPensionTypes.length > 0 && (
              <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                <p className="font-medium">Existing pensions for this citizen (excluding current):</p>
                <ul className="list-disc list-inside mt-1">
                  {existingPensionTypes.map((ptId, idx) => {
                    const pensionType = activePensionTypes.find(pt => pt.id === ptId);
                    return <li key={idx}>{pensionType?.name || ptId}</li>;
                  })}
                </ul>
                <p className="mt-1 text-xs">These cannot be selected again.</p>
              </div>
            )}
            <Select
              isMulti
              value={pensionTypeOptions.filter(option => field.value?.includes(option.value))}
              onChange={(selectedOptions) => {
                const values = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
                field.onChange(values);
              }}
              options={pensionTypeOptions}
              placeholder="Select Pension Types"
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
              styles={pensionReactSelectStyles}
            />
            <FormMessage />
          </FormItem>
        )}
      />

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
                styles={programReactSelectStyles}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

