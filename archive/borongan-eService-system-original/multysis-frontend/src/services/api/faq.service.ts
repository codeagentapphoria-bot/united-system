import api from './auth.service';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFAQInput {
  question: string;
  answer: string;
  order?: number;
  isActive?: boolean;
}

export interface UpdateFAQInput extends Partial<CreateFAQInput> {}

export interface PaginatedFAQs {
  faqs: FAQ[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const faqService = {
  async getAllFAQs(
    search?: string,
    isActive?: boolean
  ): Promise<FAQ[]> {
    const params = new URLSearchParams();

    if (search) params.append('search', search);
    if (isActive !== undefined) params.append('isActive', isActive.toString());

    const queryString = params.toString();
    const url = `/faqs${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return response.data.data;
  },

  async getFAQ(id: string): Promise<FAQ> {
    const response = await api.get(`/faqs/${id}`);
    return response.data.data;
  },

  async createFAQ(data: CreateFAQInput): Promise<FAQ> {
    const response = await api.post('/faqs', data);
    return response.data.data;
  },

  async updateFAQ(id: string, data: UpdateFAQInput): Promise<FAQ> {
    const response = await api.put(`/faqs/${id}`, data);
    return response.data.data;
  },

  async deleteFAQ(id: string): Promise<void> {
    await api.delete(`/faqs/${id}`);
  },

  async activateFAQ(id: string): Promise<FAQ> {
    const response = await api.patch(`/faqs/${id}/activate`);
    return response.data.data;
  },

  async deactivateFAQ(id: string): Promise<FAQ> {
    const response = await api.patch(`/faqs/${id}/deactivate`);
    return response.data.data;
  },

  // Public methods (no auth required)
  async getHomepageFAQs(limit: number = 5): Promise<FAQ[]> {
    const response = await api.get(`/public/faqs/active?limit=${limit}`);
    return response.data.data;
  },

  async getPaginatedFAQs(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<PaginatedFAQs> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) params.append('search', search);

    const response = await api.get(`/public/faqs/paginated?${params.toString()}`);
    return {
      faqs: response.data.data,
      pagination: response.data.pagination,
    };
  },
};


