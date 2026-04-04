// Environment Setup Utility for External API Integration
import logger from './logger';

/**
 * Validates that required environment variables are set
 * @returns {Object} Validation result with status and missing variables
 */
export const validateEnvVariables = () => {
  const required = ["VITE_EXTERNAL_API_URL", "VITE_EXTERNAL_API_KEY"];

  const missing = required.filter((key) => !import.meta.env[key]);

  return {
    isValid: missing.length === 0,
    missing,
    warnings: [],
  };
};

/**
 * Gets the current environment configuration
 * @returns {Object} Environment configuration
 */
export const getEnvConfig = () => {
  return {
    EXTERNAL_API_URL:
      import.meta.env.VITE_EXTERNAL_API_URL || "http://3.104.0.203",
    EXTERNAL_API_KEY: import.meta.env.VITE_EXTERNAL_API_KEY || "",
    DEBUG_API: import.meta.env.VITE_DEBUG_API === "true",
    NODE_ENV: import.meta.env.MODE,
  };
};

/**
 * Logs environment configuration (without sensitive data)
 */
export const logEnvConfig = () => {
  const config = getEnvConfig();
  const validation = validateEnvVariables();

  logger.group("External API Environment Configuration", () => {
    logger.info("Environment:", config.NODE_ENV);
    logger.info("API URL:", config.EXTERNAL_API_URL);
    logger.info("API Key:", config.EXTERNAL_API_KEY ? "✅ Set" : "❌ Missing");
    logger.info("Debug Mode:", config.DEBUG_API ? "✅ Enabled" : "❌ Disabled");

    if (!validation.isValid) {
      logger.warn("⚠️ Missing environment variables:", validation.missing);
      logger.warn("Please add the missing variables to your .env file");
    }
  });

  return validation;
};

/**
 * Setup function to be called on app initialization
 */
export const setupExternalApi = () => {
  // Log configuration in development
  if (import.meta.env.DEV) {
    logEnvConfig();
  }

  // Validate environment variables
  const validation = validateEnvVariables();

  if (!validation.isValid) {
    logger.error("❌ External API configuration is incomplete", null, "Environment Setup");
    logger.error("Missing variables:", validation.missing, "Environment Setup");

    // In development, show helpful message
    if (import.meta.env.DEV) {
      logger.error(`
To fix this, add the following to your .env file:

VITE_EXTERNAL_API_URL=http://3.104.0.203
VITE_EXTERNAL_API_KEY=your_api_key_here

Optional:
VITE_DEBUG_API=true
      `, null, "Environment Setup");
    }
  }

  return validation;
};

/**
 * Creates a sample .env file content
 * @returns {string} Sample .env content
 */
export const getSampleEnvContent = () => {
  return `# External API Configuration
VITE_EXTERNAL_API_URL=http://3.104.0.203
VITE_EXTERNAL_API_KEY=your_api_key_here

# Optional: Enable debug logging
VITE_DEBUG_API=false

# Other BIMS Configuration
VITE_API_BASE_URL=http://localhost:5000/api
`;
};

/**
 * Checks if the external API is properly configured
 * @returns {boolean} True if properly configured
 */
export const isExternalApiConfigured = () => {
  return validateEnvVariables().isValid;
};

export default {
  validateEnvVariables,
  getEnvConfig,
  logEnvConfig,
  setupExternalApi,
  getSampleEnvContent,
  isExternalApiConfigured,
};
