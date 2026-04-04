import { useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Custom hook for automatic data refresh after CRUD operations
 * Provides automatic cache invalidation and data refetching
 */
export const useAutoRefresh = (options = {}) => {
  const {
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    showToast = true,
    autoRefresh = true,
    refreshDelay = 100, // Small delay to ensure backend cache is cleared
  } = options;

  const toast = useToast();
  const refreshCallbacks = useRef(new Set());

  // Register a refresh callback
  const registerRefreshCallback = useCallback((callback) => {
    refreshCallbacks.current.add(callback);
    return () => refreshCallbacks.current.delete(callback);
  }, []);

  // Execute all registered refresh callbacks
  const executeRefresh = useCallback(async () => {
    if (!autoRefresh) return;
    
    try {
      const promises = Array.from(refreshCallbacks.current).map(callback => 
        Promise.resolve(callback()).catch(error => {
          console.warn('Refresh callback error:', error);
        })
      );
      
      await Promise.allSettled(promises);
      
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
      console.error('Auto refresh error:', error);
      if (onError) {
        onError(error);
      }
    }
  }, [autoRefresh, showToast, successMessage, onSuccess, onError, toast]);

  // Enhanced form submission with auto refresh
  const handleSubmitWithRefresh = useCallback(async (submitFunction, data) => {
    try {
      const result = await submitFunction(data);
      
      // Small delay to ensure backend cache is cleared
      setTimeout(() => {
        executeRefresh();
      }, refreshDelay);
      
      return result;
    } catch (error) {
      if (showToast && errorMessage) {
        toast({
          title: errorMessage,
          variant: "destructive",
        });
      }
      throw error;
    }
  }, [executeRefresh, refreshDelay, showToast, errorMessage, toast]);

  return {
    registerRefreshCallback,
    executeRefresh,
    handleSubmitWithRefresh,
  };
};

/**
 * Hook for managing entity-specific auto refresh
 * Automatically handles cache invalidation for specific entities
 */
export const useEntityAutoRefresh = (entityType, options = {}) => {
  const {
    onSuccess,
    onError,
    showToast = true,
  } = options;

  const toast = useToast();
  const refreshCallbacks = useRef(new Set());

  const registerRefreshCallback = useCallback((callback) => {
    refreshCallbacks.current.add(callback);
    return () => refreshCallbacks.current.delete(callback);
  }, []);

  const executeRefresh = useCallback(async () => {
    try {
      const promises = Array.from(refreshCallbacks.current).map(callback => 
        Promise.resolve(callback()).catch(error => {
          console.warn(`${entityType} refresh callback error:`, error);
        })
      );
      
      await Promise.allSettled(promises);
      
      if (showToast) {
        toast({
          title: `${entityType} data refreshed successfully`,
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
    }
  }, [entityType, showToast, onSuccess, onError, toast]);

  const handleCRUDOperation = useCallback(async (operation, data) => {
    try {
      const result = await operation(data);
      
      // Execute refresh after successful operation
      setTimeout(() => {
        executeRefresh();
      }, 100);
      
      return result;
    } catch (error) {
      if (showToast) {
        toast({
          title: `Failed to ${operation.name || 'perform operation'}`,
          variant: "destructive",
        });
      }
      throw error;
    }
  }, [executeRefresh, showToast, toast]);

  return {
    registerRefreshCallback,
    executeRefresh,
    handleCRUDOperation,
  };
};

/**
 * Hook for managing multiple entity refreshes
 * Useful for operations that affect multiple entities
 */
export const useMultiEntityRefresh = (entityTypes = [], options = {}) => {
  const {
    onSuccess,
    onError,
    showToast = true,
  } = options;

  const toast = useToast();
  const refreshCallbacks = useRef(new Map());

  const registerRefreshCallback = useCallback((entityType, callback) => {
    if (!refreshCallbacks.current.has(entityType)) {
      refreshCallbacks.current.set(entityType, new Set());
    }
    refreshCallbacks.current.get(entityType).add(callback);
    
    return () => {
      const callbacks = refreshCallbacks.current.get(entityType);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }, []);

  const executeRefresh = useCallback(async (targetEntities = entityTypes) => {
    try {
      const promises = [];
      
      for (const entityType of targetEntities) {
        const callbacks = refreshCallbacks.current.get(entityType);
        if (callbacks) {
          const entityPromises = Array.from(callbacks).map(callback => 
            Promise.resolve(callback()).catch(error => {
              console.warn(`${entityType} refresh callback error:`, error);
            })
          );
          promises.push(...entityPromises);
        }
      }
      
      await Promise.allSettled(promises);
      
      if (showToast) {
        toast({
          title: `Data refreshed for: ${targetEntities.join(', ')}`,
          variant: "default",
        });
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Multi-entity auto refresh error:', error);
      if (onError) {
        onError(error);
      }
    }
  }, [entityTypes, showToast, onSuccess, onError, toast]);

  return {
    registerRefreshCallback,
    executeRefresh,
  };
};
