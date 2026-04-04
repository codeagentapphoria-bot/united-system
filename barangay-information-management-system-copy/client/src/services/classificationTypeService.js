import api from '../utils/api';
import { handleErrorSilently } from '../utils/errorHandler';

export const classificationTypeService = {
  // Get all classification types for the current municipality
  async getClassificationTypes(municipalityId) {
    try {
      const response = await api.get('/classification-types', {
        params: { municipalityId }
      });
      return response.data;
    } catch (error) {
      handleErrorSilently(error, 'Fetch Classification Types');
      throw error;
    }
  },

  // Get a specific classification type by ID
  async getClassificationTypeById(id) {
    try {
      const response = await api.get(`/classification-types/${id}`);
      return response.data;
    } catch (error) {
      handleErrorSilently(error, 'Fetch Classification Type');
      throw error;
    }
  },

  // Create a new classification type
  async createClassificationType(data) {
    try {
      const response = await api.post('/classification-types', data);
      return response.data;
    } catch (error) {
      handleErrorSilently(error, 'Create Classification Type');
      throw error;
    }
  },

  // Update an existing classification type
  async updateClassificationType(id, data) {
    try {
      const response = await api.put(`/classification-types/${id}`, data);
      return response.data;
    } catch (error) {
      handleErrorSilently(error, 'Update Classification Type');
      throw error;
    }
  },

  // Delete a classification type
  async deleteClassificationType(id) {
    try {
      const response = await api.delete(`/classification-types/${id}`);
      return response.data;
    } catch (error) {
      handleErrorSilently(error, 'Delete Classification Type');
      throw error;
    }
  },
};
