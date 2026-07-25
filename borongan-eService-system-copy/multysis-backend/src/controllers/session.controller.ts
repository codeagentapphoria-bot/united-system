import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { parseTimeString } from '../utils/timeParser';
import cacheService from '../services/cache.service';

const IDLE_TIMEOUT_MS = parseTimeString(process.env.IDLE_TIMEOUT || '15m');
const ABSOLUTE_TIMEOUT_MS = parseTimeString(process.env.ABSOLUTE_TIMEOUT || '6h');

interface RedisSession {
  refreshTokenId: string;
  createdAt: number; // ms epoch
  lastActivityAt: number; // ms epoch
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
}

const sessionKey = (userType: string, userId: string): string =>
  `session:${userType}:${userId}`;

export const getSessionStatusController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ status: 'error', message: 'Not authenticated' });
    return;
  }

  const key = sessionKey(req.user.type, req.user.id);

  let session: RedisSession | null = null;
  try {
    session = await cacheService.get<RedisSession>(key);
  } catch {
    // Redis error — fail gracefully
    res.status(200).json({
      status: 'success',
      data: {
        idleRemainingMs: null,
        absoluteRemainingMs: null,
        error: 'session_status_unavailable',
      },
    });
    return;
  }

  if (!session) {
    // Redis session bookkeeping is best-effort; auth middleware still validates JWTs.
    res.status(200).json({
      status: 'success',
      data: {
        idleRemainingMs: null,
        absoluteRemainingMs: null,
        error: 'session_status_unavailable',
      },
    });
    return;
  }

  const now = Date.now();
  const idleRemaining = Math.max(0, (session.lastActivityAt + IDLE_TIMEOUT_MS) - now);
  const absoluteRemaining = Math.max(0, (session.createdAt + ABSOLUTE_TIMEOUT_MS) - now);

  res.status(200).json({
    status: 'success',
    data: {
      idleRemainingMs: idleRemaining,
      absoluteRemainingMs: absoluteRemaining,
    },
  });
};
