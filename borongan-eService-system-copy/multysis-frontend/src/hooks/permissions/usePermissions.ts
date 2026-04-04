import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { permissionService } from '@/services/api/permission.service';
import type { Permission } from '@/types/role';
import { queryKeys } from '@/lib/query-keys';

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
  const queryClient = useQueryClient();

  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const {
    data: permissions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.permissions.all,
    queryFn: ({ signal }) => permissionService.getAllPermissions(signal),
  });

  const totalPages = Math.ceil(permissions.length / itemsPerPage);
  const paginatedPermissions = permissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const createMutation = useMutation({
    mutationFn: (data: CreatePermissionInput) => {
      const validAction = data.action === 'all' || data.action === 'read' ? data.action : 'read';
      const validData = { ...data, action: validAction as 'all' | 'read' };
      return permissionService.createPermission(validData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePermissionInput }) => {
      const validData = {
        ...data,
        action: data.action && (data.action === 'all' || data.action === 'read')
          ? (data.action as 'all' | 'read')
          : undefined,
      };
      return permissionService.updatePermission(id, validData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => permissionService.deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all });
    },
  });

  const createPermission = async (data: CreatePermissionInput) => {
    await createMutation.mutateAsync(data);
  };

  const updatePermission = async (id: string, data: UpdatePermissionInput) => {
    await updateMutation.mutateAsync({ id, data });
  };

  const deletePermission = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    permissions: paginatedPermissions,
    allPermissions: permissions,
    isLoading,
    error: error?.message || null,
    selectedPermission,
    setSelectedPermission,
    currentPage,
    totalPages,
    itemsPerPage,
    total: permissions.length,
    goToPage: (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages))),
    goToNextPage: () => setCurrentPage((p) => Math.min(p + 1, totalPages)),
    goToPreviousPage: () => setCurrentPage((p) => Math.max(p - 1, 1)),
    createPermission,
    updatePermission,
    deletePermission,
    refreshPermissions: refetch,
  };
};
