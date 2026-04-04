import prisma from '../config/database';
import cacheService from './cache.service';
import { generateRefreshToken, generateToken, TokenPayload } from '../utils/jwt';
import { comparePassword } from '../utils/password';
import { createRefreshToken } from './refreshToken.service';

// =============================================================================
// TYPES
// =============================================================================

export interface AdminLoginData {
  email: string;
  password: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PortalLoginData {
  username: string;   // login by username (replaces phone number)
  password: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

// =============================================================================
// ADMIN LOGIN  (unchanged logic — email + password for eservice_users)
// =============================================================================

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

// =============================================================================
// PORTAL LOGIN  (username + password — replaces phone + OTP flow)
// =============================================================================

export const portalLogin = async (data: PortalLoginData) => {
  // Find resident by username
  const resident = await prisma.resident.findUnique({
    where: { username: data.username },
    include: {
      credentials: true,
      barangay: {
        include: { municipality: true },
      },
    },
  });

  if (!resident) {
    throw new Error('Invalid credentials');
  }

  if (!resident.credentials || !resident.credentials.password) {
    throw new Error('Invalid credentials');
  }

  const isPasswordValid = await comparePassword(data.password, resident.credentials.password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Pending/rejected accounts cannot log in
  if (resident.status === 'pending') {
    throw new Error('Your registration is pending approval. Please wait for the barangay to review your application.');
  }
  if (resident.status === 'rejected') {
    throw new Error('Your registration was not approved. Please visit your barangay hall for assistance.');
  }
  // Blocked / deleted accounts cannot log in
  if (resident.status === 'inactive') {
    throw new Error('Account is inactive. Please contact an administrator.');
  }
  if (resident.status === 'deceased' || resident.status === 'moved_out') {
    throw new Error('Account is no longer active.');
  }

  const tokenPayload: TokenPayload = {
    id: resident.id,
    username: resident.username ?? undefined,
    role: 'resident',
    type: 'resident',
  };

  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  await createRefreshToken({
    residentId: resident.id,
    token: refreshToken,
    deviceInfo: data.deviceInfo,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });

  return {
    resident: formatResidentResponse(resident),
    token,
    refreshToken,
  };
};

// =============================================================================
// GOOGLE OAUTH LOGIN  (resident credential lookup by googleId or email)
// =============================================================================

export interface GoogleLoginData {
  googleId: string;
  googleEmail: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface GoogleLoginResult {
  success: boolean;
  error?: string;
  errorCode?: 'NOT_REGISTERED' | 'ACCOUNT_PENDING' | 'ACCOUNT_REJECTED' | 'ACCOUNT_INACTIVE' | 'GOOGLE_AUTH_FAILED';
  resident?: Record<string, unknown>;
  token?: string;
  refreshToken?: string;
}

export const loginWithGoogle = async (data: GoogleLoginData): Promise<GoogleLoginResult> => {
  try {
    // Step 1: Find credentials by Google ID
    let credentials = await prisma.residentCredential.findUnique({
      where: { googleId: data.googleId },
      include: {
        resident: {
          include: {
            barangay: { include: { municipality: true } },
          },
        },
      },
    });

    // Step 2: If not found by Google ID, try to find resident by email and auto-link
    if (!credentials) {
      const residentByEmail = await prisma.resident.findFirst({
        where: { email: data.googleEmail },
        include: {
          credentials: true,
          barangay: { include: { municipality: true } },
        },
      });

      if (residentByEmail && residentByEmail.credentials) {
        // Auto-link Google account
        await prisma.residentCredential.update({
          where: { id: residentByEmail.credentials.id },
          data: {
            googleId: data.googleId,
            googleEmail: data.googleEmail,
          },
        });

        credentials = await prisma.residentCredential.findUnique({
          where: { id: residentByEmail.credentials.id },
          include: {
            resident: {
              include: {
                barangay: { include: { municipality: true } },
              },
            },
          },
        });
      }
    }

    if (!credentials || !credentials.resident) {
      return {
        success: false,
        error:
          'This Google account is not registered. Please register first or contact the administrator.',
        errorCode: 'NOT_REGISTERED',
      };
    }

    const resident = credentials.resident;

    // Status checks
    if (resident.status === 'pending') {
      return {
        success: false,
        error: 'Your registration is pending approval. Please wait for the barangay to review your application.',
        errorCode: 'ACCOUNT_PENDING',
      };
    }
    if (resident.status === 'rejected') {
      return {
        success: false,
        error: 'Your registration was not approved. Please visit your barangay hall for assistance.',
        errorCode: 'ACCOUNT_REJECTED',
      };
    }
    if (resident.status === 'inactive') {
      return {
        success: false,
        error: 'Account is inactive. Please contact an administrator.',
        errorCode: 'ACCOUNT_INACTIVE',
      };
    }
    if (resident.status === 'deceased' || resident.status === 'moved_out') {
      return {
        success: false,
        error: 'Account is no longer active.',
        errorCode: 'ACCOUNT_INACTIVE',
      };
    }

    const tokenPayload: TokenPayload = {
      id: resident.id,
      username: resident.username ?? undefined,
      role: 'resident',
      type: 'resident',
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await createRefreshToken({
      residentId: resident.id,
      token: refreshToken,
      deviceInfo: data.deviceInfo,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    return {
      success: true,
      resident: formatResidentResponse(resident),
      token,
      refreshToken,
    };
  } catch (error: any) {
    console.error('Google OAuth login error:', error.message);
    return {
      success: false,
      error: 'Google authentication failed. Please try again.',
      errorCode: 'GOOGLE_AUTH_FAILED',
    };
  }
};

// =============================================================================
// GET CURRENT USER  (used by /api/auth/me and token refresh)
// Cached for 5 minutes per user
// =============================================================================

export const getCurrentUser = async (
  userId: string,
  type: 'admin' | 'resident' | 'dev'
) => {
  if (type === 'dev') {
    return {
      id: 'dev-user',
      email: process.env.DEV_EMAIL || 'dev@local',
      name: 'Developer',
      role: 'developer',
      createdAt: new Date().toISOString(),
    };
  }

  // Cache key based on user type
  const cacheKey = type === 'admin' 
    ? `auth:admin:${userId}:me` 
    : `auth:resident:${userId}:me`;

  // Check cache first (only for non-sensitive data)
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  if (type === 'admin') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) throw new Error('User not found');
    
    await cacheService.set(cacheKey, user, 300); // 5 min TTL
    return user;
  }

  // resident
  const resident = await prisma.resident.findUnique({
    where: { id: userId },
    include: {
      barangay: { include: { municipality: true } },
      credentials: true,
    },
  });

  if (!resident) throw new Error('Resident not found');
  
  const formatted = formatResidentResponse(resident);
  await cacheService.set(cacheKey, formatted, 300); // 5 min TTL
  return formatted;
};

// =============================================================================
// HELPERS
// =============================================================================

export const formatResidentResponse = (resident: any) => ({
  id: resident.id,
  residentId: resident.residentId,
  username: resident.username,
  firstName: resident.firstName,
  middleName: resident.middleName,
  lastName: resident.lastName,
  extensionName: resident.extensionName,
  sex: resident.sex,
  civilStatus: resident.civilStatus,
  birthdate: resident.birthdate,
  birthRegion: resident.birthRegion,
  birthProvince: resident.birthProvince,
  birthMunicipality: resident.birthMunicipality,
  citizenship: resident.citizenship,
  email: resident.email,
  contactNumber: resident.contactNumber,
  streetAddress: resident.streetAddress,
  occupation: resident.occupation,
  profession: resident.profession,
  employmentStatus: resident.employmentStatus,
  educationAttainment: resident.educationAttainment,
  monthlyIncome: resident.monthlyIncome,
  height: resident.height,
  weight: resident.weight,
  isVoter: resident.isVoter,
  isEmployed: resident.isEmployed,
  indigenousPerson: resident.indigenousPerson,
  spouseName: resident.spouseName,
  emergencyContactPerson: resident.emergencyContactPerson,
  emergencyContactNumber: resident.emergencyContactNumber,
  idType: resident.idType,
  idDocumentNumber: resident.idDocumentNumber,
  acrNo: resident.acrNo,
  proofOfIdentification: resident.proofOfIdentification,
  applicationRemarks: resident.applicationRemarks,
  status: resident.status,
  barangayId: resident.barangayId,
  barangay: resident.barangay
    ? {
        id: resident.barangay.id,
        name: resident.barangay.barangayName,
        municipality: resident.barangay.municipality
          ? {
              id: resident.barangay.municipality.id,
              name: resident.barangay.municipality.municipalityName,
              province: resident.barangay.municipality.province,
              region: resident.barangay.municipality.region,
            }
          : null,
      }
    : null,
  picturePath: resident.picturePath,
  // Expose googleLinked flag (without exposing the actual googleId)
  googleLinked: !!(resident.credentials?.googleId),
  // Beneficiary / classification relations
  seniorCitizen: resident.seniorCitizenBeneficiary
    ? { id: resident.seniorCitizenBeneficiary.seniorCitizenId, status: resident.seniorCitizenBeneficiary.status }
    : null,
  pwd: resident.pwdBeneficiary
    ? { id: resident.pwdBeneficiary.pwdId, status: resident.pwdBeneficiary.status }
    : null,
  student: resident.studentBeneficiary
    ? { id: resident.studentBeneficiary.studentId, status: resident.studentBeneficiary.status }
    : null,
  soloParent: resident.soloParentBeneficiary
    ? { id: resident.soloParentBeneficiary.soloParentId, status: resident.soloParentBeneficiary.status }
    : null,
  createdAt: resident.createdAt,
  updatedAt: resident.updatedAt,
});
