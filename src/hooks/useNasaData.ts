import { useEffect, useCallback } from 'react';
import { useStore, EventData } from '../store/useStore';

const EONET_API = 'https://eonet.gsfc.nasa.gov/api/v3/events';

export function useNasaEvents() {
  const setEvents = useStore((s) => s.setEvents);
  const layers = useStore((s) => s.layers);

  const fetchEvents = useCallback(async () => {
    try {
      const categories = [
        'wildfires', 'volcanoes', 'severeStorms', 'earthquakes',
        'floods', 'icebergs', 'drought', 'landSlides'
      ];
      
      const allEvents: EventData[] = [];
      
      for (const category of categories) {
        try {
          const response = await fetch(
            `${EONET_API}?category=${category}&status=open&limit=50`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.events) {
              allEvents.push(...data.events.map((e: any) => ({
                ...e,
                category
              })));
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch ${category}:`, e);
        }
      }
      
      setEvents(allEvents);
    } catch (error) {
      console.error('Failed to fetch NASA events:', error);
    }
  }, [setEvents]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 5 * 60 * 1000); // Refresh every 5 min
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const getEventsByCategory = useCallback((category: string) => {
    const categoryMap: Record<string, string> = {
      volcanoes: 'volcanoes',
      wildfires: 'wildfires',
      earthquakes: 'earthquakes',
      storms: 'severeStorms',
      floods: 'floods',
      icebergs: 'icebergs',
    };
    
    return useStore.getState().events.filter(
      (e) => e.category === categoryMap[category]
    );
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

export function useEarthquakeData() {
  const fetchEarthquakes = useCallback(async () => {
    try {
      const response = await fetch(
        'https://earthquake.usgs.gov/earthquakes/feed/geojson/2.5/week'
      );
      if (response.ok) {
        const data = await response.json();
        return data.features.map((f: any) => ({
          id: f.id,
          title: `M${f.properties.mag} Earthquake`,
          category: 'earthquakes',
          geometry: [{
            coordinates: [f.geometry.coordinates[1], f.geometry.coordinates[0]],
            type: 'Point',
            date: new Date(f.properties.time).toISOString()
          }],
          properties: f.properties
        }));
      }
    } catch (error) {
      console.error('Failed to fetch earthquake data:', error);
    }
    return [];
  }, []);

  return { fetchEarthquakes };
}
