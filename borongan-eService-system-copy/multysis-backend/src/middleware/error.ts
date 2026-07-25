import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import { NextFunction, Request, Response } from 'express';
import { logSecurityEvent } from './audit';
import { addDevLog } from '../services/dev.service';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Sanitize error messages to prevent information disclosure
const sanitizeErrorMessage = (error: Error, statusCode: number): string => {
  // In production, don't expose internal error details
  if (process.env.NODE_ENV === 'production') {
    // For 4xx errors, we can show user-friendly messages
    if (statusCode >= 400 && statusCode < 500) {
      // Only return safe, user-friendly messages
      const safeMessages: { [key: string]: string } = {
        'Invalid credentials': 'Invalid credentials',
        'Access denied': 'Access denied',
        'Authentication required': 'Authentication required',
        'Record not found': 'Record not found',
        'Validation error': 'Validation error',
      };

      // Check if error message is in safe list
      for (const [key, value] of Object.entries(safeMessages)) {
        if (error.message.includes(key)) {
          return value;
        }
      }

      // Generic message for other 4xx errors
      return 'Invalid request';
    }

    // For 5xx errors, always return generic message
    return 'An error occurred. Please try again later.';
  }

  // In development, show actual error message
  return error.message;
};

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: any[] = [];

  // Handle Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = 'A record with this value already exists';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        break;
      default:
        statusCode = 400;
        message = 'Database error occurred';
    }
    // Log Prisma database errors
    addDevLog('error', `Database error: ${err.code} - ${message}`, {
      prismaCode: err.code,
      statusCode,
      path: req.path,
      method: req.method,
      meta: err.meta,
    });
  } else if (err instanceof PrismaClientValidationError) {
    statusCode = 400;
    message = 'Validation error';
    // Don't expose Prisma validation details in production
    if (process.env.NODE_ENV === 'development') {
      errors = [err.message];
    } else {
      errors = ['Invalid input data'];
    }
    // Log Prisma validation errors
    addDevLog('warn', 'Database validation error', {
      statusCode,
      path: req.path,
      method: req.method,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Invalid input data',
    });
  } else if (err instanceof CustomError) {
    statusCode = err.statusCode;
    message = sanitizeErrorMessage(err, statusCode);
  } else if (err instanceof Error) {
    message = sanitizeErrorMessage(err, statusCode);
  }

  // Log security-related errors
  if (statusCode === 401 || statusCode === 403) {
    logSecurityEvent('SECURITY_ERROR', {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      path: req.path,
      method: req.method,
      statusCode,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Security error',
    });
    // Also log to dev dashboard
    addDevLog('error', `Security error: ${statusCode === 401 ? 'Unauthorized' : 'Forbidden'}`, {
      statusCode,
      path: req.path,
      method: req.method,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      error: process.env.NODE_ENV === 'development' ? err.message : 'Security error',
    });
  }

  // Log 5xx server errors
  if (statusCode >= 500) {
    addDevLog('error', `Server error: ${message}`, {
      statusCode,
      path: req.path,
      method: req.method,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  // Log error in development or for 5xx errors
  if (process.env.NODE_ENV === 'development' || statusCode >= 500) {
    console.error('Error:', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      statusCode,
      path: req.path,
      method: req.method,
    });
  }

  // Status-code-aware friendly message override (Tier 1 — audit fix)
  const friendlyMessageByStatus: Record<number, string> = {
    504: 'The server took too long to respond. Please try again in a moment.',
    503: 'Service is temporarily unavailable. Please try again shortly.',
    429: 'Too many requests. Please slow down and try again in a minute.',
  };

  // Prisma error-code-aware friendly message override
  const friendlyMessageByPrismaCode: Record<string, string> = {
    P2034: 'A conflict occurred while writing to the database. Please retry.',
    P1001: 'Cannot reach the database. Please try again shortly.',
    P1002: 'Database connection timed out. Please try again shortly.',
    P1008: 'Database operations are timing out. Please try again shortly.',
    P1017: 'Database connection has been closed. Please retry.',
  };

  // Apply overrides — known codes always use the friendly override, even in production.
  let finalMessage = message;
  if (typeof (err as any).statusCode === 'number' && friendlyMessageByStatus[(err as any).statusCode]) {
    finalMessage = friendlyMessageByStatus[(err as any).statusCode];
  } else if (typeof (err as any).code === 'string' && friendlyMessageByPrismaCode[(err as any).code]) {
    finalMessage = friendlyMessageByPrismaCode[(err as any).code];
  }

  res.status(statusCode).json({
    status: 'error',
    message: finalMessage,
    ...(errors.length > 0 && { errors }),
    // Only expose stack trace in development
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
