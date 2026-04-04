import { useQuery } from '@tanstack/react-query';
import { residentService } from '@/services/api/resident.service';
import { queryKeys } from '@/lib/query-keys';

export const useMyProfile = () => {
  return useQuery({
    queryKey: queryKeys.profile.me,
    queryFn: () => residentService.getMyProfile(),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
};