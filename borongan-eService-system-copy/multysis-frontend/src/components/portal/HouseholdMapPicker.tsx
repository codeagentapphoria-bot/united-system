/**
 * HouseholdMapPicker.tsx
 *
 * Leaflet-based map for the household registration form.
 * Residents click the map or use GPS to set their household location.
 * Optionally fetches and overlays the resident's barangay boundary.
 *
 * Mirrors the UX of BIMS's HouseholdLocationForm + BarangayBoundaryMap.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap,
  LayersControl,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Locate, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api/auth.service';

// Fix Leaflet's default icon path resolution with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Blue house pin — matches BIMS icon
const housePinIcon = L.divIcon({
  html: `
    <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 3C10.477 3 6 7.477 6 13c0 6.075 7.09 13.09 9.293 15.293a1 1 0 0 0 1.414 0C18.91 26.09 26 19.075 26 13c0-5.523-4.477-10-10-10z" fill="#2563eb"/>
      <circle cx="16" cy="13" r="7" fill="#fff"/>
      <g transform="translate(9,6)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M3 10.5L12 4L21 10.5" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M5 10.5V19C5 19.5523 5.44772 20 6 20H18C18.5523 20 19 19.5523 19 19V10.5" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="9" y="14" width="6" height="6" rx="1" fill="#2563eb"/>
        </svg>
      </g>
    </svg>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 35],
  popupAnchor: [0, -20],
});

const boundaryStyle = {
  fillColor: '#3b82f6',
  weight: 2,
  opacity: 1,
  color: '#1d4ed8',
  fillOpacity: 0.1,
};

// ---------------------------------------------------------------------------
// Inner interaction component (must be inside MapContainer)
// ---------------------------------------------------------------------------
const MapInteractions: React.FC<{
  location: { lat: number; lng: number } | null;
  barangayBoundary: any;
  onSelect: (lat: number, lng: number) => void;
  readOnly: boolean;
}> = ({ location, barangayBoundary, onSelect, readOnly }) => {
  const map = useMap();

  // Fit to barangay boundary on first load
  useEffect(() => {
    if (barangayBoundary?.features?.length > 0) {
      setTimeout(() => {
        const layer = L.geoJSON(barangayBoundary);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20], maxZoom: 16 });
        }
      }, 100);
    }
  }, [barangayBoundary, map]);

  // Fly to selected location
  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], Math.max(map.getZoom(), 17), {
        animate: true,
        duration: 0.5,
      });
    }
  }, [location, map]);

  // Click to pin
  useEffect(() => {
    if (readOnly) return;
    const handler = (e: L.LeafletMouseEvent) => onSelect(e.latlng.lat, e.latlng.lng);
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [map, onSelect, readOnly]);

  return null;
};

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
export interface HouseholdLocation {
  lat: number;
  lng: number;
}

interface Props {
  barangayId?: number | null;
  value?: HouseholdLocation | null;
  onChange: (location: HouseholdLocation | null) => void;
  readOnly?: boolean;
}

const HouseholdMapPicker: React.FC<Props> = ({
  barangayId,
  value,
  onChange,
  readOnly = false,
}) => {
  const { toast } = useToast();
  const [barangayBoundary, setBarangayBoundary] = useState<any>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Default center: Borongan, Eastern Samar
  const defaultCenter: [number, number] = [11.6081, 125.4311];
  const mapCenter: [number, number] = value ? [value.lat, value.lng] : defaultCenter;

  // Fetch barangay boundary overlay
  useEffect(() => {
    if (!barangayId) return;
    api
      .get(`/addresses/barangays/${barangayId}/geojson`)
      .then((res) => setBarangayBoundary(res.data.data ?? null))
      .catch(() => {}); // Silently skip if no GIS data for this barangay
  }, [barangayId]);

  const handleSelect = useCallback(
    (lat: number, lng: number) => onChange({ lat, lng }),
    [onChange]
  );

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Geolocation not supported by this browser' });
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast({
          title: 'Location set',
          description: `Accuracy: ±${Math.round(pos.coords.accuracy)}m`,
        });
        setIsGettingLocation(false);
      },
      (err) => {
        toast({ variant: 'destructive', title: 'Could not get location', description: err.message });
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-3">
      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          {readOnly
            ? 'Pinned household location.'
            : 'Click the map to pin your household location, or use GPS.'}
        </p>
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGetMyLocation}
              disabled={isGettingLocation}
              className="flex items-center gap-1.5"
            >
              <Locate className="h-3.5 w-3.5" />
              {isGettingLocation ? 'Getting...' : 'Use My Location'}
            </Button>
            {value && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange(null)}
                className="flex items-center gap-1.5"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Coordinates display */}
      {value && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-md text-sm">
          <div>
            <span className="text-muted-foreground">Latitude: </span>
            <span className="font-mono">{value.lat.toFixed(6)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Longitude: </span>
            <span className="font-mono">{value.lng.toFixed(6)}</span>
          </div>
        </div>
      )}

      {/* Map — isolation:isolate creates a stacking context so Leaflet's internal
           z-indexes don't bleed above page-level modals/dialogs */}
      <div className="h-72 rounded-md overflow-hidden border" style={{ isolation: 'isolate' }}>
        <MapContainer
          center={mapCenter}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                attribution="Tiles &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>
            {barangayBoundary && (
              <LayersControl.Overlay checked name="Barangay Boundary">
                <GeoJSON data={barangayBoundary} style={boundaryStyle} />
              </LayersControl.Overlay>
            )}
          </LayersControl>

          <MapInteractions
            location={value ?? null}
            barangayBoundary={barangayBoundary}
            onSelect={handleSelect}
            readOnly={readOnly}
          />

          {value && (
            <Marker position={[value.lat, value.lng]} icon={housePinIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-medium">Household Location</p>
                  <p className="text-gray-500 font-mono text-xs mt-1">
                    {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default HouseholdMapPicker;
