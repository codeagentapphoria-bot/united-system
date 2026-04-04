import type { AddSubscriberInput, EditProfileInput } from '@/validations/subscriber.schema';
import api from './auth.service';

import type { Citizen } from './citizen.service';

export interface Subscriber {
  id: string;
  firstName?: string; // Optional - comes from Person gateway when linked to citizen
  middleName?: string;
  lastName?: string; // Optional - comes from Person gateway when linked to citizen
  extensionName?: string;
  phoneNumber: string;
  email?: string;
  status: string;
  residentId?: string;
  residencyType?: string;
  residencyStatus?: string;
  profilePicture?: string;
  birthDate?: string;
  civilStatus?: string;
  sex?: string;
  residentAddress?: string;
  citizenId?: string;
  citizen?: Citizen;
  person?: {
    type: 'CITIZEN' | 'SUBSCRIBER';
    citizenId?: string;
    subscriberId?: string;
    citizen?: Citizen; // Included when type='CITIZEN'
  };
  placeOfBirth?: {
    region: string;
    province: string;
    municipality: string;
  };
  addressRegion?: string;
  addressProvince?: string;
  addressMunicipality?: string;
  addressBarangay?: string;
  addressStreetAddress?: string;
  addressPostalCode?: string;
  motherInfo?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedSubscribers {
  subscribers: Subscriber[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const subscriberService = {
  async getAllSubscribers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    residencyFilter?: 'all' | 'resident' | 'non-resident',
    status?: string
  ): Promise<PaginatedSubscribers> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) params.append('search', search);
    if (residencyFilter && residencyFilter !== 'all') {
      params.append('residencyFilter', residencyFilter);
    }
    if (status) params.append('status', status);

    const response = await api.get(`/subscribers?${params.toString()}`);
    return {
      subscribers: response.data.data,
      pagination: response.data.pagination,
    };
  },

  async getSubscriber(id: string): Promise<Subscriber> {
    const response = await api.get(`/subscribers/${id}`);
    return response.data.data;
  },

