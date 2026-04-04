import { z } from 'zod';

// 09XXXXXXXXX or +639XXXXXXXXX

const phoneRegex = /^(\+639|09)\d{9}$/;

// Admin login with email
export const adminLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

// Portal login with phone number
export const loginSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .regex(phoneRegex, 'Invalid Philippine phone number format (e.g., 09XXXXXXXXX)'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .min(2, 'First name must be at least 2 characters'),
    middleName: z.string().optional(),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .min(2, 'Last name must be at least 2 characters'),
    email: z
      .union([
        z.string().email('Invalid email address'),
        z.literal(''),
      ])
      .optional()
      .transform((val) => val === '' ? undefined : val),
    phoneNumber: z
      .string()
      .min(1, 'Phone number is required')
      .regex(phoneRegex, 'Invalid Philippine phone number format (e.g., 09XXXXXXXXX)'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    acceptTerms: z
      .boolean()
      .refine((val) => val === true, {
        message: 'You must accept the Terms and Conditions to continue',
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// OTP verification schema
export const otpVerifySchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .regex(phoneRegex, 'Invalid Philippine phone number format (e.g., 09XXXXXXXXX)'),
  otp: z
    .string()
    .min(6, 'OTP must be 6 digits')
    .max(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must be 6 numeric digits'),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

