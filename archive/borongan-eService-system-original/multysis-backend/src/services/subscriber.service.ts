// Prisma types not needed - using gateway structure
import fs from 'fs';
import path from 'path';
import prisma from '../config/database';
import { hashPassword } from '../utils/password';
import { addDevLog } from './dev.service';
import {
  getAccountActivationEmail,
  getAccountBlockedEmail,
  getAccountDeactivationEmail,
} from './email-templates/account-notifications';
import { sendEmailSafely } from './email.service';

export interface CreateSubscriberData {
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  phoneNumber: string;
  email?: string;
  password: string;
  profilePicture?: string;
  citizenId?: string;
  region?: string;
  province?: string;
  municipality?: string;
  motherFirstName?: string;
  motherMiddleName?: string;
  motherLastName?: string;
}

export interface UpdateSubscriberData {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  extensionName?: string;
  email?: string;
  phoneNumber?: string;
  civilStatus?: string;
  sex?: string;
  birthdate?: string;
  residentAddress?: string;
  addressRegion?: string;
  addressProvince?: string;
  addressMunicipality?: string;
  addressBarangay?: string;
  addressPostalCode?: string;
  addressStreetAddress?: string;
  profilePicture?: string;
  region?: string;
  province?: string;
  municipality?: string;
  motherFirstName?: string;
  motherMiddleName?: string;
  motherLastName?: string;
}

