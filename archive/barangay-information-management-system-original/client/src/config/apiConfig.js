// API Configuration for BIMS External API Integration
const API_CONFIG = {
  // Base URL for external API
  BASE_URL: import.meta.env.VITE_EXTERNAL_API_URL || "http://3.104.0.203",

  // API Key from environment variables
  API_KEY: import.meta.env.VITE_EXTERNAL_API_KEY || "",

  // Default headers for all API requests
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },

  // API endpoints
  ENDPOINTS: {
    CITIES: "/api/cities",
    BUILDINGS: "/api/buildings",
    LANDMARKS: "/api/landmarks",
    LANDMARKS_STATISTICS: "/api/landmarks/statistics",
    BARANGAYS: "/api/barangays",
    MUNICIPALITIES: "/api/municipalities",
    PROVINCES: "/api/provinces",
  },

  // Request timeout in milliseconds
  TIMEOUT: 30000,

  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY: 1000, // 1 second
  },
};

// Helper function to get headers with API key
export const getApiHeaders = (customHeaders = {}) => {
  return {
    ...API_CONFIG.DEFAULT_HEADERS,
    "x-api-key": API_CONFIG.API_KEY,
    ...customHeaders,
  };
};

// Helper function to build full URL
export const buildApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to handle API errors
export const handleApiError = (error, context = "API request") => {
  if (process.env.NODE_ENV === 'development') {
    if (process.env.NODE_ENV === 'development') {
      console.error(`${context} failed:`, error);
    }
  }

  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    return {
      success: false,
      error: {
        status,
        message: data?.message || `HTTP ${status} error`,
        data: data,
      },
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      success: false,
      error: {
        status: 0,
        message: "Network error - no response received",
        data: null,
      },
    };
  } else {
    // Something else happened
    return {
      success: false,
      error: {
        status: 0,
        message: error.message || "Unknown error occurred",
        data: null,
      },
    };
  }
};

// Helper function to retry failed requests
export const retryRequest = async (
  requestFn,
  maxAttempts = API_CONFIG.RETRY.MAX_ATTEMPTS
) => {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) =>
        setTimeout(resolve, API_CONFIG.RETRY.DELAY * attempt)
      );
    }
  }

  throw lastError;
};

export default API_CONFIG;
