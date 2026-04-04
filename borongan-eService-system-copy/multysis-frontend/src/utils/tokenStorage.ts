/**
 * Token Storage Utility (Deprecated)
 * 
 * This file is kept for backward compatibility during migration.
 * Tokens are now stored in HTTP-only cookies, which are automatically
 * sent with requests. These functions are no-ops.
 * 
 * @deprecated Use cookie-based authentication instead
 */

/**
 * Store authentication tokens (no-op - cookies handle this)
 * @deprecated
 */
export const setToken = (_authToken: string, _refresh?: string): void => {
  // No-op: Tokens are stored in HTTP-only cookies
};

/**
 * Get authentication token (no-op - cookies handle this)
 * @deprecated
 */
export const getToken = (): string | null => {
  // No-op: Tokens are in HTTP-only cookies, not accessible from JS
  return null;
};

/**
 * Get refresh token (no-op - cookies handle this)
 * @deprecated
 */
export const getRefreshToken = (): string | null => {
  // No-op: Tokens are in HTTP-only cookies, not accessible from JS
  return null;
};

/**
 * Remove authentication tokens (no-op - logout API clears cookies)
 * @deprecated
 */
export const removeToken = (): void => {
  // No-op: Logout API endpoint clears cookies
};

/**
 * Check if token exists (no-op - cookies handle this)
 * @deprecated
 */
export const hasToken = (): boolean => {
  // No-op: Cannot check HTTP-only cookies from JS
  return false;
};

