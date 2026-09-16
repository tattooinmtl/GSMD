import { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Mountain, Flame, Activity, CloudLightning, Waves, TreePine,
  Snowflake, FlaskConical, Settings, CloudSun, X, ChevronDown,
  ChevronRight, Eye, EyeOff, SlidersHorizontal, MapPin,
  Globe2, Layers, Plus, Minus, Search, Satellite, Thermometer,
  Wind, Droplets, Cloud, Sun, Leaf, Lightbulb, Anchor
} from 'lucide-react';

const iconMap: Record<string, any> = {
  mountain: Mountain,
  flame: Flame,
  activity: Activity,
  'cloud-lightning': CloudLightning,
  waves: Waves,
  'tree-pine': TreePine,
  snowflake: Snowflake,
  'flask-conical': FlaskConical,
  settings: Settings,
  'cloud-sun': CloudSun,
  thermometer: Thermometer,
  wind: Wind,
  droplets: Droplets,
  cloud: Cloud,
  sun: Sun,
  leaf: Leaf,
  lightbulb: Lightbulb,
  anchor: Anchor,
  'cloud-rain': CloudLightning,
  'trending-up': Activity,
  droplet: Droplets,
  'mountain-snow': Mountain,
  smoke: Cloud,
};

function DockContent({ dockId }: { dockId: string }) {
  const { layers, toggleLayer, setLayerOpacity, events } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  const categoryMap: Record<string, string> = {
    pollution: 'pollution',
    weather: 'weather',
    volcanoes: 'natural',
    earthquakes: 'natural',
    storms: 'natural',
    wildfires: 'natural',
    ocean: 'ocean',
    land: 'land',
    ice: 'ice',
    simulation: 'simulation',
    settings: 'settings',
  };

  const categoryFilter: Record<string, string[]> = {
    volcanoes: ['volcanoes'],
    earthquakes: ['earthquakes'],
    storms: ['storms'],
    wildfires: ['wildfires'],
  };

  const getFilteredLayers = () => {
    if (dockId === 'settings') return layers;
    if (dockId === 'simulation') return layers.filter(l => l.type === 'simulation');
    
    if (categoryFilter[dockId]) {
      const layerIds = categoryFilter[dockId];
      return layers.filter(l => layerIds.includes(l.id));
    }
    
    const category = categoryMap[dockId];
    if (category) {
      return layers.filter(l => l.category === category);
    }
    
    return layers;
  };

  const filteredLayers = getFilteredLayers().filter(l =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDockEvents = () => {
    const eventCategoryMap: Record<string, string> = {
      volcanoes: 'volcanoes',
      earthquakes: 'earthquakes',
      storms: 'severeStorms',
      wildfires: 'wildfires',
    };
    const cat = eventCategoryMap[dockId];
    if (!cat) return [];
    return events.filter(e => e.category === cat).slice(0, 10);
  };

  const dockEvents = getDockEvents();

  if (dockId === 'settings') {
    return <SettingsContent />;
  }

  return (
    <div className="p-3 space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search layers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Layer toggles */}
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
        {filteredLayers.map((layer) => {
          const Icon = iconMap[layer.icon] || Layers;
          return (
            <div key={layer.id} className="bg-gray-800/40 rounded-lg p-2 border border-gray-700/50 hover:border-gray-600 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: layer.color }} />
                  <span className="text-xs text-gray-200 truncate">{layer.name}</span>
                </div>
                <button
                  onClick={() => toggleLayer(layer.id)}
                  className="p-1 rounded hover:bg-gray-700 transition-colors"
                >
                  {layer.enabled ? (
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </button>
              </div>
              {layer.enabled && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={layer.opacity * 100}
                    onChange={(e) => setLayerOpacity(layer.id, parseInt(e.target.value) / 100)}
                    className="flex-1 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-[10px] text-gray-500 w-8 text-right">{Math.round(layer.opacity * 100)}%</span>
                </div>
              )}
              <p className="text-[10px] text-gray-500 mt-1 leading-tight">{layer.description}</p>
            </div>
          );
        })}
      </div>

      {/* Active events list */}
      {dockEvents.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Active Events ({dockEvents.length})
          </h4>
          <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
            {dockEvents.map((event) => (
              <div key={event.id} className="bg-gray-800/30 rounded p-2 border border-gray-700/30">
                <p className="text-xs text-gray-200 font-medium truncate">{event.title}</p>
                <p className="text-[10px] text-gray-500">
                  {event.geometry[0]?.date && new Date(event.geometry[0].date).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsContent() {
  const {
    showLabels, setShowLabels,
    showGridLines, setShowGridLines,
    atmosphereEnabled, setAtmosphereEnabled,
    userLocation, setUserLocation,
    apiKey, setApiKey,
    setShowApiKeyModal
  } = useStore();

  const handleGeolocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.error('Geolocation error:', err)
      );
    }
  };

  return (
    <div className="p-3 space-y-4">
      {/* NASA API Key */}
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
        <h4 className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1">
          <Satellite className="w-3 h-3" />
          NASA API Configuration
        </h4>
        <input
          type="password"
          placeholder="Enter NASA API Key..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full bg-gray-900/50 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <p className="text-[10px] text-gray-500 mt-1">
          Get your free key at: <a href="https://urs.earthdata.nasa.gov/users/new" target="_blank" className="text-blue-400 hover:underline">urs.earthdata.nasa.gov</a>
        </p>
      </div>

      {/* Display Options */}
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
        <h4 className="text-xs font-semibold text-gray-300 mb-2">Display Options</h4>
        <div className="space-y-2">
          <ToggleOption label="Country Labels" enabled={showLabels} onToggle={() => setShowLabels(!showLabels)} />
          <ToggleOption label="Grid Lines" enabled={showGridLines} onToggle={() => setShowGridLines(!showGridLines)} />
          <ToggleOption label="Atmosphere" enabled={atmosphereEnabled} onToggle={() => setAtmosphereEnabled(!atmosphereEnabled)} />
        </div>
      </div>

      {/* Location */}
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
        <h4 className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          Your Location
        </h4>
        {userLocation ? (
          <div className="text-xs text-gray-300">
            <p>Lat: {userLocation.lat.toFixed(4)}°</p>
            <p>Lng: {userLocation.lng.toFixed(4)}°</p>
            <button onClick={() => setUserLocation(null)} className="text-red-400 text-[10px] mt-1 hover:underline">
              Remove marker
            </button>
          </div>
        ) : (
          <button
            onClick={handleGeolocate}
            className="w-full bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg px-3 py-1.5 text-xs hover:bg-blue-600/30 transition-colors"
          >
            📍 Detect My Location
          </button>
        )}
      </div>

      {/* Data Sources */}
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
        <h4 className="text-xs font-semibold text-gray-300 mb-2">Data Sources</h4>
        <div className="space-y-1 text-[10px] text-gray-500">
          <p>• NASA EONET (Earth Observatory Natural Event Tracker)</p>
          <p>• NASA GIBS (Global Imagery Browse Services)</p>
          <p>• USGS Earthquake Hazards Program</p>
          <p>• NOAA Global Monitoring Laboratory</p>
          <p>• ESA Copernicus Atmosphere Service</p>
          <p>• MODIS/VIIRS Fire & Thermal Anomalies</p>
        </div>
      </div>
    </div>
  );
}

function ToggleOption({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-300">{label}</span>
      <button
        onClick={onToggle}
        className={`w-8 h-4 rounded-full transition-colors ${enabled ? 'bg-blue-500' : 'bg-gray-600'}`}
      >
        <div className={`w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

export default function SidePanel() {
  const { docks, toggleDock, activeDock, setActiveDock } = useStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`h-full flex transition-all duration-300 ${collapsed ? 'w-12' : 'w-80'}`}>
      {/* Dock icons rail */}
      <div className="w-12 bg-gray-900/95 border-r border-gray-800 flex flex-col items-center py-2 gap-1 overflow-y-auto custom-scrollbar">
        {docks.map((dock) => {
          const Icon = iconMap[dock.icon] || Settings;
          const isActive = activeDock === dock.id;
          return (
            <button
              key={dock.id}
              onClick={() => {
                if (isActive) {
                  setActiveDock(null);
                } else {
                  setActiveDock(dock.id);
                }
              }}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all relative group ${
                isActive
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/50'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
              title={dock.title}
            >
              <Icon className="w-4 h-4" />
              {dock.pinned && (
                <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-400 rounded-full" />
              )}
              {/* Tooltip */}
              <div className="absolute left-full ml-2 bg-gray-800 text-gray-200 text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {dock.title}
              </div>
            </button>
          );
        })}
        
        {/* Collapse toggle */}
        <div className="mt-auto">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Dock content panel */}
      {!collapsed && activeDock && (
        <div className="flex-1 bg-gray-900/95 border-r border-gray-800 overflow-hidden flex flex-col">
          {/* Dock header */}
          <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between bg-gray-800/30">
            <div className="flex items-center gap-2">
              {(() => {
                const dock = docks.find(d => d.id === activeDock);
                const Icon = iconMap[dock?.icon || ''] || Settings;
                return <Icon className="w-4 h-4 text-blue-400" />;
              })()}
              <h3 className="text-sm font-semibold text-gray-200">
                {docks.find(d => d.id === activeDock)?.title}
              </h3>
            </div>
            <button
              onClick={() => setActiveDock(null)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Dock content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <DockContent dockId={activeDock} />
          </div>
        </div>
      )}

      {/* Empty state when no dock is active */}
      {!collapsed && !activeDock && (
        <div className="flex-1 bg-gray-900/95 border-r border-gray-800 flex items-center justify-center">
          <div className="text-center p-4">
            <Globe2 className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-xs text-gray-500">Select a dock to view layers and data</p>
          </div>
        </div>
      )}
    </div>
  );
}
