// React imports
import React, { useEffect } from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';

// UI Components (shadcn/ui)
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';
import { CitizenDisplayCard } from '../shared';

// Types and Schemas
import type { StudentInput } from '@/validations/beneficiary.schema';

// Hooks
import { useClassificationOptions } from '@/hooks/useClassificationOptions';

// ---------------------------------------------------------------------------
// Education level detection
// ---------------------------------------------------------------------------
type EducationLevel = 'k12' | 'college' | 'vocational';

const getEducationLevel = (educationAttainment?: string): EducationLevel => {
  if (!educationAttainment) return 'k12';
  const lower = educationAttainment.toLowerCase();
  if (
    lower.includes('college') ||
    lower.includes('bachelor') ||
    lower.includes('graduate') ||
    lower.includes('master') ||
    lower.includes('doctorate') ||
    lower.includes('university')
  ) {
    return 'college';
  }
  if (
    lower.includes('vocational') ||
    lower.includes('technical') ||
    lower.includes('tesda')
  ) {
    return 'vocational';
  }
  return 'k12';
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface EditStudentFieldsProps {
  selectedCitizen: any | null;
}

export const EditStudentFields: React.FC<EditStudentFieldsProps> = ({
  selectedCitizen,
}) => {
  const form = useFormContext<StudentInput>();

  const { data: studentType, loading: studentLoading } = useClassificationOptions('Student');
  const { loading: collegeLoading } = useClassificationOptions('College Student');
  const { data: vocationalType, loading: vocationalLoading } = useClassificationOptions('Vocational Student');

  const isLoading = studentLoading || collegeLoading || vocationalLoading;

  const educationLevel = getEducationLevel(selectedCitizen?.educationAttainment);

  // Pre-fill form values from selectedCitizen's saved classification_details
  // (flattened fields from normalizeBeneficiary / backend formatStudentBeneficiary)
  useEffect(() => {
    if (!selectedCitizen) return;

    if (selectedCitizen.gradeLevel) {
      form.setValue('gradeLevel', selectedCitizen.gradeLevel);
    }
    if (selectedCitizen.courseField) {
      form.setValue('courseField', selectedCitizen.courseField);
    }
    if (selectedCitizen.ncLevel) {
      form.setValue('ncLevel', selectedCitizen.ncLevel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCitizen]);

  const gradeLevelOptions: string[] =
    studentType?.details.find((f) => f.key === 'gradeLevel')?.options ?? [];

  const ncLevelOptions: string[] =
    vocationalType?.details.find((f) => f.key === 'ncLevel')?.options ?? [];

  return (
    <div className="space-y-6">
      {/* 1. Citizen Information (Read-only) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-600">Citizen Information</h3>
        <CitizenDisplayCard citizen={selectedCitizen} />
      </div>

      <Separator />

      {/* 2. Student Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-600">Student Information</h3>

        {/* ── K-12: gradeLevel Select ── */}
        {educationLevel === 'k12' && (
          <FormField
            control={form.control}
            name="gradeLevel"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel required>Grade Level</CustomFormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade level" />
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
        )}

        {/* ── College: courseField Input (free text — no fixed options) ── */}
        {educationLevel === 'college' && (
          <FormField
            control={form.control}
            name="courseField"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel>Course / Program</CustomFormLabel>
                <Input
                  {...field}
                  placeholder="e.g., BS Computer Engineering"
                  disabled={isLoading}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* ── Vocational: ncLevel Select + courseField Input ── */}
        {educationLevel === 'vocational' && (
          <>
            <FormField
              control={form.control}
              name="ncLevel"
              render={({ field }) => (
                <FormItem>
                  <CustomFormLabel>NC Level (TESDA Qualification)</CustomFormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select NC level" />
                    </SelectTrigger>
                    <SelectContent>
                      {ncLevelOptions.map((opt) => (
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
              name="courseField"
              render={({ field }) => (
                <FormItem>
                  <CustomFormLabel>Course / Program</CustomFormLabel>
                  <Input
                    {...field}
                    placeholder="e.g., Computer Programming"
                    disabled={isLoading}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </div>

      <Separator />
    </div>
  );
};
