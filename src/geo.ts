/**
 * Geographic helpers aligned to Three.js SphereGeometry UVs.
 * Equirectangular maps: u=0 at 180W, u=0.5 at Greenwich, v=0 at north pole.
 */
export function latLngToCartesian(
  lat: number,
  lng: number,
  radius: number
): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  const sinPhi = Math.sin(phi);
  const x = -radius * sinPhi * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * sinPhi * Math.sin(theta);
  return [x, y, z];
}

/** Unwrap GeoJSON positions to [longitude, latitude]. */
export function extractLonLat(input: unknown): [number, number] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const first = input[0];
  if (typeof first === 'number' && typeof input[1] === 'number') {
    return [input[0], input[1]];
  }
  return extractLonLat(first);
}

const MAX_MERCATOR_LAT = 85.05112878;

export function lngLatToMercatorPixels(
  lng: number,
  lat: number,
  worldSize: number
): { x: number; y: number } {
  const clamped = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat));
  const x = ((lng + 180) / 360) * worldSize;
  const s = Math.sin((clamped * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * worldSize;
  return { x, y };
}

export function mercatorUnitYToLat(y: number): number {
  const n = Math.PI * (1 - 2 * y);
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
}

export function tileBounds(z: number, x: number, y: number) {
  const n = 2 ** z;
  return {
    west: (x / n) * 360 - 180,
    east: ((x + 1) / n) * 360 - 180,
    north: mercatorUnitYToLat(y / n),
    south: mercatorUnitYToLat((y + 1) / n),
  };
}

export function latLngToTile(lat: number, lng: number, z: number) {
  const n = 2 ** z;
  const { x, y } = lngLatToMercatorPixels(lng, lat, n);
  return {
    x: Math.min(n - 1, Math.max(0, Math.floor(Math.min(n - 1e-9, x)))),
    y: Math.min(n - 1, Math.max(0, Math.floor(y))),
  };
}

export function cartesianToLatLng(x: number, y: number, z: number): { lat: number; lng: number } {
  const r = Math.hypot(x, y, z) || 1;
  const lat = 90 - (Math.acos(Math.min(1, Math.max(-1, y / r))) * 180) / Math.PI;
  const theta = Math.atan2(z, -x);
  let lng = (theta * 180) / Math.PI - 180;
  if (lng <= -180) lng += 360;
  if (lng > 180) lng -= 360;
  return { lat, lng };
}

export function zoomFromDistance(distance: number): number {
  return Math.round(Math.min(6, Math.max(2, 11.2 - distance * 1.2)));
}

export function splitRingOnAntimeridian(
  ring: [number, number][]
): [number, number][][] {
  const parts: [number, number][][] = [];
  let current: [number, number][] = [];
  let prevLng: number | null = null;
  for (const pt of ring) {
    const lng = pt[0];
    if (prevLng !== null && Math.abs(lng - prevLng) > 180) {
      if (current.length > 1) parts.push(current);
      current = [];
    }
    current.push(pt);
    prevLng = lng;
  }
  if (current.length > 1) parts.push(current);
  return parts;
}
