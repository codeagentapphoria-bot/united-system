import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRouteETA, formatDuration, formatDistance } from '@/lib/routing';
import { BusDetailModal } from './BusDetailModal';
import type { BusLocation } from '@/hooks/useBusLocations';
import { FiNavigation, FiMapPin } from 'react-icons/fi';

interface EtaInfo {
  duration: number;
  distance: number;
}

interface BusCardProps {
  bus: BusLocation;
  userLocation: [number, number] | null;
  onFocus?: () => void;
}

export function BusCard({ bus, userLocation, onFocus }: BusCardProps) {
  const [eta, setEta] = useState<EtaInfo | null>(null);
  const [etaLoading, setEtaLoading] = useState(false);
  const [etaError, setEtaError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const plateNumber = bus.bus?.plate_number ?? bus.bus_id;
  const isMoving = (bus.speed ?? 0) > 5;
  const routeName = bus.bus?.route?.name;
  const barangayName = bus.barangay?.name;

  useEffect(() => {
    if (!userLocation) { setEta(null); setEtaError(false); return; }
    let cancelled = false;
    setEtaLoading(true);
    setEtaError(false);
    getRouteETA(userLocation[0], userLocation[1], bus.latitude, bus.longitude).then(result => {
      if (!cancelled) {
        setEta(result);
        setEtaError(!result);
        setEtaLoading(false);
      }
    }).catch(() => {
      if (!cancelled) { setEtaError(true); setEtaLoading(false); }
    });
    return () => { cancelled = true; };
  }, [userLocation, bus.latitude, bus.longitude]);

  return (
    <>
      <Card
        className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => { onFocus?.(); setModalOpen(true); }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Left: bus info */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${isMoving ? 'bg-green-500' : 'bg-red-400'}`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-heading-700">{plateNumber}</p>
                  <Badge variant="outline" className={`text-xs ${isMoving ? 'border-green-200 text-green-700 bg-green-50' : 'border-red-200 text-red-600 bg-red-50'}`}>
                    {isMoving ? 'Moving' : 'Parked'}
                  </Badge>
                </div>

                {routeName && (
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{routeName}</p>
                )}

                {barangayName && (
                  <div className="mt-1.5">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <FiMapPin size={11} /> {barangayName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: ETA or locate button */}
            <div className="flex-shrink-0 text-right" onClick={e => e.stopPropagation()}>
              {userLocation ? (
                etaLoading ? (
                  <div className="w-16 h-8 bg-gray-100 animate-pulse rounded" />
                ) : etaError ? (
                  <span className="text-xs text-red-400" title="Unable to calculate ETA">Error</span>
                ) : eta ? (
                  <div className="bg-primary-50 border border-primary-100 rounded-lg px-2.5 py-1.5 text-center min-w-[72px]">
                    <p className="text-sm font-bold text-primary-700 leading-tight">{formatDuration(eta.duration)}</p>
                    <p className="text-[10px] text-primary-500">{formatDistance(eta.distance)}</p>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 gap-1"
                  onClick={e => { e.stopPropagation(); onFocus?.(); }}
                  title="Enable location to see ETA"
                >
                  <FiNavigation size={12} />
                  ETA
                  <span className="text-[10px] text-gray-400">(needs location)</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {modalOpen && (
        <BusDetailModal
          bus={bus}
          userLocation={userLocation}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
