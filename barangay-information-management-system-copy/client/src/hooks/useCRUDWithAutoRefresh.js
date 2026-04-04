import { useState, useCallback, useEffect } from 'react';
import { useUnifiedAutoRefresh } from './useUnifiedAutoRefresh';
import { useToast } from '@/hooks/use-toast';

/**
 * Enhanced CRUD hook with automatic cache refresh
 * Provides consistent CRUD operations with automatic Redis cache refresh
 * This ensures that data is always fresh after any mutation operation
 */
export const useCRUDWithAutoRefresh = (entityType, options = {}) => {
  const {
    fetchFunction,
    createFunction,
    updateFunction,
    deleteFunction,
    onSuccess,
    onError,
    showToast = true,
    autoRefresh = true,
    refreshDelay = 100,
    successMessages = {
      create: `${entityType} created successfully!`,
      update: `${entityType} updated successfully!`,
      delete: `${entityType} deleted successfully!`,
    },
    errorMessages = {
      create: `Failed to create ${entityType}`,
      update: `Failed to update ${entityType}`,
      delete: `Failed to delete ${entityType}`,
      fetch: `Failed to fetch ${entityType} data`,
    },
  } = options;

  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use unified auto refresh
  const { registerRefreshCallback, handleCRUDOperation, triggerRefresh } = useUnifiedAutoRefresh({
    onSuccess,
    onError,
    successMessage: `${entityType} operation completed successfully!`,
    errorMessage: `Failed to perform ${entityType} operation`,
    showToast,
    autoRefresh,
    refreshDelay,
    entityType,
  });

  // Fetch data function
  const fetchData = useCallback(async (params = {}) => {
    if (!fetchFunction) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchFunction(params);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      if (showToast) {
        toast({
          title: errorMessages.fetch,
          description: err.message || 'An error occurred while fetching data',
          variant: "destructive",
        });
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, showToast, errorMessages.fetch, toast]);

  // Create function
  const create = useCallback(async (data) => {
    if (!createFunction) {
      throw new Error('Create function not provided');
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await handleCRUDOperation(createFunction, data);
      
      if (showToast) {
        toast({
          title: successMessages.create,
          variant: "default",
        });
      }
      
      return result;
    } catch (err) {
      setError(err);
      if (showToast) {
        toast({
          title: errorMessages.create,
          description: err.message || 'An error occurred while creating',
          variant: "destructive",
        });
      }
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [createFunction, handleCRUDOperation, showToast, successMessages.create, errorMessages.create, toast]);

  // Update function
  const update = useCallback(async (id, data) => {
    if (!updateFunction) {
      throw new Error('Update function not provided');
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await handleCRUDOperation(updateFunction, { id, ...data });
      
      if (showToast) {
        toast({
          title: successMessages.update,
          variant: "default",
        });
      }
      
      return result;
    } catch (err) {
      setError(err);
      if (showToast) {
        toast({
          title: errorMessages.update,
          description: err.message || 'An error occurred while updating',
          variant: "destructive",
        });
      }
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [updateFunction, handleCRUDOperation, showToast, successMessages.update, errorMessages.update, toast]);

  // Delete function
  const remove = useCallback(async (id) => {
    if (!deleteFunction) {
      throw new Error('Delete function not provided');
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await handleCRUDOperation(deleteFunction, { id });
      
      if (showToast) {
        toast({
          title: successMessages.delete,
          variant: "default",
        });
      }
      
      return result;
    } catch (err) {
      setError(err);
      if (showToast) {
        toast({
          title: errorMessages.delete,
          description: err.message || 'An error occurred while deleting',
          variant: "destructive",
        });
      }
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [deleteFunction, handleCRUDOperation, showToast, successMessages.delete, errorMessages.delete, toast]);

  // Register fetch function for auto refresh
  useEffect(() => {
    if (fetchFunction) {
      const unregister = registerRefreshCallback(fetchData);
      return unregister;
    }
  }, [registerRefreshCallback, fetchData, fetchFunction]);

  // Manual refresh
  const refresh = useCallback(() => {
    triggerRefresh();
  }, [triggerRefresh]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Data
    data,
    loading,
    error,
    isSubmitting,
    
    // CRUD operations
    fetchData,
    create,
    update,
    delete: remove,
    refresh,
    
    // Utilities
    clearError,
    setData,
  };
};

/**
 * Simplified CRUD hook for specific entity types
 */
export const useResidentsCRUD = (options = {}) => {
  return useCRUDWithAutoRefresh('resident', {
    successMessages: {
      create: 'Resident created successfully!',
      update: 'Resident updated successfully!',
      delete: 'Resident deleted successfully!',
    },
    errorMessages: {
      create: 'Failed to create resident',
      update: 'Failed to update resident',
      delete: 'Failed to delete resident',
      fetch: 'Failed to fetch residents',
    },
    ...options,
  });
};

export const useHouseholdsCRUD = (options = {}) => {
  return useCRUDWithAutoRefresh('household', {
    successMessages: {
      create: 'Household created successfully!',
      update: 'Household updated successfully!',
      delete: 'Household deleted successfully!',
    },
    errorMessages: {
      create: 'Failed to create household',
      update: 'Failed to update household',
      delete: 'Failed to delete household',
      fetch: 'Failed to fetch households',
    },
    ...options,
  });
};

export const usePetsCRUD = (options = {}) => {
  return useCRUDWithAutoRefresh('pet', {
    successMessages: {
      create: 'Pet created successfully!',
      update: 'Pet updated successfully!',
      delete: 'Pet deleted successfully!',
    },
    errorMessages: {
      create: 'Failed to create pet',
      update: 'Failed to update pet',
      delete: 'Failed to delete pet',
      fetch: 'Failed to fetch pets',
    },
    ...options,
  });
};

export const useInventoriesCRUD = (options = {}) => {
  return useCRUDWithAutoRefresh('inventory', {
    successMessages: {
      create: 'Inventory item created successfully!',
      update: 'Inventory item updated successfully!',
      delete: 'Inventory item deleted successfully!',
    },
    errorMessages: {
      create: 'Failed to create inventory item',
      update: 'Failed to update inventory item',
      delete: 'Failed to delete inventory item',
      fetch: 'Failed to fetch inventory items',
    },
    ...options,
  });
};

export const useArchivesCRUD = (options = {}) => {
  return useCRUDWithAutoRefresh('archive', {
    successMessages: {
      create: 'Archive created successfully!',
      update: 'Archive updated successfully!',
      delete: 'Archive deleted successfully!',
    },
    errorMessages: {
      create: 'Failed to create archive',
      update: 'Failed to update archive',
      delete: 'Failed to delete archive',
      fetch: 'Failed to fetch archives',
    },
    ...options,
  });
};

export default useCRUDWithAutoRefresh;
