import { useRef, useState, useCallback } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useQueryClient } from '@tanstack/react-query';
import { type BusLocation } from '@/hooks/useBusLocations';
import { queryKeys } from '@/lib/query-keys';
import { Crosshair, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
if (!MAPBOX_TOKEN) throw new Error('VITE_MAPBOX_TOKEN is not set');

const BORONGAN_LNG = 125.4377;
const BORONGAN_LAT = 11.5077;
const DEFAULT_ZOOM = 13;

// ── Helpers ────────────────────────────────────────────────────────────────────

function getCardinalDirection(heading: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(heading / 45) % 8];
}

function getRouteName(bus: BusLocation['bus']): string {
  return bus?.route?.name ?? 'Unknown Route';
}

// ── Marker components ──────────────────────────────────────────────────────────

function BusPin({ busLocation, onClick }: { busLocation: BusLocation; onClick: () => void }) {
  const isMoving = (busLocation.speed ?? 0) > 5;
  const plate = busLocation.bus?.plate_number ?? 'N/A';
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        background: isMoving ? '#16a34a' : '#e11d48',
        width: 36, height: 36, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid white', boxShadow: '0 3px 8px rgba(0,0,0,.3)',
        cursor: 'pointer', color: 'white', fontSize: 10, fontWeight: 'bold',
        userSelect: 'none',
      }}
    >
      {plate}
    </div>
  );
}

function UserPin() {
  return (
    <div style={{ position: 'relative', width: 20, height: 20 }}>
      <div
        className="animate-ping"
        style={{
          position: 'absolute',
          background: 'rgba(34,197,94,.2)', borderRadius: '50%',
          width: 40, height: 40,
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        }}
      />
      <div style={{
        background: '#22c55e', width: 20, height: 20, borderRadius: '50%',
        border: '4px solid white', boxShadow: '0 2px 8px rgba(0,0,0,.3)',
        position: 'absolute', top: 0, left: 0,
      }} />
    </div>
  );
}

// ── Popup content ──────────────────────────────────────────────────────────────

function BusPopupContent({ busLocation }: { busLocation: BusLocation }) {
  const isMoving = (busLocation.speed ?? 0) > 5;
  const plate = busLocation.bus?.plate_number ?? 'N/A';
  const routeName = getRouteName(busLocation.bus);
  const direction = getCardinalDirection(busLocation.heading ?? 0);

  return (
    <div className="p-1 min-w-[140px]">
      <p className="font-bold text-gray-800">{plate}</p>
      <p className="text-sm text-gray-600">Route: {routeName}</p>
      <p className="text-sm font-semibold mt-1" style={{ color: isMoving ? '#16a34a' : '#e11d48' }}>
        {isMoving ? `Moving (${(busLocation.speed ?? 0).toFixed(1)} km/h)` : 'Parked / At Stop'}
      </p>
      {direction && isMoving && (
        <p className="text-xs text-gray-500 mt-1">Direction: {direction}</p>
      )}
      <p className="text-xs text-gray-400 mt-1">
        Updated: {new Date(busLocation.recorded_at).toLocaleTimeString()}
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface BusMapProps {
  height?: string;
  userLocation: [number, number] | null; // [lat, lng]
  onUserLocation: (pos: [number, number]) => void;
  buses?: BusLocation[];
  isLoading?: boolean;
  selectedRouteId?: string | null;
  onSelectedRouteChange?: (routeId: string | null) => void;
  routes?: Array<{ id: string; name: string }>;
}

export function BusMap({
  height = '350px',
  userLocation,
  onUserLocation,
  buses = [],
  isLoading = false,
  selectedRouteId,
  onSelectedRouteChange,
  routes = [],
}: BusMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const queryClient = useQueryClient();

  const filteredBuses = selectedRouteId
    ? buses.filter(b => b.bus?.route?.id === selectedRouteId)
    : buses;

  // Only show buses with valid coordinates on the map
  const activeBuses = filteredBuses.filter(
    b => typeof b.latitude === 'number' && isFinite(b.latitude) &&
      typeof b.longitude === 'number' && isFinite(b.longitude)
  );
  // Empty state only when there are genuinely no buses at all for the route
  const hasAnyBuses = filteredBuses.length > 0;
  const selectedBus = activeBuses.find(b => b.id === selectedBusId) ?? null;

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) { setLocateError('Geolocation not supported'); return; }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        onUserLocation(coords);
        mapRef.current?.flyTo({ center: [coords[1], coords[0]], zoom: 15, duration: 1000 });
        setLocating(false);
      },
      () => { setLocateError('Unable to get location'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  }, [onUserLocation]);

  const handleMapClick = useCallback(() => setSelectedBusId(null), []);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-gray-100" style={{ height }}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: BORONGAN_LNG, latitude: BORONGAN_LAT, zoom: DEFAULT_ZOOM }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/navigation-day-v1"
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={handleMapClick}
      >
        {activeBuses.map(bus => (
          <Marker
            key={bus.id}
            longitude={bus.longitude}
            latitude={bus.latitude}
            anchor="center"
          >
            <BusPin busLocation={bus} onClick={() => setSelectedBusId(bus.id)} />
          </Marker>
        ))}

        {userLocation && (
          <Marker longitude={userLocation[1]} latitude={userLocation[0]} anchor="center">
            <UserPin />
          </Marker>
        )}

        {selectedBus && (
          <Popup
            longitude={selectedBus.longitude}
            latitude={selectedBus.latitude}
            anchor="bottom"
            onClose={() => setSelectedBusId(null)}
            closeOnClick={false}
            offset={20}
          >
            <BusPopupContent busLocation={selectedBus} />
          </Popup>
        )}
      </Map>

      {/* Route filter + custom controls — outside <Map>, driven by mapRef */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
        {routes.length > 0 && (
          <Select
            value={selectedRouteId ?? 'all'}
            onValueChange={val => onSelectedRouteChange?.(val === 'all' ? null : val)}
          >
            <SelectTrigger className="w-36 bg-white shadow-lg text-xs h-10" aria-label="Filter by route">
              <SelectValue placeholder="All Routes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Routes</SelectItem>
              {routes.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <button
          onClick={handleLocate}
          disabled={locating}
          aria-label={locateError ?? 'Get my location'}
          title={locateError ?? 'Get My Location'}
          className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:bg-gray-100"
        >
          {locating
            ? <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            : <Crosshair className={`w-5 h-5 ${userLocation ? 'text-green-600' : 'text-gray-700'}`} />
          }
        </button>
        <button
          onClick={async () => { setIsFetching(true); await queryClient.invalidateQueries({ queryKey: queryKeys.busLocations }); setIsFetching(false); }}
          disabled={isFetching}
          aria-label="Refresh buses"
          title="Refresh buses"
          className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:bg-gray-100"
        >
          <RefreshCw className={`w-5 h-5 text-gray-700 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          aria-label="Zoom in"
          title="Zoom in"
          className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          aria-label="Zoom out"
          title="Zoom out"
          className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Loading buses…</p>
          </div>
        </div>
      )}

      {!isLoading && !hasAnyBuses && (
        <div className="absolute inset-0 flex items-center justify-center z-[9] pointer-events-none">
          <div className="bg-white/90 rounded-xl px-5 py-4 text-center shadow">
            <p className="font-semibold text-gray-600 text-sm">No buses currently tracked</p>
          </div>
        </div>
      )}
    </div>
  );
}
