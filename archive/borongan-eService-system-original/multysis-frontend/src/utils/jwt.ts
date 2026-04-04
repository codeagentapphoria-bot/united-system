/**
 * JWT Utility Functions
 * 
 * Helper functions to decode and check JWT tokens
 */

/**
 * Decode JWT token without verification
 * Note: This only decodes the payload, it does NOT verify the signature
 * For production use, tokens should be verified on the backend
 */
export const decodeJWT = (token: string): any | null => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      return null;
    }
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

/**
 * Check if JWT token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return true; // If we can't decode or no exp, consider expired
  }
  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  return Date.now() >= expirationTime;
};

/**
 * Check if JWT token is about to expire (within threshold)
 * @param token - JWT token string
 * @param thresholdMinutes - Minutes before expiration to consider "about to expire" (default: 5)
 */
export const isTokenAboutToExpire = (token: string, thresholdMinutes: number = 5): boolean => {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return true; // If we can't decode, consider it needs refresh
  }
  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const threshold = thresholdMinutes * 60 * 1000; // Convert minutes to milliseconds
  return Date.now() >= (expirationTime - threshold);
};

/**
 * Get token expiration time in milliseconds
 */
export const getTokenExpiration = (token: string): number | null => {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return null;
  }
  return decoded.exp * 1000; // Convert to milliseconds
};


