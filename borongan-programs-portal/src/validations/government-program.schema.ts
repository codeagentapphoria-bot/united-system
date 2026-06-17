import { z } from 'zod';

export interface RequirementItem {
  type: string;
  label: string;
  required: boolean;
}

// ── RequirementsConfig (mirrors multysis-frontend schema) ────────────────────────

const requirementItemListSchema = z.array(
  z.object({
    type: z.string().min(1),
    label: z.string().min(1),
    required: z.boolean().default(false),
  })
);

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
