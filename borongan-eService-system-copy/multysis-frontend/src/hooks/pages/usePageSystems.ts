import { useQuery } from '@tanstack/react-query';
import { systemService } from '@/services/api/system.service';
import { queryKeys } from '@/lib/query-keys';

export const usePageSystems = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.systems.all,
    queryFn: ({ signal }) => systemService.getSystems(signal),
  });

  const systems = (data ?? []).map((system) => ({
    value: system.slug,
    label: system.label,
  }));

  return { systems, isLoading, error: error?.message || null };
};
