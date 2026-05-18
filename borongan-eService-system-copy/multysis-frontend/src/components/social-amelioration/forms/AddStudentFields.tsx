// React imports
import React from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';

// UI Components (shadcn/ui)
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';
import { CitizenSelector } from '../shared';

// Hooks
import { useClassificationOptions } from '@/hooks/useClassificationOptions';

// Types and Schemas
import type { StudentInput } from '@/validations/beneficiary.schema';

interface AddStudentFieldsProps {
  onAddNewCitizen: () => void;
  isLoadingCitizens: boolean;
  localSearchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCitizen: any | null;
  onCitizenSelect: (citizen: any | null) => void;
  filteredCitizens: any[];
}

export const AddStudentFields: React.FC<AddStudentFieldsProps> = ({
  onAddNewCitizen,
  isLoadingCitizens,
  localSearchQuery,
  onSearchChange,
  selectedCitizen,
  onCitizenSelect,
  filteredCitizens,
}) => {
  const form = useFormContext<StudentInput>();

  const { data: studentType, loading } = useClassificationOptions('Student');
  const gradeLevelOptions: string[] = (
    studentType?.details.find((f) => f.key === 'gradeLevel')?.options ?? []
  );

  // Pre-fill form when citizen is selected
  React.useEffect(() => {
    if (selectedCitizen) {
      form.setValue('citizenId', selectedCitizen.id);
    }
  }, [selectedCitizen, form]);

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
                value={field.value}
                onValueChange={field.onChange}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Grade Level" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevelOptions.map((opt) => (
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