export interface SubscriberFilters {
  search?: string;
  residencyFilter?: 'all' | 'resident' | 'non-resident';
  status?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export const createSubscriber = async (data: CreateSubscriberData) => {
  const hashedPassword = await hashPassword(data.password);

  if (data.citizenId) {
    // LINKED TO CITIZEN: Create Subscriber gateway only, NO NonCitizen record
    // Verify citizen exists and is not already linked
    const citizen = await prisma.citizen.findUnique({
      where: { id: data.citizenId },
    });

    if (!citizen) {
      throw new Error('Citizen not found');
    }

    // Check if citizen is already linked
    const existingLink = await (prisma as any).subscriber.findFirst({
      where: { citizenId: data.citizenId },
    });

    if (existingLink) {
      throw new Error('Citizen is already linked to another subscriber');
    }

    // If citizen doesn't have a phone number and one is provided, check uniqueness and update the citizen
    if (!citizen.phoneNumber && data.phoneNumber) {
      // Check if phone number already exists in Citizen or NonCitizen
      const existingCitizen = await prisma.citizen.findFirst({
        where: {
          phoneNumber: data.phoneNumber,
          id: { not: data.citizenId },
        },
      });

      if (existingCitizen) {
        throw new Error('Phone number is already registered to another citizen');
      }

      const existingNonCitizen = await (prisma as any).nonCitizen.findUnique({
        where: { phoneNumber: data.phoneNumber },
      });

      if (existingNonCitizen) {
        throw new Error('Phone number is already registered to a subscriber');
      }

      await prisma.citizen.update({
        where: { id: data.citizenId },
        data: { phoneNumber: data.phoneNumber },
      });
    }

    // Create Subscriber gateway with type='CITIZEN' and password
    // NO data stored in NonCitizen - all data comes from Citizen
    const subscriberGateway = await (prisma as any).subscriber.create({
      data: {
        type: 'CITIZEN',
        citizenId: data.citizenId,
        nonCitizenId: null,
        password: hashedPassword,
      },
    });

    // Log subscriber creation
    addDevLog('info', 'Subscriber created (CITIZEN)', {
      subscriberId: subscriberGateway.id,
      citizenId: data.citizenId,
      phoneNumber: data.phoneNumber,
    });

    // Return subscriber gateway with citizen relation
    return (prisma as any).subscriber.findUnique({
      where: { id: subscriberGateway.id },
      include: {
        citizen: {
          include: {
            placeOfBirth: true,
          },
        },
      },
    });
  } else {
    // STANDALONE SUBSCRIBER: Create NonCitizen record first, then Subscriber gateway
    // Check if phone number already exists in Citizen table
    const existingCitizen = await prisma.citizen.findFirst({
      where: { phoneNumber: data.phoneNumber },
    });

    if (existingCitizen) {
      throw new Error('Phone number is already registered to a citizen');
    }

    // Check if phone number already exists in NonCitizen
    const existingNonCitizen = await (prisma as any).nonCitizen.findUnique({
      where: { phoneNumber: data.phoneNumber },
    });

    if (existingNonCitizen) {
      throw new Error('Phone number already registered');
    }

    // Generate resident ID
    const year = new Date().getFullYear();
    const count = await (prisma as any).nonCitizen.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const residentId = `RES-${year}-${String(count + 1).padStart(3, '0')}`;

    // Create NonCitizen record with all personal data (without password - stored in Subscriber)
    const nonCitizen = await (prisma as any).nonCitizen.create({
      data: {
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        extensionName: data.extensionName,
        phoneNumber: data.phoneNumber,
        email: data.email || null,
        status: 'PENDING',
        residentId,
        residencyType: 'RESIDENT',
        profilePicture: data.profilePicture || null,
        ...(data.region &&
          data.province &&
          data.municipality && {
            placeOfBirth: {
              create: {
                region: data.region,
                province: data.province,
                municipality: data.municipality,
              },
            },
          }),
        ...(data.motherFirstName &&
          data.motherLastName && {
            motherInfo: {
              create: {
                firstName: data.motherFirstName,
                middleName: data.motherMiddleName,
                lastName: data.motherLastName,
              },
            },
          }),
      },
      include: {
        placeOfBirth: true,
        motherInfo: true,
      },
    });

    // Create Subscriber gateway with type='SUBSCRIBER' and password
    const subscriberGateway = await (prisma as any).subscriber.create({
      data: {
        type: 'SUBSCRIBER',
        citizenId: null,
        nonCitizenId: nonCitizen.id,
        password: hashedPassword,
      },
    });

    // Log subscriber creation
    addDevLog('info', 'Subscriber created (SUBSCRIBER)', {
      subscriberId: subscriberGateway.id,
      nonCitizenId: nonCitizen.id,
      phoneNumber: data.phoneNumber,
      email: data.email,
      residentId: nonCitizen.residentId,
    });

    // Return subscriber gateway with nonCitizen relation
    return (prisma as any).subscriber.findUnique({
      where: { id: subscriberGateway.id },
      include: {
        nonCitizen: {
          include: {
            placeOfBirth: true,
            motherInfo: true,
          },
        },
      },
    });
  }
};

export const getSubscribers = async (filters: SubscriberFilters, pagination: PaginationOptions) => {
  const { search, residencyFilter, status } = filters;
  const { page, limit } = pagination;

  const skip = (page - 1) * limit;

  // Fetch ALL from Subscriber gateway table (we'll filter in memory)
  const [allSubscriberGateways] = await Promise.all([
    prisma.subscriber.findMany({
      include: {
        citizen: {
          include: {
            placeOfBirth: true,
          },
        },
        nonCitizen: {
          include: {
            placeOfBirth: true,
            motherInfo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.subscriber.count(),
  ]);

  // Filter and search in memory (since data is in different tables)
  let filtered = allSubscriberGateways;

  if (search) {
    filtered = filtered.filter((sg: any) => {
      const firstName = sg.type === 'CITIZEN' ? sg.citizen?.firstName : sg.nonCitizen?.firstName;
      const lastName = sg.type === 'CITIZEN' ? sg.citizen?.lastName : sg.nonCitizen?.lastName;
      const email = sg.type === 'CITIZEN' ? sg.citizen?.email : sg.nonCitizen?.email;
      const phoneNumber =
        sg.type === 'CITIZEN' ? sg.citizen?.phoneNumber : sg.nonCitizen?.phoneNumber;
      const residentId = sg.type === 'CITIZEN' ? sg.citizen?.residentId : sg.nonCitizen?.residentId;
      const searchLower = search.toLowerCase();
      return (
        firstName?.toLowerCase().includes(searchLower) ||
        lastName?.toLowerCase().includes(searchLower) ||
        email?.toLowerCase().includes(searchLower) ||
        phoneNumber?.toLowerCase().includes(searchLower) ||
        residentId?.toLowerCase().includes(searchLower)
      );
    });
  }

  if (residencyFilter && residencyFilter !== 'all') {
    filtered = filtered.filter((sg: any) => {
      // Resident filter = show only citizens
      if (residencyFilter === 'resident') {
        return sg.type === 'CITIZEN';
      }
      // Non-resident filter = show only non-citizens (subscribers)
      if (residencyFilter === 'non-resident') {
        return sg.type === 'SUBSCRIBER';
      }
      return true;
    });
  }

  if (status) {
    filtered = filtered.filter((sg: any) => {
      if (sg.type === 'CITIZEN') return true; // Citizens don't have status in gateway
      return sg.nonCitizen?.status?.toUpperCase() === status.toUpperCase();
    });
  }

  // Apply pagination after filtering
  const paginated = filtered.slice(skip, skip + limit);

  return {
    subscribers: paginated,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
    },
  };
};

export const getSubscriber = async (id: string) => {
  // Fetch from Subscriber gateway
  const subscriberGateway = await prisma.subscriber.findUnique({
    where: { id },
    include: {
      citizen: {
        include: {
          placeOfBirth: true,
          seniorCitizenBeneficiary: true,
          pwdBeneficiary: true,
          studentBeneficiary: true,
          soloParentBeneficiary: true,
        },
      },
      nonCitizen: {
        include: {
          placeOfBirth: true,
          motherInfo: true,
        },
      },
      Transaction: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!subscriberGateway) {
    throw new Error('Subscriber not found');
  }

  return subscriberGateway;
};

export const updateSubscriber = async (id: string, data: UpdateSubscriberData) => {
  // Fetch from Subscriber gateway
  const subscriberGateway = await (prisma as any).subscriber.findUnique({
    where: { id },
    include: {
      citizen: true,
      nonCitizen: {
        include: {
          placeOfBirth: true,
          motherInfo: true,
        },
      },
    },
  });

  if (!subscriberGateway) {
    throw new Error('Subscriber not found');
  }

  // Check type - if CITIZEN, prevent personal info updates but allow email/phoneNumber
  if (subscriberGateway.type === 'CITIZEN') {
    // Reject personal info updates for citizens - must update via citizen page
    const personalInfoFields = [
      'firstName',
      'lastName',
      'middleName',
      'extensionName',
      'birthDate',
      'civilStatus',
      'sex',
      'region',
      'province',
      'municipality',
      'motherFirstName',
      'motherLastName',
      'motherMiddleName',
    ];
    const attemptedPersonalUpdate = personalInfoFields.some(
      (field) => data[field as keyof UpdateSubscriberData] !== undefined
    );

    if (attemptedPersonalUpdate) {
      throw new Error(
        'Cannot update personal information for subscribers linked to citizens. Please update the citizen record instead.'
      );
    }

    // For CITIZEN type, email and phoneNumber are stored in the Citizen table
    // Allow updates to email and phoneNumber only
    if (!subscriberGateway.citizen) {
      throw new Error('Citizen record not found');
    }

    const citizenUpdateData: any = {};

    // Only update email and phoneNumber if provided
    if (data.email !== undefined) {
      citizenUpdateData.email = data.email || null;
    }
    if (data.phoneNumber !== undefined) {
      // Check if phone number already exists (in Citizen or NonCitizen) if phone number is being changed
      const currentPhoneNumber = subscriberGateway.citizen?.phoneNumber;
      if (data.phoneNumber !== currentPhoneNumber) {
        // Check in Citizen table
        const existingCitizen = await prisma.citizen.findFirst({
          where: {
            phoneNumber: data.phoneNumber,
            id: { not: subscriberGateway.citizenId },
          },
        });

        if (existingCitizen) {
          throw new Error('Phone number is already registered to another citizen');
        }

        // Check in NonCitizen table
        const existingNonCitizen = await (prisma as any).nonCitizen.findUnique({
          where: { phoneNumber: data.phoneNumber },
        });

        if (existingNonCitizen) {
          throw new Error('Phone number is already registered to a subscriber');
        }
      }
      citizenUpdateData.phoneNumber = data.phoneNumber;
    }

    // Update Citizen table if there are changes
    if (Object.keys(citizenUpdateData).length > 0) {
      await prisma.citizen.update({
        where: { id: subscriberGateway.citizenId! },
        data: citizenUpdateData,
      });
    }

    // Return updated subscriber gateway
    return (prisma as any).subscriber.findUnique({
      where: { id },
      include: {
        citizen: true,
        nonCitizen: {
          include: {
            placeOfBirth: true,
            motherInfo: true,
          },
        },
      },
    });
  }

  // Update NonCitizen record
  if (!subscriberGateway.nonCitizen) {
    throw new Error('NonCitizen record not found');
  }

  const nonCitizen = subscriberGateway.nonCitizen;

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
          console.log(`Deleted old subscriber profile picture: ${normalizedOldPath}`);
        }
      } catch (error) {
        console.error('Error deleting old subscriber profile picture:', error);
        // Don't throw - continue with update even if file deletion fails
      }
    }
  };

  // Delete old profile picture if a new one is being uploaded
  if (data.profilePicture !== undefined) {
    deleteOldFileIfReplacing(nonCitizen.profilePicture, data.profilePicture);
  }

  // Update NonCitizen data
  const updateData: any = {};

  if (data.firstName) updateData.firstName = data.firstName;
  if (data.middleName !== undefined) updateData.middleName = data.middleName;
  if (data.lastName) updateData.lastName = data.lastName;
  if (data.extensionName !== undefined) updateData.extensionName = data.extensionName;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.phoneNumber) {
    // Check if phone number already exists (in Citizen or NonCitizen) if phone number is being changed
    const currentPhoneNumber = subscriberGateway.nonCitizen?.phoneNumber;
    if (data.phoneNumber !== currentPhoneNumber) {
      // Check in Citizen table
      const existingCitizen = await prisma.citizen.findFirst({
        where: {
          phoneNumber: data.phoneNumber,
        },
      });

      if (existingCitizen) {
        throw new Error('Phone number is already registered to a citizen');
      }

      // Check in NonCitizen table
      const existingNonCitizen = await (prisma as any).nonCitizen.findFirst({
        where: {
          phoneNumber: data.phoneNumber,
          id: { not: subscriberGateway.nonCitizenId },
        },
      });

      if (existingNonCitizen) {
        throw new Error('Phone number is already registered to another subscriber');
      }
    }
    updateData.phoneNumber = data.phoneNumber;
  }
  if (data.civilStatus) updateData.civilStatus = data.civilStatus;
  if (data.sex) updateData.sex = data.sex;
  if (data.birthdate) updateData.birthDate = new Date(data.birthdate);

  // Handle address - build from structured fields if provided, otherwise use residentAddress
  if (
    data.addressRegion &&
    data.addressProvince &&
    data.addressMunicipality &&
    data.addressBarangay
  ) {
    // Build address string from structured fields
    const addressParts: string[] = [];
    if (data.addressStreetAddress) addressParts.push(data.addressStreetAddress);
    if (data.addressBarangay) addressParts.push(data.addressBarangay);
    if (data.addressMunicipality) addressParts.push(data.addressMunicipality);
    if (data.addressProvince) addressParts.push(data.addressProvince);
    if (data.addressRegion) addressParts.push(data.addressRegion);
    if (data.addressPostalCode) addressParts.push(data.addressPostalCode);
    updateData.residentAddress = addressParts.join(', ');
  } else if (data.residentAddress) {
    updateData.residentAddress = data.residentAddress;
  }

  if (data.profilePicture) updateData.profilePicture = data.profilePicture;

  await (prisma as any).nonCitizen.update({
    where: { id: nonCitizen.id },
    data: updateData,
  });

  // Update place of birth
  if (data.region || data.province || data.municipality) {
    const placeOfBirth = nonCitizen.placeOfBirth;
    if (placeOfBirth) {
      await (prisma as any).placeOfBirth.update({
        where: { nonCitizenId: nonCitizen.id },
        data: {
          region: data.region || placeOfBirth.region,
          province: data.province || placeOfBirth.province,
          municipality: data.municipality || placeOfBirth.municipality,
        },
      });
    } else {
      await (prisma as any).placeOfBirth.create({
        data: {
          nonCitizenId: nonCitizen.id,
          region: data.region || '',
          province: data.province || '',
          municipality: data.municipality || '',
        },
      });
    }
  }

  // Update mother info
  if (data.motherFirstName || data.motherLastName) {
    const motherInfo = nonCitizen.motherInfo;
    if (motherInfo) {
      await (prisma as any).motherInfo.update({
        where: { nonCitizenId: nonCitizen.id },
        data: {
          firstName: data.motherFirstName || motherInfo.firstName,
          middleName: data.motherMiddleName || motherInfo.middleName,
          lastName: data.motherLastName || motherInfo.lastName,
        },
      });
    } else {
      await (prisma as any).motherInfo.create({
        data: {
          nonCitizenId: nonCitizen.id,
          firstName: data.motherFirstName || '',
          middleName: data.motherMiddleName || '',
          lastName: data.motherLastName || '',
        },
      });
    }
  }

  // Fetch updated subscriber gateway with all relations
  const updatedSubscriber = await (prisma as any).subscriber.findUnique({
    where: { id },
    include: {
      citizen: {
        include: {
          placeOfBirth: true,
        },
      },
      nonCitizen: {
        include: {
          placeOfBirth: true,
          motherInfo: true,
        },
      },
    },
  });

  return updatedSubscriber;
};

export const activateSubscriber = async (id: string) => {
  const subscriberGateway = await (prisma as any).subscriber.findUnique({
    where: { id },
    include: {
      nonCitizen: true,
    },
  });

  if (!subscriberGateway) {
    throw new Error('Subscriber not found');
  }

  if (subscriberGateway.type === 'CITIZEN') {
    // Citizens are always active - return as-is
    return subscriberGateway;
  }

  if (!subscriberGateway.nonCitizen) {
    throw new Error('NonCitizen record not found');
  }

  // Validate status transition: Already active
  const currentStatus = subscriberGateway.nonCitizen.status?.toUpperCase();
  if (currentStatus === 'ACTIVE') {
    throw new Error('Subscriber is already active');
  }

  // Note: Activating a BLOCKED account will unblock and activate it

  // Update NonCitizen status
  await (prisma as any).nonCitizen.update({
    where: { id: subscriberGateway.nonCitizen.id },
    data: { status: 'ACTIVE' },
  });

  // Log subscriber activation
  addDevLog('info', 'Subscriber activated', {
    subscriberId: id,
    previousStatus: currentStatus,
    newStatus: 'ACTIVE',
  });

  // Get subscriber email data for notification
  const subscriberForEmail = await (prisma as any).subscriber.findUnique({
    where: { id },
    include: {
      citizen: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
        },
      },
      nonCitizen: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
        },
      },
    },
  });

  // Send activation email (non-blocking)
  try {
    const subscriber = subscriberForEmail?.citizen || subscriberForEmail?.nonCitizen;
    if (subscriber?.email) {
      const subscriberName = `${subscriber.firstName} ${subscriber.lastName}`;
      const emailData = {
        subscriberName,
        email: subscriber.email,
        phoneNumber: subscriber.phoneNumber,
        status: 'ACTIVE',
      };
      const { subject, html, text } = getAccountActivationEmail(emailData);
      await sendEmailSafely(subscriber.email, subject, html, text);
    }
  } catch (error: any) {
    console.error('Failed to send activation email:', error.message);
  }

  // Return updated gateway with full relations
  return (prisma as any).subscriber.findUnique({
    where: { id },
    include: {
      citizen: {
        include: {
          placeOfBirth: true,
        },
      },
      nonCitizen: {
        include: {
          placeOfBirth: true,
          motherInfo: true,
        },
      },
    },
  });
};

