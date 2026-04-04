import { useState, useCallback } from 'react';
import { useAutoRefresh } from './useAutoRefresh';

/**
 * Enhanced form submission hook with automatic cache refresh
 * @param {Function} submitFunction - The function to execute on form submission
 * @param {Object} options - Configuration options
 * @returns {Object} - Object containing submission state and handlers
 */
const useFormSubmission = (submitFunction, options = {}) => {
  const {
    onSuccess,
    onError,
    loadingText = "Submitting...",
    successMessage,
    errorMessage,
    showToast = true,
    autoRefresh = true,
    entityType,
  } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Use auto refresh hook
  const { registerRefreshCallback, handleSubmitWithRefresh } = useAutoRefresh({
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    showToast,
    autoRefresh,
  });

  const handleSubmit = useCallback(async (data) => {
    if (isSubmitting) {
      return; // Prevent double submission
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Use enhanced submit with auto refresh
      const result = await handleSubmitWithRefresh(submitFunction, data);
      
      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      setError(err);
      
      if (onError) {
        onError(err);
      }

      if (errorMessage && showToast) {
        // You can import and use your toast here
        if (process.env.NODE_ENV === 'development') {
          console.error('Error:', errorMessage);
        }
      }

      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [submitFunction, isSubmitting, onSuccess, onError, successMessage, errorMessage, showToast, handleSubmitWithRefresh]);

  return {
    isSubmitting,
    error,
    handleSubmit,
    resetError: () => setError(null),
    registerRefreshCallback,
  };
};

export default useFormSubmission;
