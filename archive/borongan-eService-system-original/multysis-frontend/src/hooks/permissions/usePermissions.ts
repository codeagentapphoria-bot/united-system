import type { Permission } from '@/types/role';
import { useEffect, useState } from 'react';

// Services
import { permissionService } from '@/services/api/permission.service';

export interface CreatePermissionInput {
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface UpdatePermissionInput {
  name?: string;
  description?: string;
  resource?: string;
  action?: string;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch permissions on mount
  useEffect(() => {
    const fetchPermissions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const fetchedPermissions = await permissionService.getAllPermissions();
        setPermissions(fetchedPermissions);
        if (fetchedPermissions.length > 0 && !selectedPermission) {
          setSelectedPermission(fetchedPermissions[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch permissions');
        // Fallback to empty array on error
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createPermission = async (data: CreatePermissionInput) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate action is 'all' or 'read'
      const validAction = data.action === 'all' || data.action === 'read' ? data.action : 'read';
      const validData = { ...data, action: validAction as 'all' | 'read' };
      const newPermission = await permissionService.createPermission(validData);
      
      // Refresh permissions list
      const refreshedPermissions = await permissionService.getAllPermissions();
      setPermissions(refreshedPermissions);
      setSelectedPermission(newPermission);
    } catch (err: any) {
      setError(err.message || 'Failed to create permission');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePermission = async (id: string, data: UpdatePermissionInput) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate action is 'all' or 'read' if provided
      const validData = {
        ...data,
        action: data.action && (data.action === 'all' || data.action === 'read') 
          ? (data.action as 'all' | 'read')
          : undefined,
      };
      const updatedPermission = await permissionService.updatePermission(id, validData);
      
      // Refresh permissions list
      const refreshedPermissions = await permissionService.getAllPermissions();
      setPermissions(refreshedPermissions);
      
      // Update selected permission if it's the one being updated
      if (selectedPermission?.id === id) {
        setSelectedPermission(updatedPermission);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update permission');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deletePermission = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await permissionService.deletePermission(id);
      
      // Refresh permissions list
      const refreshedPermissions = await permissionService.getAllPermissions();
      setPermissions(refreshedPermissions);
      
      // Clear selected permission if it's the one being deleted
      if (selectedPermission?.id === id) {
        setSelectedPermission(refreshedPermissions.length > 0 ? refreshedPermissions[0] : null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete permission');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPermissions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const refreshedPermissions = await permissionService.getAllPermissions();
      setPermissions(refreshedPermissions);
      
      // Update selected permission if it still exists
      if (selectedPermission) {
        const updatedSelectedPermission = refreshedPermissions.find(p => p.id === selectedPermission.id);
        if (updatedSelectedPermission) {
          setSelectedPermission(updatedSelectedPermission);
        } else if (refreshedPermissions.length > 0) {
          setSelectedPermission(refreshedPermissions[0]);
        } else {
          setSelectedPermission(null);
        }
      } else if (refreshedPermissions.length > 0) {
        setSelectedPermission(refreshedPermissions[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh permissions');
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(permissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPermissions = permissions.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return {
    permissions,
    selectedPermission,
    setSelectedPermission,
    isLoading,
    error,
    createPermission,
    updatePermission,
    deletePermission,
    refreshPermissions,
    // Pagination
    paginatedPermissions,
    currentPage,
    totalPages,
    itemsPerPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
  };
};

