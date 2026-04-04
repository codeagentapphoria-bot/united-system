import type { Role } from '@/types/role';
import api from './auth.service';

export interface PaginatedRoles {
  roles: Role[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Backend role response type
interface BackendRole {
  id: string;
  name: string;
  description: string | null;
  redirectPath: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rolePermissions?: Array<{
    permission: {
      id: string;
      name: string;
      description: string | null;
      resource: string;
      action: string;
      createdAt: string;
      updatedAt: string;
    };
  }>;
}

// Transform backend role to frontend format
const transformRole = (backendRole: BackendRole): Role => {
  return {
    id: backendRole.id,
    name: backendRole.name,
    description: backendRole.description || '',
    permissions: backendRole.rolePermissions?.map((rp) => ({
      id: rp.permission.id,
      name: rp.permission.name,
      description: rp.permission.description || '',
      resource: rp.permission.resource,
      action: rp.permission.action,
      createdAt: rp.permission.createdAt,
      updatedAt: rp.permission.updatedAt,
    })) || [],
    redirectPath: backendRole.redirectPath || undefined,
    isActive: backendRole.isActive !== undefined ? backendRole.isActive : true,
    createdAt: backendRole.createdAt,
    updatedAt: backendRole.updatedAt,
  };
};

export const roleService = {
  async getAllRoles(signal?: AbortSignal): Promise<Role[]> {
    try {
      const response = await api.get('/roles', { signal });
      const backendRoles: BackendRole[] = response.data.data;
      return backendRoles.map(transformRole);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch roles';
      throw new Error(errorMessage);
    }
  },

  async getRoles(
    page: number = 1,
    limit: number = 10,
    signal?: AbortSignal
  ): Promise<PaginatedRoles> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      const response = await api.get(`/roles?${params.toString()}`, { signal });
      const backendRoles: BackendRole[] = response.data.data || [];
      const pagination = response.data.pagination || {
        page,
        limit,
        total: 0,
        totalPages: 0,
      };
      return {
        roles: backendRoles.map(transformRole),
        pagination,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch roles';
      throw new Error(errorMessage);
    }
  },

  async getRole(id: string, signal?: AbortSignal): Promise<Role> {
    try {
      const response = await api.get(`/roles/${id}`, { signal });
      const backendRole: BackendRole = response.data.data;
      return transformRole(backendRole);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch role';
      throw new Error(errorMessage);
    }
  },

  async createRole(data: { name: string; description?: string }): Promise<Role> {
    try {
      const response = await api.post('/roles', data);
      const backendRole: BackendRole = response.data.data;
      return transformRole(backendRole);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create role';
      throw new Error(errorMessage);
    }
  },

  async updateRole(id: string, data: { name?: string; description?: string }): Promise<Role> {
    try {
      const response = await api.put(`/roles/${id}`, data);
      const backendRole: BackendRole = response.data.data;
      return transformRole(backendRole);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update role';
      throw new Error(errorMessage);
    }
  },

  async deleteRole(id: string): Promise<void> {
    try {
      await api.delete(`/roles/${id}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete role';
      throw new Error(errorMessage);
    }
  },

  async assignPermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    try {
      const response = await api.post(`/roles/${roleId}/permissions`, { permissionIds });
      const backendRole: BackendRole = response.data.data;
      return transformRole(backendRole);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to assign permissions';
      throw new Error(errorMessage);
    }
  },
};

