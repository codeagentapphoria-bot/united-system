import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import winston from 'winston';
import { AuthRequest } from './auth';
import { addDevLog } from '../services/dev.service';
import {
  AuditJobData,
  enqueueAudit,
  setAuditHandler,
  startAuditProcessor,
} from '../queues/audit.queue';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Winston sink for security audit events. Only invoked by the queue processor
// (or the inline fallback when Redis is unreachable) — never from the request
// path directly.
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

// =============================================================================
// Handler — the side-effectful work. Registered with the queue so every job
// (or inline fallback call) runs through the same code path.
// =============================================================================
const writeAuditEntry = (data: AuditJobData): void => {
  auditLogger.info(data.event, {
    ...data.eventDetails,
    timestamp: new Date().toISOString(),
  });
  if (data.event === 'SECURITY_ERROR') {
    addDevLog('error', `Security error: ${data.eventDetails.error || data.event}`, {
      ...data.eventDetails,
    });
  }
  if (data.devLog) {
    addDevLog(data.devLog.level, data.devLog.message, data.devLog.context);
  }
};
setAuditHandler(writeAuditEntry);

/**
 * Start the queue processor. Called once from the server bootstrap in
 * src/index.ts after Redis is available.
 */
export const initAuditProcessor = (): void => {
  startAuditProcessor(10);
};

// =============================================================================
// Public API — unchanged signatures; now enqueues instead of writing inline.
// =============================================================================

export const logSecurityEvent = (
  event: string,
  details: AuditJobData['eventDetails']
): void => {
  void enqueueAudit({ event, eventDetails: details });
};

export const logFailedLogin = (identifier: string, req: Request, reason: string): void => {
  const details: AuditJobData['eventDetails'] = {
    userId: identifier,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    path: req.path,
    method: req.method,
    error: reason,
  };
  void enqueueAudit({
    event: 'FAILED_LOGIN_ATTEMPT',
    eventDetails: details,
    devLog: {
      level: 'error',
      message: 'Failed login attempt',
      context: { identifier, ...details },
    },
  });
};

export const logPermissionDenial = (req: AuthRequest, resource: string, action: string): void => {
  const details: AuditJobData['eventDetails'] = {
    userId: req.user?.id,
    userType: req.user?.type,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    path: req.path,
    method: req.method,
    error: `Access denied to ${resource} for action ${action}`,
  };
  void enqueueAudit({
    event: 'PERMISSION_DENIED',
    eventDetails: details,
    devLog: {
      level: 'error',
      message: 'Permission denied',
      context: { resource, action, ...details },
    },
  });
};

export const logSuspiciousActivity = (req: Request, reason: string): void => {
  const details: AuditJobData['eventDetails'] = {
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get('user-agent'),
    path: req.path,
    method: req.method,
    error: reason,
  };
  void enqueueAudit({
    event: 'SUSPICIOUS_ACTIVITY',
    eventDetails: details,
    devLog: {
      level: 'error',
      message: 'Suspicious activity detected',
      context: { reason, ...details },
    },
  });
};

export const logSuccessfulLogin = (userId: string, userType: string, req: Request): void => {
  void enqueueAudit({
    event: 'SUCCESSFUL_LOGIN',
    eventDetails: {
      userId,
      userType,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      path: req.path,
      method: req.method,
    },
  });
};

export const auditMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const sensitivePaths = [
    '/api/users',
    '/api/roles',
    '/api/permissions',
    '/api/residents',
    '/api/admin/residents',
  ];

  if (sensitivePaths.some((p) => req.path.startsWith(p))) {
    const details: AuditJobData['eventDetails'] = {
      userId: req.user?.id,
      userType: req.user?.type,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
    };
    void enqueueAudit({
      event: 'SENSITIVE_ENDPOINT_ACCESS',
      eventDetails: details,
      devLog: {
        level: 'info',
        message: 'Sensitive endpoint accessed',
        context: details,
      },
    });
  }

  next();
};

export default auditLogger;
