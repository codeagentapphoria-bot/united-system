import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getRouteETA, formatDuration, formatDistance, type RouteResult } from '@/lib/routing';
import type { BusLocation } from '@/hooks/useBusLocations';
import { X, Navigation, MapPin, Clock } from 'lucide-react';

interface BusDetailModalProps {
  bus: BusLocation;
  userLocation: [number, number] | null;
  onClose: () => void;
}

export function BusDetailModal({ bus, userLocation, onClose }: BusDetailModalProps) {
  const [routeInfo, setRouteInfo] = useState<RouteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userLocation || !bus.latitude || !bus.longitude) return;
    setIsLoading(true);
    setError(null);
    getRouteETA(userLocation[0], userLocation[1], bus.latitude, bus.longitude).then(result => {
      if (result) setRouteInfo(result);
      else setError('Could not calculate route');
      setIsLoading(false);
    });
  }, [userLocation, bus.latitude, bus.longitude]);

  const isMoving = (bus.speed ?? 0) > 5;
  const plateNumber = bus.bus?.plate_number ?? bus.bus_id;
  const routeName = bus.bus?.routes?.[0]?.name;
  const barangayName = bus.barangay?.name;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet / dialog */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base font-bold text-heading-900">Bus Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Bus identity */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-sm text-center leading-tight shrink-0"
              style={{ backgroundColor: isMoving ? '#16a34a' : '#e11d48' }}
            >
              {plateNumber.slice(-5)}
            </div>
            <div>
              <p className="text-lg font-bold text-heading-900">{plateNumber}</p>
              <p className="text-sm text-gray-500">
                {isMoving ? `Moving at ${(bus.speed ?? 0).toFixed(1)} km/h` : 'Parked / Stopped'}
              </p>
              {routeName && <p className="text-xs text-primary-600 mt-0.5">{routeName}</p>}
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Location</p>
              <p className="font-medium text-heading-900 text-sm">{barangayName || 'Unknown'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Time to Arrive</p>
              {!userLocation ? (
                <p className="text-xs text-gray-400 italic">Enable location</p>
              ) : isLoading ? (
                <div className="w-16 h-4 bg-gray-200 animate-pulse rounded mt-1" />
              ) : routeInfo ? (
                <p className="font-medium text-heading-900 text-sm">{formatDuration(routeInfo.duration)}</p>
              ) : (
                <p className="text-xs text-gray-400">Unavailable</p>
              )}
            </div>
          </div>

          {/* ETA detail block */}
          {!userLocation ? (
            <div className="bg-primary-50 rounded-lg p-4 text-center">
              <MapPin className="w-8 h-8 text-primary-500 mx-auto mb-2" />
              <p className="text-primary-800 font-medium text-sm">Location Required</p>
              <p className="text-primary-600 text-xs mt-1">
                Tap the crosshair button on the map to share your location
              </p>
            </div>
          ) : isLoading ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Calculating route…</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          ) : routeInfo ? (
            <div className="bg-primary-50 rounded-lg p-4">
              <p className="text-[10px] text-primary-700 uppercase tracking-wide mb-3 font-semibold">
                Estimated Arrival
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-6 h-6 text-primary-600 shrink-0" />
                  <div>
                    <p className="text-2xl font-bold text-primary-900">{formatDuration(routeInfo.duration)}</p>
                    <p className="text-xs text-primary-500">away</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Navigation className="w-6 h-6 text-primary-600 shrink-0" />
                  <div>
                    <p className="text-2xl font-bold text-primary-900">{formatDistance(routeInfo.distance)}</p>
                    <p className="text-xs text-primary-500">distance</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
