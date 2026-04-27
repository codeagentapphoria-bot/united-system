import { motion } from 'framer-motion';
import { Marker } from 'react-map-gl/mapbox';
import type { BusLocation } from '@/hooks/useBusLocations';
import { useSmoothBusPosition } from '@/hooks/useSmoothBusPosition';

export interface AnimatedBusMarkerProps {
  busLocation: BusLocation;
  onClick?: () => void;
}

function AnimatedBusMarkerInner({ busLocation, onClick }: AnimatedBusMarkerProps) {
  const isMoving = (busLocation.speed ?? 0) > 5;
  const plate = busLocation.bus?.plate_number ?? 'N/A';

  const { lat, lng, heading } = useSmoothBusPosition({
    latitude: busLocation.latitude,
    longitude: busLocation.longitude,
    heading: busLocation.heading ?? 0,
  });

  return (
    <Marker longitude={lng} latitude={lat} anchor="center">
      <motion.div
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        animate={{ rotate: isMoving ? heading : 0 }}
        transition={{ duration: 0 }}
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
          cursor: 'pointer',
          color: 'white',
          fontSize: 10,
          fontWeight: 'bold',
          userSelect: 'none',
        }}
        title={`${plate} — ${isMoving ? `Moving ${(busLocation.speed ?? 0).toFixed(1)} km/h` : 'Parked'}`}
      >
        {isMoving && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            style={{ position: 'absolute', top: -6 }}
          >
            <path d="M12 2L20 18L12 14L4 18L12 2Z" fill="white" fillOpacity="0.9" />
          </svg>
        )}
        {plate}
      </motion.div>
    </Marker>
  );
}

/**
 * Animated bus marker — replaces static BusPin / BusMarker.
 *
 * Each instance owns its own RAF interpolation loop via useSmoothBusPosition.
 * The 60fps state updates stay isolated inside this component so the parent
 * BusMap / RouteMap doesn't re-render on every frame.
 */
export function AnimatedBusMarker(props: AnimatedBusMarkerProps) {
  return <AnimatedBusMarkerInner {...props} />;
}
