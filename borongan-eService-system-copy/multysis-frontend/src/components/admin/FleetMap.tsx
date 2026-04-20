import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { libreSakayService, type FleetBus } from '@/services/api/libre-sakay.service';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon broken by Vite asset bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function makeBusIcon(status: 'moving' | 'parked') {
  const color = status === 'moving' ? '#22c55e' : '#f97316';
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const BORONGAN_CENTER: [number, number] = [11.6072, 125.4317];

export function FleetMap() {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data: buses = [], isLoading, isError } = useQuery({
    queryKey: queryKeys.libreSakay.fleetLocations,
    queryFn: libreSakayService.getFleetLocations,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel('fleet-map-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bus_locations' },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.fleetLocations });
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
        <p className="text-muted-foreground text-sm">Loading fleet map…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
        <p className="text-destructive text-sm">Failed to load fleet locations.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden border" style={{ height: '480px' }}>
      <MapContainer
        center={BORONGAN_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {buses.map((bus: FleetBus) => (
          <Marker
            key={bus.bus_id}
            position={[bus.latitude, bus.longitude]}
            icon={makeBusIcon(bus.status)}
          >
            <Popup>
              <div className="text-sm space-y-1">
                <p className="font-semibold">{bus.plate_number}</p>
                {bus.route_name && <p>Route: {bus.route_name}</p>}
                {bus.driver_name && <p>Driver: {bus.driver_name}</p>}
                <p>Status: <span className={bus.status === 'moving' ? 'text-green-600' : 'text-orange-500'}>{bus.status}</span></p>
                <p>Speed: {bus.speed} km/h</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
