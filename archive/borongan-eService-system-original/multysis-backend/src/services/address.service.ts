import { Prisma } from '@prisma/client';
import prisma from '../config/database';

export interface CreateAddressData {
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  postalCode: string;
  streetAddress?: string;
  isActive?: boolean;
}

export interface UpdateAddressData {
  region?: string;
  province?: string;
  municipality?: string;
  barangay?: string;
  postalCode?: string;
  streetAddress?: string;
  isActive?: boolean;
}

export interface AddressFilters {
  search?: string;
  region?: string;
  province?: string;
  municipality?: string;
  isActive?: boolean;
}

export const createAddress = async (data: CreateAddressData) => {
  const address = await prisma.address.create({
    data: {
      region: data.region,
      province: data.province,
      municipality: data.municipality,
      barangay: data.barangay,
      postalCode: data.postalCode,
      streetAddress: data.streetAddress || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  return address;
};

export const getAddresses = async (filters: AddressFilters) => {
  const { search, region, province, municipality, isActive } = filters;

  const where: Prisma.AddressWhereInput = {};

  // Search filter
  if (search) {
    where.OR = [
      { region: { contains: search, mode: 'insensitive' } },
      { province: { contains: search, mode: 'insensitive' } },
      { municipality: { contains: search, mode: 'insensitive' } },
      { barangay: { contains: search, mode: 'insensitive' } },
      { postalCode: { contains: search, mode: 'insensitive' } },
      { streetAddress: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Region filter
  if (region) {
    where.region = region;
  }

  // Province filter
  if (province) {
    where.province = province;
  }

  // Municipality filter
  if (municipality) {
    where.municipality = municipality;
  }

  // Active filter
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const addresses = await prisma.address.findMany({
    where,
    orderBy: [{ region: 'asc' }, { province: 'asc' }, { municipality: 'asc' }, { barangay: 'asc' }],
  });

  return addresses;
};

export const getAddress = async (id: string) => {
  const address = await prisma.address.findUnique({
    where: { id },
  });

  if (!address) {
    throw new Error('Address not found');
  }

  return address;
};

export const updateAddress = async (id: string, data: UpdateAddressData) => {
  const address = await prisma.address.findUnique({ where: { id } });

  if (!address) {
    throw new Error('Address not found');
  }

  const updateData: Prisma.AddressUpdateInput = {};

  if (data.region !== undefined) updateData.region = data.region;
  if (data.province !== undefined) updateData.province = data.province;
  if (data.municipality !== undefined) updateData.municipality = data.municipality;
  if (data.barangay !== undefined) updateData.barangay = data.barangay;
  if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
  if (data.streetAddress !== undefined) updateData.streetAddress = data.streetAddress || null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return prisma.address.update({
    where: { id },
    data: updateData,
  });
};

export const deleteAddress = async (id: string) => {
  const address = await prisma.address.findUnique({
    where: { id },
  });

  if (!address) {
    throw new Error('Address not found');
  }

  return prisma.address.delete({
    where: { id },
  });
};

export const activateAddress = async (id: string) => {
  const address = await prisma.address.findUnique({ where: { id } });

  if (!address) {
    throw new Error('Address not found');
  }

  return prisma.address.update({
    where: { id },
    data: { isActive: true },
  });
};

export const deactivateAddress = async (id: string) => {
  const address = await prisma.address.findUnique({ where: { id } });

  if (!address) {
    throw new Error('Address not found');
  }

  return prisma.address.update({
    where: { id },
    data: { isActive: false },
  });
};
