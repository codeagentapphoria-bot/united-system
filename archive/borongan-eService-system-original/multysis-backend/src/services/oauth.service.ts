import axios from 'axios';
import prisma from '../config/database';
import { generateToken, generateRefreshToken, TokenPayload } from '../utils/jwt';
import { createRefreshToken } from './refreshToken.service';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/portal/google/callback';

export interface GoogleTokenInfo {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

/**
 * Get Google OAuth authorization URL
 */
export const getGoogleAuthUrl = (): string => {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'select_account',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

/**
 * Exchange authorization code for tokens
 */
export const exchangeCodeForTokens = async (code: string): Promise<GoogleTokens> => {
  const response = await axios.post<GoogleTokens>(
    'https://oauth2.googleapis.com/token',
    {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_CALLBACK_URL,
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data;
};

/**
 * Get user info from Google
 */
export const getGoogleUserInfo = async (accessToken: string): Promise<GoogleTokenInfo> => {
  const response = await axios.get<GoogleTokenInfo>(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
};

/**
 * Verify ID token from Google
 */
export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleTokenInfo | null> => {
  try {
    const response = await axios.get<GoogleTokenInfo>(
      'https://oauth2.googleapis/v3/tokeninfo',
      {
        params: { id_token: idToken },
      }
    );
    return response.data;
  } catch (error) {
    return null;
  }
};

/**
 * Find subscriber by Google ID
 */
export const findSubscriberByGoogleId = async (googleId: string) => {
  return prisma.subscriber.findUnique({
    where: { googleId },
    include: {
      citizen: true,
      nonCitizen: true,
    },
  });
};

/**
 * Find subscriber by email (from Google account)
 */
export const findSubscriberByEmail = async (email: string) => {
  // Check both Citizen and NonCitizen tables for email
  const subscriber = await prisma.subscriber.findFirst({
    where: {
      OR: [
        { citizen: { email } },
        { nonCitizen: { email } },
      ],
    },
    include: {
      citizen: true,
      nonCitizen: true,
    },
  });

  return subscriber;
};

/**
 * Handle Google OAuth login for portal
 * Returns error if Google account is not registered to any subscriber
 */
export interface GoogleLoginResult {
  success: boolean;
  error?: string;
  errorCode?: 'NOT_REGISTERED' | 'ACCOUNT_BLOCKED' | 'ACCOUNT_PENDING' | 'GOOGLE_AUTH_FAILED';
  subscriber?: any;
  token?: string;
  refreshToken?: string;
}

export const googlePortalLogin = async (
  code: string,
  deviceInfo?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<GoogleLoginResult> => {
  try {
    // Step 1: Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    if (tokens.error) {
      return {
        success: false,
        error: tokens.error_description || 'Google authentication failed',
        errorCode: 'GOOGLE_AUTH_FAILED',
      };
    }

    // Step 2: Get user info from Google
    const googleUser = await getGoogleUserInfo(tokens.access_token);

    if (!googleUser.email || !googleUser.email_verified) {
      return {
        success: false,
        error: 'Unable to verify Google email',
        errorCode: 'GOOGLE_AUTH_FAILED',
      };
    }

    // Step 3: Find subscriber by Google ID
    let subscriber = await findSubscriberByGoogleId(googleUser.sub);

    // Step 4: If not found by Google ID, try to find by email
    if (!subscriber) {
      subscriber = await findSubscriberByEmail(googleUser.email);
    }

    // Step 5: If still not found, return NOT_REGISTERED error
    if (!subscriber) {
      return {
        success: false,
        error: 'This Google account is not registered. Please register first or contact the administrator.',
        errorCode: 'NOT_REGISTERED',
      };
    }

    // Step 6: Update Google ID if not set (for account linking via email)
    if (!subscriber.googleId && googleUser.sub) {
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: {
          googleId: googleUser.sub,
          googleEmail: googleUser.email,
        },
      });
    }

    // Step 7: Get subscriber data and status
    let subscriberData: any;
    let status: string;

    if (subscriber.type === 'CITIZEN' && subscriber.citizen) {
      status = subscriber.citizen.residencyStatus || 'PENDING';
      subscriberData = subscriber.citizen;
    } else if (subscriber.type === 'SUBSCRIBER' && subscriber.nonCitizen) {
      status = subscriber.nonCitizen.status;
      subscriberData = subscriber.nonCitizen;

      // Check non-citizen status
      if (status !== 'ACTIVE') {
        if (status === 'BLOCKED') {
          return {
            success: false,
            error: 'Account is blocked',
            errorCode: 'ACCOUNT_BLOCKED',
          };
        } else if (status === 'PENDING') {
          return {
            success: false,
            error: 'Account is pending activation. Please contact an administrator.',
            errorCode: 'ACCOUNT_PENDING',
          };
        } else if (status === 'EXPIRED') {
          return {
            success: false,
            error: 'Account subscription has expired',
            errorCode: 'ACCOUNT_BLOCKED',
          };
        }
      }
    } else {
      return {
        success: false,
        error: 'Subscriber data not found',
        errorCode: 'GOOGLE_AUTH_FAILED',
      };
    }

    // Step 8: Generate JWT tokens
    const tokenPayload: TokenPayload = {
      id: subscriber.id,
      email: googleUser.email,
      phoneNumber: subscriberData.phoneNumber,
      role: 'subscriber',
      type: 'subscriber',
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Step 9: Store refresh token
    await createRefreshToken({
      subscriberId: subscriber.id,
      token: refreshToken,
      deviceInfo,
      ipAddress,
      userAgent,
    });

    // Step 10: Return subscriber data
    const subscriberResponse: any = {
      id: subscriber.id,
      firstName: subscriberData.firstName,
      middleName: subscriberData.middleName,
      lastName: subscriberData.lastName,
      extensionName: subscriberData.extensionName,
      phoneNumber: subscriberData.phoneNumber,
      email: googleUser.email,
      status,
      googleId: googleUser.sub,
    };

    return {
      success: true,
      subscriber: subscriberResponse,
      token,
      refreshToken,
    };
  } catch (error: any) {
    console.error('Google OAuth error:', error.message);
    return {
      success: false,
      error: 'Google authentication failed. Please try again.',
      errorCode: 'GOOGLE_AUTH_FAILED',
    };
  }
};

/**
 * Link Google account to existing subscriber
 */
export const linkGoogleAccount = async (
  subscriberId: string,
  code: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Verify Google code
    const tokens = await exchangeCodeForTokens(code);
    if (tokens.error) {
      return { success: false, error: tokens.error_description };
    }

    // Get user info
    const googleUser = await getGoogleUserInfo(tokens.access_token);

    if (!googleUser.email) {
      return { success: false, error: 'Unable to get Google email' };
    }

    // Check if Google ID is already linked to another account
    const existingLink = await prisma.subscriber.findUnique({
      where: { googleId: googleUser.sub },
    });

    if (existingLink && existingLink.id !== subscriberId) {
      return { success: false, error: 'This Google account is already linked to another account' };
    }

    // Update subscriber with Google ID
    await prisma.subscriber.update({
      where: { id: subscriberId },
      data: {
        googleId: googleUser.sub,
        googleEmail: googleUser.email,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Link Google account error:', error.message);
    return { success: false, error: 'Failed to link Google account' };
  }
};

/**
 * Unlink Google account from subscriber
 */
export const unlinkGoogleAccount = async (
  subscriberId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await prisma.subscriber.update({
      where: { id: subscriberId },
      data: {
        googleId: null,
        googleEmail: null,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Unlink Google account error:', error.message);
    return { success: false, error: 'Failed to unlink Google account' };
  }
};

/**
 * Login via Supabase Auth Google OAuth
 * This is called after user authenticates with Google via Supabase Auth
 */
export const loginWithSupabaseGoogle = async (
  googleId: string,
  googleEmail: string
): Promise<{
  success: boolean;
  subscriber?: {
    id: string;
    phoneNumber?: string;
    email?: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  errorCode?: 'not_registered' | 'error';
}> => {
  try {
    // Step 1: Try to find subscriber by Google ID
    let subscriber = await prisma.subscriber.findUnique({
      where: { googleId },
      include: {
        citizen: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        nonCitizen: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    // Step 2: If not found by googleId, try to find by email
    if (!subscriber) {
      subscriber = await prisma.subscriber.findFirst({
        where: {
          OR: [
            { citizen: { email: googleEmail } },
            { nonCitizen: { email: googleEmail } },
          ],
        },
        include: {
          citizen: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          nonCitizen: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
      });

      // If found by email, auto-link the Google account
      if (subscriber) {
        await prisma.subscriber.update({
          where: { id: subscriber.id },
          data: {
            googleId: googleId,
            googleEmail: googleEmail,
          },
        });
        console.log(`Auto-linked Google account to subscriber ${subscriber.id}`);
      }
    }

    // Step 3: If still not found, return not registered
    if (!subscriber) {
      return {
        success: false,
        error: 'This Google account is not registered',
        errorCode: 'not_registered',
      };
    }

    // Get subscriber data from the appropriate relation
    let subscriberData: { firstName: string; lastName: string; email?: string | null; phoneNumber?: string | null } | null = null;

    if (subscriber.type === 'CITIZEN' && subscriber.citizen) {
      subscriberData = subscriber.citizen;
    } else if (subscriber.nonCitizen) {
      subscriberData = subscriber.nonCitizen;
    }

    if (!subscriberData) {
      return {
        success: false,
        error: 'Unable to retrieve subscriber data',
        errorCode: 'error',
      };
    }

    // Generate JWT tokens for our custom auth system
    const tokenPayload: TokenPayload = {
      id: subscriber.id,
      phoneNumber: subscriberData.phoneNumber || '',
      email: subscriberData.email || undefined,
      role: 'subscriber',
      type: 'subscriber',
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token
    await createRefreshToken({
      subscriberId: subscriber.id,
      token: refreshToken,
    });

    return {
      success: true,
      subscriber: {
        id: subscriber.id,
        phoneNumber: subscriberData.phoneNumber || undefined,
        email: subscriberData.email || undefined,
        firstName: subscriberData.firstName,
        lastName: subscriberData.lastName,
        role: 'subscriber',
      },
      accessToken,
      refreshToken,
    };
  } catch (error: any) {
    console.error('Login with Supabase Google error:', error.message);
    return {
      success: false,
      error: 'Failed to login with Google',
      errorCode: 'error',
    };
  }
};
