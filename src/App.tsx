import { useState, useEffect } from 'react';
import Globe from './components/Globe';
import SidePanel from './components/SidePanel';
import { useStore } from './store/useStore';
import { useNasaEvents } from './hooks/useNasaData';
import {
  Satellite, AlertTriangle, Flame, Mountain, CloudLightning,
  Activity, Layers, Info, X, ChevronDown, ChevronUp
} from 'lucide-react';

function StatusBar() {
  const { events, layers } = useStore();
  const activeLayers = layers.filter(l => l.enabled);
  const activeVolcanoes = events.filter(e => e.category === 'volcanoes');
  const activeFires = events.filter(e => e.category === 'wildfires');
  const activeQuakes = events.filter(e => e.category === 'earthquakes');
  const activeStorms = events.filter(e => e.category === 'severeStorms');

  return (
    <div className="flex items-center gap-4 text-[10px] text-gray-400 px-4 py-1 bg-gray-900/80 border-t border-gray-800">
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        <span>LIVE</span>
      </div>
      <div className="flex items-center gap-1">
        <Layers className="w-3 h-3" />
        <span>{activeLayers.length} layers active</span>
      </div>
      <div className="flex items-center gap-1">
        <Mountain className="w-3 h-3 text-red-400" />
        <span>{activeVolcanoes.length} volcanoes</span>
      </div>
      <div className="flex items-center gap-1">
        <Flame className="w-3 h-3 text-orange-400" />
        <span>{activeFires.length} fires</span>
      </div>
      <div className="flex items-center gap-1">
        <Activity className="w-3 h-3 text-pink-400" />
        <span>{activeQuakes.length} quakes</span>
      </div>
      <div className="flex items-center gap-1">
        <CloudLightning className="w-3 h-3 text-blue-400" />
        <span>{activeStorms.length} storms</span>
      </div>
      <div className="ml-auto text-gray-600">
        NASA EONET • USGS • GIBS
      </div>
    </div>
  );
}

