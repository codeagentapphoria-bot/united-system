import { compare, hash } from 'bcryptjs';
import prisma from '../config/database';
import { parseTimeString } from '../utils/timeParser';

const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '30d';

export interface CreateRefreshTokenData {
  userId?: string;      // eservice_users.id  (admin portal)
  residentId?: string;  // residents.id        (portal residents)
  token: string;        // Plain text token (hashed before storage)
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RefreshTokenResult {
  id: string;
  userId: string | null;
  residentId: string | null;
  expiresAt: Date;
  deviceInfo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Create a new refresh token in the database.
 * The token is hashed before storage for security.
 */
export const createRefreshToken = async (
  data: CreateRefreshTokenData
): Promise<RefreshTokenResult> => {
  const hashedToken = await hash(data.token, 10);

  const expiresInMs = parseTimeString(REFRESH_TOKEN_EXPIRES);
  const expiresAt = new Date(Date.now() + expiresInMs);

  const refreshToken = await prisma.refreshToken.create({
    data: {
      userId: data.userId || null,
      residentId: data.residentId || null,
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
    residentId: refreshToken.residentId,
    expiresAt: refreshToken.expiresAt,
    deviceInfo: refreshToken.deviceInfo,
    ipAddress: refreshToken.ipAddress,
    userAgent: refreshToken.userAgent,
  };
};

/**
 * Find a refresh token by plain text value.
 * Compares against hashed tokens in the database.
 * Limits search to recent tokens to prevent expensive bcrypt scans.
 */
export const findRefreshToken = async (token: string): Promise<RefreshTokenResult | null> => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const tokens = await prisma.refreshToken.findMany({
    where: {
      revokedAt: null,
      expiresAt: { gt: now },
      createdAt: { gte: sevenDaysAgo },
    },
    take: 500,
    orderBy: { createdAt: 'desc' },
  });

  for (const dbToken of tokens) {
    try {
      const isMatch = await compare(token, dbToken.token);
      if (isMatch) {
        return {
          id: dbToken.id,
          userId: dbToken.userId,
          residentId: dbToken.residentId,
          expiresAt: dbToken.expiresAt,
          deviceInfo: dbToken.deviceInfo,
          ipAddress: dbToken.ipAddress,
          userAgent: dbToken.userAgent,
        };
      }
    } catch {
      continue;
    }
  }

  return null;
};

/**
 * Revoke a single refresh token by ID.
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
 * Revoke all active tokens for a user or resident (forced logout).
 */
export const revokeAllUserTokens = async (
  userId?: string,
  residentId?: string,
  reason?: string
): Promise<void> => {
  if (!userId && !residentId) {
    throw new Error('Either userId or residentId must be provided');
  }

  const where: Record<string, unknown> = { revokedAt: null };
  if (userId) where.userId = userId;
  else where.residentId = residentId;

  await prisma.refreshToken.updateMany({
    where: where as any,
    data: {
      revokedAt: new Date(),
      revokedReason: reason || 'Forced logout',
    },
  });
};

/**
 * Delete all expired and revoked tokens (run periodically).
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  const now = new Date();
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }],
    },
  });
  return result.count;
};

/**
 * Get a refresh token by ID (for direct validation).
 */
export const getRefreshTokenById = async (tokenId: string): Promise<RefreshTokenResult | null> => {
  const token = await prisma.refreshToken.findUnique({ where: { id: tokenId } });
  if (!token) return null;

  const now = new Date();
  if (token.revokedAt || token.expiresAt < now) return null;

  return {
    id: token.id,
    userId: token.userId,
    residentId: token.residentId,
    expiresAt: token.expiresAt,
    deviceInfo: token.deviceInfo,
    ipAddress: token.ipAddress,
    userAgent: token.userAgent,
  };
};
