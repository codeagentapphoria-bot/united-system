import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import winston from 'winston';
import { AuthRequest } from './auth';
import { addDevLog } from '../services/dev.service';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create Winston logger for audit logs
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Log security events
export const logSecurityEvent = (
  event: string,
  details: {
    userId?: string;
    userType?: string;
    ip?: string;
    userAgent?: string;
    path?: string;
    method?: string;
    statusCode?: number;
    error?: string;
  }
): void => {
  auditLogger.info(event, {
    ...details,
    timestamp: new Date().toISOString(),
  });
  // Also log security errors to dev dashboard
  if (event === 'SECURITY_ERROR') {
    addDevLog('error', `Security error: ${details.error || event}`, {
      ...details,
    });
  }
};

// Middleware to log failed login attempts
export const logFailedLogin = (identifier: string, req: Request, reason: string): void => {
  logSecurityEvent('FAILED_LOGIN_ATTEMPT', {
    userId: identifier,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    path: req.path,
    method: req.method,
    error: reason,
  });
  // Also log to dev dashboard
  addDevLog('error', 'Failed login attempt', {
    identifier,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    path: req.path,
    method: req.method,
    error: reason,
  });
};

// Middleware to log permission denials
export const logPermissionDenial = (req: AuthRequest, resource: string, action: string): void => {
  logSecurityEvent('PERMISSION_DENIED', {
    userId: req.user?.id,
    userType: req.user?.type,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    path: req.path,
    method: req.method,
    error: `Access denied to ${resource} for action ${action}`,
  });
  // Also log to dev dashboard
  addDevLog('error', 'Permission denied', {
    userId: req.user?.id,
    userType: req.user?.type,
    resource,
    action,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    path: req.path,
    method: req.method,
  });
};

// Middleware to log suspicious activities
export const logSuspiciousActivity = (req: Request, reason: string): void => {
  logSecurityEvent('SUSPICIOUS_ACTIVITY', {
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    path: req.path,
    method: req.method,
    error: reason,
  });
  // Also log to dev dashboard
  addDevLog('error', 'Suspicious activity detected', {
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    path: req.path,
    method: req.method,
    reason,
  });
};

// Middleware to log successful logins
export const logSuccessfulLogin = (userId: string, userType: string, req: Request): void => {
  logSecurityEvent('SUCCESSFUL_LOGIN', {
    userId,
    userType,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    path: req.path,
    method: req.method,
  });
};

// Middleware to log access to sensitive endpoints
export const auditMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Log access to sensitive endpoints
  const sensitivePaths = [
    '/api/users',
    '/api/roles',
    '/api/permissions',
    '/api/subscribers',
    '/api/citizens',
  ];

  if (sensitivePaths.some((path) => req.path.startsWith(path))) {
    logSecurityEvent('SENSITIVE_ENDPOINT_ACCESS', {
      userId: req.user?.id,
      userType: req.user?.type,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
    });
    // Also log to dev dashboard
    addDevLog('info', 'Sensitive endpoint accessed', {
      userId: req.user?.id,
      userType: req.user?.type,
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    });
  }

  next();
};

export default auditLogger;
