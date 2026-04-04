import api from "@/utils/api";

export const vaccineService = {
  // Create a new vaccine record
  createVaccine: async (vaccineData) => {
    try {
      const response = await api.post("/vaccine", vaccineData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get vaccines by target (pet or resident)
  getVaccinesByTarget: async (targetType, targetId) => {
    try {
      const response = await api.get(`/vaccines/${targetType}/${targetId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get vaccine by ID
  getVaccineById: async (id) => {
    try {
      const response = await api.get(`/vaccine/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update vaccine record
  updateVaccine: async (id, vaccineData) => {
    try {
      const response = await api.put(`/vaccine/${id}`, vaccineData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete vaccine record
  deleteVaccine: async (id) => {
    try {
      const response = await api.delete(`/vaccine/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
