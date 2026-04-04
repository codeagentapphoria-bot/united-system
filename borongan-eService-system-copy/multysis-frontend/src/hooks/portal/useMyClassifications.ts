import { useQuery } from '@tanstack/react-query';
import api from '@/services/api/auth.service';
import { queryKeys } from '@/lib/query-keys';

export const useMyClassifications = () => {
  return useQuery({
    queryKey: queryKeys.profile.classifications,
    queryFn: async () => {
      const response = await api.get('/portal/classifications/my');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
};