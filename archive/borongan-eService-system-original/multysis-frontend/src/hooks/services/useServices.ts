import { useState, useEffect, useCallback, useMemo } from 'react';
import { serviceService, type Service, type CreateServiceInput, type UpdateServiceInput } from '@/services/api/service.service';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

export const useServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const { toast } = useToast();

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch services function
  const fetchServices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const isActive = statusFilter === 'all' ? undefined : statusFilter === 'active';
      const category = categoryFilter === 'all' ? undefined : categoryFilter;
      
      const result = await serviceService.getAllServices(
        currentPage,
        itemsPerPage,
        debouncedSearchQuery || undefined,
        category,
        isActive
      );
      
      setServices(result.services);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch services');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to fetch services',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchQuery, categoryFilter, statusFilter, toast, itemsPerPage]);

  // Auto-select first service when services are loaded and no service is selected
  useEffect(() => {
    if (services.length > 0 && !selectedService) {
      setSelectedService(services[0]);
    }
  }, [services, selectedService]);

  // Fetch services
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Reset to page 1 when filters change (use debounced search query)
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, categoryFilter, statusFilter]);

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

  const createService = async (data: CreateServiceInput): Promise<Service> => {
    try {
      const newService = await serviceService.createService(data);
      setServices((prev) => [newService, ...prev]);
      toast({
        title: 'Success',
        description: 'Service created successfully',
      });
      return newService;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to create service',
      });
      throw err;
    }
  };

  const updateService = async (id: string, data: UpdateServiceInput): Promise<Service> => {
    try {
      const updatedService = await serviceService.updateService(id, data);
      setServices((prev) =>
        prev.map((service) => (service.id === id ? updatedService : service))
      );
      if (selectedService?.id === id) {
        setSelectedService(updatedService);
      }
      toast({
        title: 'Success',
        description: 'Service updated successfully',
      });
      return updatedService;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to update service',
      });
      throw err;
    }
  };

  const deleteService = async (id: string): Promise<void> => {
    try {
      await serviceService.deleteService(id);
      setServices((prev) => prev.filter((service) => service.id !== id));
      if (selectedService?.id === id) {
        setSelectedService(null);
      }
      toast({
        title: 'Success',
        description: 'Service deleted successfully',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to delete service',
      });
      throw err;
    }
  };

  const activateService = async (id: string): Promise<Service> => {
    try {
      const updatedService = await serviceService.activateService(id);
      setServices((prev) =>
        prev.map((service) => (service.id === id ? updatedService : service))
      );
      if (selectedService?.id === id) {
        setSelectedService(updatedService);
      }
      toast({
        title: 'Success',
        description: 'Service activated successfully',
      });
      return updatedService;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to activate service',
      });
      throw err;
    }
  };

  const deactivateService = async (id: string): Promise<Service> => {
    try {
      const updatedService = await serviceService.deactivateService(id);
      setServices((prev) =>
        prev.map((service) => (service.id === id ? updatedService : service))
      );
      if (selectedService?.id === id) {
        setSelectedService(updatedService);
      }
      toast({
        title: 'Success',
        description: 'Service deactivated successfully',
      });
      return updatedService;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to deactivate service',
      });
      throw err;
    }
  };

  // Get unique categories for filter (memoized)
  const categories = useMemo(() => {
    return Array.from(
      new Set(services.map((service) => service.category).filter((cat): cat is string => Boolean(cat)))
    ).sort();
  }, [services]);

  return {
    services,
    selectedService,
    setSelectedService,
    isLoading,
    error,
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
    refreshServices: fetchServices,
  };
};

