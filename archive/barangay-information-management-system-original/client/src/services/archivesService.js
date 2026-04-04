import api from '@/utils/api';

class ArchivesService {
  // Get list of archives with pagination and filters
  async getArchivesList(params = {}) {
    try {
      const response = await api.get('/list/archives', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch archives');
    }
  }

  // Get single archive info
  async getArchiveInfo(archiveId) {
    try {
      const response = await api.get(`/${archiveId}/archive`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch archive details');
    }
  }

  // Create new archive
  async createArchive(formData) {
    try {
      const response = await api.post('/archive', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create archive');
    }
  }

  // Update existing archive
  async updateArchive(archiveId, formData) {
    try {
      const response = await api.put(`/${archiveId}/archive`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update archive');
    }
  }

  // Delete archive
  async deleteArchive(archiveId) {
    try {
      const response = await api.delete(`/${archiveId}/archive`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete archive');
    }
  }
}

export const archivesService = new ArchivesService();
