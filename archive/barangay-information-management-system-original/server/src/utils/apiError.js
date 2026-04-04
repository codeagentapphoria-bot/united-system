export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Central error handling middleware
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Handle development vs production errors differently
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    // Operational errors we trust: send message to client
    if (err.isOperational) {
      sendErrorProd(err, res);
    } else {
      // Programming or other unknown errors: don't leak details
      logger.error('ERROR 💥', err);
      sendErrorProd(new ApiError(500, 'Something went wrong!'), res);
    }
  }
};

export const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

export const sendErrorProd = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
};
