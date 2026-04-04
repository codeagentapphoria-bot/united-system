import logger from '../utils/logger.js';
import {ApiError} from '../utils/apiError.js';

export const errorHandler = (err, req, res, next) => {
  // Default values if not set
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle operational errors differently from programming errors
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      sendErrorProd(err, req, res);
    } else {
      // Programming or other unknown error: don't leak error details
      logger.error('💥 Critical Error:', err);

      // Send generic message
      sendErrorProd(new ApiError(500, 'Something went wrong!'), req, res);
    }
  }
};

 // Development error handler with full error stack traces
export const sendErrorDev = (err, req, res) => {
  // API requests
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // For non-API requests, send JSON response instead of rendering
  logger.error('💥 Development Error:', err);
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack
  });
};

 // Production error handler without stack traces
export const sendErrorProd = (err, req, res) => {
  // API requests
  if (req.originalUrl.startsWith('/api')) {
    // Operational errors we trust
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }

    // Unknown errors
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong!'
    });
  }

  // For non-API requests, send JSON response instead of rendering
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  // Unknown errors
  logger.error('💥 Production Error:', err);
  res.status(err.statusCode).json({
    status: 'error',
    message: 'Please try again later.'
  });
};

 // Catch 404 and forward to error handler
export const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Not found - ${req.originalUrl}`));
};

 // Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

 // Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION 💥 Shutting down...');
  logger.error(err.name, err.message, err);
  process.exit(1);
});