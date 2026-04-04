import { useState, useEffect, useCallback } from "react";
import api from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useHouseholds = () => {
  const [households, setHouseholds] = useState([]);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPurok, setFilterPurok] = useState("");
  const [filterHousingType, setFilterHousingType] = useState("all");
  const [sortBy, setSortBy] = useState("household_id");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [familyCount, setFamilyCount] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    totalRecords: 0,
    totalPages: 1,
  });
  const [updateCallbacks, setUpdateCallbacks] = useState([]);
  const { user } = useAuth();

  // Register update callbacks
  const registerUpdateCallback = useCallback((callback) => {
    setUpdateCallbacks((prev) => [...prev, callback]);
    return () => {
      setUpdateCallbacks((prev) => prev.filter((cb) => cb !== callback));
    };
  }, []);

  // Execute all update callbacks
  const executeUpdateCallbacks = useCallback(
    async (action, data) => {
      try {
        await Promise.all(
          updateCallbacks.map((callback) => callback(action, data))
        );
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
  console.error("Error executing update callbacks:", error);
}
      }
    },
    [updateCallbacks]
  );

  const fetchFamilyCount = async () => {
    const res = await api.get("/list/household/family-count");
    setFamilyCount(res.data.data);
  };

  // Fetch households from backend with pagination and search
  const fetchHouseholds = async (params = {}) => {
    setLoading(true);
    try {
      // Only add barangayId if user.target_type is 'barangay'
      const queryParams = {
        ...(user.target_type === "barangay"
          ? {
              purokId:
                filterPurok === "all" ? undefined : filterPurok || undefined,
              barangayId: user.target_id,
            }
          : {
              barangayId:
                filterPurok === "all" ? undefined : filterPurok || undefined,
            }),
        page,
        perPage,
        search: searchTerm,
        housingType:
          filterHousingType !== "all" ? filterHousingType : undefined,
        sortBy,
        sortOrder,
        ...params,
      };

      const res = await api.get("/list/household", {
        params: queryParams,
      });
      setHouseholds(res.data.data?.data || res.data.data || []);
      setPagination(
        res.data.data?.pagination || {
          page: 1,
          perPage: 10,
          totalRecords: 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      setHouseholds([]);
      toast({ title: "Failed to fetch households", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch a single household for view/edit
  const fetchHousehold = async (householdId) => {
    setLoading(true);
    try {
      const res = await api.get(`/${householdId}/household`);
      setSelectedHousehold(res.data.data);
      return res.data.data;
    } catch (err) {
      // Don't show toast for 404 errors (household deleted)
      if (err.response?.status !== 404) {
        toast({
          title: "Failed to fetch household details",
          variant: "destructive",
        });
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create a new household
  const createHousehold = async (householdData) => {
    setLoading(true);
    try {
      const response = await api.post("/household", householdData);
      toast({ title: "Household added successfully!" });

      // Execute update callbacks
      await executeUpdateCallbacks("create", response.data.data);

      // Refresh list
      await fetchHouseholds();
      await fetchFamilyCount();

      return true;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Failed to save household:", err);
}
      toast({ title: "Failed to save household", variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing household with optimistic updates
  const updateHousehold = async (householdId, householdData, options = {}) => {
    const { optimistic = true, showToast = true } = options;

    setLoading(true);

    // Store original data for rollback
    const originalHouseholds = [...households];
    const originalSelectedHousehold = selectedHousehold;

    try {
      // Optimistic update
      if (optimistic) {
        const optimisticUpdate = (prevHouseholds) =>
          prevHouseholds.map((household) =>
            household.household_id === householdId
              ? {
                  ...household,
                  ...householdData,
                  updated_at: new Date().toISOString(),
                }
              : household
          );

        setHouseholds(optimisticUpdate);

        if (selectedHousehold?.household_id === householdId) {
          setSelectedHousehold((prev) => ({
            ...prev,
            ...householdData,
            updated_at: new Date().toISOString(),
          }));
        }
      }

      // Make API call
      const response = await api.put(
        `/household/${householdId}`,
        householdData
      );

      if (showToast) {
        toast({ title: "Household updated successfully!" });
      }

      // Execute update callbacks
      await executeUpdateCallbacks("update", {
        householdId,
        data: response.data.data,
        originalData: originalSelectedHousehold,
      });

      // Refresh data to ensure consistency
      await fetchHouseholds();
      await fetchFamilyCount();

      return true;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Failed to update household:", err);
}

      // Rollback optimistic updates on error
      if (optimistic) {
        setHouseholds(originalHouseholds);
        setSelectedHousehold(originalSelectedHousehold);
      }

      if (showToast) {
        toast({ title: "Failed to update household", variant: "destructive" });
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Delete a household
  const deleteHousehold = async (householdId) => {
    setLoading(true);
    try {
      await api.delete(`/${householdId}/household`);
      toast({ title: "Household deleted successfully!" });

      // Execute update callbacks
      await executeUpdateCallbacks("delete", { householdId });

      // Refresh list
      await fetchHouseholds();
      await fetchFamilyCount();

      return true;
    } catch (err) {
      toast({ title: "Failed to delete household", variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Bulk update households
  const bulkUpdateHouseholds = async (updates) => {
    setLoading(true);
    try {
      const promises = updates.map(({ householdId, data }) =>
        api.put(`/household/${householdId}`, data)
      );

      await Promise.all(promises);
      toast({ title: `${updates.length} households updated successfully!` });

      // Execute update callbacks for each update
      await Promise.all(
        updates.map((update) => executeUpdateCallbacks("bulk_update", update))
      );

      // Refresh data
      await fetchHouseholds();
      await fetchFamilyCount();

      return true;
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Failed to bulk update households:", err);
}
      toast({
        title: "Failed to update some households",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    await Promise.all([fetchHouseholds(), fetchFamilyCount()]);
  };

  // Handle sorting
  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new sort column with default desc order
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
    setPage(1); // Reset to first page when sorting
  };

  // Note: Search filtering is now handled server-side via the API
  // No need for client-side filtering since backend handles search properly

  // Effect to fetch households when dependencies change
  useEffect(() => {
    fetchHouseholds();
  }, [
    page,
    perPage,
    searchTerm,
    filterPurok,
    filterHousingType,
    sortBy,
    sortOrder,
  ]);

  return {
    // State
    households,
    selectedHousehold,
    loading,
    searchTerm,
    filterPurok,
    filterHousingType,
    sortBy,
    sortOrder,
    page,
    perPage,
    pagination,

    // Actions
    setSearchTerm,
    setFilterPurok,
    setFilterHousingType,
    setSortBy,
    setSortOrder,
    handleSort,
    setPage,
    setPerPage,
    setSelectedHousehold,
    fetchHouseholds,
    fetchHousehold,
    createHousehold,
    updateHousehold,
    deleteHousehold,
    bulkUpdateHouseholds,
    refreshData,
    registerUpdateCallback,
  };
};
