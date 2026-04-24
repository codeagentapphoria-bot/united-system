import api from './auth.service';

export interface Page {
  id: string;
  system: string;
  path: string;
  name: string;
  createdAt: string;
}

export interface PaginatedPages {
  pages: Page[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const pageService = {
  async getPages(
    system?: string,
    page: number = 1,
    limit: number = 100,
    signal?: AbortSignal
  ): Promise<PaginatedPages> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (system) params.append('system', system);

      const response = await api.get(`/pages?${params.toString()}`, { signal });
      return {
        pages: response.data.pages || [],
        pagination: response.data.pagination || {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to fetch pages';
      throw new Error(errorMessage);
    }
  },

  async createPage(
    data: { system: string; path: string; name: string },
    signal?: AbortSignal
  ): Promise<Page> {
    try {
      const response = await api.post('/pages', data, { signal });
      return response.data.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to create page';
      throw new Error(errorMessage);
    }
  },

  async updatePage(
    id: string,
    data: { system?: string; path?: string; name?: string },
    signal?: AbortSignal
  ): Promise<Page> {
    try {
      const response = await api.put(`/pages/${id}`, data, { signal });
      return response.data.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to update page';
      throw new Error(errorMessage);
    }
  },

  async deletePage(id: string, signal?: AbortSignal): Promise<void> {
    try {
      await api.delete(`/pages/${id}`, { signal });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to delete page';
      throw new Error(errorMessage);
    }
  },
};
