import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/query-keys';

export interface RouteStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence_order: number;
}

export interface RouteWithStops {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  stops: RouteStop[];
}

export function useRoutes() {
  return useQuery<RouteWithStops[]>({
    queryKey: queryKeys.routes.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes')
        .select(`
          id,
          name,
          description,
          is_active,
          route_stops!inner(
            sequence_order,
            stops!inner(
              id,
              name,
              latitude,
              longitude
            )
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Normalize: flatten route_stops → stops array, sorted by sequence_order
      return (data ?? []).map((r: Record<string, unknown>) => {
        const routeStops = r.route_stops as Array<{ sequence_order: number; stops: Omit<RouteStop, 'sequence_order'> }>;
        const stops: RouteStop[] = (routeStops ?? [])
          .sort((a, b) => a.sequence_order - b.sequence_order)
          .map(rs => ({ ...rs.stops, sequence_order: rs.sequence_order }));

        return {
          id: r.id as string,
          name: r.name as string,
          description: r.description as string | null,
          is_active: r.is_active as boolean,
          stops,
        };
      });
    },
    staleTime: 60_000,
  });
}

export function useRoute(routeId: string | null) {
  return useQuery<RouteWithStops | null>({
    queryKey: queryKeys.routes.detail(routeId ?? ''),
    queryFn: async () => {
      if (!routeId) return null;
      const { data, error } = await supabase
        .from('routes')
        .select(`
          id,
          name,
          description,
          is_active,
          route_stops!inner(
            sequence_order,
            stops!inner(
              id,
              name,
              latitude,
              longitude
            )
          )
        `)
        .eq('id', routeId)
        .single();

      if (error) throw error;
      if (!data) return null;

      const routeStops = data.route_stops as unknown as Array<{ sequence_order: number; stops: Omit<RouteStop, 'sequence_order'> }>;
      const stops: RouteStop[] = (routeStops ?? [])
        .sort((a, b) => a.sequence_order - b.sequence_order)
        .map(rs => ({ ...rs.stops, sequence_order: rs.sequence_order }));

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        is_active: data.is_active,
        stops,
      };
    },
    enabled: !!routeId,
    staleTime: 60_000,
  });
}
