import { GovernmentProgramType, Prisma } from '@prisma/client';
import prisma from '../config/database';

type ProgramTypeValue = 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT' | 'ALL';

export interface CreateGovernmentProgramData {
  name: string;
  description?: string;
  requirements?: string;
  types: ProgramTypeValue[];
  isActive?: boolean;
}

export interface UpdateGovernmentProgramData {
  name?: string;
  description?: string;
  requirements?: string;
  types?: ProgramTypeValue[];
  isActive?: boolean;
}

export interface GovernmentProgramFilters {
  search?: string;
  type?: ProgramTypeValue; // filter: programs whose types array contains this value
  isActive?: boolean;
}

export const createGovernmentProgram = async (data: CreateGovernmentProgramData) => {
  return prisma.governmentProgram.create({
    data: {
      name: data.name,
      description: data.description || null,
      requirements: data.requirements || null,
      types: data.types as GovernmentProgramType[],
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });
};

export const getGovernmentPrograms = async (filters: GovernmentProgramFilters) => {
  const { search, type, isActive } = filters;

  const where: Prisma.GovernmentProgramWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Filter: programs whose `types` array contains the requested type
  if (type) {
    where.types = { has: type as GovernmentProgramType };
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  return prisma.governmentProgram.findMany({
    where,
    orderBy: [{ name: 'asc' }],
  });
};

export const getGovernmentProgram = async (id: string) => {
  const program = await prisma.governmentProgram.findUnique({ where: { id } });

  if (!program) {
    throw new Error('Government program not found');
  }

  return program;
};

export const updateGovernmentProgram = async (id: string, data: UpdateGovernmentProgramData) => {
  const program = await prisma.governmentProgram.findUnique({ where: { id } });

  if (!program) {
    throw new Error('Government program not found');
  }

  const updateData: Prisma.GovernmentProgramUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.requirements !== undefined) updateData.requirements = data.requirements || null;
  if (data.types !== undefined) updateData.types = data.types as GovernmentProgramType[];
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return prisma.governmentProgram.update({ where: { id }, data: updateData });
};

export const deleteGovernmentProgram = async (id: string) => {
  const program = await prisma.governmentProgram.findUnique({ where: { id } });

  if (!program) {
    throw new Error('Government program not found');
  }

  return prisma.governmentProgram.delete({ where: { id } });
};

export const activateGovernmentProgram = async (id: string) => {
  const program = await prisma.governmentProgram.findUnique({ where: { id } });

  if (!program) {
    throw new Error('Government program not found');
  }

  return prisma.governmentProgram.update({ where: { id }, data: { isActive: true } });
};

export const deactivateGovernmentProgram = async (id: string) => {
  const program = await prisma.governmentProgram.findUnique({ where: { id } });

  if (!program) {
    throw new Error('Government program not found');
  }

  return prisma.governmentProgram.update({ where: { id }, data: { isActive: false } });
};
