import type { AddCitizenInput, EditCitizenInput } from '@/validations/citizen.schema';
import { getToken } from '../../utils/tokenStorage';
import api from './auth.service';

export interface Citizen {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  email?: string;
  phoneNumber?: string;
  citizenPicture?: string;
  birthDate: string;
  civilStatus: string;
  sex: string;
  username: string;
  pin: string;
  residentId?: string;
  residencyStatus: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED';
  residencyApplicationRemarks?: string;
  isResident: boolean;
  isVoter: boolean;
  proofOfResidency?: string;
  proofOfIdentification?: string;
  address?: string;
  isEmployed: boolean;
  citizenship?: string;
  acrNo?: string;
  profession?: string;
  height?: string;
  weight?: string;
  // Spouse and Emergency Contact
  spouseName?: string;
  emergencyContactPerson?: string;
  emergencyContactNumber?: string;
  // Complete Address (separated fields)
  addressRegion?: string;
  addressProvince?: string;
  addressMunicipality?: string;
  addressBarangay?: string;
  addressPostalCode?: string;
  addressStreetAddress?: string;
  // Valid ID
  idType?: string;
  citizenPlaceOfBirth?: {
    region: string;
    province: string;
    municipality: string;
  };
  // Beneficiary information
  beneficiaryInfo?: Array<{
    type: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT';
    programIds: string[];
    programNames: string[];
    programTypes: string[];
  }>;
  isBeneficiary?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCitizens {
  citizens: Citizen[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const citizenService = {
  async getAllCitizens(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED'
  ): Promise<PaginatedCitizens> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) params.append('search', search);
    if (status) params.append('status', status);

    const response = await api.get(`/citizens?${params.toString()}`);
    return {
      citizens: response.data.data,
      pagination: response.data.pagination,
    };
  },

  async getCitizen(id: string): Promise<Citizen> {
    const response = await api.get(`/citizens/${id}`);
    return response.data.data;
  },

  async createCitizen(data: AddCitizenInput): Promise<Citizen> {
    const formData = new FormData();
    
    // Add all non-file fields
    formData.append('firstName', data.firstName);
    if (data.middleName) formData.append('middleName', data.middleName);
    formData.append('lastName', data.lastName);
    if (data.extensionName) formData.append('extensionName', data.extensionName);
    if (data.email && data.email.trim() !== '') formData.append('email', data.email);
    formData.append('phoneNumber', data.phoneNumber);
    // Spouse and Emergency Contact
    if (data.spouseName) formData.append('spouseName', data.spouseName);
    formData.append('emergencyContactPerson', data.emergencyContactPerson);
    formData.append('emergencyContactNumber', data.emergencyContactNumber);
    // Complete Address
    formData.append('addressRegion', data.addressRegion);
    formData.append('addressProvince', data.addressProvince);
    formData.append('addressMunicipality', data.addressMunicipality);
    formData.append('addressBarangay', data.addressBarangay);
    formData.append('addressPostalCode', data.addressPostalCode);
    if (data.addressStreetAddress) formData.append('addressStreetAddress', data.addressStreetAddress);
    // Valid ID
    formData.append('idType', data.idType);
    formData.append('civilStatus', data.civilStatus);
    formData.append('sex', data.sex);
    formData.append('birthDate', data.birthdate);
    formData.append('region', data.region);
    formData.append('province', data.province);
    formData.append('municipality', data.municipality);
    // Convert booleans to strings for FormData
    formData.append('isResident', String(data.isResident));
    formData.append('isVoter', String(data.isVoter));
    formData.append('username', data.username);
    formData.append('pin', data.pin);
    if (data.address) formData.append('address', data.address);
    if (data.isEmployed !== undefined) formData.append('isEmployed', String(data.isEmployed));
    if (data.citizenship) formData.append('citizenship', data.citizenship);
    if (data.acrNo) formData.append('acrNo', data.acrNo);
    if (data.profession) formData.append('profession', data.profession);
    if (data.height) formData.append('height', data.height);
    if (data.weight) formData.append('weight', data.weight);
    
    // Add files if they exist
    if (data.citizenPictureFile) {
      formData.append('citizenPicture', data.citizenPictureFile);
    }
    if (data.proofOfResidencyFile) {
      formData.append('proofOfResidency', data.proofOfResidencyFile);
    }
    if (data.proofOfIdentificationFile) {
      formData.append('proofOfIdentification', data.proofOfIdentificationFile);
    }

    const response = await api.post('/citizens', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  async updateCitizen(id: string, data: EditCitizenInput): Promise<Citizen> {
    const formData = new FormData();
    
    // Add all non-file fields
    if (data.firstName) formData.append('firstName', data.firstName);
    if (data.middleName !== undefined) formData.append('middleName', data.middleName);
    if (data.lastName) formData.append('lastName', data.lastName);
    if (data.extensionName !== undefined) formData.append('extensionName', data.extensionName);
    if (data.email && data.email.trim() !== '') formData.append('email', data.email);
    if (data.phoneNumber !== undefined) formData.append('phoneNumber', data.phoneNumber);
    // Spouse and Emergency Contact
    if (data.spouseName !== undefined) formData.append('spouseName', data.spouseName || '');
    if (data.emergencyContactPerson !== undefined) formData.append('emergencyContactPerson', data.emergencyContactPerson || '');
    if (data.emergencyContactNumber !== undefined) formData.append('emergencyContactNumber', data.emergencyContactNumber || '');
    // Complete Address
    if (data.addressRegion !== undefined) formData.append('addressRegion', data.addressRegion || '');
    if (data.addressProvince !== undefined) formData.append('addressProvince', data.addressProvince || '');
    if (data.addressMunicipality !== undefined) formData.append('addressMunicipality', data.addressMunicipality || '');
    if (data.addressBarangay !== undefined) formData.append('addressBarangay', data.addressBarangay || '');
    if (data.addressPostalCode !== undefined) formData.append('addressPostalCode', data.addressPostalCode || '');
    if (data.addressStreetAddress !== undefined) formData.append('addressStreetAddress', data.addressStreetAddress || '');
    // Valid ID
    if (data.idType !== undefined) formData.append('idType', data.idType || '');
    if (data.civilStatus) formData.append('civilStatus', data.civilStatus);
    if (data.sex) formData.append('sex', data.sex);
    if (data.birthdate) formData.append('birthDate', data.birthdate);
    if (data.region) formData.append('region', data.region);
    if (data.province) formData.append('province', data.province);
    if (data.municipality) formData.append('municipality', data.municipality);
    if (data.isResident !== undefined) formData.append('isResident', data.isResident.toString());
    if (data.isVoter !== undefined) formData.append('isVoter', data.isVoter.toString());
    if (data.username) formData.append('username', data.username);
    if (data.pin) formData.append('pin', data.pin);
    if (data.address !== undefined) formData.append('address', data.address || '');
    if (data.isEmployed !== undefined) formData.append('isEmployed', data.isEmployed.toString());
    if (data.citizenship !== undefined) formData.append('citizenship', data.citizenship || '');
    if (data.acrNo !== undefined) formData.append('acrNo', data.acrNo || '');
    if (data.profession !== undefined) formData.append('profession', data.profession || '');
    if (data.height !== undefined) formData.append('height', data.height || '');
    if (data.weight !== undefined) formData.append('weight', data.weight || '');
    
    // Add files if they exist
    if (data.citizenPictureFile) {
      formData.append('citizenPicture', data.citizenPictureFile);
    }
    if (data.proofOfResidencyFile) {
      formData.append('proofOfResidency', data.proofOfResidencyFile);
    }
    if (data.proofOfIdentificationFile) {
      formData.append('proofOfIdentification', data.proofOfIdentificationFile);
    }

    const response = await api.put(`/citizens/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  async approveCitizen(id: string, remarks?: string): Promise<Citizen> {
    const response = await api.patch(`/citizens/${id}/approve`, { remarks });
    return response.data.data;
  },

  async rejectCitizen(id: string, remarks?: string): Promise<Citizen> {
    const response = await api.patch(`/citizens/${id}/reject`, { remarks });
    return response.data.data;
  },

  async removeCitizen(id: string, remarks?: string): Promise<{ success: boolean; message: string }> {
    const response = await api.patch(`/citizens/${id}/remove`, { remarks });
    return response.data.data;
  },

  async activateCitizen(id: string): Promise<Citizen> {
    const response = await api.patch(`/citizens/${id}/activate`);
    return response.data.data;
  },

  async deactivateCitizen(id: string): Promise<Citizen> {
    const response = await api.patch(`/citizens/${id}/deactivate`);
    return response.data.data;
  },

  async checkUsernameAvailability(username: string, excludeId?: string): Promise<boolean> {
    try {
      const params = new URLSearchParams({ username });
      if (excludeId) params.append('excludeId', excludeId);
      const response = await api.get(`/citizens/check-username?${params.toString()}`);
      return response.data.data.available;
    } catch (error: any) {
      // If unauthorized, check if token exists
      if (error.response?.status === 401) {
        const token = getToken();
        if (!token) {
          throw new Error('Authentication required. Please log in again.');
        }
        throw new Error('Authentication failed. Please log in again.');
      }
      // Re-throw other errors
      throw error;
    }
  },
};


