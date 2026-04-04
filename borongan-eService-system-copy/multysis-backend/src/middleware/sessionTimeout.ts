import { NextFunction, Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from './auth';
import { parseTimeString } from '../utils/timeParser';
import { addDevLog } from '../services/dev.service';

const IDLE_TIMEOUT = process.env.IDLE_TIMEOUT || '15m';
const ABSOLUTE_TIMEOUT = process.env.ABSOLUTE_TIMEOUT || '6h';

const IDLE_TIMEOUT_MS = parseTimeString(IDLE_TIMEOUT);
const ABSOLUTE_TIMEOUT_MS = parseTimeString(ABSOLUTE_TIMEOUT);

/**
 * Session timeout middleware
 * Checks for idle timeout and absolute timeout
 * Updates lastActivityAt on each request
 */
export const sessionTimeout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      // No user, continue (will be handled by auth middleware)
      next();
      return;
    }

    const userId = req.user.id;
    const userType = req.user.type;

    // Dev users don't have sessions in database, skip session checking
    if (userType === 'dev') {
      next();
      return;
    }

    // Find active session for this user
    const session = await prisma.session.findFirst({
      where: {
        ...(userType === 'admin' ? { userId } : { residentId: userId }),
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        refreshToken: true,
      },
    });

    if (!session) {
      // No active session found, continue (session will be created on login)
      next();
      return;
    }

    const now = new Date();
    const lastActivityAt = session.lastActivityAt;
    const createdAt = session.createdAt;

    // Check idle timeout
    const idleTime = now.getTime() - lastActivityAt.getTime();
    if (idleTime > IDLE_TIMEOUT_MS) {
      // Idle timeout exceeded
      addDevLog('warn', 'Session expired due to inactivity', {
        userId,
        userType,
        sessionId: session.id,
        idleTime: Math.floor(idleTime / 1000), // seconds
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

    // Check absolute timeout
    const absoluteTime = now.getTime() - createdAt.getTime();
    if (absoluteTime > ABSOLUTE_TIMEOUT_MS) {
      // Absolute timeout exceeded
      addDevLog('warn', 'Session expired (absolute timeout)', {
        userId,
        userType,
        sessionId: session.id,
        absoluteTime: Math.floor(absoluteTime / 1000), // seconds
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

    // Update lastActivityAt
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: now },
    });

    next();
  } catch (error) {
    // On error, continue (don't block requests)
    next();
  }
};

/**
 * Create or update session for authenticated user
 * Should be called after successful login
 */
export const createOrUpdateSession = async (
  userId: string,
  userType: 'admin' | 'resident' | 'dev',
  refreshTokenId: string,
  req: Request
): Promise<void> => {
  // Dev users don't need sessions stored in database
  if (userType === 'dev') {
    return;
  }

  try {
    const ipAddress =
      req.ip || req.socket.remoteAddress || (req.headers['x-forwarded-for'] as string) || undefined;
    const userAgent = req.headers['user-agent'] || undefined;
    const deviceInfo = JSON.stringify({
      userAgent,
      ipAddress,
      platform: req.headers['sec-ch-ua-platform'] || undefined,
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_MS);

    // Check if session exists
    const existingSession = await prisma.session.findFirst({
      where: {
        ...(userType === 'admin' ? { userId } : { residentId: userId }),
        refreshTokenId,
      },
    });

    if (existingSession) {
      // Update existing session
      await prisma.session.update({
        where: { id: existingSession.id },
        data: {
          lastActivityAt: now,
          expiresAt,
          ipAddress,
          userAgent,
          deviceInfo,
        },
      });
    } else {
      // Create new session
      await prisma.session.create({
        data: {
          ...(userType === 'admin' ? { userId } : { residentId: userId }),
          refreshTokenId,
          ipAddress,
          userAgent,
          deviceInfo,
          lastActivityAt: now,
          expiresAt,
        },
      });
    }
  } catch (error) {
    // Log error but don't throw (session creation is not critical)
    console.error('Error creating/updating session:', error);
  }
};

/**
 * Delete all sessions for a user (used during logout)
 */
export const deleteUserSessions = async (
  userId?: string,
  residentId?: string
): Promise<void> => {
  if (!userId && !residentId) {
    return;
  }

  try {
    await prisma.session.deleteMany({
      where: userId
        ? { userId }
        : { residentId: residentId as string },
    });
  } catch (error) {
    console.error('Error deleting user sessions:', error);
  }
};
