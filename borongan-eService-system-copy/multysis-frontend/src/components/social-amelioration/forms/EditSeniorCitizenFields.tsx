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
import { CitizenDisplayCard } from '../shared';

// Types and Schemas
import type { SeniorCitizenInput } from '@/validations/beneficiary.schema';

// Hooks
import { useClassificationOptions } from '@/hooks/useClassificationOptions';

interface EditSeniorCitizenFieldsProps {
  selectedCitizen: any;
  initialData?: any;
  existingBeneficiaries?: any[];
}

export const EditSeniorCitizenFields: React.FC<EditSeniorCitizenFieldsProps> = ({
  selectedCitizen,
  initialData,
  existingBeneficiaries = [],
}) => {
  const form = useFormContext<SeniorCitizenInput>();
  const { data: seniorType, loading } = useClassificationOptions('Senior Citizen');

  const fetchedPensionTypes: string[] =
    seniorType?.details.find(f => f.key === 'pensionTypes')?.options ?? [];

  // Get existing pension types for the selected citizen (excluding current beneficiary)
  const existingPensionTypes = useMemo(() => {
    if (!selectedCitizen || !initialData) return [];
    const currentBeneficiaryId = initialData.id;
    return existingBeneficiaries
      .filter(b =>
        b.id !== currentBeneficiaryId &&
        (b.citizenId === selectedCitizen.id || (b.citizen && b.citizen.id === selectedCitizen.id))
      )
      .flatMap(b => {
        const details = b.classification_details;
        return details?.pensionTypes ?? (b.pensionTypes ?? []);
      })
      .filter(Boolean);
  }, [selectedCitizen?.id, existingBeneficiaries, initialData?.id]);

  const availableOptions = fetchedPensionTypes.filter(opt => !existingPensionTypes.includes(opt));

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
                  {existingPensionTypes.map((ptName, idx) => (
                    <li key={idx}>{ptName}</li>
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
