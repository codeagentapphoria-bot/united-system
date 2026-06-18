import { z } from 'zod';

const programTypeEnum = z.enum(['SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT', 'HEALTHCARE_WORKER', 'ALL']);

const requirementItemSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  label: z.string().min(1, 'Label is required'),
  required: z.boolean().default(false),
});

export type RequirementItem = z.infer<typeof requirementItemSchema>;

export const requirementItemListSchema = z.array(requirementItemSchema);

const sharedModeSchema = z.object({
  mode: z.literal('shared'),
  shared: requirementItemListSchema,
});

const perTypeEntrySchema = z.object({
  sub_types_enabled: z.boolean(),
  sub_types: z.array(z.string()),
  default: requirementItemListSchema,
  requirements: z.record(z.string(), requirementItemListSchema),
});

const perTypeModeSchema = z.object({
  mode: z.literal('per_type'),
  by_type: z.record(z.string(), perTypeEntrySchema),
});

export const requirementsConfigSchema = z.discriminatedUnion('mode', [
  sharedModeSchema,
  perTypeModeSchema,
]);

export type RequirementsConfig = z.infer<typeof requirementsConfigSchema>;

export const governmentProgramSchema = z.object({
  name: z.string().min(1, 'Program name is required').min(2, 'Program name must be at least 2 characters'),
  description: z.string().optional(),
  requirements: requirementsConfigSchema.optional(),
  types: z.array(programTypeEnum).min(1, 'Select at least one beneficiary type'),
  isActive: z.boolean().default(true),
});

export type GovernmentProgramInput = z.infer<typeof governmentProgramSchema>;
