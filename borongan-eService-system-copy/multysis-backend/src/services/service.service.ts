import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import cacheService from './cache.service';

export interface CreateServiceData {
  code: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
  requiresPayment?: boolean;
  defaultAmount?: number;
  paymentStatuses?: string[];
  formFields?: any;
  displayInSidebar?: boolean;
  displayInSubscriberTabs?: boolean;
  requiresAppointment?: boolean;
  appointmentDuration?: number; // Duration in minutes
}

export interface UpdateServiceData {
  code?: string;
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
  requiresPayment?: boolean;
  defaultAmount?: number;
  paymentStatuses?: string[];
  formFields?: any;
  displayInSidebar?: boolean;
  displayInSubscriberTabs?: boolean;
  requiresAppointment?: boolean;
  appointmentDuration?: number; // Duration in minutes
}

export interface ServiceFilters {
  search?: string;
  category?: string;
  isActive?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export const createService = async (data: CreateServiceData) => {
  // Check if code already exists
  const existingService = await prisma.service.findUnique({
    where: { code: data.code },
  });

  if (existingService) {
    throw new Error('Service code already exists');
  }

  const service = await prisma.service.create({
    data: {
      code: data.code,
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      icon: data.icon || null,
      order: data.order || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      requiresPayment: data.requiresPayment !== undefined ? data.requiresPayment : true,
      defaultAmount: data.defaultAmount || null,
      paymentStatuses: data.paymentStatuses ? (data.paymentStatuses as any) : null,
      formFields: data.formFields ? (data.formFields as any) : null,
      displayInSidebar: data.displayInSidebar !== undefined ? data.displayInSidebar : true,
      displayInSubscriberTabs:
        data.displayInSubscriberTabs !== undefined ? data.displayInSubscriberTabs : true,
      requiresAppointment:
        data.requiresAppointment !== undefined ? data.requiresAppointment : false,
      appointmentDuration: data.appointmentDuration || null,
    },
  });

  return service;
};

export const getServices = async (filters: ServiceFilters, pagination: PaginationOptions) => {
  const { search, category, isActive } = filters;
  const { page, limit } = pagination;

  const where: Prisma.ServiceWhereInput = {};

  // Search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Category filter
  if (category) {
    where.category = category;
  }

  // Active filter
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const skip = (page - 1) * limit;

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.service.count({ where }),
  ]);

  return {
    services,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getService = async (id: string) => {
  const service = await prisma.service.findUnique({
    where: { id },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  return service;
};

export const getServiceByCode = async (code: string) => {
  const service = await prisma.service.findUnique({
    where: { code },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  return service;
};

export const getActiveServices = async (options?: {
  displayInSidebar?: boolean;
  displayInSubscriberTabs?: boolean;
}) => {
  const cacheKey = `services:active:${options?.displayInSidebar}:${options?.displayInSubscriberTabs}`;
  
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  const where: Prisma.ServiceWhereInput = {
    isActive: true,
  };

  if (options?.displayInSidebar !== undefined) {
    where.displayInSidebar = options.displayInSidebar;
  }

  if (options?.displayInSubscriberTabs !== undefined) {
    where.displayInSubscriberTabs = options.displayInSubscriberTabs;
  }

  const services = await prisma.service.findMany({
    where,
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  });

  await cacheService.set(cacheKey, services, 600);
  
  return services;
};

export const getAllCategories = async (): Promise<string[]> => {
  const services = await prisma.service.findMany({
    select: { category: true },
    where: {
      isActive: true,
    },
  });

  const categories = new Set<string>();
  services.forEach((service) => {
    if (service.category) {
      categories.add(service.category);
    }
  });

  return Array.from(categories).sort();
};

export const updateService = async (id: string, data: UpdateServiceData) => {
  const service = await prisma.service.findUnique({ where: { id } });

  if (!service) {
    throw new Error('Service not found');
  }

  // Check code uniqueness if code is being updated
  if (data.code && data.code !== service.code) {
    const existingService = await prisma.service.findUnique({
      where: { code: data.code },
    });

    if (existingService) {
      throw new Error('Service code already exists');
    }
  }

  const updateData: Prisma.ServiceUpdateInput = {};

  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description || null;
  if (data.category !== undefined) updateData.category = data.category || null;
  if (data.icon !== undefined) updateData.icon = data.icon || null;
  if (data.order !== undefined) updateData.order = data.order;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.requiresPayment !== undefined) updateData.requiresPayment = data.requiresPayment;
  if (data.defaultAmount !== undefined) updateData.defaultAmount = data.defaultAmount || null;
  if (data.paymentStatuses !== undefined)
    updateData.paymentStatuses = data.paymentStatuses ? (data.paymentStatuses as any) : null;
  if (data.formFields !== undefined)
    updateData.formFields = data.formFields ? (data.formFields as any) : null;
  if (data.displayInSidebar !== undefined) updateData.displayInSidebar = data.displayInSidebar;
  if (data.displayInSubscriberTabs !== undefined)
    updateData.displayInSubscriberTabs = data.displayInSubscriberTabs;
  if (data.requiresAppointment !== undefined)
    updateData.requiresAppointment = data.requiresAppointment;
  if (data.appointmentDuration !== undefined)
    updateData.appointmentDuration = data.appointmentDuration || null;

  return prisma.service.update({
    where: { id },
    data: updateData,
  });
};

export const deleteService = async (id: string) => {
  const service = await prisma.service.findUnique({
    where: { id },
    include: {
      transactions: {
        take: 1,
      },
    },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  // Check if service has transactions
  if (service.transactions.length > 0) {
    throw new Error('Cannot delete service with existing transactions');
  }

  return prisma.service.delete({
    where: { id },
  });
};

export const activateService = async (id: string) => {
  const service = await prisma.service.findUnique({ where: { id } });

  if (!service) {
    throw new Error('Service not found');
  }

  return prisma.service.update({
    where: { id },
    data: { isActive: true },
  });
};

export const deactivateService = async (id: string) => {
  const service = await prisma.service.findUnique({ where: { id } });

  if (!service) {
    throw new Error('Service not found');
  }

  return prisma.service.update({
    where: { id },
    data: { isActive: false },
  });
};

export const getServiceFieldsMetadata = async (serviceId: string) => {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { formFields: true },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  return service.formFields;
};
