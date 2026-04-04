import { useDebounce } from '@/hooks/useDebounce';
import type { Subscriber } from '@/services/api/subscriber.service';
import { subscriberService } from '@/services/api/subscriber.service';
import { useEffect, useState } from 'react';

const IS_MOCK = import.meta.env.VITE_MOCK_API === 'true';

// Mock data fallback
const mockSubscribers: any[] = [
  {
    id: '1',
    name: 'Juan Dela Cruz',
    firstName: 'Juan',
    middleName: 'Santos',
    lastName: 'Dela Cruz',
    extensionName: 'Jr.',
    residentId: 'RES-2024-001',
    phoneNumber: '09171234567',
    email: 'juan@example.com',
    status: 'active',
    accountStatus: 'active',
    residencyType: 'resident',
    residencyStatus: 'active',
    birthDate: '1990-05-15',
    dateSubscribed: '2025-01-15',
    profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    residentAddress: '123 Main Street, Barangay Central, Quezon City, Metro Manila',
    placeOfBirth: {
      region: 'NCR',
      province: 'Metro Manila',
      municipality: 'Quezon City'
    }
  },
];

export const useSubscribers = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const [residencyFilter, setResidencyFilter] = useState<'all' | 'resident' | 'non-resident'>('all');
  
  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Fetch subscribers from API
  const fetchSubscribers = async () => {
    if (IS_MOCK) {
      setSubscribers(mockSubscribers as any);
      setSelectedSubscriber((prev) => prev || mockSubscribers[0] as any);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const result = await subscriberService.getAllSubscribers(
        currentPage,
        itemsPerPage,
        debouncedSearchQuery, // Use debounced search query
        residencyFilter
      );
      setSubscribers(result.subscribers);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
      
      // Set first subscriber as selected if available and no current selection
      setSelectedSubscriber((prev) => {
        if (result.subscribers.length > 0 && !prev) {
          return result.subscribers[0];
        }
        // If current selection still exists in the new list, keep it; otherwise select first
        if (prev && result.subscribers.find(s => s.id === prev.id)) {
          return prev;
        }
        return result.subscribers.length > 0 ? result.subscribers[0] : null;
      });
    } catch (error) {
      // Logging utility will only log in development
      const { logger } = await import('../../utils/logger');
      logger.error('Failed to fetch subscribers:', error);
      setSubscribers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch subscribers when debounced search, filter, or page changes
  useEffect(() => {
    fetchSubscribers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearchQuery, residencyFilter]);

  // Refresh function to manually refetch subscribers
  const refreshSubscribers = async () => {
    await fetchSubscribers();
  };

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, residencyFilter]);

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

  // Transform subscribers to match expected format
  const transformedSubscribers = subscribers.map((sub) => ({
    ...sub,
    name: `${sub.firstName || ''} ${sub.middleName ? sub.middleName + ' ' : ''}${sub.lastName || ''}${sub.extensionName ? ' ' + sub.extensionName : ''}`.trim(),
    accountStatus: sub.status?.toLowerCase() || 'active',
    residencyStatus: sub.residencyStatus || sub.status?.toLowerCase() || 'active',
    birthDate: sub.birthDate,
    dateSubscribed: sub.createdAt,
  }));

  // Transform selectedSubscriber if it exists
  const transformedSelectedSubscriber = selectedSubscriber ? {
    ...selectedSubscriber,
    name: `${selectedSubscriber.firstName || ''} ${selectedSubscriber.middleName ? selectedSubscriber.middleName + ' ' : ''}${selectedSubscriber.lastName || ''}${selectedSubscriber.extensionName ? ' ' + selectedSubscriber.extensionName : ''}`.trim(),
    accountStatus: selectedSubscriber.status?.toLowerCase() || 'active',
    residencyStatus: selectedSubscriber.residencyStatus || selectedSubscriber.status?.toLowerCase() || 'active',
    birthDate: selectedSubscriber.birthDate,
    dateSubscribed: selectedSubscriber.createdAt,
  } : null;

  return {
    subscribers: transformedSubscribers,
    filteredSubscribers: transformedSubscribers,
    paginatedFilteredSubscribers: transformedSubscribers,
    selectedSubscriber: transformedSelectedSubscriber as any, // Cast to any to resolve complex inference issues in component
    setSelectedSubscriber,
    searchQuery,
    setSearchQuery,
    residencyFilter,
    setResidencyFilter,
    // Pagination
    currentPage,
    totalPages,
    total,
    itemsPerPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    isLoading,
    refreshSubscribers,
  };
};
