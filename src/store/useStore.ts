import { create } from 'zustand';
import { extractLonLat } from '../geo';
import {
  AI_PROVIDERS,
  defaultModelFor,
  isAiProvider,
  type AiProvider,
} from '../lib/aiProviders';

export interface LayerConfig {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  opacity: number;
  color: string;
  icon: string;
  description: string;
  shortLabel: string;
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
  magnitude?: number;
  place?: string;
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
  selectEvent: (event: EventData | null, opts?: { flyTo?: boolean }) => void;
  focusTarget: { lat: number; lng: number; token: number } | null;
  
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
  
  showGridLines: boolean;
  setShowGridLines: (show: boolean) => void;
  
  atmosphereEnabled: boolean;
  setAtmosphereEnabled: (enabled: boolean) => void;
  
  timeSlider: number;
  setTimeSlider: (time: number) => void;

  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;

  minimaxKey: string;
  setMinimaxKey: (key: string) => void;
  nvidiaKey: string;
  setNvidiaKey: (key: string) => void;
  aiProvider: AiProvider;
  setAiProvider: (provider: AiProvider) => void;
  aiModel: string;
  setAiModel: (model: string) => void;
  agentOpen: boolean;
  setAgentOpen: (open: boolean) => void;
  stationsOpen: boolean;
  setStationsOpen: (open: boolean) => void;
}

export type ThemeMode = 'dark' | 'light';

export function applyDocumentTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const saved = window.localStorage.getItem('earth_theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark';
}

