import { useQuery } from '@tanstack/react-query';
import { useBusLocations } from './useBusLocations';
import { estimateMinutesToStop } from '@/lib/distance';
import type { RouteStop } from './useRoutes';

export interface NextBusETA {
  busId: string;
  etaMinutes: number;
}

async function fetchETAs(
  buses: Array<{ id: string; latitude: number; longitude: number }>,
  stop: RouteStop
): Promise<NextBusETA[]> {
  const results = await Promise.all(
    buses.map(async (bus) => {
      const eta = await estimateMinutesToStop(
        bus.latitude,
        bus.longitude,
        stop.latitude,
        stop.longitude
      );
      if (!eta) return null;
      return { busId: bus.id, etaMinutes: Math.ceil(eta.duration / 60) } as NextBusETA;
    })
  );
  return results.filter((r): r is NextBusETA => r !== null);
}

export function useNextBusETA(routeId: string, stop: RouteStop) {
  const { data: buses = [] } = useBusLocations(30_000);

  return useQuery({
    // Include buses in key so the query re-runs when bus locations refresh
    queryKey: ['next-bus-eta', routeId, stop.id, stop.latitude, stop.longitude, buses.map(b => b.id)],
    queryFn: () => {
      const routeBuses = buses.filter(b => b.bus?.route?.id === routeId);
      if (!routeBuses.length) return [];
      return fetchETAs(routeBuses, stop);
    },
    staleTime: 25_000,
  });
}
