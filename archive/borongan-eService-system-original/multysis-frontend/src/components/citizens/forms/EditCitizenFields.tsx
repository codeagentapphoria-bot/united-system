// React imports
import React from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';
import { FiRefreshCw, FiUpload, FiUser } from 'react-icons/fi';
import Select from 'react-select';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';

// Types and Schemas
import type { EditCitizenInput } from '@/validations/citizen.schema';

// Services
import { citizenService } from '@/services/api/citizen.service';

// Hooks
import { useAddresses } from '@/hooks/addresses/useAddresses';

// Utils
import { cn } from '@/lib/utils';

interface EditCitizenFieldsProps {
  currentStep: number;
  onStepChange?: (step: number) => void;
  validateStepRef?: React.MutableRefObject<((step: number) => Promise<boolean>) | null>;
  citizenPicturePreview?: string;
  proofOfIdentificationPreview?: string;
  onCitizenPictureChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProofOfIdentificationChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  citizenId?: string;
}

export const EditCitizenFields: React.FC<EditCitizenFieldsProps> = ({
  currentStep,
  onStepChange: _onStepChange,
  validateStepRef,
  citizenPicturePreview,
  proofOfIdentificationPreview,
  onCitizenPictureChange,
  onProofOfIdentificationChange,
  citizenId,
}) => {
  const form = useFormContext<EditCitizenInput>();
  const [isGeneratingUsername, setIsGeneratingUsername] = React.useState(false);
  
  // Address management
  const {
    getUniqueRegions,
    getProvincesByRegion,
    getMunicipalitiesByRegionAndProvince,
    getBarangaysByRegionProvinceAndMunicipality,
    getPostalCode,
  } = useAddresses();
  
  // Watch civil status to conditionally show spouse name
  const civilStatus = form.watch('civilStatus');
  const showSpouseName = civilStatus === 'married';

  const totalSteps = 4;
  const steps = [
    { number: 1, title: 'Personal Information', fields: ['firstName', 'lastName', 'civilStatus', 'sex', 'birthdate', 'region', 'province', 'municipality'] },
    { number: 2, title: 'Contact & Address', fields: ['phoneNumber', 'emergencyContactPerson', 'emergencyContactNumber', 'addressId'] },
    { number: 3, title: 'Additional Info', fields: ['citizenship', 'username', 'pin'] },
    { number: 4, title: 'Documents', fields: ['idType', 'proofOfIdentificationFile'] },
  ];

  // Expose validation function for parent component
  const validateStep = React.useCallback(async (step: number): Promise<boolean> => {
    if (step < 1 || step > totalSteps) {
      return false;
    }
    const stepFields = steps[step - 1]?.fields;
    if (!stepFields) {
      return false;
    }
    const result = await form.trigger(stepFields as any);
    return result;
  }, [form, totalSteps]);

  // Expose validation function to parent via ref
  React.useEffect(() => {
    if (validateStepRef) {
      validateStepRef.current = validateStep;
    }
  }, [validateStep, validateStepRef]);

  const generateUsername = async () => {
    const firstName = form.watch('firstName') || '';
    const lastName = form.watch('lastName') || '';
    const currentUsername = form.watch('username') || '';
    const birthdate = form.watch('birthdate') || '';
    
    if (!firstName || !lastName) {
      return;
    }

    setIsGeneratingUsername(true);

    try {
      // Clean names: lowercase, remove special chars, keep only alphanumeric
      const cleanFirstName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanLastName = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Get initials
      const firstInitial = cleanFirstName.charAt(0);
      const lastInitial = cleanLastName.charAt(0);
      
      // Extract year from birthdate if available
      let yearSuffix = '';
      if (birthdate) {
        try {
          const year = new Date(birthdate).getFullYear();
          yearSuffix = year.toString().slice(-2); // Last 2 digits (e.g., 2024 -> 24)
        } catch (e) {
          // Invalid date, ignore
        }
      }
      
      // Generate various username patterns (more human-readable)
      const usernamePatterns: string[] = [];
      
      // Pattern 1: firstname.lastname
      usernamePatterns.push(`${cleanFirstName}.${cleanLastName}`);
      
      // Pattern 2: firstname_lastname
      usernamePatterns.push(`${cleanFirstName}_${cleanLastName}`);
      
      // Pattern 3: firstnamelastname (no separator)
      usernamePatterns.push(`${cleanFirstName}${cleanLastName}`);
      
      // Pattern 4: firstname.lastname with year
      if (yearSuffix) {
        usernamePatterns.push(`${cleanFirstName}.${cleanLastName}${yearSuffix}`);
        usernamePatterns.push(`${cleanFirstName}_${cleanLastName}${yearSuffix}`);
        usernamePatterns.push(`${cleanFirstName}${cleanLastName}${yearSuffix}`);
      }
      
      // Pattern 5: firstinitial.lastname
      usernamePatterns.push(`${firstInitial}.${cleanLastName}`);
      usernamePatterns.push(`${firstInitial}_${cleanLastName}`);
      usernamePatterns.push(`${firstInitial}${cleanLastName}`);
      
      // Pattern 6: firstname.lastinitial
      usernamePatterns.push(`${cleanFirstName}.${lastInitial}`);
      usernamePatterns.push(`${cleanFirstName}_${lastInitial}`);
      usernamePatterns.push(`${cleanFirstName}${lastInitial}`);
      
      // Pattern 7: Shorter first name variants (if longer than 4 chars)
      if (cleanFirstName.length > 4) {
        const shortFirst = cleanFirstName.slice(0, 4);
        usernamePatterns.push(`${shortFirst}.${cleanLastName}`);
        usernamePatterns.push(`${shortFirst}_${cleanLastName}`);
        usernamePatterns.push(`${shortFirst}${cleanLastName}`);
      }
      
      // Try each pattern, skipping the current username
      for (const pattern of usernamePatterns) {
        if (pattern === currentUsername) continue;
        
        const isAvailable = await citizenService.checkUsernameAvailability(pattern, citizenId);
        if (isAvailable) {
          form.setValue('username', pattern);
          return;
        }
      }
      
      // If all patterns are taken, try with random numbers (but smaller, more natural)
      const basePatterns = [
        `${cleanFirstName}.${cleanLastName}`,
        `${cleanFirstName}_${cleanLastName}`,
        `${cleanFirstName}${cleanLastName}`,
      ];
      
      for (const base of basePatterns) {
        if (base === currentUsername) continue;
        
        // Try with 2-3 digit numbers (more natural than just incrementing)
        for (let i = 1; i <= 999; i++) {
          const numSuffix = i < 10 ? `0${i}` : i.toString();
          const username = `${base}${numSuffix}`;
          
          if (username === currentUsername) continue;
          
          const isAvailable = await citizenService.checkUsernameAvailability(username, citizenId);
          if (isAvailable) {
            form.setValue('username', username);
            return;
          }
        }
      }
      
      // Fallback: random number if all else fails
      const randomSuffix = Math.floor(Math.random() * 10000);
      form.setValue('username', `${cleanFirstName}${cleanLastName}${randomSuffix}`);
      
    } catch (error: any) {
      console.error('Error generating username:', error);
      // If it's an auth error, we should still allow manual entry
      // The error will be handled by the API service
      if (error.response?.status === 401 || error.message?.includes('Authentication')) {
        // Don't prevent user from manually entering username
        // Just log the error silently
      }
    } finally {
      setIsGeneratingUsername(false);
    }
  };

  const civilStatusOptions = [
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'widowed', label: 'Widowed' },
    { value: 'divorced', label: 'Divorced' }
  ];

  const sexOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' }
  ];

  // Region options imported from shared constants

  const reactSelectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      minHeight: '48px',
      borderColor: state.hasValue && form.formState.errors.civilStatus ? '#ef4444' : '#d1d5db',
      '&:hover': {
        borderColor: state.hasValue && form.formState.errors.civilStatus ? '#ef4444' : '#9ca3af',
      },
    }),
    option: (base: any, state: any) => ({
      ...base,
      padding: '12px',
      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
      color: state.isSelected ? 'white' : '#374151',
    }),
    menu: (base: any) => ({
      ...base,
      zIndex: 9999,
    }),
  };

  // Add idTypeOptions
  const idTypeOptions = [
    { value: "Driver's License", label: "Driver's License" },
    { value: 'Passport', label: 'Passport' },
    { value: 'SSS ID', label: 'SSS ID' },
    { value: 'PhilHealth ID', label: 'PhilHealth ID' },
    { value: 'TIN ID', label: 'TIN ID' },
    { value: 'Postal ID', label: 'Postal ID' },
    { value: 'National ID', label: 'National ID' },
    { value: 'Senior Citizen ID', label: 'Senior Citizen ID' },
    { value: 'Voter\'s ID', label: 'Voter\'s ID' },
    { value: 'Barangay ID', label: 'Barangay ID' },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Step Content */}
      <div>
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-600 border-b pb-2">
          Personal Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Citizen Picture Upload */}
          <FormField
            control={form.control}
            name="citizenPicture"
            render={() => (
              <FormItem className="md:col-span-3 flex flex-col items-center md:items-start">
                <p className="text-sm text-gray-600 mb-3 text-center md:text-left">
                  Click to upload citizen's photo
                </p>
                <div className="relative group w-48 h-48">
                  <div className="w-full h-full rounded-lg bg-primary-100 flex items-center justify-center overflow-hidden border-4 border-primary-300 shadow-lg">
                    {citizenPicturePreview ? (
                      <img 
                        src={citizenPicturePreview} 
                        alt="Citizen preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FiUser size={64} className="text-primary-600" />
                    )}
                  </div>
                  <label 
                    htmlFor="citizenPicture"
                    className="absolute inset-0 w-48 h-48 rounded-lg bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center cursor-pointer transition-all duration-200"
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center">
                      <div className="bg-primary-600 p-4 rounded-lg mb-2">
                        <FiUpload size={24} className="text-white" />
                      </div>
                      <span className="text-white text-sm font-medium">Upload Photo</span>
                    </div>
                    <input
                      id="citizenPicture"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onCitizenPictureChange}
                    />
                  </label>
                </div>
                <FormMessage className="mt-2 text-center" />
              </FormItem>
            )}
          />
          
          {/* Personal Information Fields */}
          <div className="md:col-span-9">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <CustomFormLabel required>First Name</CustomFormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="h-12 text-base"
                        placeholder="Enter first name"
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
                        className="h-12 text-base"
                        placeholder="Enter middle name"
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
                        className="h-12 text-base"
                        placeholder="Enter last name"
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
                      <Input
                        {...field}
                        className="h-12 text-base"
                        placeholder="Jr., Sr., III, etc."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        className="react-select-container"
                        classNamePrefix="react-select"
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
                        className="react-select-container"
                        classNamePrefix="react-select"
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
                        className="h-12 text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
            </div>

            {/* Place of Birth */}
            <div>
              <h3 className="text-lg font-semibold text-primary-600 border-b pb-2 mb-4">
                Place of Birth
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            className="react-select-container"
                            classNamePrefix="react-select"
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
                            className="react-select-container"
                            classNamePrefix="react-select"
                            styles={reactSelectStyles}
                            value={provinceOptions.find(opt => opt.value === field.value)}
                            onChange={(option) => {
                              field.onChange(option?.value || '');
                              // Clear dependent field when province changes
                              form.setValue('municipality', '');
                            }}
                            isDisabled={!selectedRegion}
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
                            className="react-select-container"
                            classNamePrefix="react-select"
                            styles={reactSelectStyles}
                            value={municipalityOptions.find(opt => opt.value === field.value)}
                            onChange={(option) => field.onChange(option?.value || '')}
                            isDisabled={!selectedRegion || !selectedProvince}
                            isSearchable={true}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-primary-600 border-b pb-2 mb-4">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <CustomFormLabel required>Phone Number</CustomFormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-12 text-base"
                          placeholder="09XXXXXXXXX"
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow empty, or input that starts with 0 and contains only digits (up to 11 chars)
                            if (value === '' || /^0\d{0,10}$/.test(value)) {
                              field.onChange(value);
                            }
                          }}
                          maxLength={11}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          className="h-12 text-base"
                          placeholder="email@example.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Spouse and Emergency Contact */}
            <div>
              <h3 className="text-lg font-semibold text-primary-600 border-b pb-2 mb-4">
                {showSpouseName ? 'Spouse and Emergency Contact' : 'Emergency Contact'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {showSpouseName && (
                  <FormField
                    control={form.control}
                    name="spouseName"
                    render={({ field }) => (
                      <FormItem>
                        <CustomFormLabel>Spouse Name</CustomFormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-12 text-base"
                            placeholder="Enter spouse name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="emergencyContactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <CustomFormLabel required>Emergency Contact Person</CustomFormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-12 text-base"
                          placeholder="Enter emergency contact person name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContactNumber"
                  render={({ field }) => (
                    <FormItem className={showSpouseName ? "md:col-span-2" : ""}>
                      <CustomFormLabel required>Emergency Contact Number</CustomFormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-12 text-base"
                          placeholder="09XXXXXXXXX"
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow empty, or input that starts with 0 and contains only digits (up to 11 chars)
                            if (value === '' || /^0\d{0,10}$/.test(value)) {
                              field.onChange(value);
                            }
                          }}
                          maxLength={11}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Complete Address */}
            <div>
              <h3 className="text-lg font-semibold text-primary-600 border-b pb-2 mb-4">
                Complete Address
              </h3>
              <div className="space-y-4">
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
                              className="react-select-container"
                              classNamePrefix="react-select"
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
                              className="react-select-container"
                              classNamePrefix="react-select"
                              styles={reactSelectStyles}
                              value={provinceOptions.find(opt => opt.value === field.value)}
                              onChange={(option) => {
                                field.onChange(option?.value || '');
                                // Clear dependent fields when province changes
                                form.setValue('addressMunicipality', '');
                                form.setValue('addressBarangay', '');
                                form.setValue('addressPostalCode', '');
                              }}
                              isDisabled={!selectedRegion}
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
                              className="react-select-container"
                              classNamePrefix="react-select"
                              styles={reactSelectStyles}
                              value={municipalityOptions.find(opt => opt.value === field.value)}
                              onChange={(option) => {
                                field.onChange(option?.value || '');
                                // Clear dependent fields when municipality changes
                                form.setValue('addressBarangay', '');
                                form.setValue('addressPostalCode', '');
                              }}
                              isDisabled={!selectedRegion || !selectedProvince}
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
                              className="react-select-container"
                              classNamePrefix="react-select"
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
                              isDisabled={!selectedRegion || !selectedProvince || !selectedMunicipality}
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
                            className="h-12 text-base"
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
                          className="h-12 text-base"
                          placeholder="Enter street address (optional)"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Citizenship Information */}
            <div>
              <h3 className="text-lg font-semibold text-primary-600 border-b pb-2 mb-4">
                Citizenship Information
              </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="citizenship"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel>Citizenship</CustomFormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-12 text-base"
                    placeholder="e.g., Filipino, American, etc."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="acrNo"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel>ACR No.</CustomFormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-12 text-base"
                    placeholder="Alien Certificate of Registration number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
            </div>

            {/* Status Checkboxes */}
            <div>
        <h3 className="text-lg font-semibold text-primary-600 border-b pb-2 mb-4">
          Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="isResident"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-3">
                <FormControl>
                  <input
                    id="isResident"
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </FormControl>
                <Label htmlFor="isResident" className="text-sm font-medium text-gray-700 !mt-0">
                  Resident
                </Label>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isVoter"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-3">
                <FormControl>
                  <input
                    id="isVoter"
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </FormControl>
                <Label htmlFor="isVoter" className="text-sm font-medium text-gray-700 !mt-0">
                  Voter
                </Label>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isEmployed"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-3">
                <FormControl>
                  <input
                    id="isEmployed"
                    type="checkbox"
                    checked={field.value || false}
                    onChange={field.onChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </FormControl>
                <Label htmlFor="isEmployed" className="text-sm font-medium text-gray-700 !mt-0">
                  Employed
                </Label>
              </FormItem>
            )}
          />
        </div>
            </div>

            {/* Professional Information */}
            <div>
        <h3 className="text-lg font-semibold text-primary-600 border-b pb-2 mb-4">
          Professional Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="profession"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel>Profession</CustomFormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-12 text-base"
                    placeholder="e.g., Engineer, Teacher, etc."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="height"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel>Height</CustomFormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-12 text-base"
                    placeholder="e.g., 5ft 8in, 170 cm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel>Weight</CustomFormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-12 text-base"
                    placeholder="e.g., 70 kg, 154 lbs"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
            </div>

            {/* Account Information */}
            <div>
        <h3 className="text-lg font-semibold text-primary-600 border-b pb-2 mb-4">
          Account Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel required>Username</CustomFormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      {...field}
                      className="h-12 text-base"
                      placeholder="Enter username"
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateUsername}
                    disabled={isGeneratingUsername || !form.watch('firstName') || !form.watch('lastName')}
                    className="px-4 h-12 flex items-center gap-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiRefreshCw size={16} className={cn(isGeneratingUsername && 'animate-spin')} />
                    Generate
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pin"
            render={({ field }) => (
              <FormItem>
                <CustomFormLabel required>PIN (4 digits)</CustomFormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="h-12 text-base"
                    placeholder="0000"
                    maxLength={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            {/* Valid ID */}
            <div>
              <h3 className="text-lg font-semibold text-primary-600 border-b pb-2 mb-4">
                Valid ID
              </h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="idType"
                  render={({ field }) => (
                    <FormItem>
                      <CustomFormLabel required>ID Type</CustomFormLabel>
                      <FormControl>
                        <Select
                          options={idTypeOptions}
                          placeholder="Select ID Type"
                          className="react-select-container"
                          classNamePrefix="react-select"
                          styles={reactSelectStyles}
                          value={idTypeOptions.find(opt => opt.value === field.value)}
                          onChange={(option) => field.onChange(option?.value || '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="proofOfIdentification"
                  render={() => (
                    <FormItem className="space-y-4">
                      <CustomFormLabel required>ID Image</CustomFormLabel>
                      <p className="text-sm text-gray-600">
                        Upload a valid ID document (e.g., Driver's License, Passport, National ID, etc.)
                      </p>

                      <div className="flex justify-center">
                        <div className="relative group w-64 h-80">
                          <div className="w-full h-full rounded-lg bg-primary-100 flex items-center justify-center overflow-hidden border-4 border-primary-300 shadow-lg">
                            {proofOfIdentificationPreview ? (
                              <img 
                                src={proofOfIdentificationPreview} 
                                alt="Proof of identification preview" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center text-center">
                                <FiUpload size={48} className="text-primary-600 mb-2" />
                                <span className="text-primary-600 text-sm font-medium">Document Preview</span>
                              </div>
                            )}
                          </div>
                          <label 
                            htmlFor="proofOfIdentification"
                            className="absolute inset-0 w-64 h-80 rounded-lg bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center cursor-pointer transition-all duration-200"
                          >
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center">
                              <div className="bg-primary-600 p-4 rounded-lg mb-2">
                                <FiUpload size={24} className="text-white" />
                              </div>
                              <span className="text-white text-sm font-medium">Upload Document</span>
                            </div>
                            <input
                              id="proofOfIdentification"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={onProofOfIdentificationChange}
                            />
                          </label>
                        </div>
                      </div>
                      <FormMessage className="text-center" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