export const deactivateSubscriber = async (id: string) => {
  const subscriberGateway = await (prisma as any).subscriber.findUnique({
    where: { id },
    include: {
      nonCitizen: true,
    },
  });

  if (!subscriberGateway) {
    throw new Error('Subscriber not found');
  }

  if (subscriberGateway.type === 'CITIZEN') {
    // Citizens can't be deactivated this way
    throw new Error('Cannot deactivate citizen subscribers');
  }

  if (!subscriberGateway.nonCitizen) {
    throw new Error('NonCitizen record not found');
  }

  // Validate status transition: Can't deactivate a BLOCKED account
  const currentStatus = subscriberGateway.nonCitizen.status?.toUpperCase();
  if (currentStatus === 'BLOCKED') {
    throw new Error(
      'Cannot deactivate a blocked subscriber. Please activate the subscriber first to unblock it.'
    );
  }

  // Validate status transition: Can't deactivate a PENDING account (already inactive)
  if (currentStatus === 'PENDING') {
    throw new Error('Subscriber is already inactive (pending activation)');
  }

  // Validate status transition: Can't deactivate an already EXPIRED account
  if (currentStatus === 'EXPIRED') {
    throw new Error('Subscriber is already deactivated (expired)');
  }

  // Update NonCitizen status to EXPIRED (deactivated)
  await (prisma as any).nonCitizen.update({
    where: { id: subscriberGateway.nonCitizen.id },
    data: { status: 'EXPIRED' },
  });

  // Get subscriber email data for notification
  const subscriberForEmail = await (prisma as any).subscriber.findUnique({
    where: { id },
    include: {
      citizen: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
        },
      },
      nonCitizen: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
        },
      },
    },
  });

  // Send deactivation email (non-blocking)
  try {
    const subscriber = subscriberForEmail?.citizen || subscriberForEmail?.nonCitizen;
    if (subscriber?.email) {
      const subscriberName = `${subscriber.firstName} ${subscriber.lastName}`;
      const emailData = {
        subscriberName,
        email: subscriber.email,
        phoneNumber: subscriber.phoneNumber,
        status: 'EXPIRED',
      };
      const { subject, html, text } = getAccountDeactivationEmail(emailData);
      await sendEmailSafely(subscriber.email, subject, html, text);
    }
  } catch (error: any) {
    console.error('Failed to send deactivation email:', error.message);
  }

  // Return updated gateway
  return (prisma as any).subscriber.findUnique({
    where: { id },
    include: {
      citizen: {
        include: {
          placeOfBirth: true,
        },
      },
      nonCitizen: {
        include: {
          placeOfBirth: true,
          motherInfo: true,
        },
      },
    },
  });
};

