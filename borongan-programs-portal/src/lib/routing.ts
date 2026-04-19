const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving';

export interface RouteResult {
  duration: number; // seconds
  distance: number; // metres
}

export async function getRouteETA(
  userLat: number,
  userLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult | null> {
  if (!MAPBOX_TOKEN) return null;
  try {
    const coords = `${userLng},${userLat};${destLng},${destLat}`;
    const url = `${MAPBOX_DIRECTIONS_URL}/${coords}?overview=false&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    const route = data.routes[0];
    return { duration: route.duration, distance: route.distance };
  } catch {
    return null;
  }
}

/** Human-readable duration — shows hours when >= 60 min */
export function formatDuration(seconds: number): string {
  const totalMins = Math.round(seconds / 60);
  if (totalMins < 1) return '< 1 min';
  if (totalMins < 60) return `${totalMins} min`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** @deprecated use formatDuration */
export const formatMinutes = formatDuration;

export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}
