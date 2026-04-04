import axios from 'axios';
import prisma from '../config/database';
import { generateRefreshToken, generateToken, TokenPayload } from '../utils/jwt';
import { createRefreshToken } from './refreshToken.service';
import { formatResidentResponse } from './auth.service';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/portal/google/callback';

export interface GoogleTokenInfo {
  sub: string;
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

// =============================================================================
// Google OAuth URL
// =============================================================================
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

// =============================================================================
// Exchange authorization code for Google tokens
// =============================================================================
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
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return response.data;
};

// =============================================================================
// Get user info from Google
// =============================================================================
export const getGoogleUserInfo = async (accessToken: string): Promise<GoogleTokenInfo> => {
  const response = await axios.get<GoogleTokenInfo>(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
};

// =============================================================================
// Google OAuth portal login (backend redirect flow)
// =============================================================================
export interface GoogleLoginResult {
  success: boolean;
  error?: string;
  errorCode?: 'NOT_REGISTERED' | 'ACCOUNT_INACTIVE' | 'GOOGLE_AUTH_FAILED';
  resident?: Record<string, unknown>;
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
    const tokens = await exchangeCodeForTokens(code);
    if (tokens.error) {
      return {
        success: false,
        error: tokens.error_description || 'Google authentication failed',
        errorCode: 'GOOGLE_AUTH_FAILED',
      };
    }

    const googleUser = await getGoogleUserInfo(tokens.access_token);
    if (!googleUser.email || !googleUser.email_verified) {
      return {
        success: false,
        error: 'Unable to verify Google email',
        errorCode: 'GOOGLE_AUTH_FAILED',
      };
    }

    return _handleGoogleLogin(googleUser.sub, googleUser.email, deviceInfo, ipAddress, userAgent);
  } catch (error: any) {
    console.error('Google OAuth error:', error.message);
    return {
      success: false,
      error: 'Google authentication failed. Please try again.',
      errorCode: 'GOOGLE_AUTH_FAILED',
    };
  }
};

// =============================================================================
// Login via Supabase-initiated Google OAuth (frontend → backend)
// =============================================================================
export const loginWithSupabaseGoogle = async (
  googleId: string,
  googleEmail: string,
  deviceInfo?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<GoogleLoginResult> => {
  return _handleGoogleLogin(googleId, googleEmail, deviceInfo, ipAddress, userAgent);
};

// =============================================================================
// Link Google account to an existing resident
// =============================================================================
export const linkGoogleAccount = async (
  residentId: string,
  code: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const tokens = await exchangeCodeForTokens(code);
    if (tokens.error) return { success: false, error: tokens.error_description };

    const googleUser = await getGoogleUserInfo(tokens.access_token);
    if (!googleUser.email) return { success: false, error: 'Unable to get Google email' };

    // Verify the Google ID is not already linked to another account
    const existingCredential = await prisma.residentCredential.findUnique({
      where: { googleId: googleUser.sub },
    });

    if (existingCredential && existingCredential.residentFk !== residentId) {
      return { success: false, error: 'This Google account is already linked to another account' };
    }

    const credential = await prisma.residentCredential.findUnique({
      where: { residentFk: residentId },
    });

    if (!credential) return { success: false, error: 'Resident credentials not found' };

    await prisma.residentCredential.update({
      where: { id: credential.id },
      data: { googleId: googleUser.sub, googleEmail: googleUser.email },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Link Google account error:', error.message);
    return { success: false, error: 'Failed to link Google account' };
  }
};

// =============================================================================
// Unlink Google account from a resident
// =============================================================================
export const unlinkGoogleAccount = async (
  residentId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const credential = await prisma.residentCredential.findUnique({
      where: { residentFk: residentId },
    });

    if (!credential) return { success: false, error: 'Resident credentials not found' };

    await prisma.residentCredential.update({
      where: { id: credential.id },
      data: { googleId: null, googleEmail: null },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Unlink Google account error:', error.message);
    return { success: false, error: 'Failed to unlink Google account' };
  }
};

// =============================================================================
// Internal: shared Google login logic used by both flows
// =============================================================================
const _handleGoogleLogin = async (
  googleId: string,
  googleEmail: string,
  deviceInfo?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<GoogleLoginResult> => {
  // Step 1: Find credential by Google ID
  let credential = await prisma.residentCredential.findUnique({
    where: { googleId },
    include: {
      resident: {
        include: { barangay: { include: { municipality: true } } },
      },
    },
  });

  // Step 2: If not found, try to match by resident email and auto-link
  if (!credential) {
    const residentByEmail = await prisma.resident.findFirst({
      where: { email: googleEmail },
      include: {
        credentials: true,
        barangay: { include: { municipality: true } },
      },
    });

    if (residentByEmail?.credentials) {
      await prisma.residentCredential.update({
        where: { id: residentByEmail.credentials.id },
        data: { googleId, googleEmail },
      });

      credential = await prisma.residentCredential.findUnique({
        where: { id: residentByEmail.credentials.id },
        include: {
          resident: {
            include: { barangay: { include: { municipality: true } } },
          },
        },
      });
    }
  }

  if (!credential || !credential.resident) {
    return {
      success: false,
      error:
        'This Google account is not registered. Please register first or contact the administrator.',
      errorCode: 'NOT_REGISTERED',
    };
  }

  const resident = credential.resident;

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
    deviceInfo,
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    resident: formatResidentResponse(resident),
    token,
    refreshToken,
  };
};
