import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  addDevLog,
  devLogin,
  getDatabaseInfo,
  getSystemInfo,
  getSystemLogs,
} from '../services/dev.service';
import { setAccessTokenCookie, setRefreshTokenCookie } from '../utils/cookies';

/**
 * Extract device information from request
 */
const getDeviceInfo = (
  req: Request
): { deviceInfo?: string; ipAddress?: string; userAgent?: string } => {
  const ipAddress =
    req.ip || req.socket.remoteAddress || (req.headers['x-forwarded-for'] as string) || undefined;
  const userAgent = req.headers['user-agent'] || undefined;

  // Create device info JSON string
  const deviceInfo = JSON.stringify({
    userAgent,
    ipAddress,
    platform: req.headers['sec-ch-ua-platform'] || undefined,
  });

  return {
    deviceInfo,
    ipAddress,
    userAgent,
  };
};

export const devLoginController = async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceInfo = getDeviceInfo(req);
    const result = await devLogin({
      ...req.body,
      ...deviceInfo,
    });

    // Set HTTP-only cookies for dev login
    setAccessTokenCookie(res, result.token);
    setRefreshTokenCookie(res, result.refreshToken);

    // Log successful dev login
    addDevLog('info', 'Dev login successful', {
      email: req.body.email,
      ip: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    // Log failed dev login
    addDevLog('error', 'Dev login failed', {
      email: req.body.email || 'unknown',
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      error: error.message || 'Invalid credentials',
    });

    res.status(401).json({
      status: 'error',
      message: error.message || 'Invalid credentials',
    });
  }
};

export const getSystemLogsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await getSystemLogs(limit);
    res.status(200).json({
      status: 'success',
      data: logs,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch logs',
    });
  }
};

export const getDatabaseInfoController = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const info = await getDatabaseInfo();
    res.status(200).json({
      status: 'success',
      data: info,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch database info',
    });
  }
};

export const getSystemInfoController = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const info = await getSystemInfo();
    res.status(200).json({
      status: 'success',
      data: info,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch system info',
    });
  }
};
