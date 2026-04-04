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

  res.status(statusCode).json({
    status: 'error',
    message,
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
