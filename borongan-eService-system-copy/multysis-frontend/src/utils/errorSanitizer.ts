/**
 * Error Sanitization Utility
 * 
 * Sanitizes error messages to prevent information disclosure
 * Shows user-friendly messages instead of technical details
 */

// SanitizedError interface removed - not used

/**
 * Sanitize error message for user display
 * Removes technical details and shows user-friendly messages
 */
export const sanitizeErrorMessage = (error: any): string => {
  // If error is already a string, check if it's user-friendly
  if (typeof error === 'string') {
    // Check if it's a user-friendly message (doesn't contain technical details)
    if (
      error.includes('Invalid credentials') ||
      error.includes('Access denied') ||
      error.includes('Not authenticated') ||
      error.includes('already exists') ||
      error.includes('not found') ||
      error.includes('required') ||
      error.includes('must be') ||
      error.includes('Please')
    ) {
      return error;
    }
    // Generic message for technical errors
    return 'An error occurred. Please try again.';
  }

  // Handle error objects
  if (error?.response?.data?.message) {
    const apiMessage = error.response.data.message;
    
    // Whitelist of safe API error messages
    const safeMessages = [
      'Invalid credentials',
      'Access denied',
      'Authentication required',
      'Not authenticated',
      'Record not found',
      'Validation error',
      'already exists',
      'required',
      'must be',
    ];
    
    // Check if message is in safe list
    if (safeMessages.some(safe => apiMessage.toLowerCase().includes(safe.toLowerCase()))) {
      return apiMessage;
    }
    
    // For 4xx errors, show generic message
    if (error.response.status >= 400 && error.response.status < 500) {
      return 'Invalid request. Please check your input and try again.';
    }
  }

  // For 5xx errors or unknown errors, always show generic message
  return 'An error occurred. Please try again later.';
};

/**
 * Get detailed error for logging (development only)
 */
export const getDetailedError = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'Unknown error';
};


