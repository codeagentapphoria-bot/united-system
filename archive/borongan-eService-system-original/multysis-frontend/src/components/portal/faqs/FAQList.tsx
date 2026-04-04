// React imports
import React, { useState, useEffect, useCallback } from 'react';

// Third-party libraries
import { FiSearch } from 'react-icons/fi';
import { useDebounce } from '@/hooks/useDebounce';

// UI Components (shadcn/ui)
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';

// Custom Components
import { FAQItem } from './FAQItem';

// Hooks
import { usePortalFAQs } from '@/hooks/faqs/usePortalFAQs';


interface FAQListProps {
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
}

export const FAQList: React.FC<FAQListProps> = ({
  page: initialPage = 1,
  limit = 10,
  onPageChange,
}) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { paginatedFAQs, isLoadingPaginated, getPaginatedFAQs } = usePortalFAQs();

  const fetchFAQs = useCallback(() => {
    getPaginatedFAQs(currentPage, limit, debouncedSearchQuery || undefined);
  }, [currentPage, limit, debouncedSearchQuery, getPaginatedFAQs]);

  useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (onPageChange) {
      onPageChange(newPage);
    }
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoadingPaginated && !paginatedFAQs) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-gray-500 mt-4">Loading FAQs...</p>
      </div>
    );
  }

  if (!paginatedFAQs || paginatedFAQs.faqs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          {searchQuery ? 'No FAQs found matching your search.' : 'No FAQs available at the moment.'}
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Please ensure the backend server is running and the database migration has been completed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <FiSearch size={20} />
        </div>
        <Input
          placeholder="Search FAQs..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1); // Reset to first page on search
          }}
          className="pl-10 h-12"
        />
      </div>

      {/* FAQ List */}
      <div className="space-y-2">
        {paginatedFAQs.faqs.map((faq) => (
          <FAQItem key={faq.id} faq={faq} />
        ))}
      </div>

      {/* Pagination */}
      {paginatedFAQs.pagination.totalPages > 1 && (
        <div className="flex justify-center pt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={paginatedFAQs.pagination.totalPages}
            onPageChange={handlePageChange}
            onPrevious={() => handlePageChange(Math.max(1, currentPage - 1))}
            onNext={() => handlePageChange(Math.min(paginatedFAQs.pagination.totalPages, currentPage + 1))}
            isLoading={isLoadingPaginated}
          />
        </div>
      )}

      {/* Results count */}
      <div className="text-center text-sm text-gray-500 pt-4">
        Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, paginatedFAQs.pagination.total)} of {paginatedFAQs.pagination.total} FAQs
      </div>
    </div>
  );
};

