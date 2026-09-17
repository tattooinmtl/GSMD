import { useEffect, useCallback } from 'react';
import { useStore, EventData } from '../store/useStore';
import { extractLonLat } from '../geo';

const EONET_API = 'https://eonet.gsfc.nasa.gov/api/v3/events';
const USGS_FEED = '/api/usgs/earthquakes/feed/v1.0/summary/2.5_week.geojson';
const USGS_FEED_DIRECT = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson';
const EMSC_FEED = '/api/emsc/fdsnws/event/1/query?format=json&limit=200&orderby=time&minmagnitude=2.5';
const EMSC_FEED_DIRECT = 'https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=200&orderby=time&minmagnitude=2.5';
const USGS_VOLCANO_FEED = '/api/usgs-volcano/vsc/api/volcanoApi/volcanoesGVP';
const USGS_VOLCANO_FEED_DIRECT = 'https://volcanoes.usgs.gov/vsc/api/volcanoApi/volcanoesGVP';

function normalizeGeometry(raw: any[]): EventData['geometry'] {
  if (!Array.isArray(raw)) return [];
  return raw.map((g) => {
    const pair = extractLonLat(g?.coordinates);
    if (!pair) return null;
    return { coordinates: pair, type: typeof g.type === 'string' ? g.type : 'Point', date: typeof g.date === 'string' ? g.date : new Date().toISOString() };
  }).filter((g): g is EventData['geometry'][number] => g !== null);
}

export function useNasaEvents() {
  const setEvents = useStore((s) => s.setEvents);
  const fetchEvents = useCallback(async () => {
    const categories = ['wildfires', 'volcanoes', 'severeStorms', 'earthquakes', 'floods', 'icebergs', 'drought', 'landSlides'];
    const byId = new Map<string, EventData>();
    const perCategoryParams: Record<string, string> = {
      severeStorms: 'status=all&limit=80&days=14',
      wildfires: 'status=open&limit=60&days=7',
      volcanoes: 'status=open&limit=60&days=60',
      earthquakes: 'status=open&limit=60&days=7',
      floods: 'status=all&limit=40&days=14',
      icebergs: 'status=all&limit=40&days=60',
      drought: 'status=all&limit=20&days=60',
      landSlides: 'status=all&limit=20&days=30',
    };
    await Promise.all(categories.map(async (category) => {
      const params = perCategoryParams[category] || 'status=open&limit=60';
      try {
        const response = await fetch(`${EONET_API}?category=${category}&${params}`);
        if (!response.ok) return;
        const data = await response.json();
        for (const e of data.events || []) {
          const geometry = normalizeGeometry(e.geometry);
          if (geometry.length === 0) continue;
          const latest = geometry[geometry.length - 1];
          byId.set(e.id, { id: e.id, title: e.title, category, geometry: [latest], closed: e.closed });
        }
      } catch (err) { console.warn(`Failed to fetch ${category}:`, err); }
    }));
    const [quakes, emscQuakes, usgsVolcanoes] = await Promise.all([fetchEarthquakes(), fetchEmscEarthquakes(), fetchUsgsVolcanoes()]);
    for (const q of quakes) byId.set(q.id, q);
    for (const q of emscQuakes) if (!byId.has(q.id)) byId.set(q.id, q);
    for (const v of usgsVolcanoes) if (!byId.has(v.id)) byId.set(v.id, v);
    setEvents([...byId.values()]);
  }, [setEvents]);

  useEffect(() => { fetchEvents(); const interval = setInterval(fetchEvents, 5 * 60 * 1000); return () => clearInterval(interval); }, [fetchEvents]);

  const getEventsByCategory = useCallback((category: string) => {
    const categoryMap: Record<string, string> = { volcanoes: 'volcanoes', wildfires: 'wildfires', earthquakes: 'earthquakes', storms: 'severeStorms', floods: 'floods', icebergs: 'icebergs' };
    return useStore.getState().events.filter((e) => e.category === categoryMap[category]);
  }, []);

  return { getEventsByCategory, refetch: fetchEvents };
}

