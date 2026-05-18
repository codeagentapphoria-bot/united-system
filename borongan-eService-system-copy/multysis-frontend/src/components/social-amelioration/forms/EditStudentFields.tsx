// React imports
import React from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';

// UI Components (shadcn/ui)
import {
    FormField,
    FormItem,
    FormMessage
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
import type { StudentInput } from '@/validations/beneficiary.schema';

// Hooks
import { useClassificationOptions } from '@/hooks/useClassificationOptions';

interface EditStudentFieldsProps {
  selectedCitizen: any | null;
  gradeLevelOptions: string[];
  loading?: boolean;
}

export const EditStudentFields: React.FC<EditStudentFieldsProps> = ({
  selectedCitizen,
  gradeLevelOptions,
  loading,
}) => {
  const form = useFormContext<StudentInput>();
  const { data: studentType } = useClassificationOptions('Student');

  const fetchedGradeLevels: string[] =
    studentType?.details.find(f => f.key === 'gradeLevel')?.options ?? gradeLevelOptions;

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
                value={field.value}
                onValueChange={field.onChange}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade level" />
                </SelectTrigger>
                <SelectContent>
                  {fetchedGradeLevels.map((opt) => (
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