export const blockSubscriber = async (id: string, _remarks?: string) => {
  const subscriberGateway = await (prisma as any).subscriber.findUnique({
    where: { id },
    include: {
      nonCitizen: true,
    },
  });

  if (!subscriberGateway) {
    throw new Error('Subscriber not found');
  }

  if (subscriberGateway.type === 'CITIZEN') {
    // Citizens can't be blocked this way
    throw new Error('Cannot block citizen subscribers');
  }

  if (!subscriberGateway.nonCitizen) {
    throw new Error('NonCitizen record not found');
  }

  // Validate status transition: Can't block an already BLOCKED account
  const currentStatus = subscriberGateway.nonCitizen.status?.toUpperCase();
  if (currentStatus === 'BLOCKED') {
    throw new Error('Subscriber is already blocked');
  }

  // Update NonCitizen status
  await (prisma as any).nonCitizen.update({
    where: { id: subscriberGateway.nonCitizen.id },
    data: { status: 'BLOCKED' },
  });

  // Log subscriber blocking
  addDevLog('info', 'Subscriber blocked', {
    subscriberId: id,
    previousStatus: currentStatus,
    newStatus: 'BLOCKED',
    remarks: _remarks,
  });

  // Get subscriber email data for notification
  const subscriberForEmail = await (prisma as any).subscriber.findUnique({
    where: { id },
    include: {
      citizen: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
        },
      },
      nonCitizen: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
        },
      },
    },
  });

  // Send blocked account email (non-blocking)
  try {
    const subscriber = subscriberForEmail?.citizen || subscriberForEmail?.nonCitizen;
    if (subscriber?.email) {
      const subscriberName = `${subscriber.firstName} ${subscriber.lastName}`;
      const emailData = {
        subscriberName,
        email: subscriber.email,
        phoneNumber: subscriber.phoneNumber,
        status: 'BLOCKED',
        remarks: _remarks,
      };
      const { subject, html, text } = getAccountBlockedEmail(emailData);
      await sendEmailSafely(subscriber.email, subject, html, text);
    }
  } catch (error: any) {
    console.error('Failed to send blocked account email:', error.message);
  }

  // Return updated gateway with full relations
  return (prisma as any).subscriber.findUnique({
    where: { id },
    include: {
      citizen: {
        include: {
          placeOfBirth: true,
        },
      },
      nonCitizen: {
        include: {
          placeOfBirth: true,
          motherInfo: true,
        },
      },
    },
  });
};

