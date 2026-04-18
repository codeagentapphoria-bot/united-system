import prisma from '../config/database';
import { parseTimeString } from '../utils/timeParser';
import { verifyRefreshToken } from '../utils/jwt';

const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '30d';

export interface CreateRefreshTokenData {
  userId?: string;      // eservice_users.id  (admin portal)
  residentId?: string;  // residents.id        (portal residents)
  jti: string;          // JWT `jti` claim (UUID) — stored as lookup key
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
 * Persist a refresh-token row keyed by the JWT's jti claim.
 * The signed JWT itself is the bearer credential — no secret material is stored here.
 */
export const createRefreshToken = async (
  data: CreateRefreshTokenData
): Promise<RefreshTokenResult> => {
  const expiresInMs = parseTimeString(REFRESH_TOKEN_EXPIRES);
  const expiresAt = new Date(Date.now() + expiresInMs);

  const refreshToken = await prisma.refreshToken.create({
    data: {
      jti: data.jti,
      userId: data.userId || null,
      residentId: data.residentId || null,
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
 * Validate a refresh-token JWT and look up its row by indexed jti.
 * Returns null for invalid signature, missing jti, unknown jti, revoked, or expired rows.
 */
export const findRefreshTokenByJwt = async (token: string): Promise<RefreshTokenResult | null> => {
  let jti: string;
  try {
    const decoded = verifyRefreshToken(token);
    jti = decoded.jti;
  } catch {
    return null;
  }

  const row = await prisma.refreshToken.findUnique({ where: { jti } });
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt <= new Date()) return null;

  return {
    id: row.id,
    userId: row.userId,
    residentId: row.residentId,
    expiresAt: row.expiresAt,
    deviceInfo: row.deviceInfo,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
  };
};

// Backward-compatible alias — will be removed in a follow-up once callers are migrated.
export const findRefreshToken = findRefreshTokenByJwt;

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
 *
 * Deletes in batches to keep each transaction short. At 80k users × multi-device × 30d
 * token lifetime the eligible set can run into the millions; a single deleteMany would
 * hold a long-running transaction and block writes. Each batch caps transaction size
 * and lets Postgres autovacuum keep up.
 */
export const cleanupExpiredTokens = async (batchSize = 10000): Promise<number> => {
  const now = new Date();
  let totalDeleted = 0;

  while (true) {
    const batch = await prisma.refreshToken.findMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }],
      },
      select: { id: true },
      take: batchSize,
    });
    if (batch.length === 0) break;

    const result = await prisma.refreshToken.deleteMany({
      where: { id: { in: batch.map((row) => row.id) } },
    });
    totalDeleted += result.count;

    if (batch.length < batchSize) break;
  }

  return totalDeleted;
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
