import api from './auth.service';
import type { TransactionNote } from './transaction-note.service';

export interface AppointmentNote {
  id: string;
  transactionId: string;
  type: 'GENERAL' | 'DATE_CHANGE_REASON' | 'FOLLOW_UP' | 'INTERNAL';
  note: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  subscriberId: string;
  serviceId: string;
  transactionType: string;
  transactionId: string;
  referenceNumber: string;
  paymentStatus: string;
  paymentAmount: number;
  transmitalNo?: string;
  referenceNumberGeneratedAt?: string;
  isResidentOfBorongan: boolean;
  permitType?: string;
  status?: string;
  isPosted: boolean;
  validIdToPresent?: string;
  remarks?: string;
  serviceData?: any;
  // Appointment fields
  preferredAppointmentDate?: string;
  scheduledAppointmentDate?: string;
  appointmentStatus?: 'PENDING' | 'ACCEPTED' | 'REQUESTED_UPDATE' | 'DECLINED' | 'CANCELLED';
  appointmentNotes?: AppointmentNote[];
  // Transaction notes/messages
  transactionNotes?: TransactionNote[];
  unreadMessageCount?: number;
  // Update request fields
  updateRequestStatus?: 'NONE' | 'PENDING_PORTAL' | 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED';
  updateRequestDescription?: string;
  updateRequestedBy?: 'PORTAL' | 'ADMIN';
  pendingServiceData?: any;
  adminUpdateRequestDescription?: string;
  createdAt: string;
  updatedAt: string;
  service?: {
    id: string;
    code: string;
    name: string;
    description?: string;
  };
  subscriber?: {
    id: string;
    citizen?: {
      id: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      email?: string;
    };
    nonCitizen?: {
      id: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      email?: string;
    };
  };
  birthCertificate?: any;
  cedulas?: any;
  occupationalHealth?: any;
  rptax?: any;
  bptax?: any;
  nov?: any;
  ovrs?: any;
  bpls?: any;
  eboss?: any;
  deathCertificate?: any;
  taxComputation?: {
    id: string;
    totalTax: number;
    adjustedTax?: number | null;
    balance?: {
      totalTax: number;
      totalPaid: number;
      balance: number;
    };
    exemptionsApplied?: string[] | null;
    discountsApplied?: string[] | null;
    penaltiesApplied?: string[] | null;
  };
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ServiceStatistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  byPaymentStatus: Record<string, number>;
  totalRevenue: number;
  byDate: Array<{ date: string; count: number; revenue: number }>;
}

export interface GetTransactionsByServiceFilters {
  paymentStatus?: string;
  status?: string;
  isResidentOfBorongan?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  serviceData?: Record<string, string>; // Filter by serviceData fields
}

export const transactionService = {
  async getTransactions(
    subscriberId: string,
    type?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedTransactions> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (type) params.append('serviceId', type);

    const response = await api.get(`/transactions/subscriber/${subscriberId}?${params.toString()}`);
    // Backend returns: { status: 'success', data: transactions[], pagination: {...} }
    return {
      transactions: response.data.data || [],
      pagination: response.data.pagination || {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  },

  async getTransaction(id: string): Promise<Transaction> {
    const response = await api.get(`/transactions/${id}`);
    return response.data.data;
  },

  async getTransactionsByService(
    serviceCode: string,
    filters: GetTransactionsByServiceFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedTransactions> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
    if (filters.status) params.append('status', filters.status);
    if (filters.isResidentOfBorongan !== undefined) {
      params.append('isResidentOfBorongan', filters.isResidentOfBorongan.toString());
    }
    if (filters.search) params.append('search', filters.search);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.serviceData && Object.keys(filters.serviceData).length > 0) {
      params.append('serviceData', JSON.stringify(filters.serviceData));
    }

    const response = await api.get(`/transactions/service/${serviceCode}?${params.toString()}`);
    return {
      transactions: response.data.data,
      pagination: response.data.pagination,
    };
  },

  async getServiceStatistics(
    serviceCode: string,
    startDate?: string,
    endDate?: string
  ): Promise<ServiceStatistics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const queryString = params.toString();
    const url = `/transactions/service/${serviceCode}/statistics${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return response.data.data;
  },

  async createTransaction(data: {
    subscriberId: string;
    serviceId: string;
    serviceData?: Record<string, any>;
    paymentAmount?: number;
    isResidentOfBorongan?: boolean;
    permitType?: string;
    validIdToPresent?: string;
    remarks?: string;
  }): Promise<Transaction> {
    const response = await api.post('/transactions', data);
    return response.data.data;
  },

  async updateTransaction(
    id: string,
    data: {
      paymentStatus?: string;
      paymentAmount?: number;
      status?: string;
      isPosted?: boolean;
      remarks?: string;
      serviceData?: any;
    }
  ): Promise<Transaction> {
    const response = await api.put(`/transactions/${id}`, data);
    return response.data.data;
  },

  async downloadTransaction(id: string): Promise<void> {
    try {
      const response = await api.get(`/transactions/${id}/download`, {
        responseType: 'blob',
      });
      
      // Create blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'transaction-document.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to download transaction document');
    }
  },

  async requestUpdate(
    id: string,
    data: {
      description: string;
      serviceData: Record<string, any>;
      preferredAppointmentDate?: string;
    }
  ): Promise<Transaction> {
    const response = await api.post(`/transactions/${id}/request-update`, data);
    return response.data.data;
  },

  async adminRequestUpdate(
    id: string,
    data: {
      description: string;
    }
  ): Promise<Transaction> {
    const response = await api.post(`/transactions/${id}/admin-request-update`, data);
    return response.data.data;
  },

  async reviewUpdateRequest(
    id: string,
    data: {
      approved: boolean;
    }
  ): Promise<Transaction> {
    const response = await api.post(`/transactions/${id}/review-update-request`, data);
    return response.data.data;
  },

  async getAppointments(params?: {
    startDate?: string;
    endDate?: string;
    date?: string;
  }): Promise<Transaction[]> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params?.endDate) {
      queryParams.append('endDate', params.endDate);
    }
    if (params?.date) {
      queryParams.append('date', params.date);
    }
    
    const queryString = queryParams.toString();
    const url = `/transactions/appointments${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return response.data.data;
  },
};
