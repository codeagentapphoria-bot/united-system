import { Prisma } from '@prisma/client';
import prisma from '../config/database';

export interface CreateFAQData {
  question: string;
  answer: string;
  order?: number;
  isActive?: boolean;
}

export interface UpdateFAQData {
  question?: string;
  answer?: string;
  order?: number;
  isActive?: boolean;
}

export interface FAQFilters {
  search?: string;
  isActive?: boolean;
}

export const createFAQ = async (data: CreateFAQData) => {
  const faq = await prisma.faq.create({
    data: {
      question: data.question,
      answer: data.answer,
      order: data.order !== undefined ? data.order : 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  return faq;
};

export const getFAQs = async (filters: FAQFilters) => {
  const { search, isActive } = filters;

  const where: Prisma.FaqWhereInput = {};

  // Search filter
  if (search) {
    where.OR = [
      { question: { contains: search, mode: 'insensitive' } },
      { answer: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Active filter
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const faqs = await prisma.faq.findMany({
    where,
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  });

  return faqs;
};

export const getActiveFAQs = async (limit?: number) => {
  const faqs = await prisma.faq.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  });

  return faqs;
};

export const getPaginatedFAQs = async (page: number = 1, limit: number = 10, search?: string) => {
  const skip = (page - 1) * limit;

  const where: Prisma.FaqWhereInput = {
    isActive: true,
  };

  if (search) {
    where.OR = [
      { question: { contains: search, mode: 'insensitive' } },
      { answer: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [faqs, total] = await Promise.all([
    prisma.faq.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.faq.count({ where }),
  ]);

  return {
    faqs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getFAQ = async (id: string) => {
  const faq = await prisma.faq.findUnique({
    where: { id },
  });

  if (!faq) {
    throw new Error('FAQ not found');
  }

  return faq;
};

export const updateFAQ = async (id: string, data: UpdateFAQData) => {
  const faq = await prisma.faq.findUnique({ where: { id } });

  if (!faq) {
    throw new Error('FAQ not found');
  }

  const updateData: Prisma.FaqUpdateInput = {};

  if (data.question !== undefined) updateData.question = data.question;
  if (data.answer !== undefined) updateData.answer = data.answer;
  if (data.order !== undefined) updateData.order = data.order;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return prisma.faq.update({
    where: { id },
    data: updateData,
  });
};

export const deleteFAQ = async (id: string) => {
  const faq = await prisma.faq.findUnique({
    where: { id },
  });

  if (!faq) {
    throw new Error('FAQ not found');
  }

  return prisma.faq.delete({
    where: { id },
  });
};

export const activateFAQ = async (id: string) => {
  const faq = await prisma.faq.findUnique({ where: { id } });

  if (!faq) {
    throw new Error('FAQ not found');
  }

  return prisma.faq.update({
    where: { id },
    data: { isActive: true },
  });
};

export const deactivateFAQ = async (id: string) => {
  const faq = await prisma.faq.findUnique({ where: { id } });

  if (!faq) {
    throw new Error('FAQ not found');
  }

  return prisma.faq.update({
    where: { id },
    data: { isActive: false },
  });
};
