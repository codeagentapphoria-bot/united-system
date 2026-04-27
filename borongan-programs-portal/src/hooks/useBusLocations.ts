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
    route?: { id: string; name: string };
  };
}

export function useBusLocations(refetchInterval = 15_000) {
  return useQuery<BusLocation[]>({
    queryKey: queryKeys.busLocations,
    queryFn: async () => {
      // Query the pre-computed view that uses DISTINCT ON to return only the
      // latest record per bus (~3 rows vs 2,140 rows from the raw table).
      const { data: locations, error: locError } = await supabase
        .from('latest_bus_locations')
        .select('*');

      if (locError) throw locError;
      if (!locations?.length) return [];

      const busIds = locations.map(l => l.bus_id);

      const { data: buses, error: busError } = await supabase
        .from('buses')
        .select('id, plate_number, route:routes(id, name)')
        .in('id', busIds);

      if (busError) throw busError;

      const busMap = new Map<string, (typeof buses)[0]>();
      for (const bus of buses ?? []) busMap.set(bus.id, bus);

      return locations.map(loc => {
        const bus = busMap.get(loc.bus_id);

        return {
          id: loc.id,
          bus_id: loc.bus_id,
          latitude: loc.latitude,
          longitude: loc.longitude,
          speed: loc.speed,
          heading: loc.heading,
          recorded_at: loc.recorded_at,
          barangay: loc.barangay_id
            ? { id: loc.barangay_id, name: loc.barangay_name }
            : undefined,
          bus: bus
            ? { id: bus.id, plate_number: bus.plate_number, route: bus.route ?? undefined }
            : undefined,
        } as BusLocation;
      });
    },
    refetchInterval,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  });
}