function EventAlerts() {
  const { events, layers, selectedEvent, setSelectedEvent } = useStore();
  const [expanded, setExpanded] = useState(true);
  
  const activeEventLayers = layers.filter(l => l.enabled && l.type === 'events');
  const recentEvents = events.slice(0, 5);

  if (recentEvents.length === 0 || activeEventLayers.length === 0) return null;

  return (
    <div className="absolute top-16 left-4 z-30 max-w-xs">
      <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/50 border-b border-gray-700"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-semibold text-gray-200">Live Alerts</span>
            <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full">
              {recentEvents.length}
            </span>
          </div>
          {expanded ? <ChevronUp className="w-3 h-3 text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
        </button>
        
        {expanded && (
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            {recentEvents.map((event) => {
              const categoryColors: Record<string, string> = {
                volcanoes: 'text-red-400 bg-red-400/10',
                wildfires: 'text-orange-400 bg-orange-400/10',
                earthquakes: 'text-pink-400 bg-pink-400/10',
                severeStorms: 'text-blue-400 bg-blue-400/10',
                floods: 'text-cyan-400 bg-cyan-400/10',
                icebergs: 'text-sky-400 bg-sky-400/10',
              };
              const colorClass = categoryColors[event.category] || 'text-gray-400 bg-gray-400/10';
              
              return (
                <div
                  key={event.id}
                  className="px-3 py-2 border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${colorClass}`}>
                      {event.category.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200 truncate">{event.title}</p>
                      <p className="text-[10px] text-gray-500">
                        {event.geometry[0]?.date && new Date(event.geometry[0].date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoPanel() {
  const { selectedEvent, setSelectedEvent } = useStore();
  
  if (!selectedEvent) return null;
  
  return (
    <div className="absolute bottom-16 left-4 z-30 max-w-sm">
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-4 shadow-2xl">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-100">{selectedEvent.title}</h3>
          <button onClick={() => setSelectedEvent(null)} className="text-gray-500 hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
              {selectedEvent.category}
            </span>
          </div>
          {selectedEvent.geometry?.map((g, i) => (
            <div key={i} className="text-xs text-gray-400">
              <span className="text-gray-500">Coordinates:</span> {g.coordinates?.[1]?.toFixed(2)}°, {g.coordinates?.[0]?.toFixed(2)}°
              {g.date && <span className="ml-2 text-gray-600">({new Date(g.date).toLocaleDateString()})</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimeControl() {
  const { timeSlider, setTimeSlider } = useStore();
  const dates = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  return (
    <div className="absolute bottom-16 right-4 z-30">
      <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-xl px-4 py-2 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500">TIME</span>
          <input
            type="range"
            min="0"
            max={dates.length - 1}
            value={timeSlider}
            onChange={(e) => setTimeSlider(parseInt(e.target.value))}
            className="w-32 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-[10px] text-gray-300 w-20">{dates[timeSlider]}</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { apiKey, setApiKey, showApiKeyModal, setShowApiKeyModal } = useStore();
  const [tempKey, setTempKey] = useState('');
  const { getEventsByCategory } = useNasaEvents();

  useEffect(() => {
    if (!apiKey) {
      setShowApiKeyModal(true);
    }
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-950 overflow-hidden">
      {/* Header */}
      <header className="h-12 bg-gray-900/95 border-b border-gray-800 flex items-center px-4 z-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
            <Satellite className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-100 leading-tight">Earth Monitor</h1>
            <p className="text-[10px] text-gray-500 leading-tight">NASA Satellite Data Visualization</p>
          </div>
        </div>
        
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-green-500' : 'bg-yellow-500'}`} />
            {apiKey ? 'API Connected' : 'No API Key'}
          </div>
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="text-[10px] bg-gray-800 border border-gray-700 text-gray-300 px-2 py-1 rounded hover:bg-gray-700 transition-colors"
          >
            {apiKey ? 'Change Key' : 'Add API Key'}
          </button>
          <div className="flex items-center gap-1 text-[10px] text-gray-500 border-l border-gray-800 pl-3">
            <Info className="w-3 h-3" />
            <span>Scroll to zoom • Drag to rotate</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Side Panel */}
        <SidePanel />
        
        {/* Globe area */}
        <div className="flex-1 relative">
          <Globe />
          
          {/* Overlay elements */}
          <EventAlerts />
          <InfoPanel />
          <TimeControl />
          
          {/* Quick layer toggles */}
          <div className="absolute top-4 right-4 z-30 flex flex-col gap-1">
            <QuickToggle layerId="clouds" label="Clouds" />
            <QuickToggle layerId="volcanoes" label="Volcanoes" />
            <QuickToggle layerId="wildfires" label="Fires" />
            <QuickToggle layerId="earthquakes" label="Quakes" />
            <QuickToggle layerId="storms" label="Storms" />
            <QuickToggle layerId="co2" label="CO₂" />
            <QuickToggle layerId="temperature" label="Temp" />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Satellite className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-100">NASA API Configuration</h2>
                <p className="text-xs text-gray-500">Configure your NASA Earthdata API key</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">API Key (optional)</label>
                <input
                  type="password"
                  placeholder="Enter your NASA API key..."
                  value={tempKey || apiKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <p className="text-xs text-gray-400 leading-relaxed">
                  <strong className="text-gray-300">Note:</strong> The application works without an API key using 
                  NASA's public EONET events API and USGS earthquake data. Adding a NASA Earthdata key enables 
                  additional GIBS satellite imagery layers and higher-resolution data access.
                </p>
                <a
                  href="https://urs.earthdata.nasa.gov/users/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 text-xs hover:underline mt-2 inline-block"
                >
                  → Register for a free NASA Earthdata account
                </a>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (tempKey) setApiKey(tempKey);
                    setShowApiKeyModal(false);
                  }}
                  className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-500 transition-colors"
                >
                  {apiKey ? 'Update Key' : 'Save & Continue'}
                </button>
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickToggle({ layerId, label }: { layerId: string; label: string }) {
  const { layers, toggleLayer } = useStore();
  const layer = layers.find(l => l.id === layerId);
  if (!layer) return null;
  
  return (
    <button
      onClick={() => toggleLayer(layerId)}
      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
        layer.enabled
          ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
          : 'bg-gray-800/80 border-gray-700/50 text-gray-500 hover:text-gray-300 hover:border-gray-600'
      }`}
    >
      {label}
    </button>
  );
}
