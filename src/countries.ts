import { latLngToCartesian, splitRingOnAntimeridian } from './geo';

export interface CountryFeature {
  name: string;
  rings: [number, number][][];
  label: { lat: number; lng: number };
  area: number;
}

const COUNTRY_URLS = [
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson',
  'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json',
];

const SHORT_NAME: Record<string, string> = {
  'United States of America': 'United States',
  'United States': 'United States',
  'Russian Federation': 'Russia',
  'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom',
  'United Kingdom': 'United Kingdom',
  'Republic of Korea': 'South Korea',
  "Democratic People's Republic of Korea": 'North Korea',
  'Iran (Islamic Republic of)': 'Iran',
  'Syrian Arab Republic': 'Syria',
  'Venezuela (Bolivarian Republic of)': 'Venezuela',
  'Bolivia (Plurinational State of)': 'Bolivia',
  'Tanzania, United Republic of': 'Tanzania',
  "Lao People's Democratic Republic": 'Laos',
  'Moldova, Republic of': 'Moldova',
  'Czechia': 'Czechia',
  'Czech Republic': 'Czechia',
};

function featureName(props: Record<string, unknown> | undefined): string {
  const raw = String(props?.ADMIN || props?.NAME || props?.name || props?.NAME_LONG || props?.admin || 'Country');
  return SHORT_NAME[raw] || raw;
}

function flattenPolygons(geom: { type?: string; coordinates?: unknown }): [number, number][][] {
  const rings: [number, number][][] = [];
  const walk = (node: unknown, depth: number) => {
    if (!Array.isArray(node) || node.length === 0) return;
    if (typeof node[0] === 'number' && typeof node[1] === 'number') return;
    if (typeof node[0]?.[0] === 'number') { rings.push(node as [number, number][]); return; }
    for (const child of node) walk(child, depth + 1);
  };
  walk(geom.coordinates, 0);
  return rings;
}

function ringArea(ring: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(a) / 2;
}

function ringCentroid(ring: [number, number][]): { lat: number; lng: number } {
  let lng = 0;
  let lat = 0;
  const n = Math.max(1, ring.length - 1);
  for (let i = 0; i < n; i++) { lng += ring[i][0]; lat += ring[i][1]; }
  return { lng: lng / n, lat: lat / n };
}

let cache: Promise<CountryFeature[]> | null = null;

export function loadCountries(): Promise<CountryFeature[]> {
  if (cache) return cache;
  cache = (async () => {
    let data: { features?: unknown[] } | null = null;
    for (const url of COUNTRY_URLS) {
      try { const res = await fetch(url); if (!res.ok) continue; data = await res.json(); break; } catch { data = null; }
    }
    if (!data?.features) return [];
    const countries: CountryFeature[] = [];
    for (const raw of data.features) {
      const f = raw as { properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown } };
      if (!f.geometry) continue;
      const rings = flattenPolygons(f.geometry).filter((r) => r.length > 3);
      if (rings.length === 0) continue;
      const largest = rings.reduce((a, b) => (ringArea(a) > ringArea(b) ? a : b));
      countries.push({ name: featureName(f.properties), rings, label: ringCentroid(largest), area: rings.reduce((s, r) => s + ringArea(r), 0) });
    }
    return countries;
  })();
  return cache;
}

export function countryBorderSegments(countries: CountryFeature[], radius: number): [number, number, number][][] {
  const segs: [number, number, number][][] = [];
  for (const c of countries) {
    for (const ring of c.rings) {
      const simplified = ring.filter((_, i) => i % 2 === 0 || i === ring.length - 1);
      const parts = splitRingOnAntimeridian(simplified as [number, number][]);
      for (const part of parts) {
        const pts = part.map(([lng, lat]) => latLngToCartesian(lat, lng, radius));
        if (pts.length > 1) segs.push(pts);
      }
    }
  }
  return segs;
}
