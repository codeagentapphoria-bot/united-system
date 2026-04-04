import type { CreateRoleInput, Permission, Role, UpdateRoleInput } from '@/types/role';
import { useEffect, useState } from 'react';

// Services
import { permissionService } from '@/services/api/permission.service';
import { roleService } from '@/services/api/role.service';

export const useRoles = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch roles and permissions on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch both roles and permissions in parallel
        const [fetchedRoles, fetchedPermissions] = await Promise.all([
          roleService.getAllRoles(),
          permissionService.getAllPermissions(),
        ]);
        
        setRoles(fetchedRoles);
        setPermissions(fetchedPermissions);
        
        if (fetchedRoles.length > 0 && !selectedRole) {
          setSelectedRole(fetchedRoles[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data');
        // Fallback to empty arrays on error
        setRoles([]);
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createRole = async (data: CreateRoleInput) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Create role first
      const newRole = await roleService.createRole({
        name: data.name,
        description: data.description,
      });

      // Assign permissions if provided
      if (data.permissionIds && data.permissionIds.length > 0) {
        const roleWithPermissions = await roleService.assignPermissions(newRole.id, data.permissionIds);
        setRoles(prev => [...prev, roleWithPermissions]);
        setSelectedRole(roleWithPermissions);
      } else {
        setRoles(prev => [...prev, newRole]);
        setSelectedRole(newRole);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create role');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateRole = async (id: string, data: UpdateRoleInput) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Update role name/description
      const updateData: { name?: string; description?: string } = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;

      let updatedRole: Role;
      if (Object.keys(updateData).length > 0) {
        updatedRole = await roleService.updateRole(id, updateData);
      } else {
        // If only permissions are being updated, fetch current role
        updatedRole = await roleService.getRole(id);
      }

      // Update permissions if provided
      if (data.permissionIds !== undefined) {
        updatedRole = await roleService.assignPermissions(id, data.permissionIds);
      }

      // Refresh roles list
      const refreshedRoles = await roleService.getAllRoles();
      setRoles(refreshedRoles);

      // Update selected role if it's the one being updated
      if (selectedRole?.id === id) {
        setSelectedRole(updatedRole);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteRole = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await roleService.deleteRole(id);
      
      // Refresh roles list
      const refreshedRoles = await roleService.getAllRoles();
      setRoles(refreshedRoles);
      
      // Clear selected role if it's the one being deleted
      if (selectedRole?.id === id) {
        setSelectedRole(refreshedRoles.length > 0 ? refreshedRoles[0] : null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete role');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshRoles = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const refreshedRoles = await roleService.getAllRoles();
      setRoles(refreshedRoles);
      
      // Update selected role if it still exists
      if (selectedRole) {
        const updatedSelectedRole = refreshedRoles.find(r => r.id === selectedRole.id);
        if (updatedSelectedRole) {
          setSelectedRole(updatedSelectedRole);
        } else if (refreshedRoles.length > 0) {
          setSelectedRole(refreshedRoles[0]);
        } else {
          setSelectedRole(null);
        }
      } else if (refreshedRoles.length > 0) {
        setSelectedRole(refreshedRoles[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to refresh roles');
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
    } catch (err: any) {
      setError(err.message || 'Failed to refresh permissions');
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(roles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRoles = roles.slice(startIndex, endIndex);

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
    roles,
    permissions,
    selectedRole,
    setSelectedRole,
    isLoading,
    error,
    createRole,
    updateRole,
    deleteRole,
    refreshRoles,
    refreshPermissions,
    // Pagination
    paginatedRoles,
    currentPage,
    totalPages,
    itemsPerPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
  };
};
