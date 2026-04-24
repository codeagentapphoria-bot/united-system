import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { permissionService } from '@/services/api/permission.service';
import type { Permission } from '@/types/role';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';

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

export const usePermissions = (options: { search?: string; resource?: string } = {}) => {
  const { search = '', resource = '' } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.permissions.list({ page: currentPage, limit: itemsPerPage, search, resource }),
    queryFn: async ({ signal }) => {
      return permissionService.getPermissions(
        currentPage,
        itemsPerPage,
        search || undefined,
        resource || undefined,
        signal
      );
    },
  });

  const permissions = data?.permissions ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? Math.ceil((pagination?.total ?? 0) / itemsPerPage);

  const createMutation = useMutation({
    mutationFn: (data: CreatePermissionInput) => {
      const validAction = data.action === 'all' || data.action === 'read' ? data.action : 'read';
      const validData = { ...data, action: validAction as 'all' | 'read' };
      return permissionService.createPermission(validData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all });
      toast({ title: 'Success', description: 'Permission created successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to create permission' });
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
      toast({ title: 'Success', description: 'Permission updated successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to update permission' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => permissionService.deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all });
      toast({ title: 'Success', description: 'Permission deleted successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to delete permission' });
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

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return {
    permissions,
    selectedPermission,
    setSelectedPermission,
    isLoading,
    isFetching,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    error: error?.message || null,
    createPermission,
    updatePermission,
    deletePermission,
    refreshPermissions: refetch,
    currentPage,
    totalPages,
    itemsPerPage,
    total: pagination?.total ?? 0,
    goToPage,
    goToNextPage: () => setCurrentPage(p => Math.min(p + 1, totalPages)),
    goToPreviousPage: () => setCurrentPage(p => Math.max(p - 1, 1)),
  };
};
