import { z } from 'zod';

const programTypeEnum = z.enum(['SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT', 'ALL']);

const requirementItemSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  label: z.string().min(1, 'Label is required'),
  required: z.boolean().default(false),
});

export type RequirementItem = z.infer<typeof requirementItemSchema>;

export const governmentProgramSchema = z.object({
  name: z.string().min(1, 'Program name is required').min(2, 'Program name must be at least 2 characters'),
  description: z.string().optional(),
  requirements: z.array(requirementItemSchema).optional(),
  types: z.array(programTypeEnum).min(1, 'Select at least one beneficiary type'),
  isActive: z.boolean().default(true),
});

export type GovernmentProgramInput = z.infer<typeof governmentProgramSchema>;
