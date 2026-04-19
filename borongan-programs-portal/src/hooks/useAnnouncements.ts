import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { announcementService } from '@/services/announcement.service';
import type { Announcement } from '@/types/announcement';

export function useAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: queryKeys.announcements.active,
    queryFn: () => announcementService.getActive(),
    staleTime: 60_000,
  });
}
