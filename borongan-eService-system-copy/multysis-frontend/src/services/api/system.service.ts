import api from './auth.service';

export interface System {
  id: string;
  slug: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteWarningResponse {
  status: 'warning';
  message: string;
  data: {
    affectedPages: number;
    affectedRoles: number;
  };
}

export const systemService = {
  async getSystems(signal?: AbortSignal): Promise<System[]> {
    try {
      const response = await api.get('/systems', { signal });
      return response.data.data || [];
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to fetch systems';
      throw new Error(errorMessage);
    }
  },

  async getSystem(slug: string, signal?: AbortSignal): Promise<System> {
    try {
      const response = await api.get(`/systems/${slug}`, { signal });
      return response.data.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to fetch system';
      throw new Error(errorMessage);
    }
  },

  async createSystem(
    data: { slug: string; label: string },
    signal?: AbortSignal
  ): Promise<System> {
    try {
      const response = await api.post('/systems', data, { signal });
      return response.data.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to create system';
      throw new Error(errorMessage);
    }
  },

  async updateSystem(
    slug: string,
    data: { slug?: string; label?: string },
    signal?: AbortSignal
  ): Promise<System> {
    try {
      const response = await api.put(`/systems/${slug}`, data, { signal });
      return response.data.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to update system';
      throw new Error(errorMessage);
    }
  },

  /**
   * Delete a system.
   * Returns a warning response (409) with affected counts if the system has pages/roles.
   * Use force=true query param to force delete (set pages/roles to 'unassigned' first).
   */
  async deleteSystem(
    slug: string,
    force: boolean = false,
    signal?: AbortSignal
  ): Promise<{ affectedPages: number; affectedRoles: number } | void> {
    try {
      const params = force ? '?force=true' : '';
      await api.delete(`/systems/${slug}${params}`, { signal });
    } catch (error: any) {
      const status = error.response?.status;
      const data: DeleteWarningResponse | undefined = error.response?.data;

      if (status === 409 && data?.status === 'warning') {
        // Return the warning data so the UI can show the confirmation dialog
        return data.data;
      }

      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to delete system';
      throw new Error(errorMessage);
    }
  },
};
