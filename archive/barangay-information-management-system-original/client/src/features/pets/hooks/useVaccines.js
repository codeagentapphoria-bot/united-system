import { useState, useEffect } from "react";
import { vaccineService } from "@/services/vaccineService";
import { useToast } from "@/hooks/use-toast";

export const useVaccines = (petId) => {
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch vaccines for a pet
  const fetchVaccines = async (targetId) => {
    if (!targetId) return;
    
    setLoading(true);
    try {
      const response = await vaccineService.getVaccinesByTarget("pet", targetId);
      setVaccines(response.data || []);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error fetching vaccines:", error);
}
      toast({
        title: "Error",
        description: "Failed to fetch vaccine records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get vaccine summary stats
  const getVaccineStats = () => {
    const total = vaccines.length;
    const recent = vaccines.filter(vaccine => {
      const daysSince = getDaysSinceVaccination(vaccine.vaccination_date);
      return daysSince <= 30;
    }).length;
    const overdue = vaccines.filter(vaccine => {
      const daysSince = getDaysSinceVaccination(vaccine.vaccination_date);
      return daysSince > 365;
    }).length;

    return { total, recent, overdue };
  };

  // Get days since vaccination
  const getDaysSinceVaccination = (dateString) => {
    const vaccinationDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - vaccinationDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get latest vaccine
  const getLatestVaccine = () => {
    if (vaccines.length === 0) return null;
    return vaccines.sort((a, b) => new Date(b.vaccination_date) - new Date(a.vaccination_date))[0];
  };

  useEffect(() => {
    if (petId) {
      fetchVaccines(petId);
    }
  }, [petId]);

  return {
    vaccines,
    loading,
    fetchVaccines,
    getVaccineStats,
    getLatestVaccine,
    getDaysSinceVaccination,
  };
};
