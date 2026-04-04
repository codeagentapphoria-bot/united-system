import { Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import prisma from '../config/database';

export interface CreateCitizenData {
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  email?: string;
  phoneNumber?: string;
  citizenPicture?: string;
  birthDate: Date;
  civilStatus: string;
  sex: string;
  spouseName?: string;
  emergencyContactPerson: string;
  emergencyContactNumber: string;
  username: string;
  pin: string;
  region: string;
  province: string;
  municipality: string;
  addressRegion: string;
  addressProvince: string;
  addressMunicipality: string;
  addressBarangay: string;
  addressPostalCode?: string;
  addressStreetAddress: string;
  isResident?: boolean;
  isVoter?: boolean;
  proofOfIdentification?: string;
  idDocumentNumber?: string;
  address?: string;
  idType?: string;
  isEmployed?: boolean;
  citizenship?: string;
  acrNo?: string;
  profession?: string;
  height?: string;
  weight?: string;
}

export interface UpdateCitizenData {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  extensionName?: string;
  email?: string;
  phoneNumber?: string;
  citizenPicture?: string;
  birthDate?: Date;
  civilStatus?: string;
  sex?: string;
  spouseName?: string;
  emergencyContactPerson?: string;
  emergencyContactNumber?: string;
  username?: string;
  pin?: string;
  region?: string;
  province?: string;
  municipality?: string;
  addressRegion?: string;
  addressProvince?: string;
  addressMunicipality?: string;
  addressBarangay?: string;
  addressPostalCode?: string;
  addressStreetAddress?: string;
  isResident?: boolean;
  isVoter?: boolean;
  proofOfIdentification?: string;
  idDocumentNumber?: string;
  address?: string;
  idType?: string;
  isEmployed?: boolean;
  citizenship?: string;
  acrNo?: string;
  profession?: string;
  height?: string;
  weight?: string;
}

export interface CitizenFilters {
  search?: string;
  status?: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// Helper function to check if phone number exists in Citizen or NonCitizen
const checkPhoneNumberExists = async (
  phoneNumber: string | null | undefined,
  excludeCitizenId?: string
): Promise<boolean> => {
  if (!phoneNumber) return false;

  // Check in Citizen table
  const existingCitizen = await prisma.citizen.findFirst({
    where: {
      phoneNumber: phoneNumber,
      ...(excludeCitizenId && { id: { not: excludeCitizenId } }),
    },
  });

  if (existingCitizen) return true;

  // Check in NonCitizen table
  const existingNonCitizen = await (prisma as any).nonCitizen.findUnique({
    where: { phoneNumber: phoneNumber },
  });

  return !!existingNonCitizen;
};

export const createCitizen = async (data: CreateCitizenData) => {
  // Check if username already exists
  const existingCitizen = await prisma.citizen.findUnique({
    where: { username: data.username },
  });

  if (existingCitizen) {
    throw new Error('Username already exists');
  }

  // Check if phone number already exists (in Citizen or NonCitizen)
  if (data.phoneNumber) {
    const phoneExists = await checkPhoneNumberExists(data.phoneNumber);
    if (phoneExists) {
      throw new Error('Phone number is already registered');
    }
  }

  // Generate resident ID
  const year = new Date().getFullYear();
  const count = await prisma.citizen.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });
  const residentId = `RES-${year}-${String(count + 1).padStart(3, '0')}`;

  const citizen = await prisma.citizen.create({
    data: {
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      extensionName: data.extensionName,
      email: data.email || null,
      phoneNumber: data.phoneNumber || null,
      citizenPicture: data.citizenPicture || null,
      birthDate: data.birthDate,
      civilStatus: data.civilStatus,
      sex: data.sex,
      spouseName: data.spouseName || null,
      emergencyContactPerson: data.emergencyContactPerson,
      emergencyContactNumber: data.emergencyContactNumber,
      username: data.username,
      pin: data.pin,
      residentId,
      addressRegion: data.addressRegion,
      addressProvince: data.addressProvince,
      addressMunicipality: data.addressMunicipality,
      addressBarangay: data.addressBarangay,
      addressPostalCode: data.addressPostalCode || null,
      addressStreetAddress: data.addressStreetAddress,
      isResident: data.isResident || false,
      isVoter: data.isVoter || false,
      proofOfIdentification: data.proofOfIdentification || null,
      idDocumentNumber: data.idDocumentNumber || null,
      idType: data.idType,
      address: data.address || null,
      isEmployed: data.isEmployed || false,
      citizenship: data.citizenship || null,
      acrNo: data.acrNo || null,
      profession: data.profession || null,
      height: data.height || null,
      weight: data.weight || null,
      placeOfBirth: {
        create: {
          region: data.region,
          province: data.province,
          municipality: data.municipality,
        },
      },
    },
    include: {
      placeOfBirth: true,
    },
  });

  return citizen;
};

