/**
 * Centralized Error Handler
 * Provides consistent error handling and user feedback across the application
 */

import { toast } from '@/hooks/use-toast';
import logger from './logger';

// Error types for better categorization
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  SERVER: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

// Error messages for different scenarios
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: {
    title: 'Connection Error',
    description: 'Unable to connect to the server. Please check your internet connection and try again.',
  },
  [ERROR_TYPES.VALIDATION]: {
    title: 'Invalid Data',
    description: 'Please check your input and try again.',
  },
  [ERROR_TYPES.AUTHENTICATION]: {
    title: 'Authentication Error',
    description: 'Please log in again to continue.',
  },
  [ERROR_TYPES.AUTHORIZATION]: {
    title: 'Access Denied',
    description: 'You do not have permission to perform this action.',
  },
  [ERROR_TYPES.NOT_FOUND]: {
    title: 'Not Found',
    description: 'The requested resource was not found.',
  },
  [ERROR_TYPES.SERVER]: {
    title: 'Server Error',
    description: 'Something went wrong on our end. Please try again later.',
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: 'Unexpected Error',
    description: 'An unexpected error occurred. Please try again.',
  },
};

/**
 * Determine error type based on error object
 */
function getErrorType(error) {
  if (!error) return ERROR_TYPES.UNKNOWN;

  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
    return ERROR_TYPES.NETWORK;
  }

  // HTTP status code based errors
  if (error.response?.status) {
    const status = error.response.status;
    
    if (status === 400) return ERROR_TYPES.VALIDATION;
    if (status === 401) return ERROR_TYPES.AUTHENTICATION;
    if (status === 403) return ERROR_TYPES.AUTHORIZATION;
    if (status === 404) return ERROR_TYPES.NOT_FOUND;
    if (status >= 500) return ERROR_TYPES.SERVER;
  }

  // Validation errors
  if (error.name === 'ValidationError' || error.message?.includes('validation')) {
    return ERROR_TYPES.VALIDATION;
  }

  return ERROR_TYPES.UNKNOWN;
}

/**
 * Extract user-friendly error message
 */
function getErrorMessage(error, context = '') {
  const errorType = getErrorType(error);
  const defaultMessage = ERROR_MESSAGES[errorType];

  // Try to get specific error message from response
  let specificMessage = '';
  
  if (error.response?.data?.message) {
    specificMessage = error.response.data.message;
  } else if (error.message) {
    specificMessage = error.message;
  }

  // Combine context with specific message
  const fullMessage = context ? `${context}: ${specificMessage}` : specificMessage;

  return {
    title: defaultMessage.title,
    description: specificMessage || defaultMessage.description,
    fullMessage,
    type: errorType,
  };
}

/**
 * Handle error with logging and user notification
 */
export function handleError(error, context = '', showToast = true) {
  const errorInfo = getErrorMessage(error, context);
  
  // Log the error
  logger.error(errorInfo.fullMessage, error, context);
  
  // Show toast notification if requested
  if (showToast) {
    toast({
      title: errorInfo.title,
      description: errorInfo.description,
      variant: 'destructive',
    });
  }

  return errorInfo;
}

/**
 * Handle error silently (only logging, no user notification)
 */
export function handleErrorSilently(error, context = '') {
  return handleError(error, context, false);
}

/**
 * Handle async operations with error handling
 */
export async function handleAsync(operation, context = '', showToast = true) {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context, showToast);
    throw error; // Re-throw for further handling if needed
  }
}

/**
 * Handle async operations that return data
 */
export async function handleAsyncData(operation, context = '', defaultValue = null) {
  try {
    return await operation();
  } catch (error) {
    handleError(error, context, true);
    return defaultValue;
  }
}

/**
 * Create a safe async function wrapper
 */
export function createSafeAsync(operation, context = '') {
  return async (...args) => {
    try {
      return await operation(...args);
    } catch (error) {
      handleError(error, context, true);
      throw error;
    }
  };
}

/**
 * Handle form submission errors
 */
export function handleFormError(error, formContext = '') {
  const errorInfo = getErrorMessage(error, formContext);
  
  // Log the error
  logger.error(errorInfo.fullMessage, error, 'Form Submission');
  
  // Show toast with form-specific message
  toast({
    title: 'Form Submission Failed',
    description: errorInfo.description,
    variant: 'destructive',
  });

  return errorInfo;
}

/**
 * Handle API errors with retry logic
 */
export async function handleApiError(apiCall, context = '', maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain error types
      const errorType = getErrorType(error);
      if ([ERROR_TYPES.AUTHENTICATION, ERROR_TYPES.AUTHORIZATION, ERROR_TYPES.VALIDATION].includes(errorType)) {
        break;
      }
      
      // Log retry attempt
      if (attempt < maxRetries) {
        logger.warn(`API call failed (attempt ${attempt}/${maxRetries}), retrying...`, error, context);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
    }
  }
  
  // All retries failed
  handleError(lastError, context, true);
  throw lastError;
}

export default {
  handleError,
  handleErrorSilently,
  handleAsync,
  handleAsyncData,
  createSafeAsync,
  handleFormError,
  handleApiError,
  ERROR_TYPES,
};
