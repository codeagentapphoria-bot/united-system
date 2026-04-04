/**
 * Parse time string to milliseconds
 * Supports formats: 5m, 10m, 15m (minutes), 1h, 6h (hours), 1d, 30d (days)
 * @param timeString - Time string like "10m", "30d", "6h"
 * @returns Time in milliseconds
 */
export const parseTimeString = (timeString: string): number => {
  const match = timeString.match(/^(\d+)([mhd])$/i);
  if (!match) {
    throw new Error(
      `Invalid time format: ${timeString}. Expected format: 5m, 10m, 1h, 6h, 1d, 30d`
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'm':
      return value * 60 * 1000; // minutes to milliseconds
    case 'h':
      return value * 60 * 60 * 1000; // hours to milliseconds
    case 'd':
      return value * 24 * 60 * 60 * 1000; // days to milliseconds
    default:
      throw new Error(`Invalid time unit: ${unit}. Expected: m (minutes), h (hours), d (days)`);
  }
};

/**
 * Parse time string to seconds (for JWT expiration)
 * @param timeString - Time string like "10m", "30d", "6h"
 * @returns Time in seconds
 */
export const parseTimeStringToSeconds = (timeString: string): string => {
  const match = timeString.match(/^(\d+)([mhd])$/i);
  if (!match) {
    throw new Error(
      `Invalid time format: ${timeString}. Expected format: 5m, 10m, 1h, 6h, 1d, 30d`
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'm':
      return `${value}m`; // JWT accepts minutes directly
    case 'h':
      return `${value}h`; // JWT accepts hours directly
    case 'd':
      return `${value}d`; // JWT accepts days directly
    default:
      throw new Error(`Invalid time unit: ${unit}. Expected: m (minutes), h (hours), d (days)`);
  }
};
