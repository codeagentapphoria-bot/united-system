import { useState, useEffect, useCallback, useRef } from "react";
import useAuth from "@/hooks/useAuth";
import api from "@/utils/api";
import { registerCache } from "@/utils/cacheManager";

// Cache for storing API responses
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Request deduplication
const pendingRequests = new Map();

// Register cache with global cache manager
registerCache(cache, 'dashboard-data');
registerCache(pendingRequests, 'dashboard-pending-requests');

// Helper function to generate cache key
const getCacheKey = (endpoint, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${endpoint}?${sortedParams}`;
};

// Helper function to check if cache is valid
const isCacheValid = (timestamp) => {
  return Date.now() - timestamp < CACHE_DURATION;
};

// Optimized API call with caching and deduplication
const cachedApiCall = async (endpoint, params = {}) => {
  const cacheKey = getCacheKey(endpoint, params);

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data;
  }

  // Check if request is already pending
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Make new request
  const requestPromise = api.get(endpoint, { params })
    .then(response => {
    // Cache the response
    cache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });
    pendingRequests.delete(cacheKey);
    return response.data;
  })
    .catch(error => {
      pendingRequests.delete(cacheKey);
      if (process.env.NODE_ENV === 'development') {
        if (process.env.NODE_ENV === 'development') {
  console.error("Request failed for:", cacheKey, error);
}
      }
      throw error;
    });

  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

export const useDashboardData = (role, selectedBarangay) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [distributionLoading, setDistributionLoading] = useState(true);
  const [barangays, setBarangays] = useState([]);

  // Statistics state
  const [stats, setStats] = useState({
    population: { total: 0, male: 0, female: 0, addedThisMonth: 0 },
    households: { total: 0, addedThisMonth: 0 },
    families: { total: 0, addedThisMonth: 0 },
    pets: { total: 0, addedThisMonth: 0 },
    unemployedHouseholds: { total: 0, affected: 0, percentage: 0 },
  });

  // Demographics state
  const [demographics, setDemographics] = useState({
    age: [],
    gender: [],
    civilStatus: [],
    education: [],
    employment: [],
    classifications: [],
    voters: [],
  });

  // Distribution data state
  const [distributionData, setDistributionData] = useState({
    demographics: [],
    employment: [],
    education: [],
    voters: [],
  });

  // Refs to track if data is stale
  const lastFetchRef = useRef({});
  const abortControllerRef = useRef(null);

  // Helper function to build params with barangay filter for barangay role
  const buildParams = useCallback(() => {
    const params = {};

    // For barangay role, always include barangayId filter
    if (role === "barangay") {
      params.barangayId = user?.target_id;
    } else if (selectedBarangay) {
      // For municipality role, only include if barangay is selected
      params.barangayId = selectedBarangay;
    }

    return params;
  }, [role, selectedBarangay, user?.target_id]);

  // Helper function to safely parse numbers and handle NaN
  const safeParseInt = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === "")
      return defaultValue;
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // Helper function to safely parse floats and handle NaN
  const safeParseFloat = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === "")
      return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // Fetch barangays for municipality role (cached)
  const fetchBarangays = useCallback(async () => {
    if (role !== "municipality") return;
    try {
      const response = await cachedApiCall("/list/barangay?perPage=200");
      const barangayData = response.data.data || [];
      setBarangays(barangayData);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        if (process.env.NODE_ENV === 'development') {
  console.error("Error fetching barangays:", error);
}
      }
      setBarangays([]);
    }
  }, [role]);

  // Fetch all statistics in parallel (cached)
  const fetchStatistics = useCallback(async () => {
      const params = buildParams();

    try {
      const [
        populationRes,
        householdsRes,
        familiesRes,
        petsRes,
        unemployedRes
      ] = await Promise.all([
        cachedApiCall("/statistics/total-population", params),
        cachedApiCall("/statistics/total-households", params),
        cachedApiCall("/statistics/total-families", params),
        cachedApiCall("/statistics/total-registered-pets", params),
        cachedApiCall("/statistics/unemployed-household-stats", params)
      ]);

      setStats({
        population: {
          total: safeParseInt(populationRes.data?.total_population, 0),
          male: safeParseInt(populationRes.data?.total_male, 0),
          female: safeParseInt(populationRes.data?.total_female, 0),
          addedThisMonth: safeParseInt(populationRes.data?.added_this_month, 0),
        },
        households: {
          total: safeParseInt(householdsRes.data?.total_households, 0),
          addedThisMonth: safeParseInt(householdsRes.data?.added_this_month, 0),
        },
        families: {
          total: safeParseInt(familiesRes.data?.total_families, 0),
          addedThisMonth: safeParseInt(familiesRes.data?.added_this_month, 0),
        },
        pets: {
          total: safeParseInt(petsRes.data?.total_pets, 0),
          addedThisMonth: safeParseInt(petsRes.data?.added_this_month, 0),
        },
        unemployedHouseholds: {
          total: safeParseInt(unemployedRes.data?.total_households, 0),
          affected: safeParseInt(unemployedRes.data?.households_with_unemployed, 0),
          percentage: safeParseFloat(unemployedRes.data?.percentage_households_with_unemployed, 0),
        },
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        if (process.env.NODE_ENV === 'development') {
  console.error("Error fetching statistics:", error);
}
      }
    }
  }, [buildParams]);

  // Fetch demographics data in parallel (cached)
  const fetchDemographics = useCallback(async () => {
      const params = buildParams();

    try {
      const [
        ageRes,
        genderRes,
        civilStatusRes,
        educationRes,
        employmentRes,
        classificationsRes,
        votersRes,
      ] = await Promise.all([
        cachedApiCall("/statistics/age-demographics", params),
        cachedApiCall("/statistics/gender-demographics", params),
        cachedApiCall("/statistics/civil-status-demographics", params),
        cachedApiCall("/statistics/educational-attainment-demographics", params),
        cachedApiCall("/statistics/employment-status-demographics", params),
        cachedApiCall("/statistics/resident-classification-demographics", params),
        cachedApiCall("/statistics/voter-demographics", params),
      ]);

      setDemographics({
        age: ageRes.data || [],
        gender: genderRes.data || [],
        civilStatus: civilStatusRes.data || [],
        education: educationRes.data || [],
        employment: employmentRes.data || [],
        classifications: classificationsRes.data || [],
        voters: votersRes.data || [],
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        if (process.env.NODE_ENV === 'development') {
  console.error("Error fetching demographics:", error);
}
      }
      setDemographics({
        age: [],
        gender: [],
        civilStatus: [],
        education: [],
        employment: [],
        classifications: [],
        voters: [],
      });
    }
  }, [buildParams]);

  // Fetch distribution data via single aggregated endpoint
  const fetchDistributionData = useCallback(async () => {
    try {
      const params = {};
      if (role === "barangay" && user?.target_id) {
        params.barangayId = user.target_id;
      } else if (role === "municipality" && selectedBarangay) {
        params.barangayId = selectedBarangay;
      }

      const res = await cachedApiCall("/statistics/barangay-distribution", params);
      const rows = res.data || [];

      setDistributionData({
        demographics: rows.map(s => ({ name: s.barangay_name, male: safeParseInt(s.male), female: safeParseInt(s.female), value: safeParseInt(s.male) + safeParseInt(s.female) })),
        employment: rows.map(s => ({ name: s.barangay_name, employed: safeParseInt(s.employed), unemployed: safeParseInt(s.unemployed), student: safeParseInt(s.student), retired: safeParseInt(s.retired), value: safeParseInt(s.employed) + safeParseInt(s.unemployed) + safeParseInt(s.student) + safeParseInt(s.retired) })),
        education: rows.map(s => ({ name: s.barangay_name, elementary: safeParseInt(s.elementary), high_school: safeParseInt(s.high_school), college: safeParseInt(s.college), post_graduate: safeParseInt(s.post_graduate), value: safeParseInt(s.elementary) + safeParseInt(s.high_school) + safeParseInt(s.college) + safeParseInt(s.post_graduate) })),
        voters: rows.map(s => ({ name: s.barangay_name, regular_voter: safeParseInt(s.regular_voter), sk_voter: safeParseInt(s.sk_voter), other_voter: safeParseInt(s.other_voter), value: safeParseInt(s.regular_voter) + safeParseInt(s.sk_voter) + safeParseInt(s.other_voter) })),
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error fetching distribution data:", error);
      }
      setDistributionData({ demographics: [], employment: [], education: [], voters: [] });
    }
  }, [role, selectedBarangay, user?.target_id]);

  // Load all dashboard data — primary content first, distribution after
  const loadDashboardData = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setDistributionLoading(true);

    // Phase 1: stats + demographics — unblocks the page spinner
    try {
      await Promise.all([
        fetchBarangays(),
        fetchStatistics(),
        fetchDemographics(),
      ]);
    } catch (error) {
      if (error.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
        console.error("loadDashboardData primary error:", error);
      }
    } finally {
      setLoading(false);
    }

    // Phase 2: distribution — renders progressively in the distribution tab
    try {
      await fetchDistributionData();
    } catch (error) {
      if (error.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
        console.error("loadDashboardData distribution error:", error);
      }
    } finally {
      setDistributionLoading(false);
    }
  }, [fetchBarangays, fetchStatistics, fetchDemographics, fetchDistributionData]);

  // Effect to reload data when filters change
  useEffect(() => {
    loadDashboardData();
  }, [selectedBarangay, role, user?.target_id, loadDashboardData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    loading,
    distributionLoading,
    stats,
    demographics,
    distributionData,
    barangays,
    loadDashboardData,
  };
};
