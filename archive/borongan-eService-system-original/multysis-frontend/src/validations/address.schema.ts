import { z } from 'zod';

export const addressSchema = z.object({
  region: z.string().min(1, 'Region is required'),
  province: z.string().min(1, 'Province is required').min(2, 'Province must be at least 2 characters'),
  municipality: z.string().min(1, 'Municipality is required').min(2, 'Municipality must be at least 2 characters'),
  barangay: z.string().min(1, 'Barangay is required').min(2, 'Barangay must be at least 2 characters'),
  postalCode: z.string().min(1, 'Postal code is required').regex(/^\d{4}$/, 'Postal code must be 4 digits'),
  streetAddress: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type AddressInput = z.infer<typeof addressSchema>;

