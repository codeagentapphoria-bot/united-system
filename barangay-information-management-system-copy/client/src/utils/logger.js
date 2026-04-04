/**
 * Centralized Logger Utility
 * Provides consistent logging across the application with environment-based configuration
 */

const isDevelopment = import.meta.env.DEV;
const isDebugEnabled = import.meta.env.VITE_ENABLE_DEBUG === 'true';

class Logger {
  constructor() {
    this.isEnabled = isDevelopment || isDebugEnabled;
  }

  // Info logging - only in development/debug mode
  info(message, ...args) {
    if (this.isEnabled) {}
  }

  // Debug logging - only in debug mode
  debug(message, ...args) {
    if (isDebugEnabled) {}
  }

  // Warning logging - only in development/debug mode
  warn(message, ...args) {
    if (this.isEnabled) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[WARN] ${message}`, ...args);
      }
    }
  }

  // Error logging - always enabled in development, optional in production
  error(message, error = null, context = '') {
    const shouldLogErrors = this.isEnabled || import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true';

    if (shouldLogErrors) {
      const timestamp = new Date().toISOString();
      const errorMessage = `[ERROR] ${timestamp} - ${context ? `[${context}] ` : ''}${message}`;

      if (error) {
        if (process.env.NODE_ENV === 'development') {
  console.error(errorMessage, error);
}
      } else {
        if (process.env.NODE_ENV === 'development') {
  console.error(errorMessage);
}
      }
    }

    // Always report errors to external service in production
    if (!isDevelopment && error) {
      this.reportError(message, error, context);
    }
  }

  // Success logging - only in development/debug mode
  success(message, ...args) {
    if (this.isEnabled) {}
  }

  // Group logging for better organization
  group(label, callback) {
    if (this.isEnabled) {
      console.group(`[GROUP] ${label}`);
      try {
        callback();
      } finally {
        console.groupEnd();
      }
    } else {
      // Still execute callback even if logging is disabled
      callback();
    }
  }

  // Report error to external service (placeholder for production)
  reportError(message, error, context) {
    // TODO: Implement error reporting service (e.g., Sentry, LogRocket)
    // This is where you would send errors to your error tracking service
    if (import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true') {
      // Example: Sentry.captureException(error, { extra: { message, context } });
    }
  }

  // Clean up any sensitive data from error objects
  sanitizeError(error) {
    if (error && typeof error === 'object') {
      const sanitized = { ...error };
      
      // Remove sensitive fields
      const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
      sensitiveFields.forEach(field => {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      });
      
      return sanitized;
    }
    return error;
  }
}

// Create singleton instance
const logger = new Logger();

// Export individual methods for convenience
export const logInfo = (message, ...args) => logger.info(message, ...args);
export const logDebug = (message, ...args) => logger.debug(message, ...args);
export const logWarn = (message, ...args) => logger.warn(message, ...args);
export const logError = (message, error, context) => logger.error(message, error, context);
export const logSuccess = (message, ...args) => logger.success(message, ...args);
export const logGroup = (label, callback) => logger.group(label, callback);

// Export the logger instance
export default logger;
