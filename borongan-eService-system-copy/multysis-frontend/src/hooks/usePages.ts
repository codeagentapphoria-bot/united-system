import { useQuery } from '@tanstack/react-query';
import { pageService } from '@/services/api/page.service';

export interface RedirectOption {
  value: string; // page.id
  label: string; // page.path
  description?: string; // page.name
  system?: string;
}

export function usePages(system?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['pages', system],
    queryFn: async ({ signal }) => {
      const result = await pageService.getPages(system, '', 1, 100, signal);
      return result.pages;
    },
  });

  const redirectOptions: RedirectOption[] = (data ?? []).map((page) => ({
    value: page.id,
    label: page.path,
    description: page.name,
    system: page.system,
  }));

  return {
    redirectOptions,
    isLoading,
  };
}
