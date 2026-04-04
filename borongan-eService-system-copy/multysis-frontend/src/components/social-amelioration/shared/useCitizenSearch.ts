/**
 * useCitizenSearch.ts — updated for unified residents (was: useCitizens hook)
 *
 * Used by social amelioration modals (AddPWDModal, AddSeniorCitizenModal, etc.)
 * to search for residents to link as beneficiaries.
 */

import { useCallback, useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { residentService, type Resident } from '@/services/api/resident.service';

export const useCitizenSearch = () => {
  const [residents, setResidents]             = useState<Resident[]>([]);
  const [isLoading, setIsLoading]             = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [selectedCitizen, setSelectedCitizen] = useState<Resident | null>(null);

  const debouncedSearch = useDebounce(localSearchQuery, 300);

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setResidents([]);
      return;
    }
    setIsLoading(true);
    residentService
      .searchResidents(debouncedSearch, { status: 'active' })
      .then(setResidents)
      .catch(() => setResidents([]))
      .finally(() => setIsLoading(false));
  }, [debouncedSearch]);

  const filteredCitizens = residents.filter((r) => {
    const fullName = `${r.firstName} ${r.middleName ?? ''} ${r.lastName}`.toLowerCase();
    const q = localSearchQuery.toLowerCase();
    return (
      fullName.includes(q) ||
      r.residentId?.toLowerCase().includes(q) ||
      r.contactNumber?.toLowerCase().includes(q)
    );
  });

  const resetSearch = useCallback(() => {
    setLocalSearchQuery('');
    setResidents([]);
    setSelectedCitizen(null);
  }, []);

  return {
    // kept old names for backward compat with callers
    citizens: residents,
    filteredCitizens,
    isLoadingCitizens: isLoading,
    localSearchQuery,
    setLocalSearchQuery,
    selectedCitizen,
    setSelectedCitizen,
    resetSearch,
  };
};
