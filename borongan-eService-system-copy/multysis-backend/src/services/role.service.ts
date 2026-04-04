import prisma from '../config/database';

export interface CreateRoleData {
  name: string;
  description?: string;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
}

export const createRole = async (data: CreateRoleData) => {
  // Check if role name already exists
  const existingRole = await prisma.role.findUnique({
    where: { name: data.name },
  });

  if (existingRole) {
    throw new Error('Role name already exists');
  }

  return prisma.role.create({
    data: {
      name: data.name,
      description: data.description,
    },
  });
};

export const getRoles = async () => {
  return prisma.role.findMany({
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: {
          userRoles: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getRole = async (id: string) => {
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
      userRoles: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!role) {
    throw new Error('Role not found');
  }

  return role;
};

export const updateRole = async (id: string, data: UpdateRoleData) => {
  const role = await prisma.role.findUnique({ where: { id } });

  if (!role) {
    throw new Error('Role not found');
  }

  // Check if new name conflicts with existing role
  if (data.name && data.name !== role.name) {
    const existingRole = await prisma.role.findUnique({
      where: { name: data.name },
    });

    if (existingRole) {
      throw new Error('Role name already exists');
    }
  }

  return prisma.role.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });
};

export const deleteRole = async (id: string) => {
  const role = await prisma.role.findUnique({ where: { id } });

  if (!role) {
    throw new Error('Role not found');
  }

  // Check if role is assigned to any users
  const userCount = await prisma.userRole.count({
    where: { roleId: id },
  });

  if (userCount > 0) {
    throw new Error('Cannot delete role that is assigned to users');
  }

  return prisma.role.delete({
    where: { id },
  });
};

export const assignPermissionsToRole = async (roleId: string, permissionIds: string[]) => {
  const role = await prisma.role.findUnique({ where: { id: roleId } });

  if (!role) {
    throw new Error('Role not found');
  }

  // Verify all permissions exist
  const permissions = await prisma.permission.findMany({
    where: { id: { in: permissionIds } },
  });

  if (permissions.length !== permissionIds.length) {
    throw new Error('One or more permissions not found');
  }

  // Remove existing permissions
  await prisma.rolePermission.deleteMany({
    where: { roleId },
  });

  // Add new permissions
  await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({
      roleId,
      permissionId,
    })),
  });

  return getRole(roleId);
};
