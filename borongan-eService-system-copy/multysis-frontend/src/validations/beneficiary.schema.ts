import { z } from 'zod';

// Phone number validation (Philippine format: 09XXXXXXXXX)
// const phoneNumberRegex = /^09\d{9}$/; // Not currently used - commented out to avoid unused variable warning

// Base beneficiary schema - not currently used (commented out to avoid unused variable warning)
// const baseBeneficiarySchema = z.object({
//   firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
//   middleName: z.string().optional(),
//   lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
//   extensionName: z.string().optional(),
//   address: z.string().min(1, 'Address is required'),
//   contactNumber: z.string()
//     .min(1, 'Contact number is required')
//     .regex(phoneNumberRegex, 'Contact number must be in format 09XXXXXXXXX'),
//   dateOfBirth: z.string().min(1, 'Date of birth is required'),
//   gender: z.enum(['Male', 'Female'], {
//     required_error: 'Gender is required',
//   }),
//   civilStatus: z.enum(['Single', 'Married', 'Widowed', 'Divorced'], {
//     required_error: 'Civil status is required',
//   }),
//   familySize: z.string().min(1, 'Family size is required').refine(
//     (val) => {
//       const num = parseInt(val, 10);
//       return !isNaN(num) && num > 0;
//     },
//     { message: 'Family size must be a positive number' }
//   ),
//   monthlyIncome: z.string().min(1, 'Monthly income is required').refine(
//     (val) => {
//       const num = parseFloat(val);
//       return !isNaN(num) && num >= 0;
//     },
//     { message: 'Monthly income must be a valid number' }
//   ),
// });

// Senior Citizen Schema - Only senior citizen specific fields
export const seniorCitizenSchema = z.object({
  citizenId: z.string().min(1, 'Citizen is required'), // Required - must select a citizen
  pensionTypes: z.array(z.string()).min(1, 'At least one pension type is required'),
  governmentPrograms: z.array(z.string()).optional().default([]), // Optional - government assistance programs
});

export type SeniorCitizenInput = z.infer<typeof seniorCitizenSchema>;

// PWD Schema - Similar to Senior Citizen, uses citizenId
export const pwdSchema = z.object({
  citizenId: z.string().min(1, 'Citizen is required'), // Required - must select a citizen
  disabilityType: z.string().min(1, 'Disability type is required'),
  disabilityLevel: z.string().min(1, 'Disability level is required'),
  monetaryAllowance: z.boolean().default(false),
  assistedDevice: z.boolean().default(false),
  donorDevice: z.string().optional(),
  governmentPrograms: z.array(z.string()).optional().default([]), // Optional - government assistance programs
}).superRefine((data, ctx) => {
  // If assistedDevice is true, donorDevice is required
  if (data.assistedDevice && (!data.donorDevice || data.donorDevice.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Donor device is required when assisted device is checked',
      path: ['donorDevice'],
    });
  }
});

export type PWDInput = z.infer<typeof pwdSchema>;

// Student Schema - Similar to Senior Citizen and PWD, uses citizenId
export const studentSchema = z.object({
  citizenId: z.string().min(1, 'Citizen is required'), // Required - must select a citizen
  gradeLevel: z.string().min(1, 'Grade level is required'),
  programs: z.array(z.string()).optional().default([]), // Optional - government assistance programs
});

export type StudentInput = z.infer<typeof studentSchema>;

// Solo Parent Schema - Similar to Senior Citizen, PWD, and Student, uses citizenId
export const soloParentSchema = z.object({
  citizenId: z.string().min(1, 'Citizen is required'), // Required - must select a citizen
  category: z.string().min(1, 'Category is required'),
  assistancePrograms: z.array(z.string()).optional().default([]), // Optional - government assistance programs
});

export type SoloParentInput = z.infer<typeof soloParentSchema>;

// Edit schemas (same as add schemas for now)
export const editSeniorCitizenSchema = seniorCitizenSchema;
export const editPWDSchema = pwdSchema;
export const editStudentSchema = studentSchema;
export const editSoloParentSchema = soloParentSchema;

export type EditSeniorCitizenInput = z.infer<typeof editSeniorCitizenSchema>;
export type EditPWDInput = z.infer<typeof editPWDSchema>;
export type EditStudentInput = z.infer<typeof editStudentSchema>;
export type EditSoloParentInput = z.infer<typeof editSoloParentSchema>;

