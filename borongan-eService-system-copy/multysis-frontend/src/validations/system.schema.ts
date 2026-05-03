import { z } from 'zod';

export const createSystemSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be at most 50 characters'),
  label: z
    .string()
    .min(1, 'Label is required')
    .min(2, 'Label must be at least 2 characters')
    .max(100, 'Label must be at most 100 characters'),
});

export const updateSystemSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .min(2)
    .max(50)
    .optional(),
  label: z
    .string()
    .min(1)
    .min(2)
    .max(100)
    .optional(),
});

export type CreateSystemInput = z.infer<typeof createSystemSchema>;
export type UpdateSystemInput = z.infer<typeof updateSystemSchema>;