export function useGibsLayer(layerId: string, date?: string) {
  const apiKey = useStore((s) => s.apiKey);
  const getTileUrl = useCallback((x: number, y: number, z: number) => {
    const dateStr = date || new Date().toISOString().split('T')[0];
    const baseUrl = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best';
    return `${baseUrl}/${layerId}/default/${dateStr}/${Math.pow(2, z)}x${Math.pow(2, z - 1)}/${y}/${x}.jpg`;
  }, [layerId, date]);
  return { getTileUrl, apiKey };
}

async function fetchEarthquakes(): Promise<EventData[]> {
  const urls = [USGS_FEED, USGS_FEED_DIRECT];
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      return (data.features || []).map((f: any) => {
        const pair = extractLonLat(f.geometry?.coordinates);
        const mag = f.properties?.mag;
        const place = typeof f.properties?.place === 'string' ? f.properties.place : undefined;
        return {
          id: f.id,
          title: place || (mag != null ? `M${mag} Earthquake` : (f.properties?.title || 'Earthquake')),
          category: 'earthquakes',
          magnitude: typeof mag === 'number' ? mag : undefined,
          place,
          geometry: pair ? [{ coordinates: pair, type: 'Point', date: new Date(f.properties?.time ?? Date.now()).toISOString() }] : [],
        } satisfies EventData;
      }).filter((e: EventData) => e.geometry.length > 0);
    } catch (error) { console.warn(`USGS feed failed (${url}):`, error); }
  }
  return [];
}

export function useEarthquakeData() { return { fetchEarthquakes }; }

async function fetchEmscEarthquakes(): Promise<EventData[]> {
  for (const url of [EMSC_FEED, EMSC_FEED_DIRECT]) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      return (data.features || []).map((f: any): EventData | null => {
        const pair = extractLonLat(f.geometry?.coordinates);
        if (!pair) return null;
        const mag = f.properties?.mag;
        const region = typeof f.properties?.flynn_region === 'string' ? f.properties.flynn_region : undefined;
        const time = f.properties?.time || f.properties?.lastupdate;
        return {
          id: `emsc-${f.id || f.properties?.unid || `${pair[0]}-${pair[1]}-${time}`}`,
          title: region || (typeof mag === 'number' ? `M${mag} Earthquake` : 'Earthquake'),
          category: 'earthquakes',
          magnitude: typeof mag === 'number' ? mag : undefined,
          place: region,
          geometry: [{ coordinates: pair, type: 'Point', date: new Date(time ?? Date.now()).toISOString() }],
        };
      }).filter((e: EventData | null): e is EventData => e !== null);
    } catch (err) { console.warn(`EMSC feed failed (${url}):`, err); continue; }
  }
  return [];
}

async function fetchUsgsVolcanoes(): Promise<EventData[]> {
  for (const url of [USGS_VOLCANO_FEED, USGS_VOLCANO_FEED_DIRECT]) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      const list = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
      const parsed = list.map((v: any): (EventData & { _lastEruption: number }) | null => {
        const lat = parseFloat(v.latitude ?? v.lat);
        const lon = parseFloat(v.longitude ?? v.lon ?? v.lng);
        if (!isFinite(lat) || !isFinite(lon)) return null;
        const id = String(v.vnum ?? v.id ?? v.volcanoNumber ?? `${lat}-${lon}`);
        const name = String(v.volcanoName ?? v.name ?? 'Volcano');
        const lastEruption = parseInt(String(v.lastEruptionYear ?? v.lastEruption ?? '0'), 10) || 0;
        return { _lastEruption: lastEruption, id: `usgs-vol-${id}`, title: name, category: 'volcanoes', geometry: [{ coordinates: [lon, lat], type: 'Point', date: new Date().toISOString() }] };
      }).filter((e: any): e is EventData & { _lastEruption: number } => e !== null);
      parsed.sort((a: any, b: any) => b._lastEruption - a._lastEruption);
      return parsed.slice(0, 50).map(({ _lastEruption: _, ...e }: any) => e as EventData);
    } catch (err) { console.warn(`USGS volcano feed failed (${url}):`, err); continue; }
  }
  return [];
}
