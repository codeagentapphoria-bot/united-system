import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { faqService, type CreateFAQInput, type FAQ, type UpdateFAQInput } from '@/services/api/faq.service';
import { queryKeys } from '@/lib/query-keys';

export type { CreateFAQInput, UpdateFAQInput };

export const useFAQs = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);

  const { data: faqs = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.faqs.list({ search: searchQuery, status: statusFilter }),
    queryFn: ({ signal }) => {
      const isActive = statusFilter === 'all' ? undefined : statusFilter === 'active';
      return faqService.getAllFAQs(searchQuery || undefined, isActive, signal);
    },
  });

  const filteredFAQs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesSearch =
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' ||
                           (statusFilter === 'active' && faq.isActive) ||
                           (statusFilter === 'inactive' && !faq.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [faqs, searchQuery, statusFilter]);

  const createMutation = useMutation({
    mutationFn: (data: CreateFAQInput) => faqService.createFAQ(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faqs.all });
      toast({ title: 'Success', description: 'FAQ created successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to create FAQ' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFAQInput }) =>
      faqService.updateFAQ(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faqs.all });
      toast({ title: 'Success', description: 'FAQ updated successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to update FAQ' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => faqService.deleteFAQ(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faqs.all });
      toast({ title: 'Success', description: 'FAQ deleted successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to delete FAQ' });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => faqService.activateFAQ(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faqs.all });
      toast({ title: 'Success', description: 'FAQ activated successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to activate FAQ' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => faqService.deactivateFAQ(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.faqs.all });
      toast({ title: 'Success', description: 'FAQ deactivated successfully' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to deactivate FAQ' });
    },
  });

  const createFAQ = async (data: CreateFAQInput) => {
    return createMutation.mutateAsync(data);
  };

  const updateFAQ = async (id: string, data: UpdateFAQInput) => {
    return updateMutation.mutateAsync({ id, data });
  };

  const deleteFAQ = async (id: string) => {
    return deleteMutation.mutateAsync(id);
  };

  const activateFAQ = async (id: string) => {
    return activateMutation.mutateAsync(id);
  };

  const deactivateFAQ = async (id: string) => {
    return deactivateMutation.mutateAsync(id);
  };

  return {
    faqs: filteredFAQs,
    allFAQs: faqs,
    isLoading,
    error: error?.message || null,
    refetch,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedFAQ,
    setSelectedFAQ,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    activateFAQ,
    deactivateFAQ,
  };
};
