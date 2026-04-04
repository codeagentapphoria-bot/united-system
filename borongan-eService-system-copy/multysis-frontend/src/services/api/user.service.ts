import type { AdminUser, CreateAdminUserInput, UpdateAdminUserInput } from '@/types/user';
import api from './auth.service';

// Backend user response type (with userRoles array)
interface BackendUser {
  id: string;
  email: string;
  name: string;
  role: string;
  userRoles?: Array<{
    role: {
      id: string;
      name: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

// Transform backend user to AdminUser format
const transformUser = (backendUser: BackendUser): AdminUser => {
  // Extract role from userRoles array (use first role if multiple exist)
  const firstRole = backendUser.userRoles?.[0]?.role;
  const roleId = firstRole?.id || '';
  const roleName = firstRole?.name || backendUser.role || 'Unknown';

  return {
    id: backendUser.id,
    name: backendUser.name,
    email: backendUser.email,
    phoneNumber: undefined, // Backend User model doesn't have phoneNumber
    roleId,
    roleName,
    isActive: true, // Backend doesn't have isActive field, default to true
    createdAt: backendUser.createdAt,
    updatedAt: backendUser.updatedAt,
    lastLogin: undefined, // Backend doesn't track lastLogin
  };
};

export interface PaginatedUsers {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const userService = {
  async getAllUsers(
    page: number = 1,
    limit: number = 10,
    signal?: AbortSignal
  ): Promise<PaginatedUsers> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await api.get(`/users?${params.toString()}`, { signal });
      const backendUsers: BackendUser[] = response.data.data;
      return {
        users: backendUsers.map(transformUser),
        pagination: response.data.pagination || {
          page,
          limit,
          total: backendUsers.length,
          totalPages: Math.ceil(backendUsers.length / limit),
        },
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch users';
      throw new Error(errorMessage);
    }
  },

  async getUser(id: string, signal?: AbortSignal): Promise<AdminUser> {
    try {
      const response = await api.get(`/users/${id}`, { signal });
      const backendUser: BackendUser = response.data.data;
      return transformUser(backendUser);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch user';
      throw new Error(errorMessage);
    }
  },

  async createUser(data: CreateAdminUserInput): Promise<AdminUser> {
    try {
      // Transform frontend input to backend format
      const backendData = {
        email: data.email,
        password: data.password,
        name: data.name,
        roleIds: data.roleId ? [data.roleId] : [], // Backend expects array
      };

      const response = await api.post('/users', backendData);
      const backendUser: BackendUser = response.data.data;
      return transformUser(backendUser);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create user';
      throw new Error(errorMessage);
    }
  },

  async updateUser(id: string, data: UpdateAdminUserInput): Promise<AdminUser> {
    try {
      // Transform frontend input to backend format
      // Backend only accepts: email, name, roleIds
      // Filter out phoneNumber and isActive as backend doesn't support them
      const backendData: {
        email?: string;
        name?: string;
        roleIds?: string[];
      } = {};

      // Only include email if it's provided and not empty
      if (data.email !== undefined) {
        const trimmedEmail = data.email.trim();
        if (trimmedEmail !== '') {
          backendData.email = trimmedEmail;
        }
      }

      // Only include name if it's provided and not empty
      if (data.name !== undefined) {
        const trimmedName = data.name.trim();
        if (trimmedName !== '') {
          backendData.name = trimmedName;
        }
      }

      // Only include roleIds if roleId is provided, not empty, and is a valid UUID
      if (data.roleId !== undefined && data.roleId !== null) {
        const trimmedRoleId = typeof data.roleId === 'string' ? data.roleId.trim() : String(data.roleId);
        // Validate UUID format (basic check)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (trimmedRoleId !== '' && uuidRegex.test(trimmedRoleId)) {
          backendData.roleIds = [trimmedRoleId];
        }
      }

      const response = await api.put(`/users/${id}`, backendData);
      const backendUser: BackendUser = response.data.data;
      return transformUser(backendUser);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update user';
      throw new Error(errorMessage);
    }
  },

  async deleteUser(id: string): Promise<void> {
    try {
      await api.delete(`/users/${id}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete user';
      throw new Error(errorMessage);
    }
  },

  async changePassword(id: string, password: string): Promise<void> {
    try {
      // Backend validation requires both password and confirmPassword
      // Frontend modal already validates they match, so we send the same value
      await api.patch(`/users/${id}/password`, { password, confirmPassword: password });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to change password';
      throw new Error(errorMessage);
    }
  },
};

