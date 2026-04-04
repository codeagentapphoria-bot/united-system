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

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';

// Types and Schemas
import type { EditProfileInput } from '@/validations/subscriber.schema';

// Hooks
import { useAddresses } from '@/hooks/addresses/useAddresses';

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

interface PlaceOfBirthFieldsProps {
  disabled?: boolean;
}

export const PlaceOfBirthFields: React.FC<PlaceOfBirthFieldsProps> = ({ disabled = false }) => {
  const form = useFormContext<EditProfileInput>();
  const {
    getUniqueRegions,
    getProvincesByRegion,
    getMunicipalitiesByRegionAndProvince,
  } = useAddresses();

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4")}>
      <FormField
        control={form.control}
        name="region"
        render={({ field }) => {
          const regionOptions = getUniqueRegions();
          return (
            <FormItem>
              <CustomFormLabel required>Region</CustomFormLabel>
              <FormControl>
                <Select
                  options={regionOptions}
                  placeholder="Select region"
                  isDisabled={disabled}
                  styles={reactSelectStyles}
                  value={regionOptions.find(opt => opt.value === field.value)}
                  onChange={(option) => {
                    field.onChange(option?.value || '');
                    // Clear dependent fields when region changes
                    form.setValue('province', '');
                    form.setValue('municipality', '');
                  }}
                  isSearchable={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <FormField
        control={form.control}
        name="province"
        render={({ field }) => {
          const selectedRegion = form.watch('region') || '';
          const provinceOptions = getProvincesByRegion(selectedRegion);
          return (
            <FormItem>
              <CustomFormLabel required>Province</CustomFormLabel>
              <FormControl>
                <Select
                  options={provinceOptions}
                  placeholder="Select province"
                  isDisabled={disabled || !selectedRegion}
                  styles={reactSelectStyles}
                  value={provinceOptions.find(opt => opt.value === field.value)}
                  onChange={(option) => {
                    field.onChange(option?.value || '');
                    // Clear dependent field when province changes
                    form.setValue('municipality', '');
                  }}
                  isSearchable={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <FormField
        control={form.control}
        name="municipality"
        render={({ field }) => {
          const selectedRegion = form.watch('region') || '';
          const selectedProvince = form.watch('province') || '';
          const municipalityOptions = getMunicipalitiesByRegionAndProvince(selectedRegion, selectedProvince);
          return (
            <FormItem>
              <CustomFormLabel required>Municipality</CustomFormLabel>
              <FormControl>
                <Select
                  options={municipalityOptions}
                  placeholder="Select municipality"
                  isDisabled={disabled || !selectedRegion || !selectedProvince}
                  styles={reactSelectStyles}
                  value={municipalityOptions.find(opt => opt.value === field.value)}
                  onChange={(option) => field.onChange(option?.value || '')}
                  isSearchable={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    </div>
  );
};
