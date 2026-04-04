import prisma from '../config/database';
import { generateRefreshToken, generateToken, TokenPayload } from '../utils/jwt';
import { comparePassword, hashPassword } from '../utils/password';
import { getWelcomeEmail } from './email-templates/account-notifications';
import { sendEmailSafely } from './email.service';
import { createOtp, verifyOtp } from './otp.service';
import { createRefreshToken } from './refreshToken.service';
import { isOtpEnabled } from './sms.service';

export interface AdminLoginData {
  email: string;
  password: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PortalLoginData {
  phoneNumber: string;
  password: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PortalSignupData {
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  phoneNumber: string;
  email?: string;
  password: string;
  region?: string;
  province?: string;
  municipality?: string;
  motherFirstName?: string;
  motherMiddleName?: string;
  motherLastName?: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const adminLogin = async (data: AdminLoginData) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await comparePassword(data.password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  const tokenPayload: TokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    type: 'admin',
  };

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token in database
  await createRefreshToken({
    userId: user.id,
    token: refreshToken,
    deviceInfo: data.deviceInfo,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
    refreshToken,
  };
};

export const verifyPortalCredentials = async (
  data: PortalLoginData
): Promise<{ subscriber: any; otpRequired: boolean }> => {
  // Find subscriber gateway by phone number (check both citizen and nonCitizen)
  const subscriberGateway = await (prisma as any).subscriber.findFirst({
    where: {
      OR: [
        { citizen: { phoneNumber: data.phoneNumber } },
        { nonCitizen: { phoneNumber: data.phoneNumber } },
      ],
    },
    include: {
      citizen: true,
      nonCitizen: true,
    },
  });

  if (!subscriberGateway) {
    throw new Error('Invalid credentials');
  }

  // Password is now stored in Subscriber table for both citizen and non-citizen
  if (!subscriberGateway.password) {
    throw new Error('Invalid credentials');
  }

  // Get status and subscriber data from appropriate source
  let status: string;
  let subscriberData: any;

  if (subscriberGateway.type === 'CITIZEN' && subscriberGateway.citizen) {
    status = subscriberGateway.citizen.residencyStatus || 'PENDING';
    subscriberData = subscriberGateway.citizen;
    // Citizens are always allowed to log in (they don't have the same status restrictions)
  } else if (subscriberGateway.type === 'SUBSCRIBER' && subscriberGateway.nonCitizen) {
    status = subscriberGateway.nonCitizen.status;
    subscriberData = subscriberGateway.nonCitizen;

    // Only allow ACTIVE subscribers to log in
    // PENDING, EXPIRED, and BLOCKED accounts are not allowed
    if (status !== 'ACTIVE') {
      if (status === 'BLOCKED') {
        throw new Error('Account is blocked');
      } else if (status === 'PENDING') {
        throw new Error('Account is pending activation. Please contact an administrator.');
      } else if (status === 'EXPIRED') {
        throw new Error('Account subscription has expired');
      } else {
        throw new Error('Account is not active. Please contact an administrator.');
      }
    }
  } else {
    throw new Error('Invalid credentials');
  }

  // Validate credentials - password is hashed for all subscribers
  const isPasswordValid = await comparePassword(data.password.trim(), subscriberGateway.password);

  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Check if OTP is enabled via environment variable
  const otpEnabled = isOtpEnabled();

  if (otpEnabled) {
    // Generate and send OTP
    await createOtp(data.phoneNumber);
  }

  // Return subscriber data (without sensitive information)
  const subscriberResponse: any = {
    id: subscriberGateway.id,
    firstName: subscriberData.firstName,
    middleName: subscriberData.middleName,
    lastName: subscriberData.lastName,
    extensionName: subscriberData.extensionName,
    phoneNumber: subscriberData.phoneNumber,
    email: subscriberData.email,
  };

  // Add status field (different for citizens vs nonCitizens)
  if (subscriberGateway.type === 'CITIZEN') {
    subscriberResponse.status = subscriberData.residencyStatus || 'PENDING';
  } else {
    subscriberResponse.status = subscriberData.status;
  }

  return {
    subscriber: subscriberResponse,
    otpRequired: otpEnabled,
  };
};

export interface VerifyPortalOtpData {
  phoneNumber: string;
  otp: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const verifyPortalOtp = async (
  data: VerifyPortalOtpData
): Promise<{ subscriber: any; token: string; refreshToken: string }> => {
  // Check if OTP is enabled via environment variable
  const otpEnabled = isOtpEnabled();

  if (otpEnabled) {
    // Verify OTP only if Twilio is configured
    await verifyOtp(data.phoneNumber, data.otp);
  } else {
    // If OTP is disabled, accept a bypass code or skip verification
    // This allows login to work when Twilio is not configured
    if (data.otp !== 'BYPASS') {
      // For security, we still verify the phone number exists
      const subscriberGateway = await (prisma as any).subscriber.findFirst({
        where: {
          OR: [
            { citizen: { phoneNumber: data.phoneNumber } },
            { nonCitizen: { phoneNumber: data.phoneNumber } },
          ],
        },
      });

      if (!subscriberGateway) {
        throw new Error('Invalid phone number');
      }
    }
  }

  // Find subscriber gateway by phone number (check both citizen and nonCitizen)
  const subscriberGateway = await (prisma as any).subscriber.findFirst({
    where: {
      OR: [
        { citizen: { phoneNumber: data.phoneNumber } },
        { nonCitizen: { phoneNumber: data.phoneNumber } },
      ],
    },
    include: {
      citizen: true,
      nonCitizen: true,
    },
  });

  if (!subscriberGateway) {
    throw new Error('Subscriber not found');
  }

  // Get status and subscriber data from appropriate source
  let subscriberData: any;

  if (subscriberGateway.type === 'CITIZEN' && subscriberGateway.citizen) {
    subscriberData = subscriberGateway.citizen;
  } else if (subscriberGateway.type === 'SUBSCRIBER' && subscriberGateway.nonCitizen) {
    subscriberData = subscriberGateway.nonCitizen;
  } else {
    throw new Error('Subscriber data not found');
  }

  const tokenPayload: TokenPayload = {
    id: subscriberGateway.id, // Use gateway ID
    phoneNumber: data.phoneNumber,
    role: 'subscriber',
    type: 'subscriber',
  };

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token in database
  await createRefreshToken({
    subscriberId: subscriberGateway.id,
    token: refreshToken,
    deviceInfo: data.deviceInfo,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });

  // Return subscriber data - handle both citizen and nonCitizen structures
  const subscriberResponse: any = {
    id: subscriberGateway.id,
    firstName: subscriberData.firstName,
    middleName: subscriberData.middleName,
    lastName: subscriberData.lastName,
    extensionName: subscriberData.extensionName,
    phoneNumber: subscriberData.phoneNumber,
    email: subscriberData.email,
  };

  // Add status field (different for citizens vs nonCitizens)
  if (subscriberGateway.type === 'CITIZEN') {
    subscriberResponse.status = subscriberData.residencyStatus || 'PENDING';
  } else {
    subscriberResponse.status = subscriberData.status;
  }

  return {
    subscriber: subscriberResponse,
    token,
    refreshToken,
  };
};

export const portalLogin = async (data: PortalLoginData) => {
  // Find subscriber gateway by phone number (check both citizen and nonCitizen)
  const subscriberGateway = await (prisma as any).subscriber.findFirst({
    where: {
      OR: [
        { citizen: { phoneNumber: data.phoneNumber } },
        { nonCitizen: { phoneNumber: data.phoneNumber } },
      ],
    },
    include: {
      citizen: true,
      nonCitizen: true,
    },
  });

  if (!subscriberGateway) {
    throw new Error('Invalid credentials');
  }

  // Password is now stored in Subscriber table for both citizen and non-citizen
  if (!subscriberGateway.password) {
    throw new Error('Invalid credentials');
  }

  // Get status and subscriber data from appropriate source
  let status: string;
  let subscriberData: any;

  if (subscriberGateway.type === 'CITIZEN' && subscriberGateway.citizen) {
    status = subscriberGateway.citizen.residencyStatus || 'PENDING';
    subscriberData = subscriberGateway.citizen;
    // Citizens are always allowed to log in (they don't have the same status restrictions)
  } else if (subscriberGateway.type === 'SUBSCRIBER' && subscriberGateway.nonCitizen) {
    status = subscriberGateway.nonCitizen.status;
    subscriberData = subscriberGateway.nonCitizen;

    // Only allow ACTIVE subscribers to log in
    // PENDING, EXPIRED, and BLOCKED accounts are not allowed
    if (status !== 'ACTIVE') {
      if (status === 'BLOCKED') {
        throw new Error('Account is blocked');
      } else if (status === 'PENDING') {
        throw new Error('Account is pending activation. Please contact an administrator.');
      } else if (status === 'EXPIRED') {
        throw new Error('Account subscription has expired');
      } else {
        throw new Error('Account is not active. Please contact an administrator.');
      }
    }
  } else {
    throw new Error('Invalid credentials');
  }

  // Validate credentials - password is hashed for all subscribers
  const isPasswordValid = await comparePassword(data.password.trim(), subscriberGateway.password);

  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  const tokenPayload: TokenPayload = {
    id: subscriberGateway.id, // Use gateway ID
    phoneNumber: data.phoneNumber,
    role: 'subscriber',
    type: 'subscriber',
  };

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token in database
  await createRefreshToken({
    subscriberId: subscriberGateway.id,
    token: refreshToken,
    deviceInfo: data.deviceInfo,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });

  // Return subscriber data - handle both citizen and nonCitizen structures
  const subscriberResponse: any = {
    id: subscriberGateway.id,
    firstName: subscriberData.firstName,
    middleName: subscriberData.middleName,
    lastName: subscriberData.lastName,
    extensionName: subscriberData.extensionName,
    phoneNumber: subscriberData.phoneNumber,
    email: subscriberData.email,
  };

  // Add status field (different for citizens vs nonCitizens)
  if (subscriberGateway.type === 'CITIZEN') {
    subscriberResponse.status = subscriberData.residencyStatus || 'PENDING';
  } else {
    subscriberResponse.status = subscriberData.status;
  }

  return {
    subscriber: subscriberResponse,
    token,
    refreshToken,
  };
};

export const portalSignup = async (data: PortalSignupData) => {
  // Check if phone number already exists in Citizen table
  const existingCitizen = await prisma.citizen.findFirst({
    where: { phoneNumber: data.phoneNumber },
  });

  if (existingCitizen) {
    throw new Error('Phone number already registered');
  }

  // Check if phone number already exists in NonCitizen
  const existingNonCitizen = await (prisma as any).nonCitizen.findUnique({
    where: { phoneNumber: data.phoneNumber },
  });

  if (existingNonCitizen) {
    throw new Error('Phone number already registered');
  }

  const hashedPassword = await hashPassword(data.password);

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

  // Create NonCitizen record (without password - password is stored in Subscriber)
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

  // Create Subscriber gateway with password
  const subscriberGateway = await (prisma as any).subscriber.create({
    data: {
      type: 'SUBSCRIBER',
      citizenId: null,
      nonCitizenId: nonCitizen.id,
      password: hashedPassword,
    },
  });

  const tokenPayload: TokenPayload = {
    id: subscriberGateway.id, // Use gateway ID
    phoneNumber: nonCitizen.phoneNumber,
    role: 'subscriber',
    type: 'subscriber',
  };

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token in database
  await createRefreshToken({
    subscriberId: subscriberGateway.id,
    token: refreshToken,
    deviceInfo: data.deviceInfo,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });

  // Send welcome email (non-blocking)
  if (data.email) {
    try {
      const subscriberName = `${nonCitizen.firstName} ${nonCitizen.lastName}`;
      const emailData = {
        subscriberName,
        email: data.email,
        phoneNumber: nonCitizen.phoneNumber,
        status: nonCitizen.status,
      };
      const { subject, html, text } = getWelcomeEmail(emailData);
      await sendEmailSafely(data.email, subject, html, text);
    } catch (error: any) {
      console.error('Failed to send welcome email:', error.message);
    }
  }

  return {
    subscriber: {
      id: subscriberGateway.id,
      firstName: nonCitizen.firstName,
      middleName: nonCitizen.middleName,
      lastName: nonCitizen.lastName,
      extensionName: nonCitizen.extensionName,
      phoneNumber: nonCitizen.phoneNumber,
      email: nonCitizen.email,
      status: nonCitizen.status,
      residentId: nonCitizen.residentId,
    },
    token,
    refreshToken,
  };
};

export const getCurrentUser = async (userId: string, type: 'admin' | 'subscriber' | 'dev') => {
  if (type === 'dev') {
    // Dev users don't exist in database, return dev user info from environment
    const devEmail = process.env.DEV_EMAIL || 'dev@multysis.local';
    return {
      id: 'dev-user',
      email: devEmail,
      name: 'Developer',
      role: 'developer',
      createdAt: new Date().toISOString(),
    };
  }

  if (type === 'admin') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } else {
    // Fetch from Subscriber gateway
    const subscriberGateway = await (prisma as any).subscriber.findUnique({
      where: { id: userId },
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

    if (!subscriberGateway) {
      throw new Error('Subscriber not found');
    }

    // Merge data based on type
    if (subscriberGateway.type === 'CITIZEN' && subscriberGateway.citizen) {
      const citizen = subscriberGateway.citizen;
      return {
        id: subscriberGateway.id,
        firstName: citizen.firstName,
        middleName: citizen.middleName,
        lastName: citizen.lastName,
        extensionName: citizen.extensionName,
        phoneNumber: citizen.phoneNumber,
        email: citizen.email,
        status: 'ACTIVE',
        residentId: citizen.residentId,
        placeOfBirth: citizen.placeOfBirth
          ? {
              region: citizen.placeOfBirth.region,
              province: citizen.placeOfBirth.province,
              municipality: citizen.placeOfBirth.municipality,
            }
          : null,
        motherInfo: null, // Citizens don't have motherInfo in this structure
      };
    } else if (subscriberGateway.type === 'SUBSCRIBER' && subscriberGateway.nonCitizen) {
      const nonCitizen = subscriberGateway.nonCitizen;
      return {
        id: subscriberGateway.id,
        firstName: nonCitizen.firstName,
        middleName: nonCitizen.middleName,
        lastName: nonCitizen.lastName,
        extensionName: nonCitizen.extensionName,
        phoneNumber: nonCitizen.phoneNumber,
        email: nonCitizen.email,
        status: nonCitizen.status,
        residentId: nonCitizen.residentId,
        placeOfBirth: nonCitizen.placeOfBirth,
        motherInfo: nonCitizen.motherInfo,
      };
    }

    throw new Error('Subscriber data not found');
  }
};
