import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AuditService from "@/services/auditService";

// Cache for activities data
const activitiesCache = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export const useActivities = (limit = 100) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Memoized cache key
  const cacheKey = useMemo(() => {
    return `${user?.target_type}-${user?.target_id}-${limit}`;
  }, [user?.target_type, user?.target_id, limit]);

  // Check if cache is valid
  const isCacheValid = useCallback(() => {
    const cached = activitiesCache.get(cacheKey);
    return cached && (Date.now() - cached.timestamp) < CACHE_DURATION;
  }, [cacheKey]);

  // Load activities with caching
  const loadActivities = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first (unless forcing refresh)
      if (!forceRefresh && isCacheValid()) {
        const cached = activitiesCache.get(cacheKey);
        setActivities(cached.data);
        setLastFetchTime(cached.timestamp);
        return;
      }

      const auditLogs = await AuditService.getRecentActivities(
        user?.target_type,
        user?.target_id,
        limit,
        forceRefresh
      );
      const transformedActivities = AuditService.transformAuditLogs(auditLogs);
      
      // Cache the results
      activitiesCache.set(cacheKey, {
        data: transformedActivities,
        timestamp: Date.now()
      });
      
      setActivities(transformedActivities);
      setLastFetchTime(Date.now());
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error loading activities:", error);
}
      setError(error);
      toast({
        title: "Error",
        description: "Failed to load activities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.target_type, user?.target_id, limit, cacheKey, isCacheValid, toast]);

  // Clear cache
  const clearCache = useCallback(() => {
    activitiesCache.delete(cacheKey);
  }, [cacheKey]);

  // Get cache stats
  const getCacheStats = useCallback(() => {
    return {
      size: activitiesCache.size,
      hasValidCache: isCacheValid(),
      lastFetch: lastFetchTime ? new Date(lastFetchTime).toLocaleTimeString() : null
    };
  }, [isCacheValid, lastFetchTime]);

  // Load activities on mount
  useEffect(() => {
    if (user?.target_type && user?.target_id) {
      loadActivities();
    }
  }, [loadActivities, user?.target_type, user?.target_id]);

  return {
    activities,
    loading,
    error,
    lastFetchTime,
    loadActivities,
    clearCache,
    getCacheStats
  };
};

export const useActivitiesFilter = (activities, options = {}) => {
  const {
    searchTerm = "",
    filterType = "all",
    filterTable = "all",
    filterOperation = "all",
    debounceDelay = 300
  } = options;

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceDelay);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, debounceDelay]);

  // Memoized filtered activities
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Filter by search term
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.action.toLowerCase().includes(searchLower) ||
        activity.user.toLowerCase().includes(searchLower) ||
        activity.details.toLowerCase().includes(searchLower)
      );
    }

    // Filter by activity type
    if (filterType !== "all") {
      filtered = filtered.filter(activity => activity.type === filterType);
    }

    // Filter by table
    if (filterTable !== "all") {
      filtered = filtered.filter(activity => activity.tableName === filterTable);
    }

    // Filter by operation
    if (filterOperation !== "all") {
      filtered = filtered.filter(activity => activity.operation === filterOperation);
    }

    return filtered;
  }, [activities, debouncedSearchTerm, filterType, filterTable, filterOperation]);

  // Memoized unique values for filters
  const uniqueValues = useMemo(() => {
    const tables = ["all", ...Array.from(new Set(activities.map(activity => activity.tableName)))];
    const types = ["all", ...Array.from(new Set(activities.map(activity => activity.type)))];
    const operations = ["all", ...Array.from(new Set(activities.map(activity => activity.operation)))];
    
    return { tables, types, operations };
  }, [activities]);

  return {
    filteredActivities,
    uniqueValues,
    debouncedSearchTerm
  };
};

export const useActivitiesPagination = (activities, itemsPerPage = 20) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when activities change
  useEffect(() => {
    setCurrentPage(1);
  }, [activities.length]);

  // Memoized paginated activities
  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return activities.slice(startIndex, endIndex);
  }, [activities, currentPage, itemsPerPage]);

  // Calculate pagination info
  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, hasNextPage]);

  const goToPrevPage = useCallback(() => {
    if (hasPrevPage) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage, hasPrevPage]);

  return {
    paginatedActivities,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
    goToNextPage,
    goToPrevPage,
    setCurrentPage
  };
};
