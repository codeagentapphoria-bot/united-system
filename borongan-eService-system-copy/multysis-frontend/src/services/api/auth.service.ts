/**
 * auth.service.ts — v2
 *
 * Portal auth:  username + password  OR  Google OAuth
 * Admin auth:   email + password (unchanged)
 *
 * Removed: verifyCredentials, verifyOtp, portalSignup (phone OTP flow)
 */

import axios from 'axios';
import type { User } from '../../types/auth';

const getApiUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const isProduction = import.meta.env.PROD;
  if (isProduction && apiUrl.startsWith('http://') && !apiUrl.includes('localhost')) {
    throw new Error('API URL must use HTTPS in production. Please set VITE_API_BASE_URL to an HTTPS URL.');
  }
  return apiUrl;
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 30000,
});

// Error handling interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please check your connection and try again.';
      return Promise.reject(error);
    }
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || 'Session expired. Please log in again.';
      error.message = errorMessage;
    }
    return Promise.reject(error);
  }
);

const isProduction = import.meta.env.PROD;
const IS_MOCK = !isProduction && import.meta.env.VITE_MOCK_API === 'true';

if (isProduction && import.meta.env.VITE_MOCK_API === 'true') {
  throw new Error('Mock API mode cannot be enabled in production.');
}

// =============================================================================
// HELPERS
// =============================================================================

function buildResidentUser(resident: any): User {
  const firstName = resident.firstName || '';
  const lastName = resident.lastName || '';
  const middleName = resident.middleName || '';
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
  return {
    id: resident.id,
    name: fullName || resident.username || 'Resident',
    email: resident.email || '',
    username: resident.username || '',
    residentId: resident.residentId,
    role: 'resident',
    status: resident.status,
    barangay: resident.barangay || null,
    picturePath: resident.picturePath || null,
    googleLinked: resident.googleLinked || false,
    createdAt: resident.createdAt || new Date().toISOString(),
  } as any;
}

// =============================================================================
// AUTH SERVICE
// =============================================================================

export const authService = {
  // ---------------------------------------------------------------------------
  // Admin login (email + password — unchanged)
  // ---------------------------------------------------------------------------
  async adminLogin(credentials: { email: string; password: string }): Promise<{ user: User; token: string }> {
    try {
      const response = await api.post('/auth/admin/login', credentials);
      const result = response.data.data;
      if (!result?.user) throw new Error('Invalid response from server');
      return {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          createdAt: result.user.createdAt || new Date().toISOString(),
        } as any,
        token: 'stored-in-cookie',
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  },

  // ---------------------------------------------------------------------------
  // Portal login (username + password)
  // ---------------------------------------------------------------------------
  async portalLogin(credentials: { username: string; password: string }): Promise<{ resident: any; token: string }> {
    if (IS_MOCK) {
      const mockResident = {
        id: 'mock-resident-1',
        residentId: 'RES-2025-0000001',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        username: credentials.username,
        status: 'active',
        email: null,
        createdAt: new Date().toISOString(),
      };
      return { resident: mockResident, token: 'mock-token' };
    }
    try {
      const response = await api.post('/auth/portal/login', credentials);
      const result = response.data.data;
      if (!result?.resident) throw new Error('Invalid response from server');
      return { resident: result.resident, token: 'stored-in-cookie' };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  },

  // ---------------------------------------------------------------------------
  // Google OAuth — link account (for already-logged-in resident)
  // ---------------------------------------------------------------------------
  async linkGoogle(code: string): Promise<void> {
    try {
      await api.post('/auth/portal/google/link', { code });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to link Google account');
    }
  },

  async unlinkGoogle(): Promise<void> {
    try {
      await api.delete('/auth/portal/google/unlink');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to unlink Google account');
    }
  },

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      const { logger } = await import('../../utils/logger');
      logger.error('Logout API call failed:', error);
    }
  },

  // ---------------------------------------------------------------------------
  // Get current user (/api/auth/me)
  // ---------------------------------------------------------------------------
  async getCurrentUser(): Promise<User> {
    if (IS_MOCK) {
      return {
        id: 'mock-admin-1',
        name: 'Admin User',
        email: 'admin@multysis.local',
        role: 'admin',
        createdAt: new Date().toISOString(),
      } as any;
    }
    try {
      const response = await api.get('/auth/me');
      const data = response.data.data;

      // Admin user
      if (data.user) {
        const u = data.user;
        return {
          id: u.id,
          name: u.name || 'Admin',
          email: u.email,
          role: u.role || 'admin',
          createdAt: u.createdAt || new Date().toISOString(),
        } as any;
      }

      // Portal resident
      if (data.resident) {
        return buildResidentUser(data.resident);
      }

      throw new Error('Unrecognized user data');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Not authenticated');
    }
  },

  // ---------------------------------------------------------------------------
  // Socket token
  // ---------------------------------------------------------------------------
  async getSocketToken(): Promise<string> {
    if (IS_MOCK) return 'mock-socket-token';
    try {
      const response = await api.get('/auth/socket-token');
      const result = response.data.data;
      if (!result?.token) throw new Error('Invalid response from server');
      return result.token;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get socket token');
    }
  },
};

export default api;
