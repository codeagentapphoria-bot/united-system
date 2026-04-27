import { useRef, useState, useEffect } from 'react';

export interface BusPosition {
  latitude: number;
  longitude: number;
  heading: number;
}

interface SmoothState {
  lat: number;
  lng: number;
  heading: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function shortestAngleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function lerpAngle(from: number, to: number, t: number): number {
  return from + shortestAngleDelta(from, to) * t;
}

/**
 * Interpolates a bus position smoothly between refreshes using requestAnimationFrame.
 * Each time `target` changes (new GPS update), animates from current → new over `duration` ms.
 * Heading uses shortest angular path (350°→10° = +20°, not -340°).
 */
export function useSmoothBusPosition(
  target: BusPosition,
  duration = 1_500,
  enabled = true,
) {
  const [display, setDisplay] = useState<SmoothState>({
    lat: target.latitude,
    lng: target.longitude,
    heading: target.heading,
  });

  // Track animation state per instance (no re-render on these)
  const animRef = useRef<{
    startTime: number | null;
    fromLat: number;
    fromLng: number;
    fromHeading: number;
    rafId: number | null;
  }>({
    startTime: null,
    fromLat: target.latitude,
    fromLng: target.longitude,
    fromHeading: target.heading,
    rafId: null,
  });

  useEffect(() => {
    if (!enabled) return;

    const state = animRef.current;

    // Cancel any in-progress animation
    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
      // Snap to where we actually are (interpolated position)
      const current = display;
      state.fromLat = current.lat;
      state.fromLng = current.lng;
      state.fromHeading = current.heading;
    } else {
      // No animation running — start from current display position
      state.fromLat = display.lat;
      state.fromLng = display.lng;
      state.fromHeading = display.heading;
    }

    state.startTime = null;
    state.rafId = null;

    const tick = (timestamp: number) => {
      if (state.startTime === null) state.startTime = timestamp;

      const elapsed = timestamp - state.startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(t);

      setDisplay({
        lat: state.fromLat + (target.latitude - state.fromLat) * eased,
        lng: state.fromLng + (target.longitude - state.fromLng) * eased,
        heading: lerpAngle(state.fromHeading, target.heading, eased),
      });

      if (t < 1) {
        state.rafId = requestAnimationFrame(tick);
      } else {
        state.rafId = null;
        state.startTime = null;
      }
    };

    state.rafId = requestAnimationFrame(tick);

    return () => {
      if (state.rafId !== null) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.latitude, target.longitude, target.heading, enabled]);

  return display;
}
