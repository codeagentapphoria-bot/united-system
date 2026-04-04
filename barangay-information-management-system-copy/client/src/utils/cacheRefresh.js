// Cache Refresh Utility
// Handles clearing Redis cache when the application is refreshed

import api from '@/utils/api';

// Track if we've already cleared cache for this session
let cacheClearedThisSession = false;

/**
 * Clear Redis cache on application startup/refresh
 * This ensures fresh data is loaded after any refresh
 */
export const clearCacheOnRefresh = async () => {
  // Only clear cache once per session to avoid unnecessary API calls
  if (cacheClearedThisSession) {
    return;
  }

  try {
    // Call the backend to clear Redis cache
    await api.delete('/redis/cache');

    // Mark as cleared for this session
    cacheClearedThisSession = true;
  } catch (error) {
    // Don't throw error - app should still work even if cache clear fails
  }
};

/**
 * Clear cache patterns on refresh (more targeted approach)
 * @param {string[]} patterns - Cache patterns to clear
 */
export const clearCachePatternsOnRefresh = async (patterns = []) => {
  if (cacheClearedThisSession) {
    return;
  }

  try {
    // Call the backend to clear specific cache patterns
    await api.post('/redis/clear-pattern', { patterns });

    // Mark as cleared for this session
    cacheClearedThisSession = true;
  } catch (error) {
    // Error handling - cache clear failure should not break the app
  }
};

/**
 * Reset the session flag (useful for testing or manual refresh)
 */
export const resetCacheSession = () => {
  cacheClearedThisSession = false;
};

/**
 * Check if cache has been cleared this session
 */
export const isCacheClearedThisSession = () => {
  return cacheClearedThisSession;
};

// Export default function for easy import
export default clearCacheOnRefresh;
