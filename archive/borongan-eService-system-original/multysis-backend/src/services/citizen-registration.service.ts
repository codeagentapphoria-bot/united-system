import prisma from '../config/database';
import { hashPassword, generateTempPassword } from '../utils/password';
import { sendEmailSafely } from './email.service';
import { getCitizenApprovalEmail, getCitizenRejectionEmail } from './email-templates/citizen-notifications';

// =============================================================================
// TYPES
// =============================================================================

export interface CitizenRegistrationData {
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  birthDate: string | Date;
  sex: string;
  civilStatus: string;
  phoneNumber: string;
  email?: string;
  address: string;
  barangay: string;
  municipality?: string;
  province?: string;
  region?: string;
  postalCode?: string;
  streetAddress?: string;
  idDocumentType: string;
  idDocumentNumber: string;
  idDocumentUrl: string;
  selfieUrl?: string;
}

export interface RegistrationRequestFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// =============================================================================
// SUBMIT REGISTRATION - Creates PENDING Citizen + RegistrationWorkflow
// =============================================================================

/**
 * Submit a new citizen registration request
 * 
 * NEW FLOW:
 * 1. Create PENDING Citizen record (stores all personal info)
 * 2. Create RegistrationWorkflow (CitizenRegistrationRequest) linked via citizenId
 */
export const submitCitizenRegistration = async (data: CitizenRegistrationData) => {
  // Convert birthDate to Date if it's a string
  const birthDateValue = typeof data.birthDate === 'string'
    ? new Date(data.birthDate + 'T00:00:00.000Z')
    : data.birthDate;

  // Check if phone number already exists
  const existingPhoneCitizen = await prisma.citizen.findFirst({
    where: { phoneNumber: data.phoneNumber },
  });

  if (existingPhoneCitizen) {
    throw new Error('Phone number already registered as a citizen');
  }

  const existingPhoneNonCitizen = await prisma.nonCitizen.findFirst({
    where: { phoneNumber: data.phoneNumber },
  });

  if (existingPhoneNonCitizen) {
    throw new Error('Phone number already registered');
  }

  // Check if email already exists (if provided)
  if (data.email) {
    const existingEmailCitizen = await prisma.citizen.findFirst({
      where: { email: data.email },
    });

    if (existingEmailCitizen) {
      throw new Error('Email already registered as a citizen');
    }

    const existingEmailNonCitizen = await prisma.nonCitizen.findFirst({
      where: { email: data.email },
    });

    if (existingEmailNonCitizen) {
      throw new Error('Email already registered');
    }
  }

  // Use a transaction to create Citizen + RegistrationWorkflow atomically
  const result = await prisma.$transaction(async (tx) => {
    // Step 1: Create PENDING Citizen (stores all personal info)
    const citizen = await tx.citizen.create({
      data: {
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        extensionName: data.extensionName,
        birthDate: birthDateValue,
        sex: data.sex,
        civilStatus: data.civilStatus,
        phoneNumber: data.phoneNumber,
        email: data.email,
        address: data.address,
        addressBarangay: data.barangay,
        addressMunicipality: data.municipality || 'Borongan',
        addressProvince: data.province || 'Eastern Samar',
        addressRegion: data.region || 'Region VIII',
        addressPostalCode: data.postalCode,
        addressStreetAddress: data.streetAddress,
        residencyStatus: 'PENDING', // Start as PENDING
        // These will be set on approval:
        // residentId, username, pin, isResident, proofOfIdentification, idType, idDocumentNumber
        proofOfIdentification: data.idDocumentUrl,
        idType: data.idDocumentType,
        idDocumentNumber: data.idDocumentNumber,
      },
    });

    // Step 2: Create RegistrationWorkflow (links to Citizen, selfie for verification)
    const registrationRequest = await tx.citizenRegistrationRequest.create({
      data: {
        citizenId: citizen.id,
        selfieUrl: data.selfieUrl,
        status: 'PENDING',
      },
    });

    return { citizen, registrationRequest };
  });

  return {
    id: result.registrationRequest.id,
    citizenId: result.citizen.id,
    registrationRequestId: result.registrationRequest.id,
    phoneNumber: data.phoneNumber,
    status: 'PENDING',
    createdAt: result.registrationRequest.createdAt,
  };
};

// =============================================================================
// GET STATUS - Query Citizen for status
// =============================================================================

/**
 * Get registration status by phone number
 * 
 * NEW FLOW: Query Citizen table for status (personal data is now there)
 */
