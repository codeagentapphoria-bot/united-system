import prisma from '../config/database';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateSystemData {
  slug: string;
  label: string;
}

export interface UpdateSystemData {
  slug?: string;
  label?: string;
}

export interface DeleteSystemResult {
  deleted: boolean;
  affectedPages?: number;
  affectedRoles?: number;
}

// =============================================================================
// CREATE SYSTEM
// =============================================================================

export const createSystem = async (data: CreateSystemData) => {
  const existing = await prisma.system.findUnique({
    where: { slug: data.slug },
  });

  if (existing) {
    throw new Error('A system with this slug already exists');
  }

  return prisma.system.create({
    data: {
      slug: data.slug,
      label: data.label,
    },
  });
};

// =============================================================================
// GET SYSTEMS
// =============================================================================

export const getSystems = async () => {
  const systems = await prisma.system.findMany({
    orderBy: [{ slug: 'asc' }],
  });
  return systems;
};

// =============================================================================
// GET SYSTEM BY SLUG
// =============================================================================

export const getSystemBySlug = async (slug: string) => {
  const system = await prisma.system.findUnique({
    where: { slug },
  });

  if (!system) {
    throw new Error('System not found');
  }

  return system;
};

// =============================================================================
// UPDATE SYSTEM
// =============================================================================

export const updateSystem = async (slug: string, data: UpdateSystemData) => {
  const current = await prisma.system.findUnique({ where: { slug } });
  if (!current) throw new Error('System not found');

  // Prevent changing 'unassigned' slug
  if (current.slug === 'unassigned') {
    throw new Error('Cannot modify the unassigned system');
  }

  // Prevent changing reserved slugs
  if (data.slug && data.slug !== slug) {
    const conflict = await prisma.system.findUnique({ where: { slug: data.slug } });
    if (conflict) throw new Error('A system with this slug already exists');
  }

  return prisma.system.update({
    where: { slug },
    data: {
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.label !== undefined && { label: data.label }),
    },
  });
};

// =============================================================================
// DELETE SYSTEM
// =============================================================================

export const deleteSystem = async (
  slug: string
): Promise<{ affectedPages: number; affectedRoles: number }> => {
  // Prevent deleting 'unassigned'
  if (slug === 'unassigned') {
    throw new Error('Cannot delete the unassigned system');
  }

  // Count affected pages and roles
  const [affectedPages, affectedRoles] = await Promise.all([
    prisma.page.count({ where: { system: slug } }),
    prisma.role.count({ where: { system: slug } }),
  ]);

  if (affectedPages > 0 || affectedRoles > 0) {
    // Return counts so caller can warn the user
    return { affectedPages, affectedRoles };
  }

  // No dependents — safe to delete
  await prisma.system.delete({ where: { slug } });
  return { affectedPages: 0, affectedRoles: 0 };
};

// =============================================================================
// FORCE DELETE SYSTEM (after user confirms warning)
// Sets pages/roles to 'unassigned', then deletes the system.
// =============================================================================

export const forceDeleteSystem = async (
  slug: string
): Promise<{ affectedPages: number; affectedRoles: number }> => {
  if (slug === 'unassigned') {
    throw new Error('Cannot delete the unassigned system');
  }

  const [affectedPages, affectedRoles] = await Promise.all([
    prisma.page.count({ where: { system: slug } }),
    prisma.role.count({ where: { system: slug } }),
  ]);

  // Set all pages and roles with this system to 'unassigned'
  await Promise.all([
    prisma.page.updateMany({
      where: { system: slug },
      data: { system: 'unassigned' },
    }),
    prisma.role.updateMany({
      where: { system: slug },
      data: { system: 'unassigned' },
    }),
  ]);

  // Delete the system
  await prisma.system.delete({ where: { slug } });

  return { affectedPages, affectedRoles };
};
