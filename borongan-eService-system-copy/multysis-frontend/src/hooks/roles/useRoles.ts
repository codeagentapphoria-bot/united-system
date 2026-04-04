import type { CreateRoleInput, Role, UpdateRoleInput } from '@/types/role';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionService } from '@/services/api/permission.service';
import { roleService } from '@/services/api/role.service';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/query-keys';
import { useState, useCallback } from 'react';

interface UseRolesOptions {
  page?: number;
  limit?: number;
}

export const useRoles = (options: UseRolesOptions = {}) => {
  const { page = 1, limit = 10 } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [currentPage, setCurrentPage] = useState(page);
  const [itemsPerPage] = useState(limit);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.roles.list(currentPage, itemsPerPage),
    queryFn: async ({ signal }) => {
      const [rolesResult, permissions] = await Promise.all([
        roleService.getRoles(page, limit, signal),
        permissionService.getAllPermissions(signal),
      ]);
      return {
        roles: rolesResult.roles,
        permissions,
        pagination: rolesResult.pagination,
      };
    },
  });

  const roles = data?.roles ?? [];
  const permissions = data?.permissions ?? [];
  const pagination = data?.pagination;
  
  const totalPages = pagination?.totalPages ?? Math.ceil((pagination?.total ?? 0) / itemsPerPage);

  const createMutation = useMutation({
    mutationFn: async (data: CreateRoleInput) => {
      const newRole = await roleService.createRole({
        name: data.name,
        description: data.description,
      });
      if (data.permissionIds && data.permissionIds.length > 0) {
        return roleService.assignPermissions(newRole.id, data.permissionIds);
      }
      return newRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all });
      toast({ title: 'Success', description: 'Role created successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to create role' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRoleInput }) => {
      const updateData: { name?: string; description?: string } = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;

      let updatedRole: Role;
      if (Object.keys(updateData).length > 0) {
        updatedRole = await roleService.updateRole(id, updateData);
      } else {
        updatedRole = await roleService.getRole(id);
      }

      if (data.permissionIds !== undefined) {
        updatedRole = await roleService.assignPermissions(id, data.permissionIds);
      }

      return updatedRole;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all });
      toast({ title: 'Success', description: 'Role updated successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to update role' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roleService.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all });
      toast({ title: 'Success', description: 'Role deleted successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to delete role' });
    },
  });

  const createRole = async (data: CreateRoleInput) => {
    return createMutation.mutateAsync(data);
  };

  const updateRole = async (id: string, data: UpdateRoleInput) => {
    return updateMutation.mutateAsync({ id, data });
  };

  const deleteRole = async (id: string) => {
    return deleteMutation.mutateAsync(id);
  };

  const refreshRoles = useCallback(() => {
    refetch();
  }, [refetch]);

  const refreshPermissions = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all });
  }, [queryClient]);

  const goToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
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
    error: error?.message || null,
    createRole,
    updateRole,
    deleteRole,
    refreshRoles,
    refreshPermissions,
    paginatedRoles: roles,
    currentPage,
    totalPages,
    itemsPerPage,
    total: pagination?.total ?? 0,
    goToPage,
    goToNextPage,
    goToPreviousPage,
  };
};
