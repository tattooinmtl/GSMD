import { create } from 'zustand';

export interface LayerConfig {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  opacity: number;
  color: string;
  icon: string;
  description: string;
  nasaGibsId?: string;
  type: 'events' | 'overlay' | 'heatmap' | 'simulation';
}

export interface EventData {
  id: string;
  title: string;
  category: string;
  geometry: {
    coordinates: [number, number];
    type: string;
    date: string;
  }[];
  closed?: boolean;
}

export interface DockState {
  id: string;
  title: string;
  icon: string;
  isOpen: boolean;
  pinned: boolean;
}

interface AppState {
  apiKey: string;
  setApiKey: (key: string) => void;
  showApiKeyModal: boolean;
  setShowApiKeyModal: (show: boolean) => void;
  
  layers: LayerConfig[];
  toggleLayer: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  
  events: EventData[];
  setEvents: (events: EventData[]) => void;
  
  docks: DockState[];
  toggleDock: (id: string) => void;
  setActiveDock: (id: string | null) => void;
  activeDock: string | null;
  
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  
  globeRotation: { x: number; y: number; z: number };
  setGlobeRotation: (rot: { x: number; y: number; z: number }) => void;
  
  selectedEvent: EventData | null;
  setSelectedEvent: (event: EventData | null) => void;
  
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  
  showGridLines: boolean;
  setShowGridLines: (show: boolean) => void;
  
  atmosphereEnabled: boolean;
  setAtmosphereEnabled: (enabled: boolean) => void;
  
  timeSlider: number;
  setTimeSlider: (time: number) => void;
}

