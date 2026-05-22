// React imports
import React from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';

// UI Components (shadcn/ui)
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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

  const { data: studentType, loading: studentLoading } = useClassificationOptions('Student');
  const { loading: collegeLoading } = useClassificationOptions('College Student');
  const { data: vocationalType, loading: vocationalLoading } = useClassificationOptions('Vocational Student');

  const gradeLevelOptions: string[] =
    studentType?.details.find((f) => f.key === 'gradeLevel')?.options ?? [];
  const ncLevelOptions: string[] =
    vocationalType?.details.find((f) => f.key === 'ncLevel')?.options ?? [];

  const isLoading = studentLoading || collegeLoading || vocationalLoading;

  // Detect education level from selectedCitizen.educationAttainment — used as default
  const educationAttainment = selectedCitizen?.educationAttainment ?? '';

  const detectedEducationLevel = ((): 'k12' | 'college' | 'vocational' => {
    const v = educationAttainment.toLowerCase();
    if (
      v.includes('college') ||
      v.includes('bachelor') ||
      v.includes('graduate') ||
      v.includes('master') ||
      v.includes('doctorate') ||
      v.includes('university')
    ) {
      return 'college';
    }
    if (v.includes('vocational') || v.includes('technical') || v.includes('tesda')) {
      return 'vocational';
    }
    return 'k12';
  })();

  // Local state for student type — defaults to auto-detected value, user can override
  const [studentTypeLevel, setStudentTypeLevel] = React.useState<'k12' | 'college' | 'vocational'>(
    detectedEducationLevel
  );

  // Pre-fill form when citizen is selected
  React.useEffect(() => {
    if (selectedCitizen) {
      form.setValue('citizenId', selectedCitizen.id);
      // Reset student type to detected value when a new citizen is selected
      setStudentTypeLevel(detectedEducationLevel);
    }
  }, [selectedCitizen, form]);

  if (isLoading) {
    return (
      <div className="space-y-6">
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
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

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

      {/* 2. Student Information — conditional on studentTypeLevel */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-600">Student Information</h3>

        {/* Student Type — user selects manually; defaults to auto-detected education level */}
        <FormItem>
          <CustomFormLabel required>Student Type</CustomFormLabel>
          <Select
            value={studentTypeLevel}
            onValueChange={(val: 'k12' | 'college' | 'vocational') => setStudentTypeLevel(val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Student Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="k12">K-12 (Elementary to Senior High)</SelectItem>
              <SelectItem value="college">College / University</SelectItem>
              <SelectItem value="vocational">Vocational / TESDA</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>

        {/* K-12: Elementary / JHS / SHS → Student classification → gradeLevel dropdown */}
        {studentTypeLevel === 'k12' && (
          <FormField
            control={form.control}
            name="gradeLevel"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel required>Grade Level</CustomFormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
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
        )}

        {/* College → College Student classification → courseField text input */}
        {studentTypeLevel === 'college' && (
          <FormField
            control={form.control}
            name="courseField"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel required>Course / Program</CustomFormLabel>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  placeholder="e.g., BS Computer Engineering"
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Vocational/TESDA → Vocational Student classification → ncLevel + courseField */}
        {studentTypeLevel === 'vocational' && (
          <>
            <FormField
              control={form.control}
              name="ncLevel"
              render={({ field }) => (
                <FormItem>
                  <CustomFormLabel required>NC Level / Qualification</CustomFormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select NC Level" />
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
                    value={field.value ?? ''}
                    placeholder="e.g., Computer Programming"
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