  async createSubscriber(data: AddSubscriberInput): Promise<Subscriber> {
    const formData = new FormData();
    
    // Add citizen linking if provided
    if (data.isCitizen && data.citizenId) {
      formData.append('citizenId', data.citizenId);
      formData.append('isCitizen', 'true');
      // When linked to citizen, still need to send name fields for backend validation
      // Backend will use citizen data instead, but validation requires these fields
      if (data.firstName) formData.append('firstName', data.firstName);
      if (data.middleName) formData.append('middleName', data.middleName || '');
      if (data.lastName) formData.append('lastName', data.lastName);
    } else {
      formData.append('isCitizen', 'false');
      // Only add name fields if not linked to citizen
      if (data.firstName) formData.append('firstName', data.firstName);
      if (data.middleName) formData.append('middleName', data.middleName);
      if (data.lastName) formData.append('lastName', data.lastName);
    }
    
    // Format phone number: convert to 09XXXXXXXXX format for backend validation
    // Frontend has: countryCode (+63) + mobileNumber (9171234567)
    // Backend expects: 09XXXXXXXXX (11 digits starting with 0)
    // If linked to citizen and citizen has phone, phoneNumber is optional
    // If linked to citizen and citizen doesn't have phone, phoneNumber is required
    let phoneNumber = '';
    if (data.mobileNumber && data.mobileNumber.trim().length > 0) {
      // Remove all non-digits
      let mobile = data.mobileNumber.replace(/\D/g, '');
      
      // Remove country code if present (63 or 639)
      if (mobile.startsWith('63') && mobile.length > 10) {
        mobile = mobile.substring(2);
      }
      
      // Ensure we have exactly 10 digits, then add leading 0
      if (mobile.length === 10 && /^\d{10}$/.test(mobile)) {
        // Convert 9171234567 to 09171234567
        phoneNumber = `0${mobile}`;
      } else if (mobile.length === 11 && mobile.startsWith('0')) {
        // Already in 09XXXXXXXXX format
        phoneNumber = mobile;
      } else {
        // Try to extract last 10 digits and add leading 0
        const last10 = mobile.slice(-10);
        if (last10.length === 10 && /^\d{10}$/.test(last10)) {
          phoneNumber = `0${last10}`;
        } else {
          // Fallback: use as-is (will fail validation but at least we tried)
          phoneNumber = mobile;
        }
      }
    }
    
    // Only append phoneNumber if it's provided (for citizens without phone, it's required)
    if (phoneNumber) {
      formData.append('phoneNumber', phoneNumber);
    }
    if (data.email) formData.append('email', data.email);
    formData.append('password', data.password);
    
    // Add profile picture if it's a File object
    if (data.profilePictureFile instanceof File) {
      formData.append('profilePicture', data.profilePictureFile);
    }

    const response = await api.post('/subscribers', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  async updateSubscriber(id: string, data: Partial<EditProfileInput>): Promise<Subscriber> {
    const formData = new FormData();
    // Only append fields if they exist in the data object AND have values (not empty strings)
    // This ensures we don't send undefined fields that would trigger backend validation errors
    if (data.firstName !== undefined && data.firstName.trim() !== '') formData.append('firstName', data.firstName);
    if (data.middleName !== undefined && data.middleName.trim() !== '') formData.append('middleName', data.middleName);
    if (data.lastName !== undefined && data.lastName.trim() !== '') formData.append('lastName', data.lastName);
    if (data.extensionName !== undefined && data.extensionName.trim() !== '') formData.append('extensionName', data.extensionName);
    // Only append email if it's provided and not empty
    if (data.email !== undefined && data.email !== null && data.email.trim() !== '') {
      formData.append('email', data.email.trim());
    }
    if (data.phoneNumber !== undefined && data.phoneNumber.trim() !== '') formData.append('phoneNumber', data.phoneNumber);
    if (data.civilStatus !== undefined && data.civilStatus.trim() !== '') formData.append('civilStatus', data.civilStatus);
    if (data.sex !== undefined && data.sex.trim() !== '') formData.append('sex', data.sex);
    if (data.birthdate !== undefined && data.birthdate.trim() !== '') formData.append('birthdate', data.birthdate);
    // Address fields
    if (data.addressRegion !== undefined && data.addressRegion.trim() !== '') formData.append('addressRegion', data.addressRegion);
    if (data.addressProvince !== undefined && data.addressProvince.trim() !== '') formData.append('addressProvince', data.addressProvince);
    if (data.addressMunicipality !== undefined && data.addressMunicipality.trim() !== '') formData.append('addressMunicipality', data.addressMunicipality);
    if (data.addressBarangay !== undefined && data.addressBarangay.trim() !== '') formData.append('addressBarangay', data.addressBarangay);
    if (data.addressPostalCode !== undefined && data.addressPostalCode.trim() !== '') formData.append('addressPostalCode', data.addressPostalCode);
    if (data.addressStreetAddress !== undefined && data.addressStreetAddress.trim() !== '') formData.append('addressStreetAddress', data.addressStreetAddress);
    if (data.region !== undefined && data.region.trim() !== '') formData.append('region', data.region);
    if (data.province !== undefined && data.province.trim() !== '') formData.append('province', data.province);
    if (data.municipality !== undefined && data.municipality.trim() !== '') formData.append('municipality', data.municipality);
    if (data.motherFirstName !== undefined && data.motherFirstName.trim() !== '') formData.append('motherFirstName', data.motherFirstName);
    if (data.motherMiddleName !== undefined && data.motherMiddleName.trim() !== '') formData.append('motherMiddleName', data.motherMiddleName);
    if (data.motherLastName !== undefined && data.motherLastName.trim() !== '') formData.append('motherLastName', data.motherLastName);
    
    // Add profile picture if it's a File object
    if (data.profilePictureFile instanceof File) {
      formData.append('profilePicture', data.profilePictureFile);
    }

    const response = await api.put(`/subscribers/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  async activateSubscriber(id: string): Promise<Subscriber> {
    const response = await api.patch(`/subscribers/${id}/activate`);
    return response.data.data;
  },

  async deactivateSubscriber(id: string): Promise<Subscriber> {
    const response = await api.patch(`/subscribers/${id}/deactivate`);
    return response.data.data;
  },

  async blockSubscriber(id: string, remarks?: string): Promise<Subscriber> {
    const response = await api.patch(`/subscribers/${id}/block`, { remarks });
    return response.data.data;
  },

  async changePassword(id: string, password: string, confirmPassword: string): Promise<void> {
    await api.patch(`/subscribers/${id}/password`, { password, confirmPassword });
  },

  async getSubscriberTransactions(id: string, serviceId?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (serviceId) {
      params.append('serviceId', serviceId);
    }
    const response = await api.get(`/subscribers/${id}/transactions${params.toString() ? `?${params.toString()}` : ''}`);
    return response.data.data;
  },

  async searchCitizens(query: string, limit: number = 10): Promise<any[]> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
    });
    const response = await api.get(`/subscribers/search/citizens?${params.toString()}`);
    return response.data.data;
  },
};

