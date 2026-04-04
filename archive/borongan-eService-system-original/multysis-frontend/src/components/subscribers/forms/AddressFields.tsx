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

interface AddressFieldsProps {
  disabled?: boolean;
}

export const AddressFields: React.FC<AddressFieldsProps> = ({ disabled = false }) => {
  const form = useFormContext<EditProfileInput>();
  const {
    getUniqueRegions,
    getProvincesByRegion,
    getMunicipalitiesByRegionAndProvince,
    getBarangaysByRegionProvinceAndMunicipality,
    getPostalCode,
  } = useAddresses();

  return (
    <div className={cn("space-y-4")}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Region */}
        <FormField
          control={form.control}
          name="addressRegion"
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
                      form.setValue('addressProvince', '');
                      form.setValue('addressMunicipality', '');
                      form.setValue('addressBarangay', '');
                      form.setValue('addressPostalCode', '');
                    }}
                    isSearchable={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Province */}
        <FormField
          control={form.control}
          name="addressProvince"
          render={({ field }) => {
            const selectedRegion = form.watch('addressRegion') || '';
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
                      // Clear dependent fields when province changes
                      form.setValue('addressMunicipality', '');
                      form.setValue('addressBarangay', '');
                      form.setValue('addressPostalCode', '');
                    }}
                    isSearchable={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Municipality */}
        <FormField
          control={form.control}
          name="addressMunicipality"
          render={({ field }) => {
            const selectedRegion = form.watch('addressRegion') || '';
            const selectedProvince = form.watch('addressProvince') || '';
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
                    onChange={(option) => {
                      field.onChange(option?.value || '');
                      // Clear dependent fields when municipality changes
                      form.setValue('addressBarangay', '');
                      form.setValue('addressPostalCode', '');
                    }}
                    isSearchable={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Barangay */}
        <FormField
          control={form.control}
          name="addressBarangay"
          render={({ field }) => {
            const selectedRegion = form.watch('addressRegion') || '';
            const selectedProvince = form.watch('addressProvince') || '';
            const selectedMunicipality = form.watch('addressMunicipality') || '';
            const barangayOptions = getBarangaysByRegionProvinceAndMunicipality(
              selectedRegion,
              selectedProvince,
              selectedMunicipality
            );
            return (
              <FormItem>
                <CustomFormLabel required>Barangay</CustomFormLabel>
                <FormControl>
                  <Select
                    options={barangayOptions}
                    placeholder="Select barangay"
                    isDisabled={disabled || !selectedRegion || !selectedProvince || !selectedMunicipality}
                    styles={reactSelectStyles}
                    value={barangayOptions.find(opt => opt.value === field.value)}
                    onChange={(option) => {
                      field.onChange(option?.value || '');
                      // Auto-fill postal code when barangay is selected
                      if (option?.value) {
                        const postalCode = getPostalCode(
                          selectedRegion,
                          selectedProvince,
                          selectedMunicipality,
                          option.value
                        );
                        form.setValue('addressPostalCode', postalCode);
                      } else {
                        form.setValue('addressPostalCode', '');
                      }
                    }}
                    isSearchable={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Postal Code */}
        <FormField
          control={form.control}
          name="addressPostalCode"
          render={({ field }) => (
            <FormItem>
              <CustomFormLabel required>Postal Code</CustomFormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="h-10"
                  placeholder="Postal code"
                  readOnly
                  disabled
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Street Address */}
      <FormField
        control={form.control}
        name="addressStreetAddress"
        render={({ field }) => (
          <FormItem>
            <CustomFormLabel>Unit No. / House No. / Street Name</CustomFormLabel>
            <FormControl>
              <Input
                {...field}
                className="h-10"
                placeholder="Enter street address (optional)"
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};



