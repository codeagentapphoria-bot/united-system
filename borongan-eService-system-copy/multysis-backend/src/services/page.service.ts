import prisma from '../config/database';

// =============================================================================
// TYPES
// =============================================================================

export interface CreatePageData {
  system: string;
  path: string;
  name: string;
}

export interface UpdatePageData {
  system?: string;
  path?: string;
  name?: string;
}

// =============================================================================
// CREATE PAGE
// =============================================================================

export const createPage = async (data: CreatePageData) => {
  // Check for duplicate (system + path)
  const existing = await prisma.page.findUnique({
    where: { system_path: { system: data.system, path: data.path } },
  });

  if (existing) {
    throw new Error('A page with this system and path already exists');
  }

  return prisma.page.create({
    data: {
      system: data.system,
      path: data.path,
      name: data.name,
    },
  });
};

// =============================================================================
// GET PAGES
// =============================================================================

export const getPages = async (options: { system?: string; page?: number; limit?: number } = {}) => {
  const { system, page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const where = system ? { system } : {};

  const [pages, total] = await Promise.all([
    prisma.page.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ system: 'asc' }, { path: 'asc' }],
    }),
    prisma.page.count({ where }),
  ]);

  return {
    pages,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// =============================================================================
// GET PAGE BY ID
// =============================================================================

export const getPageById = async (id: string) => {
  const page = await prisma.page.findUnique({
    where: { id },
  });

  if (!page) {
    throw new Error('Page not found');
  }

  return page;
};

// =============================================================================
// UPDATE PAGE
// =============================================================================

export const updatePage = async (id: string, data: UpdatePageData) => {
  // If changing system or path, check for conflicts
  if (data.system !== undefined || data.path !== undefined) {
    const current = await prisma.page.findUnique({ where: { id } });
    if (!current) throw new Error('Page not found');

    const newSystem = data.system ?? current.system;
    const newPath = data.path ?? current.path;

    const conflict = await prisma.page.findUnique({
      where: { system_path: { system: newSystem, path: newPath } },
    });

    if (conflict && conflict.id !== id) {
      throw new Error('A page with this system and path already exists');
    }
  }

  return prisma.page.update({
    where: { id },
    data,
  });
};

// =============================================================================
// DELETE PAGE
// =============================================================================

export const deletePage = async (id: string) => {
  await prisma.page.delete({ where: { id } });
};
