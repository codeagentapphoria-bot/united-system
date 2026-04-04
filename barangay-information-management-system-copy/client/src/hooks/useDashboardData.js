import { useState, useEffect } from "react";
import useAuth from "@/hooks/useAuth";
import api from "@/utils/api";
import { handleErrorSilently } from "@/utils/errorHandler";

export const useDashboardData = (
  role,
  selectedBarangay,
  selectedMonth,
  selectedYear
) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [barangays, setBarangays] = useState([]);

  // Statistics state
  const [stats, setStats] = useState({
    population: { total: 0, male: 0, female: 0, addedThisMonth: 0 },
    households: { total: 0, addedThisMonth: 0 },
    families: { total: 0, addedThisMonth: 0 },
    pets: { total: 0, addedThisMonth: 0 },
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

  // Helper function to build params with barangay filter for barangay role
  const buildParams = () => {
    const params = {};

    // For barangay role, always include barangayId filter
    if (role === "barangay") {
      params.barangayId = user?.target_id;
    } else if (selectedBarangay) {
      // For municipality role, only include if barangay is selected
      params.barangayId = selectedBarangay;
    }

    // Puroks removed in v2 - purokId filter no longer applicable

    return params;
  };

  // Fetch barangays for municipality role
  const fetchBarangays = async () => {
    if (role !== "municipality") return;
    try {
      const response = await api.get("/list/barangay?perPage=200");
      // The API returns { data: { data: [...], pagination: {...} } }
      const barangayData = response.data.data.data || [];
      setBarangays(barangayData);
    } catch (error) {
      handleErrorSilently(error, "Fetch Barangays");
      setBarangays([]); // Ensure it's always an array
    }
  };

  // fetchPuroks removed — puroks table dropped in v2

  // Fetch population statistics
  const fetchPopulationStats = async () => {
    try {
      const params = buildParams();

      const response = await api.get("/statistics/total-population", {
        params,
      });
      const data = response.data.data;

      setStats((prev) => ({
        ...prev,
        population: {
          total: data.total_population || 0,
          male: data.total_male || 0,
          female: data.total_female || 0,
          addedThisMonth: data.added_this_month || 0,
        },
      }));
    } catch (error) {
      handleErrorSilently(error, "Fetch Population Stats");
    }
  };

  // Fetch household statistics
  const fetchHouseholdStats = async () => {
    try {
      const params = buildParams();

      const response = await api.get("/statistics/total-households", {
        params,
      });
      const data = response.data.data;

      setStats((prev) => ({
        ...prev,
        households: {
          total: data.total_households || 0,
          addedThisMonth: data.added_this_month || 0,
        },
      }));
    } catch (error) {
      handleErrorSilently(error, "Fetch Household Stats");
    }
  };

  // Fetch family statistics
  const fetchFamilyStats = async () => {
    try {
      const params = buildParams();

      const response = await api.get("/statistics/total-families", { params });
      const data = response.data.data;

      setStats((prev) => ({
        ...prev,
        families: {
          total: data.total_families || 0,
          addedThisMonth: data.added_this_month || 0,
        },
      }));
    } catch (error) {
      handleErrorSilently(error, "Fetch Family Stats");
    }
  };

  // Fetch pet statistics
  const fetchPetStats = async () => {
    try {
      const params = buildParams();

      const response = await api.get("/statistics/total-registered-pets", {
        params,
      });
      const data = response.data.data;

      setStats((prev) => ({
        ...prev,
        pets: {
          total: data.total_pets || 0,
          addedThisMonth: data.added_this_month || 0,
        },
      }));
    } catch (error) {
      handleErrorSilently(error, "Fetch Pet Stats");
    }
  };

  // Fetch demographics data
  const fetchDemographics = async () => {
    try {
      const params = buildParams();

      const [
        ageResponse,
        genderResponse,
        civilStatusResponse,
        educationResponse,
        employmentResponse,
        classificationsResponse,
        votersResponse,
      ] = await Promise.allSettled([
        api.get("/statistics/age-demographics", { params }),
        api.get("/statistics/gender-demographics", { params }),
        api.get("/statistics/civil-status-demographics", { params }),
        api.get("/statistics/educational-attainment-demographics", { params }),
        api.get("/statistics/employment-status-demographics", { params }),
        api.get("/statistics/resident-classification-demographics", { params }),
        api.get("/statistics/voter-demographics", { params }),
      ]);

      setDemographics({
        age:
          ageResponse.status === "fulfilled"
            ? ageResponse.value.data.data || []
            : [],
        gender:
          genderResponse.status === "fulfilled"
            ? genderResponse.value.data.data || []
            : [],
        civilStatus:
          civilStatusResponse.status === "fulfilled"
            ? civilStatusResponse.value.data.data || []
            : [],
        education:
          educationResponse.status === "fulfilled"
            ? educationResponse.value.data.data || []
            : [],
        employment:
          employmentResponse.status === "fulfilled"
            ? employmentResponse.value.data.data || []
            : [],
        classifications:
          classificationsResponse.status === "fulfilled"
            ? classificationsResponse.value.data.data || []
            : [],
        voters:
          votersResponse.status === "fulfilled"
            ? votersResponse.value.data.data || []
            : [],
      });
    } catch (error) {
      handleErrorSilently(error, "Fetch Demographics");
      // Set empty arrays as fallback
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
  };

  // Fetch distribution data
  const fetchDistributionData = async () => {
    if (role === "barangay") {
      // Puroks removed in v2 — barangay role shows empty distribution charts
      // (no sub-unit breakdown available without puroks)
      setDistributionData({
        demographics: [],
        employment: [],
        education: [],
        voters: [],
      });
      return;
    } else if (role === "municipality") {
      // Data per barangay for municipality role
      try {
        const brgyRes = await api.get("/list/barangay?perPage=200");
        const brgyList = brgyRes.data.data.data || [];

        // Filter barangays based on selected barangay
        const filteredBarangays = selectedBarangay
          ? brgyList.filter(
              (barangay) =>
                barangay.id.toString() === selectedBarangay.toString()
            )
          : brgyList;

        const stats = await Promise.all(
          filteredBarangays.map(async (barangay) => {
            try {
              const params = {
                barangayId: barangay.id,
                // Puroks removed in v2 - purokId no longer applicable
              };

              const [demoRes, empRes, eduRes, voterRes] = await Promise.all([
                api.get("/statistics/gender-demographics", { params }),
                api.get("/statistics/employment-status-demographics", {
                  params,
                }),
                api.get("/statistics/educational-attainment-demographics", {
                  params,
                }),
                api.get("/statistics/voter-demographics", { params }),
              ]);

              // Transform the data to get total counts for each category
              const demographicsTotal = (demoRes.data.data || []).reduce(
                (sum, item) => sum + (parseInt(item.count) || 0),
                0
              );
              const employmentTotal = (empRes.data.data || []).reduce(
                (sum, item) => sum + (parseInt(item.count) || 0),
                0
              );
              const educationTotal = (eduRes.data.data || []).reduce(
                (sum, item) => sum + (parseInt(item.count) || 0),
                0
              );
              const votersTotal = (voterRes.data.data || []).reduce(
                (sum, item) => sum + (parseInt(item.count) || 0),
                0
              );

              return {
                name: barangay.barangay_name,
                demographics: demographicsTotal,
                employment: employmentTotal,
                education: educationTotal,
                voters: votersTotal,
              };
            } catch {
              return {
                name: barangay.barangay_name,
                demographics: 0,
                employment: 0,
                education: 0,
                voters: 0,
              };
            }
          })
        );

        setDistributionData({
          demographics: stats.map((s) => ({
            name: s.name,
            value: s.demographics,
          })),
          employment: stats.map((s) => ({
            name: s.name,
            value: s.employment,
          })),
          education: stats.map((s) => ({
            name: s.name,
            value: s.education,
          })),
          voters: stats.map((s) => ({
            name: s.name,
            value: s.voters,
          })),
        });
      } catch {
        setDistributionData({
          demographics: [],
          employment: [],
          education: [],
          voters: [],
        });
      }
    } else {
      setDistributionData({
        demographics: [],
        employment: [],
        education: [],
        voters: [],
      });
    }
  };

  // Load all data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPopulationStats(),
        fetchHouseholdStats(),
        fetchFamilyStats(),
        fetchPetStats(),
        fetchDemographics(),
        fetchDistributionData(),
      ]);
    } catch (error) {
      handleErrorSilently(error, "Load Dashboard Data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch barangays on mount (municipality)
  useEffect(() => {
    fetchBarangays();
  }, [role]);

  useEffect(() => {
    loadDashboardData();
  }, [selectedBarangay, selectedMonth, selectedYear]);

  return {
    loading,
    stats,
    demographics,
    distributionData,
    barangays,
    loadDashboardData,
  };
};
