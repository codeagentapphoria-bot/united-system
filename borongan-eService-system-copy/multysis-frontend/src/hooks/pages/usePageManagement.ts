import type { Page } from '@/services/api/page.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pageService } from '@/services/api/page.service';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/query-keys';
import { useState, useCallback } from 'react';

interface UsePageManagementOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export const usePageManagement = (options: UsePageManagementOptions = {}) => {
  const { page = 1, limit = 10, search = '' } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [currentPage, setCurrentPage] = useState(page);
  const [itemsPerPage] = useState(limit);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.pages.list(currentPage, itemsPerPage, search),
    queryFn: async ({ signal }) => {
      return pageService.getPages(undefined, search, currentPage, limit, signal);
    },
  });

  const pages = data?.pages ?? [];
  const pagination = data?.pagination;
  const totalPages =
    pagination?.totalPages ?? Math.ceil((pagination?.total ?? 0) / itemsPerPage);

  const createMutation = useMutation({
    mutationFn: async (data: { system: string; path: string; name: string }) => {
      return pageService.createPage(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.all });
      toast({ title: 'Success', description: 'Page created successfully' });
    },
    onError: (err: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to create page',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { system?: string; path?: string; name?: string };
    }) => {
      return pageService.updatePage(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.all });
      toast({ title: 'Success', description: 'Page updated successfully' });
    },
    onError: (err: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to update page',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pageService.deletePage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.all });
      toast({ title: 'Success', description: 'Page deleted successfully' });
    },
    onError: (err: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to delete page',
      });
    },
  });

  const createPage = async (data: { system: string; path: string; name: string }) => {
    return createMutation.mutateAsync(data);
  };

  const updatePage = async (
    id: string,
    data: { system?: string; path?: string; name?: string }
  ) => {
    return updateMutation.mutateAsync({ id, data });
  };

  const deletePage = async (id: string) => {
    return deleteMutation.mutateAsync(id);
  };

  const refreshPages = useCallback(() => {
    refetch();
  }, [refetch]);

  const goToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return {
    pages,
    selectedPage,
    setSelectedPage,
    isLoading,
    isFetching,
    error: error?.message || null,
    createPage,
    updatePage,
    deletePage,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refreshPages,
    paginatedPages: pages,
    currentPage,
    totalPages,
    itemsPerPage,
    total: pagination?.total ?? 0,
    goToPage,
    goToNextPage,
    goToPreviousPage,
  };
};