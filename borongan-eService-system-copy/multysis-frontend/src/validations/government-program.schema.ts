import { z } from 'zod';

export const governmentProgramSchema = z.object({
  name: z.string().min(1, 'Program name is required').min(2, 'Program name must be at least 2 characters'),
  description: z.string().optional(),
  type: z.enum(['SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT', 'ALL'], {
    required_error: 'Type is required',
    invalid_type_error: 'Type must be one of: SENIOR_CITIZEN, PWD, STUDENT, SOLO_PARENT, ALL',
  }),
  isActive: z.boolean().default(true),
});

export type GovernmentProgramInput = z.infer<typeof governmentProgramSchema>;