export const changeSubscriberPassword = async (id: string, password: string) => {
  const subscriberGateway = await (prisma as any).subscriber.findUnique({
    where: { id },
  });

  if (!subscriberGateway) {
    throw new Error('Subscriber not found');
  }

  const hashedPassword = await hashPassword(password);

  // Update password in Subscriber table (works for both citizen and non-citizen)
  await (prisma as any).subscriber.update({
    where: { id },
    data: { password: hashedPassword },
  });

  return (prisma as any).subscriber.findUnique({
    where: { id },
    include: {
      citizen: true,
      nonCitizen: true,
    },
  });
};

export const getSubscriberTransactions = async (id: string, serviceId?: string) => {
  // Verify subscriber gateway exists
  const subscriberGateway = await (prisma as any).subscriber.findUnique({
    where: { id },
  });

  if (!subscriberGateway) {
    throw new Error('Subscriber not found');
  }

  const where: any = { subscriberId: id };
  if (serviceId) {
    where.serviceId = serviceId;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      service: true,
    },
  });

  return transactions;
};

// Search citizens for linking to subscribers
export const searchCitizensForLinking = async (query: string, limit: number = 10) => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchTerm = query.trim();

  const citizens = await prisma.citizen.findMany({
    where: {
      OR: [
        { phoneNumber: { contains: searchTerm, mode: 'insensitive' } },
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { residentId: { contains: searchTerm, mode: 'insensitive' } },
        {
          AND: [
            { firstName: { contains: searchTerm.split(' ')[0] || '', mode: 'insensitive' } },
            { lastName: { contains: searchTerm.split(' ')[1] || searchTerm, mode: 'insensitive' } },
          ],
        },
      ],
      // Exclude citizens already linked to subscribers
      ...({ subscriber: null } as any),
    },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      extensionName: true,
      phoneNumber: true,
      email: true,
      residentId: true,
      birthDate: true,
    },
    take: limit,
    orderBy: [
      // Prioritize exact phone number matches
      { phoneNumber: searchTerm === searchTerm.replace(/\D/g, '') ? 'asc' : 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return citizens;
};
