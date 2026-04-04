import { z } from 'zod';

export const createAdminUserSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  phoneNumber: z
    .string()
    .regex(/^(09\d{9}|\+639\d{9})$/, 'Phone number must be in Philippine format (09XXXXXXXXX or +639XXXXXXXXX)')
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z
    .string()
    .min(1, 'Password confirmation is required'),
  roleId: z
    .string()
    .min(1, 'Role is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const updateAdminUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .optional(),
  phoneNumber: z
    .string()
    .regex(/^(09\d{9}|\+639\d{9})$/, 'Phone number must be in Philippine format (09XXXXXXXXX or +639XXXXXXXXX)')
    .optional()
    .or(z.literal('')),
  roleId: z
    .string()
    .min(1, 'Role is required')
    .optional(),
  isActive: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z
    .string()
    .min(1, 'Password confirmation is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

