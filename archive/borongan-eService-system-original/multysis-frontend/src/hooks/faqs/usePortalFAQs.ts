// React imports
import { useEffect, useState } from 'react';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Services
import { faqService, type FAQ, type PaginatedFAQs } from '@/services/api/faq.service';

export const usePortalFAQs = () => {
  const [homepageFAQs, setHomepageFAQs] = useState<FAQ[]>([]);
  const [paginatedFAQs, setPaginatedFAQs] = useState<PaginatedFAQs | null>(null);
  const [isLoadingHomepage, setIsLoadingHomepage] = useState(true);
  const [isLoadingPaginated, setIsLoadingPaginated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  // Fetch homepage FAQs (max 5)
  const getHomepageFAQs = async () => {
    try {
      setIsLoadingHomepage(true);
      setError(null);
      const faqs = await faqService.getHomepageFAQs(5);
      setHomepageFAQs(faqs);
    } catch (err: any) {
      // Handle network errors gracefully (backend not running, CORS issues, etc.)
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        console.warn('Backend server not available. FAQs will not be displayed.');
        setHomepageFAQs([]); // Set empty array so component doesn't show error
        setError(null); // Don't set error for network issues
      } else {
        setError(err.message || 'Failed to fetch FAQs');
        console.error('Failed to fetch homepage FAQs:', err);
      }
    } finally {
      setIsLoadingHomepage(false);
    }
  };

  // Fetch paginated FAQs
  const getPaginatedFAQs = async (page: number = 1, limit: number = 10, search?: string) => {
    try {
      setIsLoadingPaginated(true);
      setError(null);
      const result = await faqService.getPaginatedFAQs(page, limit, search);
      setPaginatedFAQs(result);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch FAQs');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to fetch FAQs',
      });
      throw err;
    } finally {
      setIsLoadingPaginated(false);
    }
  };

  // Load homepage FAQs on mount
  useEffect(() => {
    getHomepageFAQs();
  }, []);

  return {
    homepageFAQs,
    paginatedFAQs,
    isLoadingHomepage,
    isLoadingPaginated,
    error,
    getHomepageFAQs,
    getPaginatedFAQs,
  };
};

