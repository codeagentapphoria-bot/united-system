import { QueryClient, QueryCache } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

const queryCache = new QueryCache({
  onError: (error, query) => {
    // Skip silent background polls and refetches on focus to avoid toast spam.
    // Only toast user-initiated queries.
    if (query.state.data !== undefined) return; // refetch failed — already had data, no toast
    const message = error instanceof Error ? error.message : 'Request failed. Please try again.';
    toast({
      variant: 'destructive',
      title: 'Request failed',
      description: message,
    });
  },
});

export const queryClient = new QueryClient({
  queryCache,
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
