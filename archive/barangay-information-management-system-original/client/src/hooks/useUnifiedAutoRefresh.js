import { useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Unified Auto Refresh Hook
 * Provides consistent automatic cache refresh for all CRUD operations
 * This hook ensures that Redis cache is automatically refreshed after any data mutation
 */
export const useUnifiedAutoRefresh = (options = {}) => {
  const {
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    showToast = true,
    autoRefresh = true,
    refreshDelay = 100, // Small delay to ensure backend cache is cleared
    entityType = 'data',
  } = options;

  const { toast } = useToast();
  const refreshCallbacks = useRef(new Set());
  const isRefreshing = useRef(false);

  // Register a refresh callback
  const registerRefreshCallback = useCallback((callback) => {
    if (typeof callback !== 'function') {
      console.warn('useUnifiedAutoRefresh: registerRefreshCallback expects a function');
      return () => {};
    }
    
    refreshCallbacks.current.add(callback);
    return () => {
      refreshCallbacks.current.delete(callback);
    };
  }, [entityType]);

  // Execute all registered refresh callbacks
  const executeRefresh = useCallback(async () => {
    if (!autoRefresh || isRefreshing.current) {
      console.log(`⏭️ Skipping auto refresh for ${entityType} - autoRefresh: ${autoRefresh}, isRefreshing: ${isRefreshing.current}`);
      return;
    }
    
    console.log(`🔄 Executing auto refresh for ${entityType}...`);
    console.log(`📊 Total registered callbacks: ${refreshCallbacks.current.size}`);
    isRefreshing.current = true;
    
    try {
      const callbacks = Array.from(refreshCallbacks.current);
      console.log(`🔧 Executing ${callbacks.length} refresh callbacks`);
      
      const promises = callbacks.map((callback, index) => 
        Promise.resolve(callback()).then(() => {
          console.log(`✅ Callback ${index + 1} completed successfully`);
        }).catch(error => {
          console.warn(`${entityType} refresh callback ${index + 1} error:`, error);
        })
      );
      
      await Promise.allSettled(promises);
      console.log(`✅ Auto refresh completed for ${entityType}`);
      
      if (showToast && successMessage) {
        toast({
          title: successMessage,
          variant: "default",
        });
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(`${entityType} auto refresh error:`, error);
      if (onError) {
        onError(error);
      }
    } finally {
      isRefreshing.current = false;
    }
  }, [autoRefresh, entityType, showToast, successMessage, onSuccess, onError, toast]);

  // Handle CRUD operations with automatic refresh
  const handleCRUDOperation = useCallback(async (operation, data) => {
    try {
      const result = await operation(data);
      
      // Execute refresh after a small delay to ensure backend cache is cleared
      setTimeout(() => {
        executeRefresh();
      }, refreshDelay);
      
      return result;
    } catch (error) {
      if (showToast) {
        toast({
          title: errorMessage || 'Failed to perform operation',
          variant: "destructive",
        });
      }
      throw error;
    }
  }, [executeRefresh, refreshDelay, showToast, errorMessage, toast]);

  return {
    registerRefreshCallback,
    executeRefresh,
    handleCRUDOperation,
    isRefreshing: isRefreshing.current,
  };
};

export default useUnifiedAutoRefresh;