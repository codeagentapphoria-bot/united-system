import axios from 'axios';
import type { LoginCredentials, SignupData, User } from '../../types/auth';

// Get API URL and enforce HTTPS in production
const getApiUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const isProduction = import.meta.env.PROD;
  
  // Enforce HTTPS in production (except for localhost)
  if (isProduction && apiUrl.startsWith('http://') && !apiUrl.includes('localhost')) {
    throw new Error('API URL must use HTTPS in production. Please set VITE_API_BASE_URL to an HTTPS URL.');
  }
  
  return apiUrl;
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for HTTP-only cookies
  timeout: 30000, // 30 seconds timeout
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message === 'timeout of 30000ms exceeded') {
      error.message = 'Request timeout. Please check your connection and try again.';
      return Promise.reject(error);
    }

    // Handle 401 unauthorized - session expired or invalid
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.message || 'Session expired. Please log in again.';
      
      // Handle specific timeout codes
      if (errorCode === 'IDLE_TIMEOUT' || errorCode === 'ABSOLUTE_TIMEOUT') {
        error.message = errorMessage;
        // Redirect to login will be handled by the component
      } else {
        error.message = errorMessage;
      }
    }

    return Promise.reject(error);
  }
);

// Prevent mock mode in production builds
const isProduction = import.meta.env.PROD;
const IS_MOCK = !isProduction && import.meta.env.VITE_MOCK_API === 'true';

// Build-time check: Throw error if mock mode is enabled in production
if (isProduction && import.meta.env.VITE_MOCK_API === 'true') {
  throw new Error('Mock API mode cannot be enabled in production builds. Set VITE_MOCK_API=false or remove it.');
}

// Mock credentials from environment variables (development only)
const MOCK_ADMIN_EMAIL = import.meta.env.VITE_MOCK_ADMIN_EMAIL || 'admin@multysis.local';
const MOCK_ADMIN_PASSWORD = import.meta.env.VITE_MOCK_ADMIN_PASSWORD || 'Admin123!';
const MOCK_SUBSCRIBER_PHONE = import.meta.env.VITE_MOCK_SUBSCRIBER_PHONE || '09171234567';
const MOCK_SUBSCRIBER_PASSWORD = import.meta.env.VITE_MOCK_SUBSCRIBER_PASSWORD || 'Subscriber123!';

