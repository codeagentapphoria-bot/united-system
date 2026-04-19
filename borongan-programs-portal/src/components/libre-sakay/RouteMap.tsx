import { useRef, useState, useCallback } from 'react';
import Map, { Marker, Source, Layer, type MapRef } from 'react-map-gl/mapbox';
import type { RouteStop } from '@/hooks/useRoutes';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Crosshair, ZoomIn, ZoomOut } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
if (!MAPBOX_TOKEN) throw new Error('VITE_MAPBOX_TOKEN is not set');

const BORONGAN_LNG = 125.4377;
const BORONGAN_LAT = 11.5077;
const DEFAULT_ZOOM = 13;

interface RouteMapProps {
  height?: string;
  stops: RouteStop[];
  activeBusIds?: string[];
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

export function RouteMap({ height = '350px', stops, activeBusIds = [], onStopClick }: RouteMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  // Build GeoJSON line from stops in order
  const routeGeoJson = stops.length >= 2 ? {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: stops.map(s => [s.longitude, s.latitude]),
    },
  } : null;

  // Fit bounds to show all stops
  const fitBounds = useCallback(() => {
    if (!mapRef.current || stops.length === 0) return;
    if (stops.length === 1) {
      mapRef.current.flyTo({
        center: [stops[0].longitude, stops[0].latitude],
        zoom: 15,
        duration: 1000,
      });
      return;
    }
    const lngs = stops.map(s => s.longitude);
    const lats = stops.map(s => s.latitude);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];
    mapRef.current.fitBounds(bounds, { padding: 60, duration: 1000 });
  }, [stops]);

  const handleStopClick = useCallback((stop: RouteStop) => {
    setSelectedStopId(stop.id);
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
                'line-color': '#4f46e5',
                'line-width': 4,
                'line-opacity': 0.8,
              }}
            />
          </Source>
        )}

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