const defaultLayers: LayerConfig[] = [
  // Pollution Layers
  { id: 'co2', name: 'CO₂ Concentration', category: 'pollution', enabled: false, opacity: 0.7, color: '#ff4444', icon: 'cloud', description: 'Carbon dioxide atmospheric concentration from OCO-2 satellite', nasaGibsId: 'CO2_CONCENTRATION', type: 'overlay' },
  { id: 'co', name: 'Carbon Monoxide', category: 'pollution', enabled: false, opacity: 0.7, color: '#ff8800', icon: 'cloud', description: 'CO levels from MOPITT instrument on Terra satellite', nasaGibsId: 'CO_MONOPOLAR', type: 'overlay' },
  { id: 'nox', name: 'NOₓ (Nitrogen Oxides)', category: 'pollution', enabled: false, opacity: 0.7, color: '#ffcc00', icon: 'cloud', description: 'NO₂ tropospheric column from OMI/Aura', nasaGibsId: 'NO2_TROPOSPHERIC', type: 'overlay' },
  { id: 'so2', name: 'SO₂ (Sulfur Dioxide)', category: 'pollution', enabled: false, opacity: 0.7, color: '#aa44ff', icon: 'cloud', description: 'SO₂ plume detection from OMI/Aura', nasaGibsId: 'SO2_TROPOSPHERIC', type: 'overlay' },
  { id: 'aerosol', name: 'Aerosol Optical Depth', category: 'pollution', enabled: false, opacity: 0.7, color: '#886644', icon: 'cloud', description: 'Aerosol optical depth from MODIS', nasaGibsId: 'AEROSOL_OPTICAL_DEPTH', type: 'overlay' },
  { id: 'pm25', name: 'PM2.5 Particulates', category: 'pollution', enabled: false, opacity: 0.7, color: '#996633', icon: 'cloud', description: 'Fine particulate matter estimation', nasaGibsId: 'PM25_CONCENTRATION', type: 'overlay' },
  { id: 'ozone', name: 'Ozone (O₃)', category: 'pollution', enabled: false, opacity: 0.7, color: '#4488ff', icon: 'cloud', description: 'Total column ozone from OMI/Aura', nasaGibsId: 'OZONE_TOTAL', type: 'overlay' },
  { id: 'methane', name: 'Methane (CH₄)', category: 'pollution', enabled: false, opacity: 0.7, color: '#44ff88', icon: 'cloud', description: 'Methane concentration from GOSAT/OCO-2', nasaGibsId: 'CH4_CONCENTRATION', type: 'overlay' },
  
  // Weather Layers
  { id: 'clouds', name: 'Cloud Cover', category: 'weather', enabled: true, opacity: 0.6, color: '#ffffff', icon: 'cloud', description: 'True color cloud imagery from MODIS', nasaGibsId: 'MODIS_Terra_CorrectedReflectance_TrueColor', type: 'overlay' },
  { id: 'temperature', name: 'Land Surface Temperature', category: 'weather', enabled: false, opacity: 0.7, color: '#ff6600', icon: 'thermometer', description: 'Land surface temperature from MODIS', nasaGibsId: 'MODIS_Terra_Land_Surface_Temp_Day', type: 'heatmap' },
  { id: 'sst', name: 'Sea Surface Temperature', category: 'weather', enabled: false, opacity: 0.7, color: '#0066ff', icon: 'thermometer', description: 'Sea surface temperature from GHRSST', nasaGibsId: 'GHRSST_L4_MUR_Sea_Surface_Temperature', type: 'heatmap' },
  { id: 'precipitation', name: 'Precipitation Rate', category: 'weather', enabled: false, opacity: 0.7, color: '#0044cc', icon: 'cloud-rain', description: 'Global precipitation from GPM/IMERG', nasaGibsId: 'GPM_3IMERGDE_06_precipitation', type: 'overlay' },
  { id: 'wind', name: 'Wind Speed', category: 'weather', enabled: false, opacity: 0.7, color: '#00ccff', icon: 'wind', description: 'Surface wind speed from ASCAT', nasaGibsId: 'ASCAT_surface_wind_speed', type: 'overlay' },
  { id: 'humidity', name: 'Relative Humidity', category: 'weather', enabled: false, opacity: 0.7, color: '#66aaff', icon: 'droplets', description: 'Atmospheric relative humidity', nasaGibsId: 'AIRS_RelativeHumidity', type: 'overlay' },
  
  // Natural Events
  { id: 'volcanoes', name: 'Active Volcanoes', category: 'natural', enabled: true, opacity: 1, color: '#ff2200', icon: 'mountain', description: 'Active volcanic eruptions from NASA EONET', type: 'events' },
  { id: 'wildfires', name: 'Wildfires & Fire Smoke', category: 'natural', enabled: true, opacity: 1, color: '#ff6600', icon: 'flame', description: 'Active wildfires detected by VIIRS/MODIS', nasaGibsId: 'VIIRS_SNUP_CorrectedReflectance_TrueColor', type: 'events' },
  { id: 'earthquakes', name: 'Earthquakes', category: 'natural', enabled: true, opacity: 1, color: '#ff0066', icon: 'activity', description: 'Recent seismic activity from USGS', type: 'events' },
  { id: 'storms', name: 'Active Storms', category: 'natural', enabled: true, opacity: 1, color: '#0088ff', icon: 'cloud-lightning', description: 'Tropical cyclones and severe storms', type: 'events' },
  { id: 'floods', name: 'Flood Events', category: 'natural', enabled: false, opacity: 1, color: '#0044aa', icon: 'waves', description: 'Active flood events worldwide', type: 'events' },
  { id: 'icebergs', name: 'Iceberg Tracking', category: 'natural', enabled: false, opacity: 1, color: '#88ccff', icon: 'snowflake', description: 'Iceberg locations from satellite tracking', type: 'events' },
  
  // Ocean & Water
  { id: 'currents', name: 'Ocean Currents', category: 'ocean', enabled: false, opacity: 0.7, color: '#0066cc', icon: 'anchor', description: 'Major ocean surface currents', nasaGibsId: 'OSCAR_surface_currents', type: 'overlay' },
  { id: 'chlorophyll', name: 'Chlorophyll Concentration', category: 'ocean', enabled: false, opacity: 0.7, color: '#00cc44', icon: 'leaf', description: 'Ocean chlorophyll-a from MODIS Aqua', nasaGibsId: 'MODIS_Aqua_Chlorophyll_A', type: 'overlay' },
  { id: 'sea_level', name: 'Sea Level Anomaly', category: 'ocean', enabled: false, opacity: 0.7, color: '#0033cc', icon: 'trending-up', description: 'Sea surface height anomaly from Jason-3', nasaGibsId: 'SEA_LEVEL_Anomaly', type: 'heatmap' },
  
  // Land & Vegetation
  { id: 'ndvi', name: 'Vegetation Index (NDVI)', category: 'land', enabled: false, opacity: 0.7, color: '#00aa00', icon: 'tree-pine', description: 'Normalized Difference Vegetation Index', nasaGibsId: 'MODIS_Terra_L3_NDVI_Monthly', type: 'overlay' },
  { id: 'soil_moisture', name: 'Soil Moisture', category: 'land', enabled: false, opacity: 0.7, color: '#884400', icon: 'droplet', description: 'Surface soil moisture from SMAP', nasaGibsId: 'SMAP_L4_Soil_Moisture', type: 'overlay' },
  { id: 'drought', name: 'Drought Index', category: 'land', enabled: false, opacity: 0.7, color: '#cc6600', icon: 'sun', description: 'Drought severity index', type: 'heatmap' },
  { id: 'night_lights', name: 'Night Lights', category: 'land', enabled: false, opacity: 0.8, color: '#ffcc00', icon: 'lightbulb', description: 'VIIRS nighttime city lights', nasaGibsId: 'VIIRS_CityLights_2012', type: 'overlay' },
  
  // Ice & Cryosphere
  { id: 'sea_ice', name: 'Sea Ice Extent', category: 'ice', enabled: false, opacity: 0.7, color: '#aaddff', icon: 'snowflake', description: 'Arctic/Antarctic sea ice concentration', nasaGibsId: 'AMSRE_Sea_Ice', type: 'overlay' },
  { id: 'ice_sheet', name: 'Ice Sheet Mass Balance', category: 'ice', enabled: false, opacity: 0.7, color: '#66bbff', icon: 'mountain-snow', description: 'Greenland/Antarctica ice mass change from GRACE', type: 'heatmap' },
];

