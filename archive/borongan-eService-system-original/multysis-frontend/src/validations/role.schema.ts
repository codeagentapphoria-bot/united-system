import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Role name is required')
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Role name can only contain letters, numbers, spaces, hyphens, and underscores'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(200, 'Description must not exceed 200 characters'),
  permissionIds: z
    .array(z.string())
    .min(1, 'At least one permission must be selected'),
  redirectPath: z
    .string()
    .min(1, 'Redirect page is required'),
});

export const updateRoleSchema = z.object({
  name: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Role name can only contain letters, numbers, spaces, hyphens, and underscores')
    .optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(200, 'Description must not exceed 200 characters')
    .optional(),
  permissionIds: z
    .array(z.string())
    .min(1, 'At least one permission must be selected')
    .optional(),
  redirectPath: z
    .string()
    .min(1, 'Redirect page is required'),
  isActive: z.boolean().optional(),
});

export const addPermissionToRoleSchema = z.object({
  permissionIds: z
    .array(z.string())
    .min(1, 'At least one permission must be selected'),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type AddPermissionToRoleInput = z.infer<typeof addPermissionToRoleSchema>;
