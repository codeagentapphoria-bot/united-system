import { regionOptions } from '@/constants/regions';
import { useAddresses } from '@/hooks/addresses/useAddresses';
import type { EditProfileInput } from '@/validations/subscriber.schema';
import { editProfileSchema } from '@/validations/subscriber.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

// Helper function to parse residentAddress string
// Format: "Street, Barangay, Municipality, Province, Region, PostalCode"
const parseResidentAddress = (addressString: string | undefined): {
  streetAddress?: string;
  barangay?: string;
  municipality?: string;
  province?: string;
  region?: string;
  postalCode?: string;
} => {
  if (!addressString || !addressString.trim()) {
    return {};
  }

  // Split by comma and trim each part
  const parts = addressString.split(',').map(part => part.trim()).filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return {};
  }

  const result: {
    streetAddress?: string;
    barangay?: string;
    municipality?: string;
    province?: string;
    region?: string;
    postalCode?: string;
  } = {};

  // Parse from the END of the array to be more robust
  // Format: [Street], [Barangay], [Municipality], [Province], [Region], [PostalCode]

  // 1. Postal Code (optional numeric check at the very end)
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    if (/^\d{4,5}$/.test(lastPart)) { // Philippine postal codes are 4 digits
      result.postalCode = parts.pop();
    }
  }

  // 2. Region (last remaining)
  if (parts.length > 0) {
    result.region = parts.pop();
  }

  // 3. Province
  if (parts.length > 0) {
    result.province = parts.pop();
  }

  // 4. Municipality
  if (parts.length > 0) {
    result.municipality = parts.pop();
  }

  // 5. Barangay
  if (parts.length > 0) {
    result.barangay = parts.pop();
  }

  // 6. Street Address (everything else at the beginning)
  if (parts.length > 0) {
    result.streetAddress = parts.join(', ');
  }

  return result;
};

