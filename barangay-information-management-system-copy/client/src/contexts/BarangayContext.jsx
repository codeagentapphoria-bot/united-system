import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/utils/api";
import { handleErrorSilently } from "@/utils/errorHandler";
import logger from "@/utils/logger";

const BarangayContext = createContext();

export const BarangayProvider = ({ children }) => {
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [availableBarangays, setAvailableBarangays] = useState([]);
  const [barangayStats, setBarangayStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBarangays = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/public/list/barangay");
      const barangays = data.data.data.map((barangay) => ({
        id: barangay.id,
        name: barangay.barangay_name,
        code: barangay.barangay_code,
        email: barangay.email,
        contactNumber: barangay.contact_number || "N/A",
        address: barangay.address || "N/A",
        captain: barangay.captain_name || "N/A",
        coordinates: [
          parseFloat(barangay.latitude) || 11.6081,
          parseFloat(barangay.longitude) || 125.4311,
        ],
        municipality_id: barangay.municipality_id,
        municipality_name: barangay.municipality_name || "Municipality",
        originalData: barangay,
      }));
      setAvailableBarangays(barangays);
      setError(null);
    } catch (err) {
      handleErrorSilently(err, "Fetch Barangays");
      setAvailableBarangays([]);
      setError("Failed to load barangay data");
    } finally {
      setLoading(false);
    }
  };

  const fetchBarangayStats = async () => {
    if (!availableBarangays.length) return;
    try {
      const statsArr = await Promise.all(
        availableBarangays.map(async (barangay) => {
          try {
            const [household, population, family, pets, requests] =
              await Promise.all([
                api.get("/statistics/total-households", {
                  params: { barangayId: barangay.id },
                }),
                api.get("/statistics/total-population", {
                  params: { barangayId: barangay.id },
                }),
                api.get("/statistics/total-families", {
                  params: { barangayId: barangay.id },
                }),
                api.get("/statistics/total-registered-pets", {
                  params: { barangayId: barangay.id },
                }),
                api.get("/statistics/total-requests", {
                  params: { barangayId: barangay.id },
                }),
              ]);
            return {
              barangayId: barangay.id,
              households: household.data.data?.total_households || 0,
              residents: parseInt(population.data.data?.total_population) || 0,
              families: family.data.data?.total_families || 0,
              pets: pets.data.data?.total_pets || 0,
              addedThisMonth: household.data.data?.added_this_month || 0,
              completedCertificates:
                requests.data.data?.completed_certificates || 0,
              totalRequests: requests.data.data?.total_requests || 0,
            };
          } catch (err) {
            handleErrorSilently(err, `Fetch Barangay Stats (ID: ${barangay.id})`);
            return {
              barangayId: barangay.id,
              households: 0,
              residents: 0,
              families: 0,
              pets: 0,
              addedThisMonth: 0,
              completedCertificates: 0,
              totalRequests: 0,
            };
          }
        })
      );
      const statsMap = {};
      statsArr.forEach((stat) => {
        statsMap[stat.barangayId] = stat;
      });
      setBarangayStats(statsMap);
    } catch (err) {
      handleErrorSilently(err, "Fetch Barangay Statistics");
    }
  };

  useEffect(() => {
    fetchBarangays();
  }, []);

  useEffect(() => {
    if (availableBarangays.length) fetchBarangayStats();
  }, [availableBarangays]);

  useEffect(() => {
    const saved = localStorage.getItem("selectedBarangay");
    if (saved && availableBarangays.length) {
      try {
        const parsed = JSON.parse(saved);
        const found = availableBarangays.find((b) => b.id === parsed.id);
        if (found) setSelectedBarangay(found);
      } catch (err) {
        handleErrorSilently(err, "Parse Saved Barangay");
        localStorage.removeItem("selectedBarangay");
      }
    }
  }, [availableBarangays]);

  const handleSetSelectedBarangay = (barangay) => {
    setSelectedBarangay(barangay);
    localStorage.setItem("selectedBarangay", JSON.stringify(barangay));
  };

  const clearBarangaySelection = () => {
    setSelectedBarangay(null);
    localStorage.removeItem("selectedBarangay");
  };

  const getBarangayStats = (barangayId) =>
    barangayStats[barangayId] || {
      households: 0,
      residents: 0,
      families: 0,
      addedThisMonth: 0,
      completedCertificates: 0,
      totalRequests: 0,
    };

  const value = {
    selectedBarangay,
    setSelectedBarangay: handleSetSelectedBarangay,
    availableBarangays,
    barangayStats,
    getBarangayStats,
    isBarangaySelected: !!selectedBarangay,
    clearBarangaySelection,
    loading,
    error,
    refetchBarangays: fetchBarangays,
  };

  return (
    <BarangayContext.Provider value={value}>
      {children}
    </BarangayContext.Provider>
  );
};

export const useBarangay = () => {
  const context = useContext(BarangayContext);
  if (!context) {
    throw new Error("useBarangay must be used within a BarangayProvider");
  }
  return context;
};