export const getCitizens = async (filters: CitizenFilters, pagination: PaginationOptions) => {
  const { search, status } = filters;
  const { page, limit } = pagination;

  const where: Prisma.CitizenWhereInput = {
    // Exclude PENDING citizens that have a citizenRegistrationRequest
    // Only show: admin-created citizens OR citizens not linked to registration requests
    OR: [
      { citizenRegistrationRequest: null },
      {
        AND: [
          { residencyStatus: 'ACTIVE' as const },
        ],
      },
      {
        AND: [
          { residencyStatus: 'INACTIVE' as const },
        ],
      },
      {
        AND: [
          { residencyStatus: 'REJECTED' as const },
        ],
      },
    ],
  };

  // Search filter
  if (search) {
    where.AND = [
      {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search, mode: 'insensitive' } },
          { residentId: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
        ],
      },
      {
        OR: [
          { citizenRegistrationRequest: null },
          { residencyStatus: 'ACTIVE' as const },
          { residencyStatus: 'INACTIVE' as const },
          { residencyStatus: 'REJECTED' as const },
        ],
      },
    ];
  }

  // Status filter (if provided, overrides the excludePending for PENDING)
  if (status) {
    delete where.OR;
    delete where.AND;
    where.residencyStatus = status;
  }

  const skip = (page - 1) * limit;

  const [citizens, total] = await Promise.all([
    prisma.citizen.findMany({
      where,
      include: {
        placeOfBirth: true,
        seniorCitizenBeneficiary: true,
        pwdBeneficiary: true,
        studentBeneficiary: true,
        soloParentBeneficiary: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.citizen.count({ where }),
  ]);

  return {
    citizens,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getCitizen = async (id: string) => {
  const citizen = await prisma.citizen.findUnique({
    where: { id },
    include: {
      placeOfBirth: true,
      seniorCitizenBeneficiary: true,
      pwdBeneficiary: true,
      studentBeneficiary: true,
      soloParentBeneficiary: true,
    },
  });

  if (!citizen) {
    throw new Error('Citizen not found');
  }

  return citizen;
};

export const updateCitizen = async (id: string, data: UpdateCitizenData) => {
  const citizen = await prisma.citizen.findUnique({
    where: { id },
    include: {
      placeOfBirth: true,
    },
  });

  if (!citizen) {
    throw new Error('Citizen not found');
  }

  // Check username uniqueness if username is being updated
  if (data.username && data.username !== citizen.username) {
    const existingCitizen = await prisma.citizen.findUnique({
      where: { username: data.username },
    });

    if (existingCitizen) {
      throw new Error('Username already exists');
    }
  }

  // Check if phone number already exists (in Citizen or NonCitizen) if phone number is being updated
  if (data.phoneNumber !== undefined && data.phoneNumber !== citizen.phoneNumber) {
    if (data.phoneNumber) {
      const phoneExists = await checkPhoneNumberExists(data.phoneNumber, id);
      if (phoneExists) {
        throw new Error('Phone number is already registered');
      }
    }
  }

  // Helper function to normalize file paths for comparison
  const normalizeFilePath = (filePath: string | null | undefined): string | null => {
    if (!filePath) return null;

    // Extract relative path from URL or use as-is if already relative
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      // Extract relative path from full URL
      const urlPath = filePath.includes('/uploads/') ? filePath.split('/uploads/')[1] : '';
      return urlPath ? `/uploads/${urlPath}` : null;
    }

    // Already a relative path
    return filePath.startsWith('/') ? filePath : `/${filePath}`;
  };

  // Helper function to delete old file if a new one is being uploaded
  const deleteOldFileIfReplacing = (
    oldFilePath: string | null | undefined,
    newFilePath: string | null | undefined
  ) => {
    const normalizedOldPath = normalizeFilePath(oldFilePath);
    const normalizedNewPath = normalizeFilePath(newFilePath);

    // Only delete if there's an old file AND a new file is being uploaded AND they're different
    if (normalizedOldPath && normalizedNewPath && normalizedOldPath !== normalizedNewPath) {
      try {
        const fullPath = path.join(process.cwd(), normalizedOldPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`Deleted old file: ${normalizedOldPath}`);
        }
      } catch (error) {
        console.error('Error deleting old file:', error);
        // Don't throw - continue with update even if file deletion fails
      }
    }
  };

  // Delete old files if new ones are being uploaded
  if (data.citizenPicture !== undefined) {
    deleteOldFileIfReplacing(citizen.citizenPicture, data.citizenPicture);
  }
  if (data.proofOfIdentification !== undefined) {
    deleteOldFileIfReplacing(citizen.proofOfIdentification, data.proofOfIdentification);
  }

  // Update main citizen data
  const updateData: Prisma.CitizenUpdateInput = {};

  if (data.firstName) updateData.firstName = data.firstName;
  if (data.middleName !== undefined) updateData.middleName = data.middleName;
  if (data.lastName) updateData.lastName = data.lastName;
  if (data.extensionName !== undefined) updateData.extensionName = data.extensionName;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber || null;
  if (data.citizenPicture !== undefined) updateData.citizenPicture = data.citizenPicture || null;
  if (data.birthDate) updateData.birthDate = data.birthDate;
  if (data.civilStatus) updateData.civilStatus = data.civilStatus;
  if (data.sex) updateData.sex = data.sex;
  if (data.spouseName !== undefined) updateData.spouseName = data.spouseName || null;
  if (data.emergencyContactPerson !== undefined)
    updateData.emergencyContactPerson = data.emergencyContactPerson || null;
  if (data.emergencyContactNumber !== undefined)
    updateData.emergencyContactNumber = data.emergencyContactNumber || null;
  if (data.username) updateData.username = data.username;
  if (data.pin) updateData.pin = data.pin;
  if (data.addressRegion !== undefined) updateData.addressRegion = data.addressRegion || null;
  if (data.addressProvince !== undefined) updateData.addressProvince = data.addressProvince || null;
  if (data.addressMunicipality !== undefined)
    updateData.addressMunicipality = data.addressMunicipality || null;
  if (data.addressBarangay !== undefined) updateData.addressBarangay = data.addressBarangay || null;
  if (data.addressPostalCode !== undefined)
    updateData.addressPostalCode = data.addressPostalCode || null;
  if (data.addressStreetAddress !== undefined)
    updateData.addressStreetAddress = data.addressStreetAddress || null;
  if (data.isResident !== undefined) updateData.isResident = data.isResident;
  if (data.isVoter !== undefined) updateData.isVoter = data.isVoter;
  if (data.proofOfIdentification !== undefined)
    updateData.proofOfIdentification = data.proofOfIdentification || null;
  if (data.idDocumentNumber !== undefined)
    updateData.idDocumentNumber = data.idDocumentNumber || null;
  if (data.address !== undefined) updateData.address = data.address || null;
  if (data.idType !== undefined) updateData.idType = data.idType || null;
  if (data.isEmployed !== undefined) updateData.isEmployed = data.isEmployed;
  if (data.citizenship !== undefined) updateData.citizenship = data.citizenship || null;
  if (data.acrNo !== undefined) updateData.acrNo = data.acrNo || null;
  if (data.profession !== undefined) updateData.profession = data.profession || null;
  if (data.height !== undefined) updateData.height = data.height || null;
  if (data.weight !== undefined) updateData.weight = data.weight || null;

  await prisma.citizen.update({
    where: { id },
    data: updateData,
    include: {
      placeOfBirth: true,
    },
  });

  // Update place of birth
  if (data.region || data.province || data.municipality) {
    const existingPlaceOfBirth =
      citizen.placeOfBirth && citizen.placeOfBirth.length > 0 ? citizen.placeOfBirth[0] : null;

    if (existingPlaceOfBirth) {
      // Update existing place of birth
      await prisma.placeOfBirth.update({
        where: { id: existingPlaceOfBirth.id },
        data: {
          region: data.region || existingPlaceOfBirth.region,
          province: data.province || existingPlaceOfBirth.province,
          municipality: data.municipality || existingPlaceOfBirth.municipality,
        },
      });
    } else {
      // Create new place of birth
      await prisma.placeOfBirth.create({
        data: {
          citizenId: id,
          region: data.region || '',
          province: data.province || '',
          municipality: data.municipality || '',
        },
      });
    }
  }

  const updatedCitizen = await prisma.citizen.findUnique({
    where: { id },
    include: {
      placeOfBirth: true,
      seniorCitizenBeneficiary: true,
      pwdBeneficiary: true,
      studentBeneficiary: true,
      soloParentBeneficiary: true,
    },
  });

  if (!updatedCitizen) {
    throw new Error('Citizen not found after update');
  }

  return updatedCitizen;
};

export const isUsernameAvailable = async (
  username: string,
  excludeId?: string
): Promise<boolean> => {
  const existingCitizen = await prisma.citizen.findUnique({
    where: { username },
  });

  // If checking for update, exclude the current citizen's ID
  if (excludeId && existingCitizen?.id === excludeId) {
    return true;
  }

  return !existingCitizen;
};

export const activateCitizen = async (id: string) => {
  const citizen = await prisma.citizen.findUnique({ where: { id } });

  if (!citizen) {
    throw new Error('Citizen not found');
  }

  return prisma.citizen.update({
    where: { id },
    data: { residencyStatus: 'ACTIVE' },
    include: {
      placeOfBirth: true,
      seniorCitizenBeneficiary: true,
      pwdBeneficiary: true,
      studentBeneficiary: true,
      soloParentBeneficiary: true,
    },
  });
};

export const deactivateCitizen = async (id: string) => {
  const citizen = await prisma.citizen.findUnique({ where: { id } });

  if (!citizen) {
    throw new Error('Citizen not found');
  }

  return prisma.citizen.update({
    where: { id },
    data: { residencyStatus: 'INACTIVE' },
    include: {
      placeOfBirth: true,
      seniorCitizenBeneficiary: true,
      pwdBeneficiary: true,
      studentBeneficiary: true,
      soloParentBeneficiary: true,
    },
  });
};

export const approveCitizen = async (id: string, remarks?: string) => {
  const citizen = await prisma.citizen.findUnique({ where: { id } });

  if (!citizen) {
    throw new Error('Citizen not found');
  }

  return prisma.citizen.update({
    where: { id },
    data: {
      residencyStatus: 'ACTIVE',
      residencyApplicationRemarks: remarks || citizen.residencyApplicationRemarks,
    },
    include: {
      placeOfBirth: true,
      seniorCitizenBeneficiary: true,
      pwdBeneficiary: true,
      studentBeneficiary: true,
      soloParentBeneficiary: true,
    },
  });
};

export const rejectCitizen = async (id: string, remarks?: string) => {
  const citizen = await prisma.citizen.findUnique({ where: { id } });

  if (!citizen) {
    throw new Error('Citizen not found');
  }

  return prisma.citizen.update({
    where: { id },
    data: {
      residencyStatus: 'REJECTED',
      residencyApplicationRemarks: remarks || citizen.residencyApplicationRemarks,
    },
    include: {
      placeOfBirth: true,
      seniorCitizenBeneficiary: true,
      pwdBeneficiary: true,
      studentBeneficiary: true,
      soloParentBeneficiary: true,
    },
  });
};

export const removeCitizen = async (id: string, _remarks?: string) => {
  const citizen = await prisma.citizen.findUnique({
    where: { id },
    include: { placeOfBirth: true },
  });

  if (!citizen) {
    throw new Error('Citizen not found');
  }

  // Delete related files if they exist
  const deleteFile = (filePath: string | null | undefined) => {
    if (!filePath) return;
    try {
      // Handle both relative paths (/uploads/images/file.jpg) and full URLs (http://...)
      let relativePath: string;
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        // Extract relative path from full URL
        const urlPath = filePath.includes('/uploads/') ? filePath.split('/uploads/')[1] : '';
        relativePath = `/uploads/${urlPath}`;
      } else {
        // Already a relative path
        relativePath = filePath.startsWith('/') ? filePath : `/${filePath}`;
      }

      // Remove leading slash and join with uploads directory
      const pathWithoutLeadingSlash = relativePath.replace(/^\//, '');
      const fullPath = path.join(process.cwd(), pathWithoutLeadingSlash);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  // Delete associated files
  deleteFile(citizen.citizenPicture);
  deleteFile(citizen.proofOfIdentification);

  // Delete the citizen record (cascade will handle related records like placeOfBirth)
  await prisma.citizen.delete({
    where: { id },
  });

  return { success: true, message: 'Citizen removed successfully' };
};
