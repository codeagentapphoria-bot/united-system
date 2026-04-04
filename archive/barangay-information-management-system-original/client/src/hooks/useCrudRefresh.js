import { useState, useCallback } from 'react';
import { useCacheManager } from '@/hooks/useCacheManager';
import { toast } from '@/hooks/use-toast';

/**
 * Hook to handle page refresh after CRUD operations
 * Provides options for automatic refresh, cache clearing, and user feedback
 */
export const useCrudRefresh = (options = {}) => {
  const { clearAllCaches } = useCacheManager();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const {
    autoRefresh = false, // Changed default to false to prevent double refresh
    clearCache = true,
    showToast = true,
    refreshDelay = 1000, // 1 second delay
    toastDuration = 3000
  } = options;

  /**
   * Handle refresh after successful CRUD operation
   */
  const handleCrudSuccess = useCallback(async (operation, data = {}) => {
    try {
      setIsRefreshing(true);

      // Show success toast
      if (showToast) {
        const operationMessages = {
          create: 'Created successfully',
          update: 'Updated successfully', 
          delete: 'Deleted successfully',
          import: 'Imported successfully',
          export: 'Exported successfully'
        };

        toast({
          title: `${operationMessages[operation] || 'Operation completed'}`,
          description: data.message || 'Data has been updated',
          duration: toastDuration
        });
      }

      // Clear caches if enabled
      if (clearCache) {
        clearAllCaches();
      }

      // Auto refresh page if enabled
      if (autoRefresh) {
        setTimeout(() => {
          window.location.reload();
        }, refreshDelay);
      }

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error('Error during CRUD refresh:', error);
}
      toast({
        title: 'Refresh Error',
        description: 'Failed to refresh data. Please reload the page manually.',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [autoRefresh, clearCache, showToast, refreshDelay, toastDuration, clearAllCaches]);

  /**
   * Handle refresh after failed CRUD operation
   */
  const handleCrudError = useCallback((error, operation = 'operation') => {
    toast({
      title: `${operation.charAt(0).toUpperCase() + operation.slice(1)} Failed`,
      description: error.response?.data?.message || error.message || 'An error occurred',
      variant: 'destructive'
    });
  }, []);

  /**
   * Manual refresh function
   */
  const manualRefresh = useCallback(() => {
    if (clearCache) {
      clearAllCaches();
    }
    window.location.reload();
  }, [clearCache, clearAllCaches]);

  /**
   * Soft refresh - clear cache and refetch data without page reload
   */
  const softRefresh = useCallback(() => {
    if (clearCache) {
      clearAllCaches();
    }
    
    toast({
      title: 'Cache Cleared',
      description: 'Data cache has been refreshed',
      duration: 2000
    });
  }, [clearCache, clearAllCaches]);

  return {
    handleCrudSuccess,
    handleCrudError,
    manualRefresh,
    softRefresh,
    isRefreshing
  };
};

export default useCrudRefresh;