export const getRegistrationStatus = async (phoneNumber: string) => {
  // Find the citizen by phone number
  const citizen = await prisma.citizen.findFirst({
    where: { phoneNumber },
    include: {
      citizenRegistrationRequest: {
        select: {
          id: true,
          status: true,
          reviewedAt: true,
          adminNotes: true,
        },
      },
    },
  });

  if (!citizen) {
    return null;
  }

  return {
    citizenId: citizen.id,
    registrationRequestId: citizen.citizenRegistrationRequest?.id || null,
    status: citizen.residencyStatus, // PENDING, ACTIVE, REJECTED, etc.
    workflowStatus: citizen.citizenRegistrationRequest?.status || null,
    firstName: citizen.firstName,
    lastName: citizen.lastName,
    createdAt: citizen.createdAt,
    reviewedAt: citizen.citizenRegistrationRequest?.reviewedAt,
    adminNotes: citizen.citizenRegistrationRequest?.adminNotes,
  };
};

// =============================================================================
// GET REQUESTS - Admin queries RegistrationWorkflow with Citizen relation
// =============================================================================

/**
 * Get all registration requests (for admin)
 * 
 * NEW FLOW: Query RegistrationWorkflow, include Citizen data via relation
 */
export const getRegistrationRequests = async (filters: RegistrationRequestFilters) => {
  const {
    status,
    search,
    page = 1,
    limit = 20,
  } = filters;

  const where: any = {};

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (search) {
    // Search in Citizen fields via relation
    where.citizen = {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const [requests, total] = await Promise.all([
    prisma.citizenRegistrationRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        citizen: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            extensionName: true,
            phoneNumber: true,
            email: true,
            residencyStatus: true,
            birthDate: true,
            sex: true,
            civilStatus: true,
            addressStreetAddress: true,
            addressBarangay: true,
            addressMunicipality: true,
            addressProvince: true,
            addressPostalCode: true,
            idType: true,
            idDocumentNumber: true,
            proofOfIdentification: true,
          },
        },
      },
    }),
    prisma.citizenRegistrationRequest.count({ where }),
  ]);

  return {
    requests,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// =============================================================================
// GET SINGLE REQUEST - Include full Citizen data
// =============================================================================

/**
 * Get single registration request by ID
 */
export const getRegistrationRequestById = async (id: string) => {
  const request = await prisma.citizenRegistrationRequest.findUnique({
    where: { id },
    include: {
      citizen: true,
      subscriber: true,
    },
  });

  if (!request) {
    throw new Error('Registration request not found');
  }

  return request;
};

// =============================================================================
// REVIEW REQUEST - Update Citizen status, create Subscriber on approval
// =============================================================================

/**
 * Review registration request (approve/reject)
 * 
 * NEW FLOW:
 * - On APPROVED: Update Citizen to ACTIVE, create Subscriber with credentials
 * - On REJECTED: Update Citizen to REJECTED, mark for auto-delete
 */
export const reviewRegistrationRequest = async (
  requestId: string,
  action: 'APPROVED' | 'REJECTED',
  adminId: string,
  adminNotes?: string
) => {
  // Get request with citizen data
  const request = await prisma.citizenRegistrationRequest.findUnique({
    where: { id: requestId },
    include: { citizen: true },
  });

  if (!request) {
    throw new Error('Registration request not found');
  }

  if (!request.citizen) {
    throw new Error('Citizen record not found');
  }

  if (request.status !== 'PENDING' && request.status !== 'UNDER_REVIEW') {
    throw new Error(`Cannot ${action.toLowerCase()} a request that is already ${request.status.toLowerCase()}`);
  }

  const now = new Date();

  // REJECTED - Update Citizen to REJECTED status
  if (action === 'REJECTED') {
    // Update both Citizen and RegistrationWorkflow
    await prisma.$transaction([
      prisma.citizen.update({
        where: { id: request.citizenId },
        data: { residencyStatus: 'REJECTED' },
      }),
      prisma.citizenRegistrationRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          adminNotes: adminNotes || null,
          reviewedBy: adminId,
          reviewedAt: now,
        },
      }),
    ]);

    // Send rejection email if provided
    if (request.citizen.email) {
      try {
        const emailData = {
          applicantName: `${request.citizen.firstName} ${request.citizen.lastName}`,
          email: request.citizen.email,
          reason: adminNotes || 'Your registration did not meet the requirements.',
        };
        const { subject, html, text } = getCitizenRejectionEmail(emailData);
        await sendEmailSafely(request.citizen.email, subject, html, text);
      } catch (error: any) {
        console.error('Failed to send rejection email:', error.message);
      }
    }

    return {
      citizenId: request.citizenId,
      status: 'REJECTED',
      reviewedAt: now,
    };
  }

  // APPROVED - Update Citizen to ACTIVE, create Subscriber
  // Generate credentials
  const tempPassword = generateTempPassword();
  const hashedPassword = await hashPassword(tempPassword);

  // Generate resident ID
  const year = now.getFullYear();
  const citizenCount = await prisma.citizen.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });
  const residentId = `CIT-${year}-${String(citizenCount + 1).padStart(4, '0')}`;

  // Generate username
  const baseUsername = `${request.citizen.firstName.toLowerCase()}.${request.citizen.lastName.toLowerCase()}`;
  const randomDigits = Math.floor(Math.random() * 90) + 10;
  const username = `${baseUsername}${randomDigits}`;

  // Update Citizen and create Subscriber atomically
  const result = await prisma.$transaction(async (tx) => {
    // Update Citizen to ACTIVE
    const updatedCitizen = await tx.citizen.update({
      where: { id: request.citizenId },
      data: {
        residencyStatus: 'ACTIVE',
        residentId: residentId,
        isResident: true,
        username: username,
        pin: tempPassword, // 4-digit PIN
      },
    });

    // Create Subscriber with credentials
    const subscriber = await tx.subscriber.create({
      data: {
        type: 'CITIZEN',
        citizenId: updatedCitizen.id,
        password: hashedPassword,
      },
    });

    // Update RegistrationWorkflow
    await tx.citizenRegistrationRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        adminNotes: adminNotes || null,
        reviewedBy: adminId,
        reviewedAt: now,
        subscriberId: subscriber.id,
      },
    });

    return { updatedCitizen, subscriber };
  });

  // Send approval email with credentials
  if (request.citizen.email) {
    try {
      const emailData = {
        applicantName: `${request.citizen.firstName} ${request.citizen.lastName}`,
        email: request.citizen.email,
        phoneNumber: request.citizen.phoneNumber || 'N/A',
        tempPassword: tempPassword,
        loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal/login`,
      };
      const { subject, html, text } = getCitizenApprovalEmail(emailData);
      await sendEmailSafely(request.citizen.email, subject, html, text);
    } catch (error: any) {
      console.error('Failed to send approval email:', error.message);
    }
  }

  return {
    citizenId: result.updatedCitizen.id,
    subscriberId: result.subscriber.id,
    residentId: result.updatedCitizen.residentId,
    username: result.updatedCitizen.username,
    status: 'APPROVED',
    reviewedAt: now,
    tempPasswordSent: !!request.citizen.email,
  };
};

// =============================================================================
// REQUEST RESUBMISSION
// =============================================================================

/**
 * Request additional documents from applicant
 */
export const requestResubmission = async (
  requestId: string,
  adminId: string,
  adminNotes: string
) => {
  const request = await prisma.citizenRegistrationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('Registration request not found');
  }

  const updatedRequest = await prisma.citizenRegistrationRequest.update({
    where: { id: requestId },
    data: {
      status: 'REQUIRES_RESUBMISSION',
      adminNotes,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  });

  return {
    id: updatedRequest.id,
    status: updatedRequest.status,
    reviewedAt: updatedRequest.reviewedAt,
    adminNotes: updatedRequest.adminNotes,
  };
};

// =============================================================================
// MARK UNDER REVIEW
// =============================================================================

/**
 * Mark request as under review
 */
export const markUnderReview = async (requestId: string, adminId: string) => {
  const request = await prisma.citizenRegistrationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error('Registration request not found');
  }

  const updatedRequest = await prisma.citizenRegistrationRequest.update({
    where: { id: requestId },
    data: {
      status: 'UNDER_REVIEW',
      reviewedBy: adminId,
    },
  });

  return {
    id: updatedRequest.id,
    status: updatedRequest.status,
  };
};

// =============================================================================
// DELETE REJECTED REGISTRATIONS - Cleanup old rejected records
// =============================================================================

/**
 * Delete rejected registrations older than 30 days
 * 
 * This is called by a scheduled cron job AND can be triggered manually by admin
 * 
 * @returns Number of deleted registrations
 */
export const deleteRejectedRegistrations = async (daysOld: number = 30): Promise<number> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  // Find rejected citizens created before cutoff
  const rejectedCitizens = await prisma.citizen.findMany({
    where: {
      residencyStatus: 'REJECTED',
      createdAt: {
        lt: cutoffDate,
      },
    },
    select: { id: true },
  });

  if (rejectedCitizens.length === 0) {
    return 0;
  }

  const citizenIds = rejectedCitizens.map(c => c.id);

  // Delete in transaction (Cascade should handle related records)
  await prisma.$transaction([
    // Delete registration workflows first (though cascade should handle this)
    prisma.citizenRegistrationRequest.deleteMany({
      where: { citizenId: { in: citizenIds } },
    }),
    // Delete citizens (cascade will delete related records)
    prisma.citizen.deleteMany({
      where: { id: { in: citizenIds } },
    }),
  ]);

  return citizenIds.length;
};

/**
 * Delete a specific rejected registration (manual admin action)
 */
export const deleteRejectedRegistration = async (citizenId: string) => {
  const citizen = await prisma.citizen.findUnique({
    where: { id: citizenId },
  });

  if (!citizen) {
    throw new Error('Citizen not found');
  }

  if (citizen.residencyStatus !== 'REJECTED') {
    throw new Error('Can only delete rejected registrations');
  }

  await prisma.$transaction([
    prisma.citizenRegistrationRequest.deleteMany({
      where: { citizenId },
    }),
    prisma.citizen.delete({
      where: { id: citizenId },
    }),
  ]);

  return { deleted: true, citizenId };
};
