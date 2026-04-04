import { useState, useEffect, useCallback } from "react";
import api from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { handleErrorSilently } from "@/utils/errorHandler";
import { useUnifiedAutoRefresh } from "@/hooks/useUnifiedAutoRefresh";

export const usePets = () => {
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSpecies, setFilterSpecies] = useState("all");
  const [filterPurok, setFilterPurok] = useState("all");
  const [puroks, setPuroks] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [sortBy, setSortBy] = useState("pet_name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    totalRecords: 0,
    totalPages: 1,
  });
  const { user } = useAuth();

  // Set up unified auto refresh for pets
  const { registerRefreshCallback, handleCRUDOperation } = useUnifiedAutoRefresh({
    entityType: 'pet',
    successMessage: 'Pet operation completed successfully!',
    autoRefresh: true,
    refreshDelay: 100,
  });

  // Fetch puroks for filter
  const fetchPuroks = useCallback(async () => {
    if (user?.target_type === "barangay" && user?.target_id) {
      try {
        const res = await api.get(`/list/${user.target_id}/purok`);
        setPuroks(res.data.data || []);
      } catch (error) {
        handleErrorSilently(error, "Fetch Puroks");
        setPuroks([]);
      }
    } else {
      // Initialize as empty array for non-barangay users
      setPuroks([]);
    }
  }, [user?.target_type, user?.target_id]);

  // Fetch barangays for filter
  const fetchBarangays = useCallback(async () => {
    if (user?.target_type === "municipality") {
      try {
        const res = await api.get(`/list/barangay`);
        setBarangays(res.data.data.data || []);
      } catch (error) {
        handleErrorSilently(error, "Fetch Barangays");
        setBarangays([]);
      }
    } else {
      setBarangays([]);
    }
  }, [user?.target_type]);

  // Fetch pets from backend with pagination and search
  const fetchPets = async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = {
        page,
        perPage,
        search: searchTerm,
        species: filterSpecies !== "all" ? filterSpecies : undefined,
        sortBy,
        sortOrder,
        ...params,
      };

      // Add purok/barangay filtering
      if (user?.target_type === "barangay") {
        if (filterPurok !== "all") {
          queryParams.purokId = filterPurok;
        }
        queryParams.barangayId = user.target_id;
      } else if (user?.target_type === "municipality") {
        if (filterPurok !== "all") {
          queryParams.barangayId = filterPurok;
        }
      }

      const res = await api.get("/list/pets", {
        params: queryParams,
      });
      setPets(res.data.data || []);
      setPagination(
        res.data.pagination || {
          page: 1,
          perPage: 10,
          totalRecords: 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      setPets([]);
      toast({ title: "Failed to fetch pets", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch puroks and barangays on mount
  useEffect(() => {
    if (user?.target_type) {
      fetchPuroks();
      fetchBarangays();
    }
  }, [fetchPuroks, fetchBarangays, user?.target_type, user?.target_id]);

  // Fetch pets when filters change
  useEffect(() => {
    fetchPets();
  }, [
    page,
    perPage,
    searchTerm,
    filterSpecies,
    filterPurok,
    sortBy,
    sortOrder,
    user?.target_type,
    user?.target_id,
  ]);

  // Register fetchPets for auto refresh
  useEffect(() => {
    const unregister = registerRefreshCallback(fetchPets);
    return unregister;
  }, [registerRefreshCallback, fetchPets]);

  // Fetch a single pet for view/edit
  const fetchPet = async (petId) => {
    setLoading(true);
    try {
      const res = await api.get(`/${petId}/pet`);
      setSelectedPet(res.data.data);
      return res.data.data;
    } catch (err) {
      toast({
        title: "Failed to fetch pet details",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create a new pet
  const createPet = async (petData) => {
    setLoading(true);
    try {
      const response = await handleCRUDOperation(
        async (data) => {
          return await api.post("/pet", data, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
        },
        petData
      );
      
      toast({ title: "Pet added successfully!" });
      return true;
    } catch (err) {
      handleErrorSilently(err, "Save Pet");
      toast({ title: "Failed to save pet", variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing pet
  const updatePet = async (petId, petData) => {
    setLoading(true);
    try {
      const response = await handleCRUDOperation(
        async (data) => {
          return await api.put(`/${petId}/pet`, data, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
        },
        petData
      );
      
      toast({ title: "Pet updated successfully!" });
      return true;
    } catch (err) {
      handleErrorSilently(err, "Update Pet");
      toast({ title: "Failed to update pet", variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Delete a pet
  const deletePet = async (petId) => {
    setLoading(true);
    try {
      await handleCRUDOperation(
        async (data) => {
          return await api.delete(`/${petId}/pet`);
        },
        { petId }
      );
      
      toast({ title: "Pet deleted successfully!" });
      return true;
    } catch (err) {
      toast({ title: "Failed to delete pet", variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    await fetchPets();
  };

  // Handle sorting
  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle sort order if same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new sort column with default asc order
      setSortBy(newSortBy);
      setSortOrder("asc");
    }
    setPage(1); // Reset to first page when sorting
  };

  return {
    // State
    pets,
    selectedPet,
    loading,
    searchTerm,
    filterSpecies,
    filterPurok,
    puroks,
    barangays,
    sortBy,
    sortOrder,
    page,
    perPage,
    pagination,
    setSearchTerm,
    setFilterSpecies,
    setFilterPurok,
    setSortBy,
    setSortOrder,
    handleSort,
    setPage,
    setPerPage,
    setSelectedPet,
    fetchPets,
    fetchPet,
    createPet,
    updatePet,
    deletePet,
    refreshData,
  };
};
