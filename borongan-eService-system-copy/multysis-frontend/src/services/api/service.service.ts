import api from './auth.service';

export interface Service {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  order: number;
  isActive: boolean;
  requiresPayment: boolean;
  defaultAmount?: number;
  paymentStatuses?: string[];
  formFields?: any;
  displayInSidebar: boolean;
  displayInSubscriberTabs: boolean;
  requiresAppointment?: boolean;
  appointmentDuration?: number; // Duration in minutes
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedServices {
  services: Service[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateServiceInput {
  code: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  order?: number;
  isActive?: boolean;
  requiresPayment?: boolean;
  defaultAmount?: number;
  paymentStatuses?: string[];
  formFields?: any;
  displayInSidebar?: boolean;
  displayInSubscriberTabs?: boolean;
  requiresAppointment?: boolean;
  appointmentDuration?: number; // Duration in minutes
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {}

export interface FieldMetadata {
  name: string;
  type: string;
  required: boolean;
  label?: string;
  placeholder?: string;
}

export interface AppointmentSlot {
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // Time in HH:mm format
  datetime: string; // ISO datetime string
  isAvailable: boolean;
  transactionId?: string;
}

export const serviceService = {
  async getAllServices(
    page: number = 1,
    limit: number = 10,
    search?: string,
    category?: string,
    isActive?: boolean,
    signal?: AbortSignal
  ): Promise<PaginatedServices> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (isActive !== undefined) params.append('isActive', isActive.toString());

    const response = await api.get(`/services?${params.toString()}`, { signal });
    return {
      services: response.data.data,
      pagination: response.data.pagination,
    };
  },

  async getActiveServices(
    options?: {
      displayInSidebar?: boolean;
      displayInSubscriberTabs?: boolean;
    },
    signal?: AbortSignal
  ): Promise<Service[]> {
    const params = new URLSearchParams();
    if (options?.displayInSidebar !== undefined) {
      params.append('displayInSidebar', options.displayInSidebar.toString());
    }
    if (options?.displayInSubscriberTabs !== undefined) {
      params.append('displayInSubscriberTabs', options.displayInSubscriberTabs.toString());
    }

    const queryString = params.toString();
    const url = `/services/active${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url, { signal });
    return response.data.data;
  },

  async getCategories(signal?: AbortSignal): Promise<string[]> {
    const response = await api.get('/services/categories', { signal });
    return response.data.data;
  },

  async getService(id: string, signal?: AbortSignal): Promise<Service> {
    const response = await api.get(`/services/${id}`, { signal });
    return response.data.data;
  },

  async getServiceByCode(code: string): Promise<Service> {
    const response = await api.get(`/services/code/${code}`);
    return response.data.data;
  },

  async createService(data: CreateServiceInput): Promise<Service> {
    const response = await api.post('/services', data);
    return response.data.data;
  },

  async updateService(id: string, data: UpdateServiceInput): Promise<Service> {
    const response = await api.put(`/services/${id}`, data);
    return response.data.data;
  },

  async deleteService(id: string): Promise<void> {
    await api.delete(`/services/${id}`);
  },

  async activateService(id: string): Promise<Service> {
    const response = await api.patch(`/services/${id}/activate`);
    return response.data.data;
  },

  async deactivateService(id: string): Promise<Service> {
    const response = await api.patch(`/services/${id}/deactivate`);
    return response.data.data;
  },

  async getAppointmentAvailability(
    serviceId: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: AppointmentSlot[] }> {
    const response = await api.get(`/services/${serviceId}/appointments/availability`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  async getServiceFieldsMetadata(serviceId: string): Promise<FieldMetadata[]> {
    const response = await api.get(`/service-fields/${serviceId}`);
    return response.data.data;
  },
};

// Export for convenience
export const serviceApi = serviceService;

