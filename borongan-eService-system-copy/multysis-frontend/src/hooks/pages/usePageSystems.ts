import { useQuery } from '@tanstack/react-query';
import { pageService } from '@/services/api/page.service';
import { queryKeys } from '@/lib/query-keys';
import { SYSTEM_LABELS } from '@/constants/systemLabels';

export const usePageSystems = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.pages.systems,
    queryFn: ({ signal }) => pageService.getSystems(signal),
  });

  const systems = (data ?? []).map((system) => ({
    value: system,
    label: SYSTEM_LABELS[system] ?? system,
  }));

  return { systems, isLoading, error: error?.message || null };
};