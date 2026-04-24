import prisma from '../config/database';
import { PermissionAction } from '@prisma/client';

export interface CreatePermissionData {
  resource: string;
  action: 'read' | 'all';
}

export interface UpdatePermissionData {
  resource?: string;
  action?: 'read' | 'all';
}

export const createPermission = async (data: CreatePermissionData) => {
  const action = data.action.toUpperCase() as PermissionAction;

  // Check if permission already exists
  const existingPermission = await prisma.permission.findUnique({
    where: {
      resource_action: {
        resource: data.resource,
        action,
      },
    },
  });

  if (existingPermission) {
    throw new Error('Permission already exists');
  }

  return prisma.permission.create({
    data: {
      resource: data.resource,
      action,
    },
  });
};

export const getPermissions = async (options: {
  page?: number;
  limit?: number;
  search?: string;
  resource?: string;
} = {}) => {
  const { page = 1, limit = 10, search, resource } = options;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [{ resource: { contains: search, mode: 'insensitive' } }];
  }
  if (resource && resource !== 'all') {
    where.resource = resource;
  }

  const [permissions, total] = await Promise.all([
    prisma.permission.findMany({
      where,
      skip,
      take: limit,
      include: {
        rolePermissions: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    }),
    prisma.permission.count({ where }),
  ]);

  return {
    permissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getPermission = async (id: string) => {
  const permission = await prisma.permission.findUnique({
    where: { id },
    include: {
      rolePermissions: {
        include: {
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      },
    },
  });

  if (!permission) {
    throw new Error('Permission not found');
  }

  return permission;
};

export const updatePermission = async (id: string, data: UpdatePermissionData) => {
  const permission = await prisma.permission.findUnique({ where: { id } });

  if (!permission) {
    throw new Error('Permission not found');
  }

  const resource = data.resource || permission.resource;
  const action = data.action ? (data.action.toUpperCase() as PermissionAction) : permission.action;

  // Check if new combination conflicts with existing permission
  if (
    (data.resource || data.action) &&
    (resource !== permission.resource || action !== permission.action)
  ) {
    const existingPermission = await prisma.permission.findUnique({
      where: {
        resource_action: {
          resource,
          action,
        },
      },
    });

    if (existingPermission && existingPermission.id !== id) {
      throw new Error('Permission already exists');
    }
  }

  return prisma.permission.update({
    where: { id },
    data: {
      ...(data.resource && { resource }),
      ...(data.action && { action }),
    },
  });
};

export const deletePermission = async (id: string) => {
  const permission = await prisma.permission.findUnique({ where: { id } });

  if (!permission) {
    throw new Error('Permission not found');
  }

  // Check if permission is assigned to any roles — atomic with delete
  return prisma.$transaction(async (tx) => {
    const roleCount = await tx.rolePermission.count({
      where: { permissionId: id },
    });

    if (roleCount > 0) {
      throw new Error('Cannot delete permission that is assigned to roles');
    }

    return tx.permission.delete({
      where: { id },
    });
  });
};
