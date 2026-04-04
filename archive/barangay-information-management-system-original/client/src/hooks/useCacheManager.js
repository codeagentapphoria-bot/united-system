import { useCallback } from 'react';
import { cacheManager } from '@/utils/cacheManager';

/**
 * Hook for managing frontend caches
 * Provides functions to clear caches when data operations occur
 */
export const useCacheManager = () => {
  const clearAllCaches = useCallback(() => {
    cacheManager.clearAll();
  }, []);

  const clearCachePattern = useCallback((pattern) => {
    cacheManager.clearPattern(pattern);
  }, []);

  const forceRefresh = useCallback(() => {
    cacheManager.forceRefresh();
  }, []);

  return {
    clearAllCaches,
    clearCachePattern,
    forceRefresh
  };
};
