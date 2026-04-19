import { getRouteETA } from './routing';

/**
 * Get road-based ETA from a bus location to a stop using Mapbox Directions API.
 * Returns null if the token is missing or the API call fails.
 */
export async function estimateMinutesToStop(
  busLat: number,
  busLng: number,
  stopLat: number,
  stopLng: number
) {
  return getRouteETA(busLat, busLng, stopLat, stopLng);
}
