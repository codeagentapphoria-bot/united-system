import axios from 'axios';

const getApiUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  return apiUrl;
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
  withCredentials: true,
  timeout: 60000, // 60 seconds for file uploads
});

// =============================================================================
// TYPES - Frontend types match backend response
// =============================================================================

export interface CitizenRegistrationData {
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  birthDate: string;
  sex: string;
  civilStatus: string;
  phoneNumber: string;
  email?: string;
  // Present Address
  address: string;
  barangay: string;
  municipality?: string;
  province?: string;
  region?: string;
  postalCode?: string;
  streetAddress?: string;
  // Documents
  idDocumentType: string;
  idDocumentNumber: string;
  idDocumentUrl: string;
  selfieUrl?: string;
}

export interface RegistrationSubmitResponse {
  id: string;                  // Registration request ID
  citizenId: string;           // Citizen record ID
  registrationRequestId: string;
  phoneNumber: string;
  status: 'PENDING';
  createdAt: string;
}

export interface RegistrationStatusResponse {
  citizenId: string;
  registrationRequestId: string | null;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';
  workflowStatus: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION' | null;
  firstName: string;
  lastName: string;
  createdAt: string;
  reviewedAt?: string;
  adminNotes?: string;
}

export interface RegistrationRequestResponse {
  id: string;
  citizenId: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  selfieUrl?: string;
  subscriberId?: string;
  createdAt: string;
  updatedAt: string;
  // Populated via include - documents now stored in Citizen table
  citizen?: {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    extensionName?: string;
    phoneNumber: string;
    email?: string;
    residencyStatus: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';
    birthDate: string;
    sex: string;
    civilStatus: string;
    address?: string;
    addressBarangay?: string;
    addressMunicipality?: string;
    addressProvince?: string;
    addressRegion?: string;
    addressPostalCode?: string;
    addressStreetAddress?: string;
    proofOfIdentification?: string;
    idType?: string;
    idDocumentNumber?: string;
  };
  subscriber?: {
    id: string;
    type: 'CITIZEN' | 'SUBSCRIBER';
  };
}

// =============================================================================
// SERVICE - Citizen Registration API
// =============================================================================

export const citizenRegistrationService = {
  /**
   * Submit a citizen registration request
   * 
   * Backend flow: Creates PENDING Citizen + RegistrationWorkflow (atomically)
   */
  async submitRegistration(data: CitizenRegistrationData): Promise<RegistrationSubmitResponse> {
    try {
      const formData = new FormData();
      // Personal Information
      formData.append('firstName', data.firstName);
      if (data.middleName) formData.append('middleName', data.middleName);
      formData.append('lastName', data.lastName);
      if (data.extensionName) formData.append('extensionName', data.extensionName);
      formData.append('birthDate', data.birthDate);
      formData.append('sex', data.sex);
      formData.append('civilStatus', data.civilStatus);
      formData.append('phoneNumber', data.phoneNumber);
      if (data.email) formData.append('email', data.email);
      // Present Address
      formData.append('address', data.address);
      formData.append('barangay', data.barangay);
      if (data.municipality) formData.append('municipality', data.municipality);
      if (data.province) formData.append('province', data.province);
      if (data.region) formData.append('region', data.region);
      if (data.postalCode) formData.append('postalCode', data.postalCode);
      if (data.streetAddress) formData.append('streetAddress', data.streetAddress);
      // Documents
      formData.append('idDocumentType', data.idDocumentType);
      formData.append('idDocumentNumber', data.idDocumentNumber);
      formData.append('idDocumentUrl', data.idDocumentUrl);
      if (data.selfieUrl) formData.append('selfieUrl', data.selfieUrl);

      const response = await api.post('/citizen-registration/register', formData);
      
      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Registration failed');
      }

      return response.data.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      throw new Error(errorMessage);
    }
  },

  /**
   * Check registration status by phone number
   * 
   * Backend flow: Queries Citizen table for status (with workflow status from RegistrationWorkflow)
   */
  async getRegistrationStatus(phoneNumber: string): Promise<RegistrationStatusResponse> {
    try {
      const response = await api.get(`/citizen-registration/register/status/${phoneNumber}`);
      
      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to get status');
      }

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('No registration found for this phone number');
      }
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get status';
      throw new Error(errorMessage);
    }
  },
};

// =============================================================================
// ADMIN SERVICE - Registration Workflow Management
// =============================================================================

const adminApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000,
});

// Add auth token to admin requests
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface RegistrationRequestFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  requests: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const adminRegistrationService = {
  /**
   * Get all registration requests (admin)
   */
  async getRegistrationRequests(filters?: RegistrationRequestFilters): Promise<PaginatedResponse<RegistrationRequestResponse>> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await adminApi.get(`/citizen-registration/registration-requests?${params.toString()}`);
      
      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to get registration requests');
      }

      return response.data.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get registration requests';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get single registration request by ID (admin)
   */
  async getRegistrationRequestById(id: string): Promise<RegistrationRequestResponse> {
    try {
      const response = await adminApi.get(`/citizen-registration/registration-requests/${id}`);
      
      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to get registration request');
      }

      return response.data.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get registration request';
      throw new Error(errorMessage);
    }
  },

  /**
   * Review registration request (approve/reject)
   */
  async reviewRegistration(
    id: string, 
    action: 'APPROVED' | 'REJECTED', 
    adminNotes?: string
  ): Promise<{
    citizenId: string;
    subscriberId?: string;
    residentId?: string;
    username?: string;
    status: string;
    reviewedAt: string;
    tempPasswordSent: boolean;
  }> {
    try {
      const response = await adminApi.post(`/citizen-registration/registration-requests/${id}/review`, {
        action,
        adminNotes,
      });
      
      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to review registration');
      }

      return response.data.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to review registration';
      throw new Error(errorMessage);
    }
  },

  /**
   * Request resubmission from applicant
   */
  async requestResubmission(id: string, adminNotes: string): Promise<void> {
    try {
      const response = await adminApi.post(`/citizen-registration/registration-requests/${id}/request-docs`, {
        adminNotes,
      });
      
      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to request resubmission');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to request resubmission';
      throw new Error(errorMessage);
    }
  },

  /**
   * Mark registration as under review
   */
  async markUnderReview(id: string): Promise<void> {
    try {
      const response = await adminApi.patch(`/citizen-registration/registration-requests/${id}/under-review`);
      
      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to mark as under review');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to mark as under review';
      throw new Error(errorMessage);
    }
  },

  /**
   * Delete rejected registrations older than X days (cron / manual admin)
   */
  async deleteRejectedRegistrations(daysOld: number = 30): Promise<{ deletedCount: number }> {
    try {
      const response = await adminApi.delete(
        `/citizen-registration/registration-requests/rejected?daysOld=${daysOld}`
      );
      
      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to delete rejected registrations');
      }

      return response.data.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete rejected registrations';
      throw new Error(errorMessage);
    }
  },

  /**
   * Delete a specific rejected registration (manual admin action)
   */
  async deleteRejectedRegistration(citizenId: string): Promise<void> {
    try {
      const response = await adminApi.delete(
        `/citizen-registration/registration-requests/rejected/${citizenId}`
      );
      
      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to delete rejected registration');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete rejected registration';
      throw new Error(errorMessage);
    }
  },
};

export default citizenRegistrationService;
