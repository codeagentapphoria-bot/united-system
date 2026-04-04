// React imports
import React from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';

// UI Components (shadcn/ui)
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';

// Types and Schemas
import type { EditProfileInput } from '@/validations/subscriber.schema';

// Utils
import { cn } from '@/lib/utils';

interface MotherInfoFieldsProps {
  disabled?: boolean;
}

export const MotherInfoFields: React.FC<MotherInfoFieldsProps> = ({ disabled = false }) => {
  const form = useFormContext<EditProfileInput>();

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4")}>
      <FormField
        control={form.control}
        name="motherFirstName"
        render={({ field }) => (
          <FormItem>
            <CustomFormLabel>Mother's First Name</CustomFormLabel>
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
        name="motherMiddleName"
        render={({ field }) => (
          <FormItem>
            <CustomFormLabel>Mother's Middle Name</CustomFormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="Middle name"
                className="h-10"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="motherLastName"
        render={({ field }) => (
          <FormItem>
            <CustomFormLabel>Mother's Last Name</CustomFormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="Last name"
                className="h-10"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

