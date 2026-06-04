// React imports
import React from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';

// UI Components (shadcn/ui)
import {
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';
import { CitizenDisplayCard } from '../shared';

// Types and Schemas
import type { PWDInput } from '@/validations/beneficiary.schema';

// Hooks
import { useClassificationOptions } from '@/hooks/useClassificationOptions';

interface EditPWDFieldsProps {
  selectedCitizen: any;
}

export const EditPWDFields: React.FC<EditPWDFieldsProps> = ({
  selectedCitizen,
}) => {
  const form = useFormContext<PWDInput>();
  const { data: pwdType, loading: isLoadingCategories } = useClassificationOptions('Person with Disability');

  const fetchedDisabilityTypes: string[] =
    pwdType?.details.find(f => f.key === 'disabilityType')?.options ?? [];

  const disabilityLevelOptions = [
    { value: 'Mild', label: 'Mild' },
    { value: 'Moderate', label: 'Moderate' },
    { value: 'Severe', label: 'Severe' },
    { value: 'Profound', label: 'Profound' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Citizen Selection (Read-only in edit mode) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-600">Citizen</h3>
        <CitizenDisplayCard citizen={selectedCitizen} />
      </div>

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
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoadingCategories}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select disability type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fetchedDisabilityTypes.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select disability level" />
                  </SelectTrigger>
                  <SelectContent>
                    {disabilityLevelOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <Separator />
    </div>
  );
};

