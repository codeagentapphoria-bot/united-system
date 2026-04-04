import { useState, useCallback, useEffect } from "react";
import householdUpdateService from "../services/householdUpdateService";
import { toast } from "@/hooks/use-toast";
import { handleErrorSilently } from "@/utils/errorHandler";

export const useHouseholdUpdates = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [updateHistory, setUpdateHistory] = useState([]);

  // Enhanced create household with validation and logging
  const createHousehold = useCallback(async (householdData, options = {}) => {
    setIsUpdating(true);
    setUpdateProgress(0);

    try {
      setUpdateProgress(25);

      // Use the update service for consistent handling
      const result = await householdUpdateService.processUpdate({
        action: "create",
        data: householdData,
        options: { showToast: true, ...options },
      });

      setUpdateProgress(100);
      setLastUpdate(new Date().toISOString());

      // Add to local history
      setUpdateHistory((prev) => [
        {
          id: Date.now(),
          action: "create",
          data: householdData,
          result,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 49),
      ]);

      return result;
    } catch (error) {
      handleErrorSilently(error, "Create Household");
      throw error;
    } finally {
      setIsUpdating(false);
      setUpdateProgress(0);
    }
  }, []);

  // Enhanced update household with optimistic updates
  const updateHousehold = useCallback(
    async (householdId, householdData, oldData = null, options = {}) => {
      const { optimistic = true, showToast = true, onProgress } = options;

      setIsUpdating(true);
      setUpdateProgress(0);

      try {
        // Optimistic update callback
        if (optimistic && onProgress) {
          onProgress(25, "Applying optimistic update...");
        }

        setUpdateProgress(25);

        // Use the update service
        const result = await householdUpdateService.processUpdate({
          action: "update",
          householdId,
          data: householdData,
          oldData,
          options: { showToast, ...options },
        });

        setUpdateProgress(100);
        setLastUpdate(new Date().toISOString());

        // Add to local history
        setUpdateHistory((prev) => [
          {
            id: Date.now(),
            action: "update",
            householdId,
            data: householdData,
            result,
            timestamp: new Date().toISOString(),
          },
          ...prev.slice(0, 49),
        ]);

        return result;
      } catch (error) {
        handleErrorSilently(error, "Update Household");
        throw error;
      } finally {
        setIsUpdating(false);
        setUpdateProgress(0);
      }
    },
    []
  );

  // Enhanced delete household
  const deleteHousehold = useCallback(async (householdId, options = {}) => {
    setIsUpdating(true);
    setUpdateProgress(0);

    try {
      setUpdateProgress(25);

      const result = await householdUpdateService.processUpdate({
        action: "delete",
        householdId,
        data: { householdId },
        options: { showToast: true, ...options },
      });

      setUpdateProgress(100);
      setLastUpdate(new Date().toISOString());

      // Add to local history
      setUpdateHistory((prev) => [
        {
          id: Date.now(),
          action: "delete",
          householdId,
          result,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 49),
      ]);

      return result;
    } catch (error) {
      handleErrorSilently(error, "Delete Household");
      throw error;
    } finally {
      setIsUpdating(false);
      setUpdateProgress(0);
    }
  }, []);

  // Bulk update households
  const bulkUpdateHouseholds = useCallback(async (updates, options = {}) => {
    setIsUpdating(true);
    setUpdateProgress(0);

    try {
      const totalUpdates = updates.length;
      let completedUpdates = 0;
      const results = [];

      for (const update of updates) {
        try {
          const result = await householdUpdateService.processUpdate({
            action: "update",
            householdId: update.householdId,
            data: update.data,
            options: { showToast: false, ...options },
          });

          results.push({
            success: true,
            result,
            householdId: update.householdId,
          });
        } catch (error) {
          results.push({
            success: false,
            error,
            householdId: update.householdId,
          });
        }

        completedUpdates++;
        const progress = Math.round((completedUpdates / totalUpdates) * 100);
        setUpdateProgress(progress);
      }

      setLastUpdate(new Date().toISOString());

      // Show summary toast
      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      if (successCount > 0) {
        toast({
          title: `Successfully updated ${successCount} household(s)`,
          description:
            errorCount > 0 ? `${errorCount} update(s) failed` : undefined,
        });
      }

      if (errorCount > 0) {
        toast({
          title: `${errorCount} update(s) failed`,
          variant: "destructive",
        });
      }

      return results;
    } catch (error) {
      handleErrorSilently(error, "Bulk Update Households");
      throw error;
    } finally {
      setIsUpdating(false);
      setUpdateProgress(0);
    }
  }, []);

  // Validate household data
  const validateHouseholdData = useCallback((data) => {
    return householdUpdateService.validateHouseholdData(data);
  }, []);

  // Transform household data
  const transformHouseholdData = useCallback((data) => {
    return householdUpdateService.transformDataForAPI(data);
  }, []);

  // Get audit log
  const getAuditLog = useCallback((limit = 50) => {
    return householdUpdateService.getAuditLog(limit);
  }, []);

  // Get update statistics
  const getUpdateStats = useCallback(() => {
    return householdUpdateService.getUpdateStats();
  }, []);

  // Export audit log
  const exportAuditLog = useCallback(() => {
    householdUpdateService.exportAuditLog();
  }, []);

  // Clear local history
  const clearLocalHistory = useCallback(() => {
    setUpdateHistory([]);
  }, []);

  // Get local update history
  const getLocalHistory = useCallback(
    (limit = 50) => {
      return updateHistory.slice(0, limit);
    },
    [updateHistory]
  );

  // Subscribe to update events
  const subscribeToUpdates = useCallback((callback) => {
    // This could be enhanced with a proper event system
    const interval = setInterval(() => {
      const stats = householdUpdateService.getUpdateStats();
      callback(stats);
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Auto-refresh data after updates
  const autoRefresh = useCallback(
    (refreshFunction) => {
      if (lastUpdate && refreshFunction) {
        refreshFunction();
      }
    },
    [lastUpdate]
  );

  return {
    // State
    isUpdating,
    updateProgress,
    lastUpdate,
    updateHistory,

    // Actions
    createHousehold,
    updateHousehold,
    deleteHousehold,
    bulkUpdateHouseholds,
    validateHouseholdData,
    transformHouseholdData,

    // Audit and history
    getAuditLog,
    getUpdateStats,
    exportAuditLog,
    getLocalHistory,
    clearLocalHistory,

    // Utilities
    subscribeToUpdates,
    autoRefresh,
  };
};
