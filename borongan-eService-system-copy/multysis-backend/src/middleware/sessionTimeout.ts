import { NextFunction, Request, Response } from 'express';
import { AuthRequest } from './auth';
import { parseTimeString } from '../utils/timeParser';
import { addDevLog } from '../services/dev.service';
import cacheService from '../services/cache.service';

// =============================================================================
// Session state is held in Redis, not Postgres. At 80k users the sessionTimeout
// middleware runs on every authenticated request — keeping it off the DB hot
// path is the single biggest post-login scaling win. Graceful fallback: when
// Redis is down, cacheService.get returns null and we fail-open (auth middleware
// still validates the JWT).
//
// The legacy `sessions` table is preserved for future audit-history use but is
// no longer written to by this module.
// =============================================================================

const IDLE_TIMEOUT = process.env.IDLE_TIMEOUT || '15m';
const ABSOLUTE_TIMEOUT = process.env.ABSOLUTE_TIMEOUT || '6h';

const IDLE_TIMEOUT_MS = parseTimeString(IDLE_TIMEOUT);
const ABSOLUTE_TIMEOUT_MS = parseTimeString(ABSOLUTE_TIMEOUT);
const ABSOLUTE_TIMEOUT_SEC = Math.ceil(ABSOLUTE_TIMEOUT_MS / 1000);

interface RedisSession {
  refreshTokenId: string;
  createdAt: number; // ms epoch
  lastActivityAt: number; // ms epoch
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
}

const sessionKey = (userType: 'admin' | 'resident', userId: string): string =>
  `session:${userType}:${userId}`;

/**
 * Session timeout middleware.
 * Enforces idle timeout and absolute timeout using a per-user Redis key.
 */
export const sessionTimeout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next();
      return;
    }

    const userId = req.user.id;
    const userType = req.user.type;

    // Dev users don't participate in session timeout bookkeeping
    if (userType === 'dev') {
      next();
      return;
    }

    const key = sessionKey(userType, userId);
    const session = await cacheService.get<RedisSession>(key);

    // No session row (first hit after login, TTL expired, or Redis is down) —
    // fail-open. JWT validation in the auth middleware is still in force.
    if (!session) {
      next();
      return;
    }

    const now = Date.now();

    // Idle timeout
    const idleTime = now - session.lastActivityAt;
    if (idleTime > IDLE_TIMEOUT_MS) {
      await cacheService.del(key);
      addDevLog('warn', 'Session expired due to inactivity', {
        userId,
        userType,
        idleTime: Math.floor(idleTime / 1000),
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        code: 'IDLE_TIMEOUT',
      });
      res.status(401).json({
        status: 'error',
        message: 'Session expired due to inactivity. Please log in again.',
        code: 'IDLE_TIMEOUT',
      });
      return;
    }

    // Absolute timeout
    const absoluteTime = now - session.createdAt;
    if (absoluteTime > ABSOLUTE_TIMEOUT_MS) {
      await cacheService.del(key);
      addDevLog('warn', 'Session expired (absolute timeout)', {
        userId,
        userType,
        absoluteTime: Math.floor(absoluteTime / 1000),
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        code: 'ABSOLUTE_TIMEOUT',
      });
      res.status(401).json({
        status: 'error',
        message: 'Session expired. Please log in again.',
        code: 'ABSOLUTE_TIMEOUT',
      });
      return;
    }

    // Refresh lastActivityAt, recompute TTL so the key auto-expires at the
    // absolute deadline rather than sliding with every request.
    const remainingSec = Math.max(1, ABSOLUTE_TIMEOUT_SEC - Math.floor(absoluteTime / 1000));
    session.lastActivityAt = now;
    await cacheService.set(key, session, remainingSec);

    next();
  } catch {
    // Never block requests on session middleware failure
    next();
  }
};

/**
 * Create or refresh the Redis session entry for a user after login / rotation.
 */
export const createOrUpdateSession = async (
  userId: string,
  userType: 'admin' | 'resident' | 'dev',
  refreshTokenId: string,
  req: Request
): Promise<void> => {
  if (userType === 'dev') return;

  try {
    const ipAddress =
      req.ip || req.socket.remoteAddress || (req.headers['x-forwarded-for'] as string) || undefined;
    const userAgent = req.headers['user-agent'] || undefined;
    const deviceInfo = JSON.stringify({
      userAgent,
      ipAddress,
      platform: req.headers['sec-ch-ua-platform'] || undefined,
    });

    const key = sessionKey(userType, userId);
    const now = Date.now();

    // Preserve createdAt on rotation within the same absolute window so the
    // timeout keeps counting from the original login, not from each rotation.
    const existing = await cacheService.get<RedisSession>(key);
    const createdAt =
      existing && now - existing.createdAt < ABSOLUTE_TIMEOUT_MS ? existing.createdAt : now;

    const session: RedisSession = {
      refreshTokenId,
      createdAt,
      lastActivityAt: now,
      ipAddress,
      userAgent,
      deviceInfo,
    };

    const remainingSec = Math.max(1, ABSOLUTE_TIMEOUT_SEC - Math.floor((now - createdAt) / 1000));
    await cacheService.set(key, session, remainingSec);
  } catch (error) {
    // Session bookkeeping is not critical; never fail the login on it
    console.error('Error writing Redis session:', error);
  }
};

/**
 * Drop the Redis session entry for a user (logout / forced logout).
 */
export const deleteUserSessions = async (
  userId?: string,
  residentId?: string
): Promise<void> => {
  try {
    if (userId) await cacheService.del(sessionKey('admin', userId));
    if (residentId) await cacheService.del(sessionKey('resident', residentId));
  } catch (error) {
    console.error('Error deleting Redis session:', error);
  }
};
