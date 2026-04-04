import api from "@/utils/api";

class SystemManagementService {
  /**
   * Export database as SQL dump
   */
  async exportDatabase() {
    const response = await api.get('/system-management/export/database', {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Export uploads folder as ZIP
   */
  async exportUploads() {
    const response = await api.get('/system-management/export/uploads', {
      responseType: 'blob',
    });
    return response.data;
  }
}

export const systemManagementService = new SystemManagementService();

