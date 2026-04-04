/**
 * Environment-specific logging utility
 * 
 * Only logs in development mode to prevent information disclosure in production
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  error: (message: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.error(message, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.warn(message, ...args);
    }
  },
  
  info: (message: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.info(message, ...args);
    }
  },
  
  log: (message: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.log(message, ...args);
    }
  },
  
  debug: (message: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.debug(message, ...args);
    }
  },
};


