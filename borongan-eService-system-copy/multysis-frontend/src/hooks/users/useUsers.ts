import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoles } from '@/hooks/roles/useRoles';
import { userService } from '@/services/api/user.service';
import { useToast } from '@/hooks/use-toast';
import type { AdminUser, CreateAdminUserInput, UpdateAdminUserInput } from '@/types/user';
import { queryKeys } from '@/lib/query-keys';
import { useState, useCallback } from 'react';

export const useUsers = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { roles } = useRoles();

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { data: usersData, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.users.list(currentPage, itemsPerPage),
    queryFn: ({ signal }) => userService.getAllUsers(currentPage, itemsPerPage, signal),
  });

  const users = usersData?.users ?? [];
  const totalPages = usersData?.pagination.totalPages ?? 1;
  const total = usersData?.pagination.total ?? 0;

  const createMutation = useMutation({
    mutationFn: (data: CreateAdminUserInput) => userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast({ title: 'Success', description: 'User created successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to create user' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminUserInput }) =>
      userService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast({ title: 'Success', description: 'User updated successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to update user' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast({ title: 'Success', description: 'User deleted successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to delete user' });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      userService.changePassword(id, password),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Password changed successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to change password' });
    },
  });

  const createUser = async (data: CreateAdminUserInput) => {
    return createMutation.mutateAsync(data);
  };

  const updateUser = async (id: string, data: UpdateAdminUserInput) => {
    return updateMutation.mutateAsync({ id, data });
  };

  const deleteUser = async (id: string) => {
    return deleteMutation.mutateAsync(id);
  };

  const changePassword = async (id: string, password: string) => {
    return changePasswordMutation.mutateAsync({ id, password });
  };

  const refreshUsers = useCallback(() => {
    refetch();
  }, [refetch]);

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
    users,
    selectedUser,
    setSelectedUser,
    roles,
    isLoading,
    error: error?.message || null,
    createUser,
    updateUser,
    deleteUser,
    changePassword,
    refreshUsers,
    currentPage,
    totalPages,
    total,
    itemsPerPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
  };
};
