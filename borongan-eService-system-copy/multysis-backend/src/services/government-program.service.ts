import { Prisma } from '@prisma/client';
import prisma from '../config/database';

export interface CreateGovernmentProgramData {
  name: string;
  description?: string;
  type: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT' | 'ALL';
  isActive?: boolean;
}

export interface UpdateGovernmentProgramData {
  name?: string;
  description?: string;
  type?: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT' | 'ALL';
  isActive?: boolean;
}

export interface GovernmentProgramFilters {
  search?: string;
  type?: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT' | 'ALL';
  isActive?: boolean;
}

export const createGovernmentProgram = async (data: CreateGovernmentProgramData) => {
  const governmentProgram = await prisma.governmentProgram.create({
    data: {
      name: data.name,
      description: data.description || null,
      type: data.type,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  return governmentProgram;
};

export const getGovernmentPrograms = async (filters: GovernmentProgramFilters) => {
  const { search, type, isActive } = filters;

  const where: Prisma.GovernmentProgramWhereInput = {};

  // Search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Type filter
  if (type) {
    where.type = type;
  }

  // Active filter
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const governmentPrograms = await prisma.governmentProgram.findMany({
    where,
    orderBy: [{ name: 'asc' }],
  });

  return governmentPrograms;
};

export const getGovernmentProgram = async (id: string) => {
  const governmentProgram = await prisma.governmentProgram.findUnique({
    where: { id },
  });

  if (!governmentProgram) {
    throw new Error('Government program not found');
  }

  return governmentProgram;
};

export const updateGovernmentProgram = async (id: string, data: UpdateGovernmentProgramData) => {
  const governmentProgram = await prisma.governmentProgram.findUnique({ where: { id } });

  if (!governmentProgram) {
    throw new Error('Government program not found');
  }

  const updateData: Prisma.GovernmentProgramUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return prisma.governmentProgram.update({
    where: { id },
    data: updateData,
  });
};

export const deleteGovernmentProgram = async (id: string) => {
  const governmentProgram = await prisma.governmentProgram.findUnique({
    where: { id },
  });

  if (!governmentProgram) {
    throw new Error('Government program not found');
  }

  return prisma.governmentProgram.delete({
    where: { id },
  });
};

export const activateGovernmentProgram = async (id: string) => {
  const governmentProgram = await prisma.governmentProgram.findUnique({ where: { id } });

  if (!governmentProgram) {
    throw new Error('Government program not found');
  }

  return prisma.governmentProgram.update({
    where: { id },
    data: { isActive: true },
  });
};

export const deactivateGovernmentProgram = async (id: string) => {
  const governmentProgram = await prisma.governmentProgram.findUnique({ where: { id } });

  if (!governmentProgram) {
    throw new Error('Government program not found');
  }

  return prisma.governmentProgram.update({
    where: { id },
    data: { isActive: false },
  });
};
