import { z } from 'zod';

// 09XXXXXXXXX or +639XXXXXXXXX

const phoneRegex = /^(\+639|09)\d{9}$/;

export const addSubscriberSchema = z
  .object({
    isCitizen: z.boolean().optional().default(false),
    citizenId: z.string().uuid('Invalid citizen ID').optional(),
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    lastName: z.string().optional(),
    countryCode: z.string().default('+63'),
    mobileNumber: z.string().optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Confirm password is required'),
    profilePictureFile: z.instanceof(File).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine((data) => {
    // If isCitizen is true and citizenId is provided, firstName/lastName are not required
    if (data.isCitizen && data.citizenId) {
      return true;
    }
    // Otherwise, firstName and lastName are required
    return !!(data.firstName && data.lastName);
  }, {
    message: 'First name and last name are required when not linking to existing citizen',
    path: ['firstName'],
  })
  .refine((data) => {
    // If linked to citizen, mobileNumber is optional (will use citizen's phone if available)
    // But if citizen doesn't have phone, mobileNumber is required
    // We'll handle this validation in the form component based on citizen data
    if (data.isCitizen && data.citizenId) {
      // Allow empty - validation will be handled in form component
      return true;
    }
    // Otherwise, mobileNumber is required
    if (!data.mobileNumber || data.mobileNumber.trim().length === 0) {
      return false;
    }
    // Validate format
    if (!/^\d{10}$/.test(data.mobileNumber)) {
      return false;
    }
    return true;
  }, {
    message: 'Mobile number is required and must be 10 digits',
    path: ['mobileNumber'],
  });

export const editProfileSchema = z.object({
  // Personal Info
  picture: z.string().optional(),
  profilePictureFile: z.instanceof(File).optional(),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  extensionName: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .regex(phoneRegex, 'Invalid Philippine phone number'),
  civilStatus: z.string().min(1, 'Civil status is required'),
  sex: z.string().min(1, 'Sex is required'),
  birthdate: z.string().min(1, 'Birthdate is required'),
  
  // Address (structured fields)
  addressRegion: z.string().min(1, 'Region is required'),
  addressProvince: z.string().min(1, 'Province is required'),
  addressMunicipality: z.string().min(1, 'Municipality is required'),
  addressBarangay: z.string().min(1, 'Barangay is required'),
  addressPostalCode: z.string().min(1, 'Postal code is required'),
  addressStreetAddress: z.string().optional(),
  
  // Place of Birth
  region: z.string().min(1, 'Region is required'),
  province: z.string().min(1, 'Province is required'),
  municipality: z.string().min(1, 'Municipality is required'),
  
  // Mother's Information (Optional)
  motherFirstName: z.string().optional(),
  motherMiddleName: z.string().optional(),
  motherLastName: z.string().optional(),
  
  // Resident Address (for non-citizens - used for parsing, not validation)
  residentAddress: z.string().optional(),
});

export type AddSubscriberInput = z.infer<typeof addSubscriberSchema>;
export type EditProfileInput = z.infer<typeof editProfileSchema>;

