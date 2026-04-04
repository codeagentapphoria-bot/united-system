import type { Permission } from '@/types/role';
import api from './auth.service';

// Backend permission response type
interface BackendPermission {
  id: string;
  resource: string;
  action: string; // 'READ' | 'ALL' in backend
  createdAt: string;
  updatedAt: string;
}

// Generate permission name from resource and action
const generatePermissionName = (resource: string, action: string): string => {
  const actionLower = action.toLowerCase();
  const resourceFormatted = resource
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  if (actionLower === 'all') {
    return `Manage ${resourceFormatted}`;
  } else {
    return `View ${resourceFormatted}`;
  }
};

// Generate permission description from resource and action
const generatePermissionDescription = (resource: string, action: string): string => {
  const actionLower = action.toLowerCase();
  const resourceFormatted = resource
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  if (actionLower === 'all') {
    return `Can view, add, edit, and delete ${resourceFormatted.toLowerCase()}`;
  } else {
    return `Can only view ${resourceFormatted.toLowerCase()}`;
  }
};

// Transform backend permission to frontend format
const transformPermission = (backendPermission: BackendPermission): Permission => {
  const actionLower = backendPermission.action.toLowerCase();
  
  return {
    id: backendPermission.id,
    name: generatePermissionName(backendPermission.resource, backendPermission.action),
    description: generatePermissionDescription(backendPermission.resource, backendPermission.action),
    resource: backendPermission.resource,
    action: actionLower, // Convert to lowercase for frontend
    createdAt: backendPermission.createdAt,
    updatedAt: backendPermission.updatedAt,
  };
};

export const permissionService = {
  async getAllPermissions(signal?: AbortSignal): Promise<Permission[]> {
    try {
      const response = await api.get('/permissions', { signal });
      const backendPermissions: BackendPermission[] = response.data.data;
      return backendPermissions.map(transformPermission);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch permissions';
      throw new Error(errorMessage);
    }
  },

  async getPermission(id: string, signal?: AbortSignal): Promise<Permission> {
    try {
      const response = await api.get(`/permissions/${id}`, { signal });
      const backendPermission: BackendPermission = response.data.data;
      return transformPermission(backendPermission);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch permission';
      throw new Error(errorMessage);
    }
  },

  async createPermission(data: { name?: string; description?: string; resource: string; action: 'read' | 'all' }): Promise<Permission> {
    try {
      // Backend only accepts resource and action, ignore name and description
      const backendData = {
        resource: data.resource,
        action: data.action,
      };
      const response = await api.post('/permissions', backendData);
      const backendPermission: BackendPermission = response.data.data;
      return transformPermission(backendPermission);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create permission';
      throw new Error(errorMessage);
    }
  },

  async updatePermission(id: string, data: { name?: string; description?: string; resource?: string; action?: 'read' | 'all' }): Promise<Permission> {
    try {
      // Backend only accepts resource and action, ignore name and description
      const backendData: { resource?: string; action?: 'read' | 'all' } = {};
      if (data.resource !== undefined) backendData.resource = data.resource;
      if (data.action !== undefined) backendData.action = data.action;
      
      const response = await api.put(`/permissions/${id}`, backendData);
      const backendPermission: BackendPermission = response.data.data;
      return transformPermission(backendPermission);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update permission';
      throw new Error(errorMessage);
    }
  },

  async deletePermission(id: string): Promise<void> {
    try {
      await api.delete(`/permissions/${id}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete permission';
      throw new Error(errorMessage);
    }
  },
};

