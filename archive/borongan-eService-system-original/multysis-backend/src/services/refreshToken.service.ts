import { compare, hash } from 'bcryptjs';
import prisma from '../config/database';
import { parseTimeString } from '../utils/timeParser';

const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '30d';

export interface CreateRefreshTokenData {
  userId?: string;
  subscriberId?: string;
  token: string; // Plain text token (will be hashed)
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RefreshTokenResult {
  id: string;
  userId: string | null;
  subscriberId: string | null;
  expiresAt: Date;
  deviceInfo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Create a new refresh token in the database
 * The token is hashed before storage for security
 */
export const createRefreshToken = async (
  data: CreateRefreshTokenData
): Promise<RefreshTokenResult> => {
  // Hash the token before storing
  const hashedToken = await hash(data.token, 10);

  // Calculate expiration date
  const expiresInMs = parseTimeString(REFRESH_TOKEN_EXPIRES);
  const expiresAt = new Date(Date.now() + expiresInMs);

  const refreshToken = await prisma.refreshToken.create({
    data: {
      userId: data.userId || null,
      subscriberId: data.subscriberId || null,
      token: hashedToken,
      deviceInfo: data.deviceInfo || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      expiresAt,
    },
  });

  return {
    id: refreshToken.id,
    userId: refreshToken.userId,
    subscriberId: refreshToken.subscriberId,
    expiresAt: refreshToken.expiresAt,
    deviceInfo: refreshToken.deviceInfo,
    ipAddress: refreshToken.ipAddress,
    userAgent: refreshToken.userAgent,
  };
};

/**
 * Find a refresh token by plain text token
 * Compares the provided token with hashed tokens in the database
 * OPTIMIZED: Limits search to recent tokens to prevent performance issues
 */
export const findRefreshToken = async (token: string): Promise<RefreshTokenResult | null> => {
  const now = new Date();

  // CRITICAL FIX: Limit search to recent tokens only (last 7 days)
  // This prevents loading thousands of tokens and doing expensive bcrypt comparisons
  // Most active refresh tokens are used within 7 days of creation
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const tokens = await prisma.refreshToken.findMany({
    where: {
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
      createdAt: {
        gte: sevenDaysAgo, // Only check tokens created in last 7 days
      },
    },
    take: 500, // Hard limit to prevent memory issues
    orderBy: {
      createdAt: 'desc', // Check newest tokens first (more likely to match)
    },
  });

  // Compare the provided token with each hashed token
  // bcrypt.compare is intentionally slow, so we limit the number of comparisons
  for (const dbToken of tokens) {
    try {
      const isMatch = await compare(token, dbToken.token);
      if (isMatch) {
        return {
          id: dbToken.id,
          userId: dbToken.userId,
          subscriberId: dbToken.subscriberId,
          expiresAt: dbToken.expiresAt,
          deviceInfo: dbToken.deviceInfo,
          ipAddress: dbToken.ipAddress,
          userAgent: dbToken.userAgent,
        };
      }
    } catch (error) {
      // Continue to next token if comparison fails
      continue;
    }
  }

  return null;
};

/**
 * Revoke a refresh token by ID
 */
export const revokeRefreshToken = async (tokenId: string, reason?: string): Promise<void> => {
  await prisma.refreshToken.update({
    where: { id: tokenId },
    data: {
      revokedAt: new Date(),
      revokedReason: reason || null,
    },
  });
};

/**
 * Revoke all refresh tokens for a user (for forced logout)
 */
export const revokeAllUserTokens = async (
  userId?: string,
  subscriberId?: string,
  reason?: string
): Promise<void> => {
  const where: any = {
    revokedAt: null, // Only revoke non-revoked tokens
  };

  if (userId) {
    where.userId = userId;
  } else if (subscriberId) {
    where.subscriberId = subscriberId;
  } else {
    throw new Error('Either userId or subscriberId must be provided');
  }

  await prisma.refreshToken.updateMany({
    where,
    data: {
      revokedAt: new Date(),
      revokedReason: reason || 'Forced logout',
    },
  });
};

/**
 * Clean up expired and revoked tokens
 * This should be run periodically (e.g., via a cron job)
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  const now = new Date();

  // Delete tokens that are expired or revoked
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }],
    },
  });

  return result.count;
};

/**
 * Get refresh token by ID (for validation)
 */
export const getRefreshTokenById = async (tokenId: string): Promise<RefreshTokenResult | null> => {
  const token = await prisma.refreshToken.findUnique({
    where: { id: tokenId },
  });

  if (!token) {
    return null;
  }

  // Check if token is revoked or expired
  const now = new Date();
  if (token.revokedAt || token.expiresAt < now) {
    return null;
  }

  return {
    id: token.id,
    userId: token.userId,
    subscriberId: token.subscriberId,
    expiresAt: token.expiresAt,
    deviceInfo: token.deviceInfo,
    ipAddress: token.ipAddress,
    userAgent: token.userAgent,
  };
};
