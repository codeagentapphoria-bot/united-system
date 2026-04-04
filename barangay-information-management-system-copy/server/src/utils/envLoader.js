import fs from 'fs';
import path from 'path';

/**
 * Load environment variables from .env file with proper encoding handling
 * This function handles UTF-16 encoded .env files and normalizes line endings
 */
export const loadEnvConfig = () => {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    console.warn(`Warning: .env file not found at ${envPath}`);
    return;
  }
  
  try {
    // Read and clean the .env file content
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Clean up the content - remove null characters and normalize line endings
    envContent = envContent.replace(/\0/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    const envLines = envContent.split('\n');
    let loadedCount = 0;
    
    envLines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmedLine.substring(0, equalIndex).trim();
          const value = trimmedLine.substring(equalIndex + 1).trim();
          // Don't override variables already set in the environment
          // (allows PG_DATABASE=test node server.js to work correctly)
          if (process.env[key] === undefined) {
            process.env[key] = value;
          }
          loadedCount++;
        }
      }
    });
    
    console.log(`Loaded ${loadedCount} environment variables from .env file`);
  } catch (error) {
    console.error('Error loading .env file:', error.message);
    throw error;
  }
};

/**
 * Get environment variable with fallback
 * @param {string} key - Environment variable key
 * @param {any} defaultValue - Default value if not found
 * @returns {any} Environment variable value or default
 */
export const getEnv = (key, defaultValue = null) => {
  return process.env[key] || defaultValue;
};

/**
 * Get required environment variable (throws error if not found)
 * @param {string} key - Environment variable key
 * @returns {any} Environment variable value
 */
export const getRequiredEnv = (key) => {
  const value = process.env[key];
  if (value === undefined || value === null) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
};
