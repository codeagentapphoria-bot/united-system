import { z } from 'zod';

const programTypeEnum = z.enum(['SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT', 'ALL']);

export const governmentProgramSchema = z.object({
  name: z.string().min(1, 'Program name is required').min(2, 'Program name must be at least 2 characters'),
  description: z.string().optional(),
  requirements: z.string().optional(),
  types: z.array(programTypeEnum).min(1, 'Select at least one beneficiary type'),
  isActive: z.boolean().default(true),
});

export type GovernmentProgramInput = z.infer<typeof governmentProgramSchema>;
