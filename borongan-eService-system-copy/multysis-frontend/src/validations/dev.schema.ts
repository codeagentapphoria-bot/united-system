import { z } from 'zod';

// Dev login with email
export const devLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

export type DevLoginInput = z.infer<typeof devLoginSchema>;

