// React imports
import React, { useMemo } from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';

// UI Components (shadcn/ui)
import { Checkbox } from '@/components/ui/checkbox';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';
import { CitizenSelector } from '../shared';

// Types and Schemas
import type { SeniorCitizenInput } from '@/validations/beneficiary.schema';

// Hooks
import { useClassificationOptions } from '@/hooks/useClassificationOptions';

interface AddSeniorCitizenFieldsProps {
  onAddNewCitizen: () => void;
  isLoadingCitizens: boolean;
  localSearchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCitizen: any;
  onCitizenSelect: (citizen: any) => void;
  filteredCitizens: any[];
  existingBeneficiaries?: any[];
  reactSelectStyles: any;
}

export const AddSeniorCitizenFields: React.FC<AddSeniorCitizenFieldsProps> = ({
  onAddNewCitizen,
  isLoadingCitizens,
  localSearchQuery,
  onSearchChange,
  selectedCitizen,
  onCitizenSelect,
  filteredCitizens,
  existingBeneficiaries = [],
  reactSelectStyles: _reactSelectStyles,
}) => {
  const form = useFormContext<SeniorCitizenInput>();
  const { data: seniorType, loading } = useClassificationOptions('Senior Citizen');
  const pensionOptions: string[] = (
    seniorType?.details.find((f) => f.key === 'pensionTypes')?.options ?? []
  );

  // Get existing pension types for the selected citizen to prevent duplicates
  const existingPensionTypes = useMemo(() => {
    if (!selectedCitizen) return new Set<string>();
    return new Set(
      existingBeneficiaries
        .filter(b => b.citizenId === selectedCitizen.id || (b.citizen && b.citizen.id === selectedCitizen.id))
        .flatMap(b => b.pensionTypes || [])
        .filter(Boolean)
    );
  }, [selectedCitizen, existingBeneficiaries]);

  const availableOptions = pensionOptions.filter(opt => !existingPensionTypes.has(opt));

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

      {/* 2. Pension Types (Multiple) */}
      <FormField
        control={form.control}
        name="pensionTypes"
        render={({ field }) => (
          <FormItem>
            <CustomFormLabel required>Pension Types</CustomFormLabel>
            {selectedCitizen && existingPensionTypes.size > 0 && (
              <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                <p className="font-medium">Existing pensions for this citizen:</p>
                <ul className="list-disc list-inside mt-1">
                  {Array.from(existingPensionTypes).map((pt, idx) => (
                    <li key={idx}>{pt}</li>
                  ))}
                </ul>
                <p className="mt-1 text-xs">These cannot be selected again.</p>
              </div>
            )}
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading pension types...</p>
            ) : (
              <div className="space-y-2">
                {availableOptions.map((opt) => {
                  const selected = (field.value as string[] ?? []).includes(opt);
                  return (
                    <div key={opt} className="flex items-center gap-2">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) => {
                          const prev = (field.value as string[]) ?? [];
                          const next = checked
                            ? Array.from(new Set([...prev, opt]))
                            : prev.filter((v) => v !== opt);
                          field.onChange(next);
                        }}
                      />
                      <FormLabel className="font-normal cursor-pointer">{opt}</FormLabel>
                    </div>
                  );
                })}
                {availableOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No pension types available.</p>
                )}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      <Separator />
    </div>
  );
};
