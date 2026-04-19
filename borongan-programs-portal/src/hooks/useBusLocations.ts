import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/query-keys';

export interface BusLocation {
  id: string;
  bus_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading?: number;
  recorded_at: string;
  barangay?: { id: string; name: string };
  bus?: {
    id: string;
    plate_number: string;
    routes?: { id: string; name: string }[];
  };
}

export function useBusLocations(refetchInterval = 30_000) {
  return useQuery<BusLocation[]>({
    queryKey: queryKeys.busLocations,
    queryFn: async () => {
      const { data: locations, error: locError } = await supabase
        .from('bus_locations')
        .select('*, barangay:barangays(id, name)')
        .order('recorded_at', { ascending: false });

      if (locError) throw locError;
      if (!locations?.length) return [];

      const busIds = [...new Set(locations.map(l => l.bus_id))];

      const { data: buses, error: busError } = await supabase
        .from('buses')
        .select('id, plate_number, bus_routes(route_id, is_primary, routes(id, name))')
        .in('id', busIds);

      if (busError) throw busError;

      const busMap = new Map<string, typeof buses[0]>();
      for (const bus of buses ?? []) busMap.set(bus.id, bus);

      // Keep only the latest location per bus
      const latestPerBus = new Map<string, typeof locations[0]>();
      for (const loc of locations) {
        if (!latestPerBus.has(loc.bus_id)) latestPerBus.set(loc.bus_id, loc);
      }

      return Array.from(latestPerBus.values()).map(loc => {
        const bus = busMap.get(loc.bus_id);
        const routesData = bus?.bus_routes as unknown as {
          route_id: string;
          is_primary: boolean;
          routes: { id: string; name: string };
        }[] | undefined;
        const routes = routesData?.map(br => br.routes).filter(Boolean) ?? [];

        return {
          ...loc,
          bus: bus
            ? { id: bus.id, plate_number: bus.plate_number, routes: routes.length ? routes : undefined }
            : undefined,
        } as BusLocation;
      });
    },
    refetchInterval,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  });
}
