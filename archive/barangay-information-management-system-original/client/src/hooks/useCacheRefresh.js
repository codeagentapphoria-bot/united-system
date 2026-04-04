import { useEffect } from 'react';
import { clearCacheOnRefresh, clearCachePatternsOnRefresh } from '@/utils/cacheRefresh';
import useAuth from '@/hooks/useAuth';

/**
 * Hook to handle cache clearing on application refresh
 * Automatically clears Redis cache when the app starts up
 */
export const useCacheRefresh = (options = {}) => {
  const { user } = useAuth();
  const { 
    enabled = true,
    patterns = [],
    clearOnAuth = false 
  } = options;

  useEffect(() => {
    // Only clear cache if enabled and user is authenticated
    if (!enabled || !user) {
      return;
    }

    // Clear cache when component mounts (app refresh)
    const handleRefresh = async () => {
      try {
        if (patterns.length > 0) {
          // Clear specific patterns
          await clearCachePatternsOnRefresh(patterns);
        } else {
          // Clear all cache
          await clearCacheOnRefresh();
        }
      } catch (error) {
        // Error clearing cache - continue silently
      }
    };

    handleRefresh();
  }, [enabled, user, patterns, clearOnAuth]);

  // Return functions for manual cache clearing
  return {
    clearCacheOnRefresh,
    clearCachePatternsOnRefresh
  };
};

export default useCacheRefresh;