export const useEditProfile = (initialData?: Partial<EditProfileInput & { residentAddress?: string }>) => {
  const [previewImage, setPreviewImage] = useState<string | undefined>(initialData?.picture);
  const {
    getUniqueRegions,
    getProvincesByRegion,
    getMunicipalitiesByRegionAndProvince,
    getBarangaysByRegionProvinceAndMunicipality,
  } = useAddresses();

  const form = useForm<EditProfileInput>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      extensionName: '',
      email: '',
      phoneNumber: '',
      civilStatus: '',
      sex: '',
      birthdate: '',
      addressRegion: '',
      addressProvince: '',
      addressMunicipality: '',
      addressBarangay: '',
      addressPostalCode: '',
      addressStreetAddress: '',
      region: '',
      province: '',
      municipality: '',
      motherFirstName: '',
      motherMiddleName: '',
      motherLastName: '',
      picture: '',
    },
  });

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      // Format birthdate if it's a Date object or ISO string
      let formattedBirthdate = '';
      if (initialData.birthdate) {
        const birthdateValue = initialData.birthdate as Date | string | unknown;
        if (birthdateValue instanceof Date) {
          formattedBirthdate = birthdateValue.toISOString().split('T')[0];
        } else if (typeof birthdateValue === 'string') {
          // If it's an ISO string, convert to YYYY-MM-DD format
          formattedBirthdate = birthdateValue.split('T')[0];
        } else {
          formattedBirthdate = String(birthdateValue || '');
        }
      }

      // Normalize civilStatus and sex to lowercase to match form options
      // Form options use lowercase: 'single', 'married', 'male', 'female'
      // Database might store: 'Single', 'Married', 'Male', 'Female'
      const normalizedCivilStatus = initialData.civilStatus 
        ? initialData.civilStatus.toLowerCase().trim() 
        : '';
      
      const normalizedSex = initialData.sex 
        ? initialData.sex.toLowerCase().trim() 
        : '';

      // Normalize place of birth values to match form option values
      // Form uses values from the address API
      // Database might store: 'NCR', 'Metro Manila', 'Quezon City'
      const normalizePlaceValue = (value: string | undefined, options: Array<{ value: string; label: string }>): string => {
        if (!value) return '';
        const valueLower = value.toLowerCase().trim();
        
        // Try exact match first (case-insensitive) - match by value
        const exactMatch = options.find(opt => 
          opt.value.toLowerCase() === valueLower || 
          opt.value.toLowerCase() === valueLower.replace(/\s+/g, '-')
        );
        if (exactMatch) return exactMatch.value;
        
        // Try label match (case-insensitive) - match by label
        const labelMatch = options.find(opt => opt.label.toLowerCase() === valueLower);
        if (labelMatch) return labelMatch.value;
        
        // Try partial match on label (e.g., "Metro Manila" -> "metro-manila")
        const slugMatch = options.find(opt => {
          const optSlug = opt.label.toLowerCase().replace(/\s+/g, '-');
          return optSlug === valueLower || optSlug.includes(valueLower) || valueLower.includes(optSlug);
        });
        if (slugMatch) return slugMatch.value;
        
        // Try to find by removing special characters and comparing
        const normalizedValue = valueLower.replace(/[^a-z0-9]/g, '');
        const normalizedMatch = options.find(opt => {
          const optNormalized = opt.label.toLowerCase().replace(/[^a-z0-9]/g, '');
          const valueNormalized = opt.value.toLowerCase().replace(/[^a-z0-9]/g, '');
          return optNormalized === normalizedValue || valueNormalized === normalizedValue;
        });
        if (normalizedMatch) return normalizedMatch.value;
        
        // If no match found, try to return the original value
        // This allows the form to at least try to display it
        // The form component will handle if it doesn't match any option
        return value;
      };

      // Get actual options from address API
      // Use regionOptions as fallback if API data is not available yet
      const regionOptionsList = getUniqueRegions();
      const regionOptionsToUse = regionOptionsList.length > 0 ? regionOptionsList : regionOptions;
      const normalizedRegion = normalizePlaceValue(initialData.region, regionOptionsToUse);
      
      // For province, try to get options using normalized region first, then fall back to original region
      let provinceOptionsList: Array<{ value: string; label: string }> = [];
      if (normalizedRegion) {
        provinceOptionsList = getProvincesByRegion(normalizedRegion);
      }
      // If no options found with normalized region, try with original region value
      if (provinceOptionsList.length === 0 && initialData.region) {
        provinceOptionsList = getProvincesByRegion(initialData.region);
      }
      const normalizedProvince = provinceOptionsList.length > 0 
        ? normalizePlaceValue(initialData.province, provinceOptionsList)
        : (initialData.province || '');
      
      // For municipality, try with normalized values first, then fall back to original values
      let municipalityOptionsList: Array<{ value: string; label: string }> = [];
      if (normalizedRegion && normalizedProvince) {
        municipalityOptionsList = getMunicipalitiesByRegionAndProvince(normalizedRegion, normalizedProvince);
      }
      // If no options found, try with original region and normalized province
      if (municipalityOptionsList.length === 0 && initialData.region && normalizedProvince) {
        municipalityOptionsList = getMunicipalitiesByRegionAndProvince(initialData.region, normalizedProvince);
      }
      // If still no options, try with original region and original province
      if (municipalityOptionsList.length === 0 && initialData.region && initialData.province) {
        municipalityOptionsList = getMunicipalitiesByRegionAndProvince(initialData.region, initialData.province);
      }
      const normalizedMunicipality = municipalityOptionsList.length > 0
        ? normalizePlaceValue(initialData.municipality, municipalityOptionsList)
        : (initialData.municipality || '');

      // Parse residentAddress string if structured fields are not available
      // This is for non-citizens who only have residentAddress as a string
      let parsedAddress = {
        streetAddress: initialData.addressStreetAddress,
        barangay: initialData.addressBarangay,
        municipality: initialData.addressMunicipality,
        province: initialData.addressProvince,
        region: initialData.addressRegion,
        postalCode: initialData.addressPostalCode,
      };

      // If structured address fields are empty but we have a residentAddress string, parse it
      // Check if initialData has a residentAddress field (we'll need to pass it from PortalProfile)
      if ((!initialData.addressRegion || !initialData.addressProvince) && (initialData as any).residentAddress) {
        const parsed = parseResidentAddress((initialData as any).residentAddress);
        parsedAddress = {
          ...parsedAddress,
          ...parsed,
        };
      }

      // Normalize address fields similar to place of birth
      // Get address region options - use API data if available, otherwise fallback to static options
      const addressRegionOptionsList = getUniqueRegions();
      const addressRegionOptionsToUse = addressRegionOptionsList.length > 0 ? addressRegionOptionsList : regionOptions;
      
      // Use parsed address region if available, otherwise use initialData
      const addressRegionToNormalize = parsedAddress.region || initialData.addressRegion;
      
      // Normalize address region - if normalization fails, try using the original value directly
      let normalizedAddressRegion = normalizePlaceValue(addressRegionToNormalize, addressRegionOptionsToUse);
      // If normalization returned the original value (meaning it didn't find a match), try direct matching
      if (normalizedAddressRegion === addressRegionToNormalize && addressRegionToNormalize) {
        const directMatch = addressRegionOptionsToUse.find(opt => 
          opt.value === addressRegionToNormalize || 
          opt.label === addressRegionToNormalize ||
          opt.value.toLowerCase() === addressRegionToNormalize.toLowerCase() ||
          opt.label.toLowerCase() === addressRegionToNormalize.toLowerCase()
        );
        if (directMatch) {
          normalizedAddressRegion = directMatch.value;
        } else {
          // If still no match, use original value - React Select might handle it
          normalizedAddressRegion = addressRegionToNormalize;
        }
      } else if (!normalizedAddressRegion && addressRegionToNormalize) {
        // If normalization returned empty, try direct match
        const directMatch = addressRegionOptionsToUse.find(opt => 
          opt.value === addressRegionToNormalize || 
          opt.label === addressRegionToNormalize ||
          opt.value.toLowerCase() === addressRegionToNormalize.toLowerCase() ||
          opt.label.toLowerCase() === addressRegionToNormalize.toLowerCase()
        );
        normalizedAddressRegion = directMatch ? directMatch.value : addressRegionToNormalize;
      }
      
      // Use parsed address province if available
      const addressProvinceToNormalize = parsedAddress.province || initialData.addressProvince;
      
      // For address province, try to get options using normalized region first, then fall back to original region
      let addressProvinceOptionsList: Array<{ value: string; label: string }> = [];
      if (normalizedAddressRegion) {
        addressProvinceOptionsList = getProvincesByRegion(normalizedAddressRegion);
      }
      // If no options found with normalized region, try with original region value
      if (addressProvinceOptionsList.length === 0 && addressRegionToNormalize) {
        addressProvinceOptionsList = getProvincesByRegion(addressRegionToNormalize);
      }
      const normalizedAddressProvince = addressProvinceOptionsList.length > 0 
        ? normalizePlaceValue(addressProvinceToNormalize, addressProvinceOptionsList)
        : (addressProvinceToNormalize || '');
      
      // Use parsed address municipality if available
      const addressMunicipalityToNormalize = parsedAddress.municipality || initialData.addressMunicipality;
      
      // For address municipality, try with normalized values first, then fall back to original values
      let addressMunicipalityOptionsList: Array<{ value: string; label: string }> = [];
      if (normalizedAddressRegion && normalizedAddressProvince) {
        addressMunicipalityOptionsList = getMunicipalitiesByRegionAndProvince(normalizedAddressRegion, normalizedAddressProvince);
      }
      // If no options found, try with original region and normalized province
      if (addressMunicipalityOptionsList.length === 0 && addressRegionToNormalize && normalizedAddressProvince) {
        addressMunicipalityOptionsList = getMunicipalitiesByRegionAndProvince(addressRegionToNormalize, normalizedAddressProvince);
      }
      // If still no options, try with original region and original province
      if (addressMunicipalityOptionsList.length === 0 && addressRegionToNormalize && addressProvinceToNormalize) {
        addressMunicipalityOptionsList = getMunicipalitiesByRegionAndProvince(addressRegionToNormalize, addressProvinceToNormalize);
      }
      const normalizedAddressMunicipality = addressMunicipalityOptionsList.length > 0
        ? normalizePlaceValue(addressMunicipalityToNormalize, addressMunicipalityOptionsList)
        : (addressMunicipalityToNormalize || '');

      // Use parsed address barangay if available
      const addressBarangayToNormalize = parsedAddress.barangay || initialData.addressBarangay;
      
      // For barangay, we need to get options based on normalized region, province, and municipality
      let addressBarangayOptionsList: Array<{ value: string; label: string }> = [];
      if (normalizedAddressRegion && normalizedAddressProvince && normalizedAddressMunicipality) {
        addressBarangayOptionsList = getBarangaysByRegionProvinceAndMunicipality(
          normalizedAddressRegion,
          normalizedAddressProvince,
          normalizedAddressMunicipality
        );
      }
      // Try with original values if normalized values don't work
      if (addressBarangayOptionsList.length === 0 && addressRegionToNormalize && addressProvinceToNormalize && addressMunicipalityToNormalize) {
        addressBarangayOptionsList = getBarangaysByRegionProvinceAndMunicipality(
          addressRegionToNormalize,
          addressProvinceToNormalize,
          addressMunicipalityToNormalize
        );
      }
      const normalizedAddressBarangay = addressBarangayOptionsList.length > 0
        ? normalizePlaceValue(addressBarangayToNormalize, addressBarangayOptionsList)
        : (addressBarangayToNormalize || '');

      const formData: Partial<EditProfileInput> = {
        firstName: initialData.firstName || '',
        middleName: initialData.middleName || '',
        lastName: initialData.lastName || '',
        extensionName: initialData.extensionName || '',
        email: initialData.email || '',
        phoneNumber: initialData.phoneNumber || '',
        civilStatus: normalizedCivilStatus,
        sex: normalizedSex,
        birthdate: formattedBirthdate,
        addressRegion: normalizedAddressRegion,
        addressProvince: normalizedAddressProvince,
        addressMunicipality: normalizedAddressMunicipality,
        addressBarangay: normalizedAddressBarangay,
        addressPostalCode: parsedAddress.postalCode || initialData.addressPostalCode || '',
        addressStreetAddress: parsedAddress.streetAddress || initialData.addressStreetAddress || '',
        region: normalizedRegion,
        province: normalizedProvince,
        municipality: normalizedMunicipality,
        motherFirstName: initialData.motherFirstName || '',
        motherMiddleName: initialData.motherMiddleName || '',
        motherLastName: initialData.motherLastName || '',
        picture: initialData.picture || '',
      };

      form.reset(formData);
      setPreviewImage(initialData.picture);
    } else {
      // Reset to empty values if no initialData
      form.reset({
        firstName: '',
        middleName: '',
        lastName: '',
        extensionName: '',
        email: '',
        phoneNumber: '',
        civilStatus: '',
        sex: '',
        birthdate: '',
        addressRegion: '',
        addressProvince: '',
        addressMunicipality: '',
        addressBarangay: '',
        addressPostalCode: '',
        addressStreetAddress: '',
        region: '',
        province: '',
        municipality: '',
        motherFirstName: '',
        motherMiddleName: '',
        motherLastName: '',
        picture: '',
      });
      setPreviewImage(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
      // Store file object instead of URL
      form.setValue('profilePictureFile', file);
    }
  };

  const resetForm = () => {
    form.reset();
    setPreviewImage(initialData?.picture);
  };

  return {
    form,
    handleSubmit: form.handleSubmit,
    reset: resetForm,
    previewImage,
    handleImageChange,
  };
};

