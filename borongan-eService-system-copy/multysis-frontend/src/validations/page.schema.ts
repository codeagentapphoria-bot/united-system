import { z } from 'zod';

export const createPageSchema = z.object({
  system: z.string().min(1, 'System is required'),
  path: z.string().min(1, 'Path is required'),
  name: z.string().min(1, 'Name is required'),
});

export const updatePageSchema = z.object({
  system: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;