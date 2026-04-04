import { useQuery } from '@tanstack/react-query';
import api from '@/services/api/auth.service';
import { queryKeys } from '@/lib/query-keys';

export const useMyHousehold = () => {
  return useQuery({
    queryKey: queryKeys.profile.household,
    queryFn: async () => {
      const response = await api.get('/portal/household/my');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
};