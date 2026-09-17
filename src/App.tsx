import { useState, useEffect, type CSSProperties } from 'react';
import Globe from './components/Globe';
import SidePanel from './components/SidePanel';
import AgentPanel from './components/AgentPanel';
import LiveStationsPanel from './components/LiveStationsPanel';
import { LozengeRow } from './components/LayerLozenges';
import { applyDocumentTheme, useStore } from './store/useStore';
import { useNasaEvents } from './hooks/useNasaData';
import { AI_PROVIDERS, providerMeta, type AiProvider } from './lib/aiProviders';
import {
  Satellite, AlertTriangle, Flame, Mountain, CloudLightning,
  Activity, Layers, Info, ChevronDown, ChevronUp, Moon, Sun, Bot, Radio,
  Play, Pause
} from 'lucide-react';

function StatusBar() {
  const { events, layers } = useStore();
  const activeLayers = layers.filter(l => l.enabled);
  const activeVolcanoes = events.filter(e => e.category === 'volcanoes');
  const activeFires = events.filter(e => e.category === 'wildfires');
  const activeQuakes = events.filter(e => e.category === 'earthquakes');
  const activeStorms = events.filter(e => e.category === 'severeStorms');

  return (
    <div className="app-status flex items-center gap-4">
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
      <div className="ml-auto" style={{ color: 'var(--text-faint)' }}>
        OSM · NASA GIBS · EONET · USGS
      </div>
    </div>
  );
}

