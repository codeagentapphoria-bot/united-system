import api from "@/utils/api";

class InventoryService {
  // Get inventory list with pagination and filters
  async getInventoryList(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.barangayId) queryParams.append('barangayId', params.barangayId);
    if (params.itemType) queryParams.append('itemType', params.itemType);
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page);
    if (params.perPage) queryParams.append('perPage', params.perPage);

    const response = await api.get(`/list/inventories?${queryParams.toString()}`);
    return response.data;
  }

  // Get single inventory item
  async getInventoryInfo(inventoryId) {
    const response = await api.get(`/${inventoryId}/inventory`);
    return response.data;
  }

  // Create new inventory item
  async createInventory(formData) {
    const response = await api.post('/inventory', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Update inventory item
  async updateInventory(inventoryId, formData) {
    const response = await api.put(`/${inventoryId}/inventory`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Delete inventory item
  async deleteInventory(inventoryId) {
    const response = await api.delete(`/${inventoryId}/inventory`);
    return response.data;
  }
}

export const inventoryService = new InventoryService();
