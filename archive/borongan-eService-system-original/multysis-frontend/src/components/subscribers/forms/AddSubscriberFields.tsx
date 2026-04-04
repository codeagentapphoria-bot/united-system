// React imports
import React from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';

// UI Components (shadcn/ui)
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';
import { CitizenSearchField } from './CitizenSearchField';

// Types and Schemas
import type { AddSubscriberInput } from '@/validations/subscriber.schema';

// Utils
import { cn } from '@/lib/utils';

export const AddSubscriberFields: React.FC = () => {
  const form = useFormContext<AddSubscriberInput>();
  const isCitizen = form.watch('isCitizen');
  const citizenId = form.watch('citizenId');
  const mobileNumber = form.watch('mobileNumber');
  
  // Check if citizen has phone: if citizenId is set and mobileNumber has value, citizen has phone
  // This is set by CitizenSearchField when a citizen is selected
  const citizenHasPhone = citizenId && mobileNumber && mobileNumber.trim().length > 0;

  return (
    <>
      {/* Is Citizen Toggle */}
      <FormField
        control={form.control}
        name="isCitizen"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center space-x-2">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value || false}
                  onChange={(e) => {
                    field.onChange(e.target.checked);
                    if (!e.target.checked) {
                      form.setValue('citizenId', undefined);
                      form.setValue('firstName', '');
                      form.setValue('middleName', '');
                      form.setValue('lastName', '');
                    }
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </FormControl>
              <div className="!mb-0 cursor-pointer" onClick={() => field.onChange(!field.value)}>
                <CustomFormLabel>
                  Is this subscriber a registered citizen?
                </CustomFormLabel>
              </div>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Citizen Search - Only show if isCitizen is true */}
      {isCitizen && (
        <div className="space-y-4">
          <CitizenSearchField />
          {!citizenId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> If the citizen is not found, you can create a new citizen record first, then link the subscriber to it.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Name Fields - Only show if NOT linked to citizen */}
      {(!isCitizen || !citizenId) && (
        <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4")}>
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel required>First Name</CustomFormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ''} // Ensure value is always a string, never undefined
                  placeholder="First name"
                  className="h-10"
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
                  value={field.value || ''} // Ensure value is always a string, never undefined
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
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel required>Last Name</CustomFormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ''} // Ensure value is always a string, never undefined
                  placeholder="Last name"
                  className="h-10"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      )}

      {/* Mobile Number */}
      <FormField
        control={form.control}
        name="mobileNumber"
        render={({ field }) => {
          const shouldDisable = !!(citizenId && citizenHasPhone);
          const isRequired = !citizenId || !citizenHasPhone;
          
          return (
            <FormItem>
              <CustomFormLabel required={isRequired}>
                Mobile Number
                {citizenId && citizenHasPhone && (
                  <span className="text-xs text-gray-500 ml-2">(from linked citizen)</span>
                )}
                {citizenId && !citizenHasPhone && (
                  <span className="text-xs text-yellow-600 ml-2">(citizen has no phone - please add)</span>
                )}
              </CustomFormLabel>
              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="countryCode"
                  render={({ field: countryCodeField }) => (
                    <FormControl>
                      <Select
                        value={countryCodeField.value}
                        onValueChange={countryCodeField.onChange}
                        disabled={shouldDisable}
                      >
                        <SelectTrigger className="w-[120px] h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+63">🇵🇭 +63</SelectItem>
                          <SelectItem value="+1">🇺🇸 +1</SelectItem>
                          <SelectItem value="+44">🇬🇧 +44</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  )}
                />
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ''} // Ensure value is always a string, never undefined
                    placeholder="9171234567"
                    className="h-10 flex-1"
                    disabled={shouldDisable}
                    readOnly={shouldDisable}
                    onChange={(e) => {
                      field.onChange(e);
                      // Custom validation: if citizen selected without phone, validate format
                      if (citizenId && !citizenHasPhone && e.target.value) {
                        const value = e.target.value.trim();
                        if (value && !/^\d{10}$/.test(value)) {
                          form.setError('mobileNumber', {
                            type: 'manual',
                            message: 'Invalid mobile number format (10 digits)',
                          });
                        } else if (value) {
                          form.clearErrors('mobileNumber');
                        }
                      }
                    }}
                    onBlur={() => {
                      field.onBlur();
                      // Validate on blur if citizen selected without phone
                      if (citizenId && !citizenHasPhone) {
                        const value = (field.value || '').trim();
                        if (!value) {
                          form.setError('mobileNumber', {
                            type: 'manual',
                            message: 'Mobile number is required when citizen has no phone number',
                          });
                        } else if (!/^\d{10}$/.test(value)) {
                          form.setError('mobileNumber', {
                            type: 'manual',
                            message: 'Invalid mobile number format (10 digits)',
                          });
                        } else {
                          form.clearErrors('mobileNumber');
                        }
                      } else {
                        // Trigger schema validation
                        form.trigger('mobileNumber');
                      }
                    }}
                  />
                </FormControl>
              </div>
              {citizenId && citizenHasPhone && (
                <p className="text-xs text-gray-500 mt-1">
                  Using contact information from linked citizen record
                </p>
              )}
              {citizenId && !citizenHasPhone && (
                <p className="text-xs text-yellow-600 mt-1">
                  This phone number will be added to the citizen's record
                </p>
              )}
              <FormMessage />
            </FormItem>
          );
        }}
      />

      {/* Email */}
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <CustomFormLabel>
              Email Address
              {citizenId && <span className="text-xs text-gray-500 ml-2">(from linked citizen)</span>}
            </CustomFormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ''} // Ensure value is always a string, never undefined
                  type="email"
                  placeholder="email@example.com"
                  className="h-10"
                  disabled={!!citizenId}
                  readOnly={!!citizenId}
                />
              </FormControl>
            {citizenId && (
              <p className="text-xs text-gray-500 mt-1">
                Using contact information from linked citizen record
              </p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Password Fields */}
      <div className="space-y-4">
        <div className="bg-primary-50 border border-primary-200 rounded-md p-3">
          <p className="text-sm text-primary-700 font-medium mb-1">Password Requirements:</p>
          <ul className="text-xs text-primary-600 space-y-0.5 list-disc list-inside">
            <li>At least 8 characters long</li>
            <li>Contains at least one uppercase letter (A-Z)</li>
            <li>Contains at least one lowercase letter (a-z)</li>
            <li>Contains at least one number (0-9)</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel required>Password</CustomFormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    placeholder="Create password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel required>Confirm Password</CustomFormLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    placeholder="Confirm password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </>
  );
};