function EventAlerts() {
  const { events, layers } = useStore();
  const [expanded, setExpanded] = useState(true);
  
  const activeEventLayers = layers.filter(l => l.enabled && l.type === 'events');
  const recentEvents = events.slice(0, 5);

  if (recentEvents.length === 0 || activeEventLayers.length === 0) return null;

  return (
    <div className="absolute top-16 left-4 z-30 max-w-xs">
      <div className="hud-card overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-3 py-2"
          style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#e6b84d' }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Live Alerts</span>
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
                  className="px-3 py-2 cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    useStore.getState().selectEvent(event, { flyTo: true });
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${colorClass}`}>
                      {event.category.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: 'var(--text)' }}>{event.title}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
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

function TimeControl() {
  const { timeSlider, setTimeSlider } = useStore();
  const [playing, setPlaying] = useState(false);
  const dates = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  const maxIdx = dates.length - 1;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const current = useStore.getState().timeSlider;
      const next = current >= maxIdx ? 0 : current + 1;
      useStore.getState().setTimeSlider(next);
    }, 900);
    return () => window.clearInterval(id);
  }, [playing, maxIdx]);

  return (
    <div className="absolute bottom-16 right-4 z-30">
      <div className="hud-card px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`icon-btn${playing ? ' is-on' : ''}`}
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause animation' : 'Play animation'}
            title={playing ? 'Pause' : 'Play'}
            style={{ width: 24, height: 24 }}
          >
            {playing ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>TIME</span>
          <input
            type="range"
            min="0"
            max={maxIdx}
            value={timeSlider}
            onChange={(e) => setTimeSlider(parseInt(e.target.value))}
            className="panel-slider w-32"
            style={{
              '--slider-fill': `${(timeSlider / Math.max(maxIdx, 1)) * 100}%`,
            } as CSSProperties}
          />
          <span className="text-[10px] w-20" style={{ color: 'var(--text)' }}>{dates[timeSlider]}</span>
        </div>
      </div>
    </div>
  );
}

function activeProviderKey(state: {
  aiProvider: AiProvider;
  minimaxKey: string;
  nvidiaKey: string;
}) {
  if (state.aiProvider === 'nvidia') return state.nvidiaKey;
  return state.minimaxKey;
}

export default function App() {
  const {
    apiKey, setApiKey, showApiKeyModal, setShowApiKeyModal, theme, setTheme,
    minimaxKey, setMinimaxKey, nvidiaKey, setNvidiaKey,
    aiProvider, setAiProvider, aiModel, setAiModel, agentOpen, setAgentOpen,
    stationsOpen, setStationsOpen,
  } = useStore();
  const [tempKey, setTempKey] = useState('');
  const [tempMinimax, setTempMinimax] = useState('');
  const [tempNvidia, setTempNvidia] = useState('');
  const [tempProvider, setTempProvider] = useState<AiProvider>(aiProvider);
  const { getEventsByCategory } = useNasaEvents();
  const hasAiKey = Boolean(activeProviderKey({ aiProvider, minimaxKey, nvidiaKey }));
  const providerLabel = providerMeta(aiProvider).label;

  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const next = event.data?.theme;
      if (next === 'light' || next === 'dark') setTheme(next);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [setTheme]);

  useEffect(() => {
    if (!showApiKeyModal) return;
    setTempMinimax(minimaxKey);
    setTempNvidia(nvidiaKey);
    setTempProvider(aiProvider);
    setTempKey(apiKey);
  }, [minimaxKey, nvidiaKey, aiProvider, apiKey, showApiKeyModal]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
            <Satellite className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight" style={{ color: 'var(--text)' }}>Earth Monitor</h1>
            <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>NASA Satellite Data Visualization</p>
          </div>
        </div>
        
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <div className={`w-2 h-2 rounded-full ${hasAiKey ? 'bg-green-500' : 'bg-yellow-500'}`} />
            {hasAiKey ? providerLabel : 'No AI key'}
          </div>
          <button
            type="button"
            className={`icon-btn${stationsOpen ? ' is-on' : ''}`}
            onClick={() => setStationsOpen(!stationsOpen)}
            aria-label="Toggle live stations monitoring"
            title="Live Stations Monitoring"
          >
            <Radio className="w-4 h-4" />
          </button>
          <button
            type="button"
            className={`icon-btn${agentOpen ? ' is-on' : ''}`}
            onClick={() => setAgentOpen(!agentOpen)}
            aria-label="Toggle researcher agent"
            title="Researcher Agent"
          >
            <Bot className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="ui-btn"
            style={{ padding: '4px 10px', fontSize: 11 }}
          >
            Providers
          </button>
          <div className="zoom-hint flex items-center gap-1 text-[10px] pl-3" style={{ color: 'var(--text-muted)', borderLeft: '1px solid var(--border)' }}>
            <Info className="w-3 h-3" />
            <span>Scroll to zoom · Drag to rotate</span>
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
          <TimeControl />
          
          <GlobeLayerBar />
        </div>
        <AgentPanel />
      </div>

      <LiveStationsPanel />

      {/* Status bar */}
      <StatusBar />

      {/* API Key Modal */}
      {showApiKeyModal && (
        <ProvidersModal
          tempKey={tempKey}
          setTempKey={setTempKey}
          tempMinimax={tempMinimax}
          setTempMinimax={setTempMinimax}
          tempNvidia={tempNvidia}
          setTempNvidia={setTempNvidia}
          tempProvider={tempProvider}
          setTempProvider={setTempProvider}
          apiKey={apiKey}
          aiModel={aiModel}
          setApiKey={setApiKey}
          setMinimaxKey={setMinimaxKey}
          setNvidiaKey={setNvidiaKey}
          setAiProvider={setAiProvider}
          setAiModel={setAiModel}
          onClose={() => setShowApiKeyModal(false)}
        />
      )}
    </div>
  );
}

function ProvidersModal({
  tempKey,
  setTempKey,
  tempMinimax,
  setTempMinimax,
  tempNvidia,
  setTempNvidia,
  tempProvider,
  setTempProvider,
  apiKey,
  aiModel,
  setApiKey,
  setMinimaxKey,
  setNvidiaKey,
  setAiProvider,
  setAiModel,
  onClose,
}: {
  tempKey: string;
  setTempKey: (v: string) => void;
  tempMinimax: string;
  setTempMinimax: (v: string) => void;
  tempNvidia: string;
  setTempNvidia: (v: string) => void;
  tempProvider: AiProvider;
  setTempProvider: (v: AiProvider) => void;
  apiKey: string;
  aiModel: string;
  setApiKey: (v: string) => void;
  setMinimaxKey: (v: string) => void;
  setNvidiaKey: (v: string) => void;
  setAiProvider: (v: AiProvider) => void;
  setAiModel: (v: string) => void;
  onClose: () => void;
}) {
  const meta = providerMeta(tempProvider);
  const keyValue = tempProvider === 'nvidia' ? tempNvidia : tempMinimax;
  const setKeyValue = tempProvider === 'nvidia' ? setTempNvidia : setTempMinimax;
  const modelValue = meta.models.includes(aiModel) ? aiModel : meta.models[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="hud-card p-6 max-w-md w-full mx-4 providers-modal">
        <div className="flex items-center gap-3 mb-4">
          <div className="side-kicker-icon" style={{ width: 40, height: 40, borderRadius: 12 }}>
            <Satellite className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Data and AI providers</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              MiniMax, NVIDIA, and optional NASA Earthdata
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Researcher provider</label>
            <div className="provider-pick">
              {AI_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`hud-chip${tempProvider === p.id ? ' is-on' : ''}`}
                  onClick={() => {
                    setTempProvider(p.id);
                    if (!p.models.includes(aiModel)) setAiModel(p.models[0]);
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>{meta.label} API key</label>
            <input
              type="password"
              placeholder={meta.keyPlaceholder}
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              className="field-input"
              autoComplete="off"
            />
            <p className="layer-desc">
              {meta.hint} Get a key at{' '}
              <a className="hint-link" href={meta.docsUrl} target="_blank" rel="noreferrer">{meta.docsLabel}</a>
            </p>
          </div>

          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>Model</label>
            <select
              className="field-input"
              value={modelValue}
              onChange={(e) => setAiModel(e.target.value)}
            >
              {meta.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-muted)' }}>NASA Earthdata (optional)</label>
            <input
              type="password"
              placeholder="Enter your NASA API key..."
              value={tempKey || apiKey}
              onChange={(e) => setTempKey(e.target.value)}
              className="field-input"
            />
          </div>

          <div className="settings-block" style={{ marginBottom: 0 }}>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Note:</strong> The globe runs on public NASA EONET and USGS feeds.
              The researcher uses the selected provider. NASA Earthdata is optional for GIBS.
            </p>
            <a
              href="https://urs.earthdata.nasa.gov/users/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 text-xs hover:underline mt-2 inline-block"
            >
              Register for a free NASA Earthdata account
            </a>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (tempKey) setApiKey(tempKey);
                setMinimaxKey(tempMinimax.trim());
                setNvidiaKey(tempNvidia.trim());
                setAiProvider(tempProvider);
                setAiModel(modelValue);
                onClose();
              }}
              className="ui-btn primary flex-1"
            >
              Save providers
            </button>
            <button onClick={onClose} className="ui-btn">
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobeLayerBar() {
  const layers = useStore((s) => s.layers);
  const overlayLayers = layers.filter(
    (l) => l.category === 'pollution' || l.category === 'weather'
  );
  return (
    <div className="globe-lozenge-bar">
      <LozengeRow layers={overlayLayers} />
    </div>
  );
}
