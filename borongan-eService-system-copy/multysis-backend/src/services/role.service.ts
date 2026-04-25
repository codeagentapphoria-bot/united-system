import prisma from '../config/database';

export interface CreateRoleData {
  name: string;
  description?: string;
  system: string;
  redirectPageId?: string;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  redirectPageId?: string;
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
      system: data.system,
      redirectPageId: data.redirectPageId,
    },
  });
};

export const getRoles = async (options: { page?: number; limit?: number; search?: string } = {}) => {
  const { page = 1, limit = 10, search } = options;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [roles, total] = await Promise.all([
    prisma.role.findMany({
      where,
      skip,
      take: limit,
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
        redirectPage: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.role.count({ where }),
  ]);

  return {
    roles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
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
      redirectPage: true,
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
      ...(data.redirectPageId !== undefined && { redirectPageId: data.redirectPageId }),
    },
  });
};

export const deleteRole = async (id: string) => {
  const role = await prisma.role.findUnique({ where: { id } });

  if (!role) {
    throw new Error('Role not found');
  }

  // Check if role is assigned to any users — atomic with delete
  return prisma.$transaction(async (tx) => {
    const userCount = await tx.userRole.count({
      where: { roleId: id },
    });

    if (userCount > 0) {
      throw new Error('Cannot delete role that is assigned to users');
    }

    return tx.role.delete({
      where: { id },
    });
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
  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({
      where: { roleId },
    });

    await tx.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
    });
  });

  return getRole(roleId);
};

export const getRolePages = async (roleId: string) => {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error('Role not found');

  const rolePages = await prisma.rolePage.findMany({
    where: { roleId },
    include: { page: true },
    orderBy: { page: { name: 'asc' } },
  });

  return rolePages.map((rp) => rp.page);
};

export const setRolePages = async (roleId: string, pageIds: string[]) => {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new Error('Role not found');

  // Verify all pages exist
  const pages = await prisma.page.findMany({ where: { id: { in: pageIds } } });
  if (pages.length !== pageIds.length) {
    throw new Error('One or more pages not found');
  }

  await prisma.$transaction(async (tx) => {
    await tx.rolePage.deleteMany({ where: { roleId } });
    if (pageIds.length > 0) {
      await tx.rolePage.createMany({
        data: pageIds.map((pageId) => ({ roleId, pageId })),
      });
    }
  });

  return getRolePages(roleId);
};