export const authService = {
  async adminLogin(credentials: { email: string; password: string }): Promise<{ user: User; token: string }> {
    if (IS_MOCK) {
      // Mock mode: Require valid test credentials from environment variables
      if (credentials.email !== MOCK_ADMIN_EMAIL || credentials.password !== MOCK_ADMIN_PASSWORD) {
        throw new Error('Invalid credentials');
      }
      
      const mockUser: User = {
        id: 'mock-admin-1',
        name: 'Admin User',
        email: credentials.email,
        phoneNumber: '09171234567',
        role: 'admin',
        createdAt: new Date().toISOString(),
      } as any;
      // Tokens are stored in HTTP-only cookies, not accessible from JS
      return Promise.resolve({ user: mockUser, token: 'mock-token' });
    }
    try {
      const response = await api.post('/auth/admin/login', credentials);
      const result = response.data.data; // Backend returns { status: 'success', data: { user } }
      // Tokens are stored in HTTP-only cookies automatically
      
      if (!result || !result.user) {
        throw new Error('Invalid response from server');
      }
      
      return {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          phoneNumber: '',
          role: result.user.role,
          createdAt: result.user.createdAt || new Date().toISOString(),
        },
        token: 'stored-in-cookie', // Tokens are in HTTP-only cookies
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(errorMessage);
    }
  },

  async portalLogin(credentials: LoginCredentials): Promise<{ subscriber: any; token: string }> {
    if (IS_MOCK) {
      // Mock mode: Require valid test credentials from environment variables
      if (credentials.phoneNumber !== MOCK_SUBSCRIBER_PHONE || credentials.password !== MOCK_SUBSCRIBER_PASSWORD) {
        throw new Error('Invalid credentials');
      }
      
      const mockSubscriber = {
        id: 'mock-subscriber-1',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        phoneNumber: credentials.phoneNumber,
        status: 'active',
        email: null,
        createdAt: new Date().toISOString(),
      };
      // Tokens are stored in HTTP-only cookies, not accessible from JS
      return Promise.resolve({ subscriber: mockSubscriber, token: 'mock-token' });
    }
    try {
      const response = await api.post('/auth/portal/login', credentials);
      const result = response.data.data; // Backend returns { status: 'success', data: { subscriber } }
      // Tokens are stored in HTTP-only cookies automatically
      
      if (!result || !result.subscriber) {
        throw new Error('Invalid response from server');
      }
      
      return {
        subscriber: result.subscriber,
        token: 'stored-in-cookie', // Tokens are in HTTP-only cookies
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(errorMessage);
    }
  },

  async portalSignup(data: SignupData): Promise<{ subscriber: any; token: string }> {
    if (IS_MOCK) {
      // Mock mode: Basic validation - check if phone number already exists (simulate)
      if (data.phoneNumber === MOCK_SUBSCRIBER_PHONE) {
        throw new Error('Phone number already registered');
      }
      
      // Validate password requirements
      if (data.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      if (data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      const mockSubscriber = {
        id: 'mock-subscriber-1',
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        status: 'pending',
        email: data.email || null,
        createdAt: new Date().toISOString(),
      };
      // Tokens are stored in HTTP-only cookies, not accessible from JS
      return Promise.resolve({ subscriber: mockSubscriber, token: 'mock-token' });
    }
    try {
      const response = await api.post('/auth/portal/signup', {
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      const result = response.data.data; // Backend returns { status: 'success', data: { subscriber } }
      // Tokens are stored in HTTP-only cookies automatically
      
      if (!result || !result.subscriber) {
        throw new Error('Invalid response from server');
      }
      
      return {
        subscriber: result.subscriber,
        token: 'stored-in-cookie', // Tokens are in HTTP-only cookies
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Signup failed';
      throw new Error(errorMessage);
    }
  },

  async logout(): Promise<void> {
    if (IS_MOCK) {
      return Promise.resolve();
    }
    
    try {
      // Call logout endpoint to invalidate tokens on server side and clear cookies
      await api.post('/auth/logout');
    } catch (error) {
      // Log error but don't throw - logout endpoint clears cookies even on error
      const { logger } = await import('../../utils/logger');
      logger.error('Logout API call failed:', error);
    }
  },

  async getCurrentUser(): Promise<User> {
    if (IS_MOCK) {
      const mockUser: User = {
        id: 'mock-admin-1',
        name: 'Admin User',
        email: 'admin@multysis.local',
        phoneNumber: '09171234567',
        role: 'admin',
        createdAt: new Date().toISOString(),
      } as any;
      return Promise.resolve(mockUser);
    }
    try {
      const response = await api.get('/auth/me');
      const data = response.data.data; // Backend returns { status: 'success', data: user }
      
      // Handle both admin user and subscriber responses
      if (data.email && !data.phoneNumber) {
        // Admin user (has email but no phoneNumber)
        return {
          id: data.id,
          name: data.name || 'Admin',
          email: data.email,
          phoneNumber: '',
          role: data.role || 'admin',
          createdAt: data.createdAt || new Date().toISOString(),
        };
      } else {
        // Subscriber - construct name from firstName and lastName
        const firstName = data.firstName || '';
        const lastName = data.lastName || '';
        const middleName = data.middleName || '';
        const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
        
        // Fallback to phoneNumber if name is empty, then 'Subscriber'
        const displayName = fullName || data.phoneNumber || 'Subscriber';
        
        return {
          id: data.id,
          name: displayName,
          email: data.email || '',
          phoneNumber: data.phoneNumber || '',
          role: 'subscriber',
          createdAt: data.createdAt || new Date().toISOString(),
        };
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Not authenticated');
    }
  },

  async verifyCredentials(phoneNumber: string, password: string): Promise<{ otpRequired: boolean }> {
    if (IS_MOCK) {
      // Mock mode: Require valid test credentials
      if (phoneNumber !== MOCK_SUBSCRIBER_PHONE || password !== MOCK_SUBSCRIBER_PASSWORD) {
        throw new Error('Invalid credentials');
      }
      return Promise.resolve({ otpRequired: false });
    }
    try {
      const response = await api.post('/auth/portal/verify-credentials', {
        phoneNumber,
        password,
      });
      // Check response
      if (response.data.status !== 'success') {
        throw new Error('Failed to verify credentials');
      }
      // Return whether OTP is required
      return {
        otpRequired: response.data.data?.otpRequired ?? true,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Verification failed';
      throw new Error(errorMessage);
    }
  },

  async verifyOtp(phoneNumber: string, otp: string): Promise<{ subscriber: any; token: string }> {
    if (IS_MOCK) {
      // Mock mode: Accept any 6-digit OTP
      if (!/^\d{6}$/.test(otp)) {
        throw new Error('Invalid OTP format');
      }
      const mockSubscriber = {
        id: 'mock-subscriber-1',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        phoneNumber,
        status: 'active',
        email: null,
        createdAt: new Date().toISOString(),
      };
      return Promise.resolve({ subscriber: mockSubscriber, token: 'mock-token' });
    }
    try {
      const response = await api.post('/auth/portal/verify-otp', {
        phoneNumber,
        otp,
      });
      const result = response.data.data; // Backend returns { status: 'success', data: { subscriber } }
      // Tokens are stored in HTTP-only cookies automatically
      
      if (!result || !result.subscriber) {
        throw new Error('Invalid response from server');
      }
      
      return {
        subscriber: result.subscriber,
        token: 'stored-in-cookie', // Tokens are in HTTP-only cookies
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'OTP verification failed';
      throw new Error(errorMessage);
    }
  },

  async getSocketToken(): Promise<string> {
    if (IS_MOCK) {
      return Promise.resolve('mock-socket-token');
    }
    try {
      const response = await api.get('/auth/socket-token');
      const result = response.data.data; // Backend returns { status: 'success', data: { token } }
      
      if (!result || !result.token) {
        throw new Error('Invalid response from server');
      }
      
      return result.token;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get socket token';
      throw new Error(errorMessage);
    }
  },
};

export default api;