const defaultDocks: DockState[] = [
  { id: 'pollution', title: 'Pollution Monitor', icon: 'smoke', isOpen: false, pinned: false },
  { id: 'weather', title: 'Weather Station', icon: 'cloud-sun', isOpen: false, pinned: false },
  { id: 'volcanoes', title: 'Volcano Watch', icon: 'mountain', isOpen: false, pinned: false },
  { id: 'earthquakes', title: 'Earthquake Watch', icon: 'activity', isOpen: false, pinned: false },
  { id: 'storms', title: 'Storm Tracker', icon: 'cloud-lightning', isOpen: false, pinned: false },
  { id: 'wildfires', title: 'Fire Watch', icon: 'flame', isOpen: false, pinned: false },
  { id: 'ocean', title: 'Ocean Monitor', icon: 'waves', isOpen: false, pinned: false },
  { id: 'land', title: 'Land & Vegetation', icon: 'tree-pine', isOpen: false, pinned: false },
  { id: 'ice', title: 'Cryosphere', icon: 'snowflake', isOpen: false, pinned: false },
  { id: 'simulation', title: 'Simulations', icon: 'flask-conical', isOpen: false, pinned: false },
  { id: 'settings', title: 'Settings & Layers', icon: 'settings', isOpen: false, pinned: false },
];

export const useStore = create<AppState>((set) => ({
  apiKey: localStorage.getItem('nasa_api_key') || '',
  setApiKey: (key) => {
    localStorage.setItem('nasa_api_key', key);
    set({ apiKey: key });
  },
  showApiKeyModal: false,
  setShowApiKeyModal: (show) => set({ showApiKeyModal: show }),
  
  layers: defaultLayers,
  toggleLayer: (id) => set((state) => ({
    layers: state.layers.map((l) => l.id === id ? { ...l, enabled: !l.enabled } : l)
  })),
  setLayerOpacity: (id, opacity) => set((state) => ({
    layers: state.layers.map((l) => l.id === id ? { ...l, opacity } : l)
  })),
  
  events: [],
  setEvents: (events) => set({ events }),
  
  docks: defaultDocks,
  toggleDock: (id) => set((state) => ({
    docks: state.docks.map((d) => d.id === id ? { ...d, isOpen: !d.isOpen } : d)
  })),
  setActiveDock: (id) => set({ activeDock: id }),
  activeDock: null,
  
  userLocation: null,
  setUserLocation: (loc) => set({ userLocation: loc }),
  
  globeRotation: { x: 0, y: 0, z: 0 },
  setGlobeRotation: (rot) => set({ globeRotation: rot }),
  
  selectedEvent: null,
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  
  showLabels: true,
  setShowLabels: (show) => set({ showLabels: show }),
  
  showGridLines: false,
  setShowGridLines: (show) => set({ showGridLines: show }),
  
  atmosphereEnabled: true,
  setAtmosphereEnabled: (enabled) => set({ atmosphereEnabled: enabled }),
  
  timeSlider: 0,
  setTimeSlider: (time) => set({ timeSlider: time }),
}));
