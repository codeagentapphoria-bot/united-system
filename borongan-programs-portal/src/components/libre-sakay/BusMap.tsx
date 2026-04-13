import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useBusLocations, type BusLocation } from '@/hooks/useBusLocations';
import { Crosshair, ZoomIn, ZoomOut } from 'lucide-react';

const BORONGAN_CENTER: [number, number] = [11.5077, 125.4377];
const DEFAULT_ZOOM = 13;

// ── Helpers ────────────────────────────────────────────────────────────────────

function getCardinalDirection(heading: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(heading / 45) % 8];
}

function getRouteName(bus: BusLocation['bus']): string {
  const routes = bus?.routes as unknown;
  if (Array.isArray(routes) && routes.length > 0) return routes[0].name ?? 'Unknown Route';
  if (routes && typeof routes === 'object' && 'name' in routes) return (routes as { name: string }).name;
  return 'Unknown Route';
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const createBusIcon = (isMoving: boolean, plateNumber: string) =>
  new L.DivIcon({
    className: 'bus-marker',
    html: `<div style="
      background:${isMoving ? '#16a34a' : '#e11d48'};
      width:36px;height:36px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,.3);
      cursor:pointer;
    ">
      <span style="color:white;font-size:10px;font-weight:bold;">${plateNumber}</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const userIcon = new L.DivIcon({
  className: 'user-location-marker',
  html: `<div style="position:relative;width:20px;height:20px;">
    <div style="
      background:#22c55e;width:20px;height:20px;border-radius:50%;
      border:4px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);
      position:absolute;top:0;left:0;
    "></div>
    <div style="
      background:rgba(34,197,94,.2);width:40px;height:40px;border-radius:50%;
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    "></div>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// ── Map controls (must be inside MapContainer) ─────────────────────────────────

interface MapControlsProps {
  userLocation: [number, number] | null;
  onUserLocation: (pos: [number, number]) => void;
}

function MapControls({ userLocation, onUserLocation }: MapControlsProps) {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        onUserLocation(coords);
        map.flyTo(coords, 15, { duration: 1 });
        setLocating(false);
      },
      () => { setError('Unable to get location'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  }, [map, onUserLocation]);

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <button
        onClick={handleLocate}
        disabled={locating}
        title={error ?? 'Get My Location'}
        className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:bg-gray-100"
      >
        {locating
          ? <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          : <Crosshair className={`w-5 h-5 ${userLocation ? 'text-green-600' : 'text-gray-700'}`} />
        }
      </button>
      <button onClick={() => map.zoomIn()} className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
        <ZoomIn className="w-5 h-5 text-gray-700" />
      </button>
      <button onClick={() => map.zoomOut()} className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
        <ZoomOut className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  );
}

// ── Bus marker with Popup (same as libre-sakay-web BusMarker) ─────────────────

function BusMarker({ busLocation }: { busLocation: BusLocation }) {
  const isMoving = (busLocation.speed ?? 0) > 5;
  const plateNumber = busLocation.bus?.plate_number ?? 'N/A';
  const routeName = getRouteName(busLocation.bus);
  const direction = getCardinalDirection(busLocation.heading ?? 0);
  const icon = createBusIcon(isMoving, plateNumber);

  return (
    <Marker position={[busLocation.latitude, busLocation.longitude]} icon={icon}>
      <Popup>
        <div className="p-1 min-w-[140px]">
          <p className="font-bold text-gray-800">{plateNumber}</p>
          <p className="text-sm text-gray-600">Route: {routeName}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: isMoving ? '#16a34a' : '#e11d48' }}>
            {isMoving
              ? `Moving (${(busLocation.speed ?? 0).toFixed(1)} km/h)`
              : 'Parked / At Stop'}
          </p>
          {direction && isMoving && (
            <p className="text-xs text-gray-500 mt-1">Direction: {direction}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Updated: {new Date(busLocation.recorded_at).toLocaleTimeString()}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface BusMapProps {
  height?: string;
  userLocation: [number, number] | null;
  onUserLocation: (pos: [number, number]) => void;
}

export function BusMap({ height = '350px', userLocation, onUserLocation }: BusMapProps) {
  const { data: buses = [], isLoading } = useBusLocations(30_000);
  const activeBuses = buses.filter(b => b.latitude && b.longitude);

  // Fix leaflet default icon paths broken by bundlers
  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-gray-100" style={{ height }}>
      <MapContainer
        center={BORONGAN_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {activeBuses.map(bus => (
          <BusMarker key={bus.id} busLocation={bus} />
        ))}

        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup><p className="text-sm font-medium p-1">Your Location</p></Popup>
          </Marker>
        )}

        <MapControls userLocation={userLocation} onUserLocation={onUserLocation} />
      </MapContainer>

      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-[1000]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Loading buses…</p>
          </div>
        </div>
      )}

      {!isLoading && activeBuses.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-[999] pointer-events-none">
          <div className="bg-white/90 rounded-xl px-5 py-4 text-center shadow">
            <p className="font-semibold text-gray-600 text-sm">No buses currently tracked</p>
          </div>
        </div>
      )}
    </div>
  );
}
