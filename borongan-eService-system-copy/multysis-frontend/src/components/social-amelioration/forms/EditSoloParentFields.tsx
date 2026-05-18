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
import type { SoloParentInput } from '@/validations/beneficiary.schema';

// Hooks
import { useClassificationOptions } from '@/hooks/useClassificationOptions';

interface EditSoloParentFieldsProps {
  selectedCitizen: any;
  categoryOptions: string[];
  loading?: boolean;
}

export const EditSoloParentFields: React.FC<EditSoloParentFieldsProps> = ({
  selectedCitizen,
  categoryOptions,
  loading,
}) => {
  const form = useFormContext<SoloParentInput>();
  const { data: soloParentType } = useClassificationOptions('Solo Parent');

  const fetchedCategories: string[] =
    soloParentType?.details.find(f => f.key === 'category')?.options ?? categoryOptions;

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
                value={field.value}
                onValueChange={field.onChange}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {fetchedCategories.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator />
    </div>
  );
};

