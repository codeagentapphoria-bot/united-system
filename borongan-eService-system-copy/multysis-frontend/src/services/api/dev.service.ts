import axios from 'axios';
import type { User } from '../../types/auth';

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

export interface SystemInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  env: string;
  pid: number;
  cwd: string;
}

export interface DatabaseInfo {
  connected: boolean;
  provider: string;
  poolSize: string | number;
  activeConnections: string | number;
  message?: string;
  error?: string;
}

export interface SystemLogs {
  logs: any[];
  total: number;
  limit: number;
}

export const devService = {
  async devLogin(credentials: { email: string; password: string }): Promise<{ user: User; token: string }> {
    try {
      const response = await api.post('/dev/login', credentials);
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

  async getSystemLogs(limit: number = 100): Promise<SystemLogs> {
    try {
      const response = await api.get('/dev/logs', {
        params: { limit },
      });
      return response.data.data; // Backend returns { status: 'success', data: { logs, total, limit } }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch logs';
      throw new Error(errorMessage);
    }
  },

  async getDatabaseInfo(): Promise<DatabaseInfo> {
    try {
      const response = await api.get('/dev/database');
      return response.data.data; // Backend returns { status: 'success', data: { ... } }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch database info';
      throw new Error(errorMessage);
    }
  },

  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const response = await api.get('/dev/system');
      return response.data.data; // Backend returns { status: 'success', data: { ... } }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch system info';
      throw new Error(errorMessage);
    }
  },
};

export default api;

