import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemService, type System } from '@/services/api/system.service';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/query-keys';
import { useRef } from 'react';

export const useSystemManagement = () => {
  const queryClient = useQueryClient();
  const toast = useToast().toast;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const { data: systems = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.systems.all,
    queryFn: ({ signal }) => systemService.getSystems(signal),
  });

  const createMutation = useMutation({
    mutationFn: async (data: { slug: string; label: string }) => {
      return systemService.createSystem(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.systems.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.all }); // pages system dropdown may change
      toastRef.current({ title: 'Success', description: 'System created successfully' });
    },
    onError: (err: Error) => {
      toastRef.current({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to create system',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      slug,
      data,
    }: {
      slug: string;
      data: { slug?: string; label?: string };
    }) => {
      return systemService.updateSystem(slug, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.systems.all });
      toastRef.current({ title: 'Success', description: 'System updated successfully' });
    },
    onError: (err: Error) => {
      toastRef.current({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to update system',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ slug, force = false }: { slug: string; force?: boolean }) => {
      return systemService.deleteSystem(slug, force);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.systems.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.all }); // pages system may change
      toastRef.current({
        title: 'Success',
        description: `System "${variables.slug}" deleted successfully`,
      });
    },
    onError: (err: Error) => {
      toastRef.current({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to delete system',
      });
    },
  });

  const createSystem = async (data: { slug: string; label: string }) => {
    return createMutation.mutateAsync(data);
  };

  const updateSystem = async (
    slug: string,
    data: { slug?: string; label?: string }
  ) => {
    return updateMutation.mutateAsync({ slug, data });
  };

  const deleteSystem = async (slug: string, force: boolean = false) => {
    return deleteMutation.mutateAsync({ slug, force });
  };

  return {
    systems,
    isLoading,
    error: error?.message || null,
    refetch,
    createSystem,
    updateSystem,
    deleteSystem,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

// Hook for the page system dropdown — returns { value, label } pairs from DB
export const useSystemOptions = () => {
  const { systems, isLoading, error } = useSystemManagement();

  const options = systems.map((s: System) => ({
    value: s.slug,
    label: s.label,
  }));

  return { systems: options, isLoading, error: (error as any)?.message || error || null };
};
