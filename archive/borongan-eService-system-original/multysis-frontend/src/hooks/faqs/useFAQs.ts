// React imports
import { useEffect, useState } from 'react';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Services
import { faqService, type CreateFAQInput, type FAQ, type UpdateFAQInput } from '@/services/api/faq.service';

// Re-export types for convenience
export type { CreateFAQInput, UpdateFAQInput };

export const useFAQs = () => {
  const [faqs, setFAQs] = useState<FAQ[]>([]);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { toast } = useToast();

  // Fetch FAQs
  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const isActive = statusFilter === 'all' ? undefined : statusFilter === 'active';
        
        const fetchedFAQs = await faqService.getAllFAQs(
          searchQuery || undefined,
          isActive
        );
        
        setFAQs(fetchedFAQs);
        
        // Set first FAQ as selected if available
        if (fetchedFAQs.length > 0 && !selectedFAQ) {
          setSelectedFAQ(fetchedFAQs[0]);
        }
      } catch (err: any) {
        // Handle 403 errors silently (access denied - may be subscriber trying to access admin-only endpoint)
        if (err.response?.status === 403) {
          setError('Access denied');
          setFAQs([]);
        } else {
          setError(err.message || 'Failed to fetch FAQs');
          toast({
            variant: 'destructive',
            title: 'Error',
            description: err.message || 'Failed to fetch FAQs',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchFAQs();
  }, [searchQuery, statusFilter]);

  // Filter FAQs (client-side filtering for immediate UI feedback)
  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && faq.isActive) ||
                         (statusFilter === 'inactive' && !faq.isActive);
    return matchesSearch && matchesStatus;
  });

  const createFAQ = async (data: CreateFAQInput): Promise<FAQ> => {
    try {
      const newFAQ = await faqService.createFAQ(data);
      
      setFAQs((prev) => [newFAQ, ...prev]);
      toast({
        title: 'Success',
        description: 'FAQ created successfully',
      });
      return newFAQ;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to create FAQ',
      });
      throw err;
    }
  };

  const updateFAQ = async (id: string, data: UpdateFAQInput): Promise<FAQ> => {
    try {
      const updatedFAQ = await faqService.updateFAQ(id, data);
      
      setFAQs((prev) =>
        prev.map((faq) => (faq.id === id ? updatedFAQ : faq))
      );
      if (selectedFAQ?.id === id) {
        setSelectedFAQ(updatedFAQ);
      }
      toast({
        title: 'Success',
        description: 'FAQ updated successfully',
      });
      return updatedFAQ;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to update FAQ',
      });
      throw err;
    }
  };

  const deleteFAQ = async (id: string): Promise<void> => {
    try {
      await faqService.deleteFAQ(id);
      
      setFAQs((prev) => prev.filter((faq) => faq.id !== id));
      if (selectedFAQ?.id === id) {
        setSelectedFAQ(null);
      }
      toast({
        title: 'Success',
        description: 'FAQ deleted successfully',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to delete FAQ',
      });
      throw err;
    }
  };

  const activateFAQ = async (id: string): Promise<FAQ> => {
    try {
      const activatedFAQ = await faqService.activateFAQ(id);
      
      setFAQs((prev) =>
        prev.map((faq) => (faq.id === id ? activatedFAQ : faq))
      );
      if (selectedFAQ?.id === id) {
        setSelectedFAQ(activatedFAQ);
      }
      toast({
        title: 'Success',
        description: 'FAQ activated successfully',
      });
      return activatedFAQ;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to activate FAQ',
      });
      throw err;
    }
  };

  const deactivateFAQ = async (id: string): Promise<FAQ> => {
    try {
      const deactivatedFAQ = await faqService.deactivateFAQ(id);
      
      setFAQs((prev) =>
        prev.map((faq) => (faq.id === id ? deactivatedFAQ : faq))
      );
      if (selectedFAQ?.id === id) {
        setSelectedFAQ(deactivatedFAQ);
      }
      toast({
        title: 'Success',
        description: 'FAQ deactivated successfully',
      });
      return deactivatedFAQ;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to deactivate FAQ',
      });
      throw err;
    }
  };

  return {
    faqs: filteredFAQs,
    allFAQs: faqs,
    selectedFAQ,
    setSelectedFAQ,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    activateFAQ,
    deactivateFAQ,
  };
};