const defaultLayers: LayerConfig[] = [
  // Pollution Layers
  { id: 'co2', name: 'CO₂ Concentration', shortLabel: 'CO₂', category: 'pollution', enabled: false, opacity: 0.7, color: '#ff4444', icon: 'cloud', description: 'OCO-2 column-average carbon dioxide from NASA GIBS', nasaGibsId: 'OCO-2_Carbon_Dioxide_Total_Column_Average', type: 'overlay' },
  { id: 'co', name: 'Carbon Monoxide', shortLabel: 'CO', category: 'pollution', enabled: false, opacity: 0.7, color: '#ff8800', icon: 'cloud', description: 'MOPITT CO total column from NASA GIBS', nasaGibsId: 'MOPITT_CO_Monthly_Total_Column_Day', type: 'overlay' },
  { id: 'nox', name: 'NOₓ (Nitrogen Oxides)', shortLabel: 'NOx', category: 'pollution', enabled: false, opacity: 0.7, color: '#ffcc00', icon: 'cloud', description: 'OMI tropospheric NO₂ from NASA GIBS', nasaGibsId: 'OMI_Nitrogen_Dioxide_Tropo_Column', type: 'overlay' },
  { id: 'so2', name: 'SO₂ (Sulfur Dioxide)', shortLabel: 'SO₂', category: 'pollution', enabled: false, opacity: 0.75, color: '#aa44ff', icon: 'cloud', description: 'OMI SO₂ planetary boundary layer — volcanic and industrial plumes', nasaGibsId: 'OMI_SO2_Planetary_Boundary_Layer', type: 'overlay' },
  { id: 'aerosol', name: 'Aerosol Optical Depth', shortLabel: 'Aerosol', category: 'pollution', enabled: false, opacity: 0.7, color: '#886644', icon: 'cloud', description: 'MODIS combined aerosol optical depth from NASA GIBS', nasaGibsId: 'MODIS_Combined_Value_Added_AOD', type: 'overlay' },
  { id: 'pm25', name: 'PM2.5 Particulates', shortLabel: 'PM2.5', category: 'pollution', enabled: false, opacity: 0.7, color: '#996633', icon: 'cloud', description: 'MODIS Terra aerosol (proxy for fine particulates)', nasaGibsId: 'MODIS_Terra_Aerosol', type: 'overlay' },
  { id: 'ozone', name: 'Ozone (O₃)', shortLabel: 'O₃', category: 'pollution', enabled: false, opacity: 0.7, color: '#4488ff', icon: 'cloud', description: 'OMPS total column ozone from NASA GIBS', nasaGibsId: 'OMPS_Ozone_Total_Column', type: 'overlay' },
  { id: 'methane', name: 'Methane (CH₄)', shortLabel: 'CH₄', category: 'pollution', enabled: false, opacity: 0.7, color: '#44ff88', icon: 'cloud', description: 'AIRS methane 400 hPa mixing ratio from NASA GIBS', nasaGibsId: 'AIRS_L3_Methane_400hPa_Volume_Mixing_Ratio_Daily_Day', type: 'overlay' },
  
  // Weather Layers
  { id: 'clouds', name: 'Cloud Cover', shortLabel: 'Clouds', category: 'weather', enabled: true, opacity: 0.65, color: '#8ec8f0', icon: 'cloud', description: 'MODIS Terra cloud fraction from NASA GIBS', nasaGibsId: 'MODIS_Terra_Cloud_Fraction_Day', type: 'overlay' },
  { id: 'temperature', name: 'Land Surface Temperature', shortLabel: 'Temp', category: 'weather', enabled: false, opacity: 0.7, color: '#ff6600', icon: 'thermometer', description: 'MODIS land surface temperature from NASA GIBS', nasaGibsId: 'MODIS_Terra_Land_Surface_Temp_Day', type: 'heatmap' },
  { id: 'sst', name: 'Sea Surface Temperature', shortLabel: 'SST', category: 'weather', enabled: false, opacity: 0.7, color: '#0066ff', icon: 'thermometer', description: 'MUR sea surface temperature from NASA GIBS', nasaGibsId: 'GHRSST_L4_MUR_Sea_Surface_Temperature', type: 'heatmap' },
  { id: 'precipitation', name: 'Precipitation Rate', shortLabel: 'Rain', category: 'weather', enabled: false, opacity: 0.75, color: '#3b82f6', icon: 'cloud-rain', description: 'GPM IMERG precipitation rate from NASA GIBS', nasaGibsId: 'IMERG_Precipitation_Rate', type: 'overlay' },
  { id: 'wind', name: 'Wind Speed', shortLabel: 'Wind', category: 'weather', enabled: false, opacity: 0.7, color: '#00ccff', icon: 'wind', description: 'AMSR ocean wind speed from NASA GIBS', nasaGibsId: 'AMSRUE_Ocean_Wind_Speed_Day', type: 'overlay' },
  { id: 'humidity', name: 'Relative Humidity', shortLabel: 'Humidity', category: 'weather', enabled: false, opacity: 0.7, color: '#66aaff', icon: 'droplets', description: 'AIRS surface relative humidity from NASA GIBS', nasaGibsId: 'AIRS_L3_Surface_Relative_Humidity_Daily_Day', type: 'overlay' },
  
  // Natural Events
  { id: 'volcanoes', name: 'Active Volcanoes', shortLabel: 'Volcanoes', category: 'natural', enabled: true, opacity: 1, color: '#ff2200', icon: 'mountain', description: 'Active volcanic eruptions from NASA EONET', type: 'events' },
  { id: 'wildfires', name: 'Wildfires & Fire Smoke', shortLabel: 'Fires', category: 'natural', enabled: true, opacity: 1, color: '#ff6600', icon: 'flame', description: 'Active wildfires detected by VIIRS/MODIS', nasaGibsId: 'VIIRS_SNUP_CorrectedReflectance_TrueColor', type: 'events' },
  { id: 'earthquakes', name: 'Earthquakes', shortLabel: 'Quakes', category: 'natural', enabled: true, opacity: 1, color: '#ff0066', icon: 'activity', description: 'Recent seismic activity from USGS', type: 'events' },
  { id: 'storms', name: 'Active Storms', shortLabel: 'Storms', category: 'natural', enabled: true, opacity: 1, color: '#0088ff', icon: 'cloud-lightning', description: 'Tropical cyclones and severe storms', type: 'events' },
  { id: 'floods', name: 'Flood Events', shortLabel: 'Floods', category: 'natural', enabled: false, opacity: 1, color: '#0044aa', icon: 'waves', description: 'Active flood events worldwide', type: 'events' },
  { id: 'icebergs', name: 'Iceberg Tracking', shortLabel: 'Icebergs', category: 'natural', enabled: false, opacity: 1, color: '#88ccff', icon: 'snowflake', description: 'Iceberg locations from satellite tracking', type: 'events' },
  
  // Ocean & Water
  { id: 'currents', name: 'Ocean Currents', shortLabel: 'Currents', category: 'ocean', enabled: false, opacity: 0.75, color: '#0066cc', icon: 'anchor', description: 'OSCAR sea surface currents (final, 5-day)', nasaGibsId: 'OSCAR_Sea_Surface_Currents_Final', type: 'overlay' },
  { id: 'chlorophyll', name: 'Chlorophyll Concentration', shortLabel: 'Chlorophyll', category: 'ocean', enabled: false, opacity: 0.7, color: '#00cc44', icon: 'leaf', description: 'VIIRS chlorophyll-a from NASA GIBS', nasaGibsId: 'VIIRS_SNPP_L2_Chlorophyll_A', type: 'overlay' },
  { id: 'sea_level', name: 'Sea Level Rise Trend', shortLabel: 'Sea level', category: 'ocean', enabled: false, opacity: 0.75, color: '#0033cc', icon: 'trending-up', description: 'Global mean sea level rise trend from NASA GIBS', nasaGibsId: 'Sea_Level_Rise', type: 'heatmap' },
  
  // Land & Vegetation
  { id: 'ndvi', name: 'Vegetation Index (NDVI)', shortLabel: 'NDVI', category: 'land', enabled: false, opacity: 0.7, color: '#00aa00', icon: 'tree-pine', description: 'MODIS NDVI monthly from NASA GIBS', nasaGibsId: 'MODIS_Terra_L3_NDVI_Monthly', type: 'overlay' },
  { id: 'soil_moisture', name: 'Soil Moisture', shortLabel: 'Soil', category: 'land', enabled: false, opacity: 0.7, color: '#884400', icon: 'droplet', description: 'SMAP analyzed root-zone soil moisture from NASA GIBS', nasaGibsId: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', type: 'overlay' },
  { id: 'drought', name: 'Drought Index', shortLabel: 'Drought', category: 'land', enabled: false, opacity: 0.7, color: '#cc6600', icon: 'sun', description: 'Drought severity index', type: 'heatmap' },
  { id: 'night_lights', name: 'Night Lights', shortLabel: 'Lights', category: 'land', enabled: false, opacity: 0.8, color: '#ffcc00', icon: 'lightbulb', description: 'VIIRS night lights from NASA GIBS', nasaGibsId: 'VIIRS_Night_Lights', type: 'overlay' },
  
  // Ice & Cryosphere
  { id: 'sea_ice', name: 'Sea Ice Extent', shortLabel: 'Sea ice', category: 'ice', enabled: false, opacity: 0.7, color: '#aaddff', icon: 'snowflake', description: 'MODIS Terra sea ice from NASA GIBS', nasaGibsId: 'MODIS_Terra_Sea_Ice', type: 'overlay' },
  { id: 'ice_sheet', name: 'Ice Sheet Mass Balance', shortLabel: 'Ice sheet', category: 'ice', enabled: false, opacity: 0.7, color: '#66bbff', icon: 'mountain-snow', description: 'Greenland/Antarctica ice mass change from GRACE', type: 'heatmap' },
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
  focusTarget: null,
  selectEvent: (event, opts) => {
    if (!event) {
      set({ selectedEvent: null });
      return;
    }
    const pair = event.geometry?.[0] ? extractLonLat(event.geometry[0].coordinates) : null;
    if (opts?.flyTo && pair) {
      set({
        selectedEvent: event,
        focusTarget: { lng: pair[0], lat: pair[1], token: Date.now() },
      });
      return;
    }
    set({ selectedEvent: event });
  },
  
  showLabels: true,
  setShowLabels: (show) => set({ showLabels: show }),
  
  showGridLines: false,
  setShowGridLines: (show) => set({ showGridLines: show }),
  
  atmosphereEnabled: true,
  setAtmosphereEnabled: (enabled) => set({ atmosphereEnabled: enabled }),
  
  timeSlider: 0,
  setTimeSlider: (time) => set({ timeSlider: time }),

  theme: readStoredTheme(),
  setTheme: (theme) => {
    localStorage.setItem('earth_theme', theme);
    applyDocumentTheme(theme);
    set({ theme });
  },

  minimaxKey: typeof window !== 'undefined' ? localStorage.getItem('minimax_api_key') || '' : '',
  setMinimaxKey: (key) => {
    localStorage.setItem('minimax_api_key', key);
    set({ minimaxKey: key });
  },
  nvidiaKey: typeof window !== 'undefined' ? localStorage.getItem('nvidia_api_key') || '' : '',
  setNvidiaKey: (key) => {
    localStorage.setItem('nvidia_api_key', key);
    set({ nvidiaKey: key });
  },
  aiProvider: (() => {
    if (typeof window === 'undefined') return 'minimax';
    const saved = window.localStorage.getItem('ai_provider') || '';
    return isAiProvider(saved) ? saved : 'minimax';
  })(),
  setAiProvider: (provider) => {
    localStorage.setItem('ai_provider', provider);
    const current = useStore.getState().aiModel;
    const models = AI_PROVIDERS.find((p) => p.id === provider)?.models || [];
    const nextModel = models.includes(current) ? current : defaultModelFor(provider);
    localStorage.setItem('ai_model', nextModel);
    set({ aiProvider: provider, aiModel: nextModel });
  },
  aiModel: (() => {
    if (typeof window === 'undefined') return 'MiniMax-M3';
    const savedProvider = window.localStorage.getItem('ai_provider') || '';
    const provider = isAiProvider(savedProvider) ? savedProvider : 'minimax';
    const validModels = AI_PROVIDERS.find((p) => p.id === provider)?.models || [];
    const saved = window.localStorage.getItem('ai_model') || '';
    return validModels.includes(saved) ? saved : defaultModelFor(provider);
  })(),
  setAiModel: (model) => {
    localStorage.setItem('ai_model', model);
    set({ aiModel: model });
  },
  agentOpen: true,
  setAgentOpen: (open) => set({ agentOpen: open }),
  stationsOpen: false,
  setStationsOpen: (open) => set({ stationsOpen: open }),
}));

if (typeof window !== 'undefined') {
  applyDocumentTheme(readStoredTheme());
}
