import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/utils/api";
import { handleErrorSilently } from "@/utils/errorHandler";

const BarangayContext = createContext();

const toNumber = (value) => Number.parseInt(value ?? 0, 10) || 0;

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
      const rows = data?.data?.data || [];
      const barangays = rows.map((barangay) => {
        const stats = {
          households: toNumber(barangay.household_count),
          residents: toNumber(barangay.resident_count),
          families: toNumber(barangay.family_count),
          pets: toNumber(barangay.pet_count),
          addedThisMonth: 0,
          completedCertificates: toNumber(barangay.completed_certificates),
          totalRequests: toNumber(barangay.total_requests),
        };

        return {
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
          stats,
          originalData: barangay,
        };
      });

      setBarangayStats(
        Object.fromEntries(
          barangays.map((barangay) => [barangay.id, barangay.stats])
        )
      );
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

  useEffect(() => {
    fetchBarangays();
  }, []);

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
      pets: 0,
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
