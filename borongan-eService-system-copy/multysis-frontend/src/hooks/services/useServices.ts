import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceService, type Service, type CreateServiceInput, type UpdateServiceInput } from '@/services/api/service.service';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { queryKeys } from '@/lib/query-keys';

export const useServices = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: servicesData, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.services.list(currentPage, {
      search: debouncedSearchQuery,
      category: categoryFilter,
      status: statusFilter,
    }),
    queryFn: ({ signal }) => {
      const isActive = statusFilter === 'all' ? undefined : statusFilter === 'active';
      const category = categoryFilter === 'all' ? undefined : categoryFilter;
      return serviceService.getAllServices(
        currentPage,
        itemsPerPage,
        debouncedSearchQuery || undefined,
        category,
        isActive,
        signal
      );
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.services.categories,
    queryFn: ({ signal }) => serviceService.getCategories(signal),
  });

  const services = servicesData?.services ?? [];
  const totalPages = servicesData?.pagination.totalPages ?? 1;
  const total = servicesData?.pagination.total ?? 0;

  useMemo(() => {
    if (services.length > 0 && !selectedService) {
      setSelectedService(services[0]);
    }
  }, [services, selectedService]);

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

  const createMutation = useMutation({
    mutationFn: (data: CreateServiceInput) => serviceService.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.services.categories });
      toast({ title: 'Success', description: 'Service created successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to create service' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceInput }) =>
      serviceService.updateService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.services.categories });
      toast({ title: 'Success', description: 'Service updated successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to update service' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => serviceService.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.services.categories });
      toast({ title: 'Success', description: 'Service deleted successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to delete service' });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => serviceService.activateService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      toast({ title: 'Success', description: 'Service activated successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to activate service' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => serviceService.deactivateService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      toast({ title: 'Success', description: 'Service deactivated successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to deactivate service' });
    },
  });

  const createService = async (data: CreateServiceInput) => {
    return createMutation.mutateAsync(data);
  };

  const updateService = async (id: string, data: UpdateServiceInput) => {
    return updateMutation.mutateAsync({ id, data });
  };

  const deleteService = async (id: string) => {
    return deleteMutation.mutateAsync(id);
  };

  const activateService = async (id: string) => {
    return activateMutation.mutateAsync(id);
  };

  const deactivateService = async (id: string) => {
    return deactivateMutation.mutateAsync(id);
  };

  return {
    services,
    selectedService,
    setSelectedService,
    isLoading,
    error: error?.message || null,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    categories,
    currentPage,
    totalPages,
    total,
    itemsPerPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    createService,
    updateService,
    deleteService,
    activateService,
    deactivateService,
    refreshServices: refetch,
  };
};
