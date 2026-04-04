import { z } from 'zod';

export const createPermissionSchema = z.object({
  name: z
    .string()
    .min(1, 'Permission name is required')
    .min(2, 'Permission name must be at least 2 characters')
    .max(100, 'Permission name must not exceed 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(200, 'Description must not exceed 200 characters'),
  resource: z
    .string()
    .min(1, 'Resource is required'),
  action: z
    .string()
    .min(1, 'Action is required')
    .refine(
      (val) => ['read', 'all'].includes(val),
      'Action must be either "read" (view) or "all" (manage)'
    ),
});

export const updatePermissionSchema = z.object({
  name: z
    .string()
    .min(2, 'Permission name must be at least 2 characters')
    .max(100, 'Permission name must not exceed 100 characters')
    .optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(200, 'Description must not exceed 200 characters')
    .optional(),
  resource: z
    .string()
    .min(1, 'Resource is required')
    .optional(),
  action: z
    .string()
    .refine(
      (val) => !val || ['read', 'all'].includes(val),
      'Action must be either "read" (view) or "all" (manage)'
    )
    .optional(),
});

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;

