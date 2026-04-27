import { useRef, useCallback } from 'react';
import Map, { Marker, Source, Layer, type MapRef } from 'react-map-gl/mapbox';
import type { RouteStop } from '@/hooks/useRoutes';
import type { BusLocation } from '@/hooks/useBusLocations';
import type { RouteGeometry } from '@/lib/routing';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Crosshair, ZoomIn, ZoomOut, MapPin } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const BORONGAN_LNG = 125.4377;
const BORONGAN_LAT = 11.5077;
const DEFAULT_ZOOM = 13;

interface RouteMapProps {
  height?: string;
  stops: RouteStop[];
  routeGeometry?: RouteGeometry | null;
  busLocations?: BusLocation[];
  onStopClick?: (stop: RouteStop) => void;
}

function StopPin({ stop, index, onClick }: { stop: RouteStop; index: number; onClick: () => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        background: '#4f46e5',
        width: 28,
        height: 28,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '3px solid white',
        boxShadow: '0 3px 8px rgba(0,0,0,.3)',
        cursor: 'pointer',
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
        userSelect: 'none',
      }}
      title={stop.name}
    >
      {index + 1}
    </div>
  );
}

function BusMarker({ bus }: { bus: BusLocation }) {
  const isMoving = (bus.speed ?? 0) > 5;
  const plate = bus.bus?.plate_number ?? 'N/A';

  return (
    <div
      style={{
        background: isMoving ? '#16a34a' : '#e11d48',
        width: 36,
        height: 36,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid white',
        boxShadow: '0 3px 8px rgba(0,0,0,.3)',
        cursor: 'default',
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
        userSelect: 'none',
      }}
      title={`${plate} — ${isMoving ? `Moving ${(bus.speed ?? 0).toFixed(1)} km/h` : 'Parked'}`}
    >
      {plate}
    </div>
  );
}

export function RouteMap({ height = '350px', stops, routeGeometry, busLocations = [], onStopClick }: RouteMapProps) {
  const mapRef = useRef<MapRef>(null);

  // Buses that have valid coordinates for rendering
  const visibleBuses = busLocations.filter(
    b => typeof b.latitude === 'number' && isFinite(b.latitude) &&
      typeof b.longitude === 'number' && isFinite(b.longitude)
  );

  // Graceful fallback when token is not configured
  if (!MAPBOX_TOKEN) {
    return (
      <div
        className="relative w-full rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center">
          <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">Map unavailable</p>
          <p className="text-xs text-gray-400 mt-1">Check back soon</p>
        </div>
      </div>
    );
  }

  // Use real road geometry from Mapbox if available, otherwise fall back to straight-line
  const routeGeoJson = (() => {
    if (routeGeometry && stops.length >= 2) return routeGeometry;
    if (stops.length >= 2) {
      return {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: stops.map(s => [s.longitude, s.latitude]),
        },
      };
    }
    return null;
  })();

  // Fit bounds to show all stops and buses
  const fitBounds = useCallback(() => {
    if (!mapRef.current) return;
    const allLngs: number[] = [];
    const allLats: number[] = [];

    for (const stop of stops) {
      allLngs.push(stop.longitude);
      allLats.push(stop.latitude);
    }
    for (const bus of visibleBuses) {
      allLngs.push(bus.longitude);
      allLats.push(bus.latitude);
    }

    if (allLngs.length === 0) return;
    if (allLngs.length === 1) {
      mapRef.current.flyTo({
        center: [allLngs[0], allLats[0]],
        zoom: 15,
        duration: 1000,
      });
      return;
    }

    const bounds: [[number, number], [number, number]] = [
      [Math.min(...allLngs), Math.min(...allLats)],
      [Math.max(...allLngs), Math.max(...allLats)],
    ];
    mapRef.current.fitBounds(bounds, { padding: 60, duration: 1000 });
  }, [stops, visibleBuses]);

  const handleStopClick = useCallback((stop: RouteStop) => {
    mapRef.current?.flyTo({
      center: [stop.longitude, stop.latitude],
      zoom: 16,
      duration: 800,
    });
    onStopClick?.(stop);
  }, [onStopClick]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-gray-100" style={{ height }}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: BORONGAN_LNG, latitude: BORONGAN_LAT, zoom: DEFAULT_ZOOM }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/navigation-day-v1"
        mapboxAccessToken={MAPBOX_TOKEN}
        onLoad={fitBounds}
      >
        {/* Route polyline */}
        {routeGeoJson && (
          <Source id="route" type="geojson" data={routeGeoJson}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                'line-color': '#4f46e4',
                'line-width': 4,
                'line-opacity': 0.8,
              }}
            />
          </Source>
        )}

        {/* Bus markers */}
        {visibleBuses.map(bus => (
          <Marker
            key={bus.id}
            longitude={bus.longitude}
            latitude={bus.latitude}
            anchor="center"
          >
            <BusMarker bus={bus} />
          </Marker>
        ))}

        {/* Stop markers */}
        {stops.map((stop, index) => (
          <Marker
            key={stop.id}
            longitude={stop.longitude}
            latitude={stop.latitude}
            anchor="center"
          >
            <StopPin
              stop={stop}
              index={index}
              onClick={() => handleStopClick(stop)}
            />
          </Marker>
        ))}
      </Map>

      {/* Custom controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={fitBounds}
          aria-label="Fit all stops"
          title="Fit All Stops"
          className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <Crosshair className="w-5 h-5 text-gray-700" />
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
    </div>
  );
}
