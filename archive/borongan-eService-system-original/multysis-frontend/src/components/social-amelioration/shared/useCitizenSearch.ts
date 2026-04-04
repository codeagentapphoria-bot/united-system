// React imports
import { useCallback, useEffect, useState } from 'react';

// Hooks
import { useCitizens } from '@/hooks/citizens/useCitizens';
import { useDebounce } from '@/hooks/useDebounce';

export const useCitizenSearch = () => {
  const {
    citizens,
    isLoading: isLoadingCitizens,
    setSearchQuery,
    selectedCitizen,
    setSelectedCitizen,
  } = useCitizens();
  
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);
  
  // Update the actual search query when debounced value changes
  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchQuery]);

  // Filter citizens based on search (using local search for immediate UI feedback)
  const filteredCitizens = citizens.filter(citizen => {
    const fullName = `${citizen.firstName} ${citizen.middleName || ''} ${citizen.lastName}`.toLowerCase();
    const searchLower = localSearchQuery.toLowerCase();
    return fullName.includes(searchLower) ||
           citizen.residentId?.toLowerCase().includes(searchLower) ||
           citizen.phoneNumber?.toLowerCase().includes(searchLower);
  });

  const resetSearch = useCallback(() => {
    setLocalSearchQuery('');
    setSearchQuery('');
    setSelectedCitizen(null);
  }, [setSearchQuery, setSelectedCitizen]);

  return {
    citizens,
    filteredCitizens,
    isLoadingCitizens,
    localSearchQuery,
    setLocalSearchQuery,
    selectedCitizen,
    setSelectedCitizen,
    resetSearch,
  };
};

