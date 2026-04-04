import { toast } from "@/hooks/use-toast";
import logger from "@/utils/logger";

/**
 * Setup-specific error handler for municipality and barangay setup
 * Handles authorization errors gracefully during setup process
 */
export const handleSetupError = (error, context = "Setup") => {
  const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred";
  const status = error.response?.status;

  logger.error(`${context} Error:`, error);

  // Handle authorization errors specifically
  if (status === 401) {
    // Don't show error for auth failures during setup - they're often cosmetic
    logger.warn("Authorization error during setup (likely cosmetic):", errorMessage);
    return {
      shouldShowError: false,
      shouldRetry: true,
      message: "Authentication issue detected, but setup may still succeed"
    };
  }

  // Handle specific setup errors
  if (status === 409) {
    const conflictMessage = errorMessage.includes("municipality name") || errorMessage.includes("municipality_name")
      ? "A municipality with this name already exists"
      : errorMessage.includes("municipality code") || errorMessage.includes("municipality_code")
      ? "A municipality with this code already exists"
      : errorMessage.includes("barangay name") || errorMessage.includes("barangay_name")
      ? "A barangay with this name already exists"
      : "A duplicate entry was found";

    toast({
      title: "Duplicate Entry",
      description: conflictMessage,
      variant: "destructive",
    });

    return {
      shouldShowError: true,
      shouldRetry: false,
      message: conflictMessage
    };
  }

  // Handle validation errors
  if (status === 400) {
    toast({
      title: "Validation Error",
      description: errorMessage,
      variant: "destructive",
    });

    return {
      shouldShowError: true,
      shouldRetry: false,
      message: errorMessage
    };
  }

  // Handle not found errors
  if (status === 404) {
    toast({
      title: "Resource Not Found",
      description: "The resource you're trying to update was not found.",
      variant: "destructive",
    });

    return {
      shouldShowError: true,
      shouldRetry: false,
      message: "Resource not found"
    };
  }

  // Handle server errors
  if (status >= 500) {
    toast({
      title: "Server Error",
      description: "A server error occurred. Please try again later.",
      variant: "destructive",
    });

    return {
      shouldShowError: true,
      shouldRetry: true,
      message: "Server error"
    };
  }

  // Handle network errors
  if (!error.response) {
    toast({
      title: "Network Error",
      description: "Unable to connect to the server. Please check your connection.",
      variant: "destructive",
    });

    return {
      shouldShowError: true,
      shouldRetry: true,
      message: "Network error"
    };
  }

  // Handle other errors
  toast({
    title: `${context} Error`,
    description: errorMessage,
    variant: "destructive",
  });

  return {
    shouldShowError: true,
    shouldRetry: false,
    message: errorMessage
  };
};

/**
 * Check if setup was successful despite authorization errors
 */
export const checkSetupSuccess = async (checkSetupFunction, user, context = "Setup") => {
  try {
    const result = await checkSetupFunction();
    if (result.isSetup) {
      logger.info(`${context} completed successfully despite authorization errors`);
      return {
        success: true,
        data: result.data,
        message: `${context} completed successfully`
      };
    }
    return {
      success: false,
      data: null,
      message: `${context} not detected as complete`
    };
  } catch (error) {
    logger.warn(`Setup check failed:`, error);
    return {
      success: false,
      data: null,
      message: "Unable to verify setup completion"
    };
  }
};

/**
 * Handle setup completion with proper error handling
 */
export const handleSetupCompletion = async (
  checkSetupFunction,
  updateSetupStatusFunction,
  user,
  onSuccess,
  context = "Setup"
) => {
  try {
    // Check if setup is actually complete
    const setupResult = await checkSetupSuccess(checkSetupFunction, user, context);
    
    if (setupResult.success) {
      try {
        await updateSetupStatusFunction(user);
        logger.info(`${context} status updated successfully`);
      } catch (updateError) {
        logger.warn(`Setup status update failed:`, updateError);
        // Don't fail the entire setup for status update errors
      }

      toast({
        title: `${context} Successful`,
        description: `${context} completed successfully.`,
      });

      if (onSuccess) {
        onSuccess();
      }

      return { success: true, message: `${context} completed successfully` };
    } else {
      toast({
        title: `${context} Incomplete`,
        description: `${context} was not detected as complete. Please try again.`,
        variant: "warning",
      });

      return { success: false, message: `${context} not complete` };
    }
  } catch (error) {
    logger.error(`${context} completion check failed:`, error);
    
    toast({
      title: `${context} Verification Failed`,
      description: `Unable to verify ${context.toLowerCase()} completion. Please check manually.`,
      variant: "warning",
    });

    return { success: false, message: "Verification failed" };
  }
};
