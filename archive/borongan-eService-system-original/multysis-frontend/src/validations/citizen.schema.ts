import { z } from 'zod';

// Phone number validation (Philippine format: 09XXXXXXXXX)
const phoneNumberRegex = /^09\d{9}$/;

// Add Citizen Schema
export const addCitizenSchema = z.object({
  citizenPicture: z.string().optional(),
  citizenPictureFile: z.instanceof(File).optional(),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  extensionName: z.string().optional(),
  civilStatus: z.string().min(1, 'Civil status is required'),
  sex: z.string().min(1, 'Sex is required'),
  birthdate: z.string().min(1, 'Birthdate is required'),
  // Place of Birth
  region: z.string().min(1, 'Region is required'),
  province: z.string().min(1, 'Province is required'),
  municipality: z.string().min(1, 'Municipality is required'),
  // Contact Information
  phoneNumber: z.string()
    .min(1, 'Phone number is required')
    .regex(phoneNumberRegex, 'Phone number must be in format 09XXXXXXXXX'),
  email: z.union([
    z.string().email('Invalid email address'),
    z.literal(''),
  ]).optional().transform((val) => val === '' ? undefined : val),
  // Spouse and Emergency Contact
  spouseName: z.string().optional(),
  emergencyContactPerson: z.string().min(1, 'Emergency contact person is required'),
  emergencyContactNumber: z.string()
    .min(1, 'Emergency contact number is required')
    .regex(phoneNumberRegex, 'Emergency contact number must be in format 09XXXXXXXXX'),
  // Complete Address (separated fields - using address prefix to avoid conflict with Place of Birth)
  addressRegion: z.string().min(1, 'Region is required'),
  addressProvince: z.string().min(1, 'Province is required'),
  addressMunicipality: z.string().min(1, 'Municipality is required'),
  addressBarangay: z.string().min(1, 'Barangay is required'),
  addressPostalCode: z.string().min(1, 'Postal code is required'),
  addressStreetAddress: z.string().optional(),
  // Legacy address field (keep for backward compatibility, optional)
  address: z.string().optional(),
  // Valid ID
  idType: z.string().min(1, 'ID type is required'),
  proofOfIdentification: z.string().optional(),
  proofOfIdentificationFile: z.instanceof(File).optional(),
  // Other fields
  isResident: z.boolean().default(false),
  isVoter: z.boolean().default(false),
  username: z.string().min(1, 'Username is required'),
  pin: z.string().min(4, 'PIN must be 4 digits').max(4, 'PIN must be 4 digits'),
  proofOfResidency: z.string().optional(),
  proofOfResidencyFile: z.instanceof(File).optional(),
  isEmployed: z.boolean().optional(),
  citizenship: z.string().optional(),
  acrNo: z.string().optional(),
  profession: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
});

export type AddCitizenInput = z.infer<typeof addCitizenSchema>;

// Edit Citizen Schema - Same as Add Citizen Schema
export const editCitizenSchema = addCitizenSchema;

export type EditCitizenInput = z.infer<typeof editCitizenSchema>;
