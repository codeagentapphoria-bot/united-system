import prisma from '../config/database';
import { hashPassword } from '../utils/password';

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role?: string;
  roleIds?: string[];
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  role?: string;
  roleIds?: string[];
}

export const createUser = async (data: CreateUserData) => {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error('Email already registered');
  }

  const hashedPassword = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role || 'admin',
    },
  });

  // Assign roles if provided
  if (data.roleIds && data.roleIds.length > 0) {
    // Verify all roles exist
    const roles = await prisma.role.findMany({
      where: { id: { in: data.roleIds } },
    });

    if (roles.length !== data.roleIds.length) {
      throw new Error('One or more roles not found');
    }

    await prisma.userRole.createMany({
      data: data.roleIds.map((roleId) => ({
        userId: user.id,
        roleId,
      })),
    });
  }

  return prisma.user.findUnique({
    where: { id: user.id },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });
};

export const getUsers = async () => {
  return prisma.user.findMany({
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getUser = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

export const updateUser = async (id: string, data: UpdateUserData) => {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if new email conflicts with existing user
  if (data.email && data.email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }
  }

  await prisma.user.update({
    where: { id },
    data: {
      ...(data.email && { email: data.email }),
      ...(data.name && { name: data.name }),
      ...(data.role && { role: data.role }),
    },
  });

  // Update roles if provided
  if (data.roleIds !== undefined) {
    // Remove existing roles
    await prisma.userRole.deleteMany({
      where: { userId: id },
    });

    // Add new roles
    if (data.roleIds.length > 0) {
      // Verify all roles exist
      const roles = await prisma.role.findMany({
        where: { id: { in: data.roleIds } },
      });

      if (roles.length !== data.roleIds.length) {
        throw new Error('One or more roles not found');
      }

      await prisma.userRole.createMany({
        data: data.roleIds.map((roleId) => ({
          userId: id,
          roleId,
        })),
      });
    }
  }

  return getUser(id);
};

export const deleteUser = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new Error('User not found');
  }

  return prisma.user.delete({
    where: { id },
  });
};

export const changeUserPassword = async (id: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new Error('User not found');
  }

  const hashedPassword = await hashPassword(password);

  return prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
};
