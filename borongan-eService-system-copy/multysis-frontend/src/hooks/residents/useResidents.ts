/**
 * useResidents.ts
 *
 * Replaces: useSubscribers.ts + useCitizens.ts
 * Manages fetching, pagination, search, and selection of residents
 * from the unified /api/residents endpoint.
 */

import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { residentService, type Resident, type ResidentFilters } from '@/services/api/resident.service';
import { useCallback, useState } from 'react';
import { queryKeys } from '@/lib/query-keys';

export const useResidents = (initialFilters: ResidentFilters = {}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters.status ?? 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(initialFilters.limit ?? 10);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.residents.list({
      search: debouncedSearch,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      page: currentPage,
      limit: itemsPerPage,
      barangayId: initialFilters.barangayId,
      municipalityId: initialFilters.municipalityId,
    }),
    queryFn: ({ signal }) => {
      const filters: ResidentFilters = {
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page: currentPage,
        limit: itemsPerPage,
        barangayId: initialFilters.barangayId,
        municipalityId: initialFilters.municipalityId,
        signal,
      };
      return residentService.listResidents(filters);
    },
  });

  const residents = data?.residents ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 1;

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    residents,
    isLoading,
    error: null,
    total,
    totalPages,
    currentPage,
    itemsPerPage,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedResident,
    setSelectedResident,
    handlePageChange,
    refresh,
    refetch,
  };
};
