import { useState, useCallback, useRef } from "react";
import externalApiService from "@/services/externalApiService";

export const useExternalApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Generic request method
  const makeRequest = useCallback(async (requestFn, options = {}) => {
    const { showLoading = true, clearError = true } = options;

    if (clearError) {
      setError(null);
    }

    if (showLoading) {
      setLoading(true);
    }

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const result = await requestFn();

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error?.message || "Request failed");
      }
    } catch (err) {
      if (err.name === "AbortError") {
        // Request was cancelled, don't set error
        return null;
      }

      const errorMessage = err.message || "An unexpected error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      abortControllerRef.current = null;
    }
  }, []);

  // Specific API methods
  const getCities = useCallback(
    async (options = {}) => {
      return makeRequest(() => externalApiService.getCities(), options);
    },
    [makeRequest]
  );

  const getBuildings = useCallback(
    async (filters = {}, options = {}) => {
      return makeRequest(
        () => externalApiService.getBuildings(filters),
        options
      );
    },
    [makeRequest]
  );

  const getLandmarks = useCallback(
    async (filters = {}, options = {}) => {
      return makeRequest(
        () => externalApiService.getLandmarks(filters),
        options
      );
    },
    [makeRequest]
  );

  const getLandmarksStatistics = useCallback(
    async (options = {}) => {
      return makeRequest(
        () => externalApiService.getLandmarksStatistics(),
        options
      );
    },
    [makeRequest]
  );

  const getBarangays = useCallback(
    async (filters = {}, options = {}) => {
      return makeRequest(
        () => externalApiService.getBarangays(filters),
        options
      );
    },
    [makeRequest]
  );

  const getMunicipalities = useCallback(
    async (filters = {}, options = {}) => {
      return makeRequest(
        () => externalApiService.getMunicipalities(filters),
        options
      );
    },
    [makeRequest]
  );

  const getProvinces = useCallback(
    async (filters = {}, options = {}) => {
      return makeRequest(
        () => externalApiService.getProvinces(filters),
        options
      );
    },
    [makeRequest]
  );

  const customRequest = useCallback(
    async (endpoint, requestOptions = {}, options = {}) => {
      return makeRequest(
        () => externalApiService.customRequest(endpoint, requestOptions),
        options
      );
    },
    [makeRequest]
  );

  const batchRequest = useCallback(
    async (requests, options = {}) => {
      return makeRequest(
        () => externalApiService.batchRequest(requests),
        options
      );
    },
    [makeRequest]
  );

  const healthCheck = useCallback(
    async (options = {}) => {
      return makeRequest(() => externalApiService.healthCheck(), options);
    },
    [makeRequest]
  );

  // Clear error manually
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cancel current request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }, []);

  return {
    // State
    loading,
    error,

    // Actions
    clearError,
    cancelRequest,

    // API methods
    getCities,
    getBuildings,
    getLandmarks,
    getLandmarksStatistics,
    getBarangays,
    getMunicipalities,
    getProvinces,
    customRequest,
    batchRequest,
    healthCheck,
  };
};

// Hook for specific data fetching with caching
export const useExternalApiData = (dataType, filters = {}, options = {}) => {
  const [data, setData] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const {
    loading,
    error,
    getCities,
    getBuildings,
    getLandmarks,
    getLandmarksStatistics,
    getBarangays,
    getMunicipalities,
    getProvinces,
    clearError,
  } = useExternalApi();

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      // Check cache if not forcing refresh
      if (!forceRefresh && data && lastFetched) {
        const cacheAge = Date.now() - lastFetched;
        const maxAge = options.cacheTime || 5 * 60 * 1000; // 5 minutes default

        if (cacheAge < maxAge) {
          return data;
        }
      }

      let result;

      switch (dataType) {
        case "cities":
          result = await getCities(options);
          break;
        case "buildings":
          result = await getBuildings(filters, options);
          break;
        case "landmarks":
          result = await getLandmarks(filters, options);
          break;
        case "landmarks-statistics":
          result = await getLandmarksStatistics(options);
          break;
        case "barangays":
          result = await getBarangays(filters, options);
          break;
        case "municipalities":
          result = await getMunicipalities(filters, options);
          break;
        case "provinces":
          result = await getProvinces(filters, options);
          break;
        default:
          throw new Error(`Unknown data type: ${dataType}`);
      }

      setData(result);
      setLastFetched(Date.now());
      return result;
    },
    [
      dataType,
      filters,
      options,
      data,
      lastFetched,
      getCities,
      getBuildings,
      getLandmarks,
      getLandmarksStatistics,
      getBarangays,
      getMunicipalities,
      getProvinces,
    ]
  );

  return {
    data,
    loading,
    error,
    fetchData,
    clearError,
    lastFetched,
  };
};
