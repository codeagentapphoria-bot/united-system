// React imports
import React from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';
import Select from 'react-select';

// UI Components (shadcn/ui)
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';

// Types and Schemas
import type { EditProfileInput } from '@/validations/subscriber.schema';

// Utils
import { cn } from '@/lib/utils';

const reactSelectStyles = {
  control: (base: any) => ({
    ...base,
    minHeight: '40px',
    borderColor: '#d1d9e3',
    '&:hover': { borderColor: '#4c6085' },
  }),
  menu: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),
};

const extensionOptions = [
  { value: 'none', label: 'None' },
  { value: 'Jr.', label: 'Jr.' },
  { value: 'Sr.', label: 'Sr.' },
  { value: 'II', label: 'II' },
  { value: 'III', label: 'III' },
  { value: 'IV', label: 'IV' },
];

const civilStatusOptions = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'separated', label: 'Separated' },
];

const sexOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

interface PersonalInfoFieldsProps {
  disabled?: boolean;
}

export const PersonalInfoFields: React.FC<PersonalInfoFieldsProps> = ({ disabled = false }) => {
  const form = useFormContext<EditProfileInput>();

  return (
    <div className={cn("md:col-span-9 space-y-4")}>
      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel required={!disabled}>First Name</CustomFormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="First name"
                  className="h-10"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="middleName"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel>Middle Name</CustomFormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Middle name"
                  className="h-10"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel required>Last Name</CustomFormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Last name"
                  className="h-10"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="extensionName"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel>Extension Name</CustomFormLabel>
              <FormControl>
                <Select
                  options={extensionOptions}
                  placeholder="Select extension"
                  isClearable
                  isDisabled={disabled}
                  styles={reactSelectStyles}
                  value={extensionOptions.find(opt => opt.value === field.value)}
                  onChange={(option) => field.onChange(option?.value || '')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel>Email</CustomFormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="email@example.com"
                  className="h-10"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel required>Phone Number</CustomFormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="+639171234567"
                  className="h-10"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Additional Personal Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="civilStatus"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel required>Civil Status</CustomFormLabel>
              <FormControl>
                <Select
                  options={civilStatusOptions}
                  placeholder="Select civil status"
                  isDisabled={disabled}
                  styles={reactSelectStyles}
                  value={civilStatusOptions.find(opt => opt.value === field.value)}
                  onChange={(option) => field.onChange(option?.value || '')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sex"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel required>Sex</CustomFormLabel>
              <FormControl>
                <Select
                  options={sexOptions}
                  placeholder="Select sex"
                  isDisabled={disabled}
                  styles={reactSelectStyles}
                  value={sexOptions.find(opt => opt.value === field.value)}
                  onChange={(option) => field.onChange(option?.value || '')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="birthdate"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel required>Birthdate</CustomFormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="date"
                  className="h-10"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

