import { useState } from 'react';
import { useStore, type ThemeMode } from '../store/useStore';
import { LozengeRow } from './LayerLozenges';
import { AI_PROVIDERS } from '../lib/aiProviders';
import {
  Mountain, Flame, Activity, CloudLightning, Waves, TreePine,
  Snowflake, FlaskConical, Settings, CloudSun, X,
  MapPin, Globe2, Layers, Search, Satellite,
  Thermometer, Wind, Droplets, Cloud, Sun, Leaf, Lightbulb, Anchor,
  CloudRain, CloudFog, TrendingUp, MountainSnow, Droplet,
  LocateFixed, Moon, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

const iconStroke = 1.75;

const iconMap: Record<string, typeof Cloud> = {
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
  'cloud-rain': CloudRain,
  'trending-up': TrendingUp,
  droplet: Droplet,
  'mountain-snow': MountainSnow,
  smoke: CloudFog,
};

function DockContent({ dockId }: { dockId: string }) {
  const { layers, events, selectedEvent, selectEvent } = useStore();
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
    if (dockId === 'simulation') return layers.filter((l) => l.type === 'simulation');
    if (dockId === 'pollution' || dockId === 'weather') {
      return layers.filter((l) => l.category === 'pollution' || l.category === 'weather');
    }

    if (categoryFilter[dockId]) {
      return layers.filter((l) => categoryFilter[dockId].includes(l.id));
    }

    const category = categoryMap[dockId];
    if (category) return layers.filter((l) => l.category === category);
    return layers;
  };

  const filteredLayers = getFilteredLayers().filter((l) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const eventCategoryMap: Record<string, string> = {
    volcanoes: 'volcanoes',
    earthquakes: 'earthquakes',
    storms: 'severeStorms',
    wildfires: 'wildfires',
  };
  const dockEvents = eventCategoryMap[dockId]
    ? events.filter((e) => e.category === eventCategoryMap[dockId]).slice(0, 10)
    : [];

  if (dockId === 'settings') {
    return <SettingsContent />;
  }

  return (
    <div>
      <div className="side-search">
        <Search size={14} strokeWidth={iconStroke} />
        <input
          type="search"
          placeholder="Search layers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search layers"
        />
      </div>

      {filteredLayers.length === 0 ? (
        <div className="side-empty" style={{ minHeight: 120 }}>
          <Layers size={28} strokeWidth={iconStroke} />
          <p>{dockId === 'simulation' ? 'No simulations are loaded yet.' : 'No layers match that search.'}</p>
        </div>
      ) : (
        <LozengeRow layers={filteredLayers} showDetail />
      )}

      {dockEvents.length > 0 && (
        <div>
          <div className="section-title">
            <Activity size={12} strokeWidth={iconStroke} />
            Active events ({dockEvents.length})
          </div>
          <div className="event-list">
            {dockEvents.map((event) => (
              <button
                type="button"
                key={event.id}
                className={`event-item${selectedEvent?.id === event.id ? ' is-on' : ''}`}
                onClick={() => selectEvent(event, { flyTo: true })}
              >
                <p className="event-title">{event.title}</p>
                <p className="event-meta">
                  {event.geometry[0]?.date && new Date(event.geometry[0].date).toLocaleDateString()}
                </p>
              </button>
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
    theme, setTheme,
    minimaxKey, setMinimaxKey,
    nvidiaKey, setNvidiaKey,
    aiProvider, setAiProvider,
    aiModel, setAiModel,
    setAgentOpen,
  } = useStore();

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error('Geolocation error:', err)
    );
  };

  const pickTheme = (next: ThemeMode) => setTheme(next);

  return (
    <div>
      <div className="settings-block">
        <h4>
          <Sun size={13} strokeWidth={iconStroke} />
          Appearance
        </h4>
        <div className="theme-pair">
          <button
            type="button"
            className={`theme-choice${theme === 'dark' ? ' is-on' : ''}`}
            onClick={() => pickTheme('dark')}
            aria-pressed={theme === 'dark'}
          >
            <Moon size={16} strokeWidth={iconStroke} />
            Dark
          </button>
          <button
            type="button"
            className={`theme-choice${theme === 'light' ? ' is-on' : ''}`}
            onClick={() => pickTheme('light')}
            aria-pressed={theme === 'light'}
          >
            <Sun size={16} strokeWidth={iconStroke} />
            Light
          </button>
        </div>
      </div>

      <div className="settings-block">
        <h4>Researcher providers</h4>
        <div className="provider-pick" style={{ marginBottom: 8 }}>
          {AI_PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`hud-chip${aiProvider === p.id ? ' is-on' : ''}`}
              onClick={() => setAiProvider(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {aiProvider === 'minimax' && (
          <input
            className="field-input"
            type="password"
            placeholder="sk-..."
            value={minimaxKey}
            onChange={(e) => setMinimaxKey(e.target.value)}
            autoComplete="off"
          />
        )}
        {aiProvider === 'nvidia' && (
          <input
            className="field-input"
            type="password"
            placeholder="nvapi-..."
            value={nvidiaKey}
            onChange={(e) => setNvidiaKey(e.target.value)}
            autoComplete="off"
          />
        )}
        <select
          className="field-input"
          style={{ marginTop: 8 }}
          value={AI_PROVIDERS.find((p) => p.id === aiProvider)?.models.includes(aiModel) ? aiModel : (AI_PROVIDERS.find((p) => p.id === aiProvider)?.models[0] || aiModel)}
          onChange={(e) => setAiModel(e.target.value)}
        >
          {(AI_PROVIDERS.find((p) => p.id === aiProvider)?.models || []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button type="button" className="ui-btn primary" style={{ marginTop: 8 }} onClick={() => setAgentOpen(true)}>
          Open agent
        </button>
        <p className="layer-desc">
          Keys from{' '}
          <a className="hint-link" href="https://platform.minimax.io" target="_blank" rel="noreferrer">minimax.io</a>
          {' '}or{' '}
          <a className="hint-link" href="https://build.nvidia.com" target="_blank" rel="noreferrer">NVIDIA</a>
        </p>
      </div>

      <div className="settings-block">
        <h4>
          <Satellite size={13} strokeWidth={iconStroke} />
          NASA API
        </h4>
        <input
          className="field-input"
          type="password"
          placeholder="Enter NASA API key..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="off"
        />
        <p className="layer-desc">
          Free key at{' '}
          <a className="hint-link" href="https://urs.earthdata.nasa.gov/users/new" target="_blank" rel="noreferrer">
            urs.earthdata.nasa.gov
          </a>
        </p>
      </div>

      <div className="settings-block">
        <h4>Display</h4>
        <ToggleOption label="Country labels" enabled={showLabels} onToggle={() => setShowLabels(!showLabels)} />
        <ToggleOption label="Grid lines" enabled={showGridLines} onToggle={() => setShowGridLines(!showGridLines)} />
        <ToggleOption label="Atmosphere" enabled={atmosphereEnabled} onToggle={() => setAtmosphereEnabled(!atmosphereEnabled)} />
      </div>

      <div className="settings-block">
        <h4>
          <MapPin size={13} strokeWidth={iconStroke} />
          Your location
        </h4>
        {userLocation ? (
          <div>
            <p className="event-title">Lat {userLocation.lat.toFixed(4)}°</p>
            <p className="event-meta">Lng {userLocation.lng.toFixed(4)}°</p>
            <button type="button" className="ui-btn danger" style={{ marginTop: 8 }} onClick={() => setUserLocation(null)}>
              Remove marker
            </button>
          </div>
        ) : (
          <button type="button" className="ui-btn primary" onClick={handleGeolocate}>
            <LocateFixed size={14} strokeWidth={iconStroke} />
            Detect my location
          </button>
        )}
      </div>

      <div className="settings-block">
        <h4>Data sources</h4>
        <div className="source-list">
          <span>OpenStreetMap (map, borders, names)</span>
          <span>NASA EONET</span>
          <span>NASA GIBS</span>
          <span>USGS Earthquake Hazards Program</span>
          <span>NOAA Global Monitoring Laboratory</span>
          <span>ESA Copernicus Atmosphere Service</span>
          <span>MODIS / VIIRS fire anomalies</span>
        </div>
      </div>
    </div>
  );
}

function ToggleOption({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="toggle-row">
      <span>{label}</span>
      <button
        type="button"
        className={`layer-switch${enabled ? ' is-on' : ''}`}
        onClick={onToggle}
        aria-pressed={enabled}
        aria-label={label}
      >
        <span className="knob" />
      </button>
    </div>
  );
}

export default function SidePanel() {
  const { docks, activeDock, setActiveDock } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const active = docks.find((d) => d.id === activeDock);
  const ActiveIcon = iconMap[active?.icon || ''] || Settings;

  const shellClass = [
    'side-shell',
    collapsed ? 'is-collapsed' : activeDock ? 'is-open' : 'is-idle',
  ].join(' ');

  return (
    <aside className={shellClass} aria-label="Layer controls">
      <nav className="side-rail custom-scrollbar" aria-label="Layer docks">
        {docks.map((dock) => {
          const Icon = iconMap[dock.icon] || Settings;
          const isActive = activeDock === dock.id;
          return (
            <button
              key={dock.id}
              type="button"
              className={`dock-btn${isActive ? ' is-active' : ''}`}
              onClick={() => setActiveDock(isActive ? null : dock.id)}
              aria-pressed={isActive}
              aria-label={dock.title}
            >
              <Icon size={16} strokeWidth={iconStroke} />
              <span className="dock-tip">{dock.title}</span>
            </button>
          );
        })}

        <div className="mt-auto" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            type="button"
            className="dock-btn"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={iconStroke} />
            ) : (
              <PanelLeftClose size={16} strokeWidth={iconStroke} />
            )}
            <span className="dock-tip">{collapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        </div>
      </nav>

      {!collapsed && activeDock && active && (
        <section className="side-body">
          <div className="side-header">
            <div className="side-kicker">
              <span className="side-kicker-icon">
                <ActiveIcon size={14} strokeWidth={iconStroke} />
              </span>
              <h3>{active.title}</h3>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setActiveDock(null)}
              aria-label="Close dock"
            >
              <X size={15} strokeWidth={iconStroke} />
            </button>
          </div>
          <div className="side-content custom-scrollbar">
            <DockContent dockId={activeDock} />
          </div>
        </section>
      )}

      {!collapsed && !activeDock && (
        <section className="side-body">
          <div className="side-empty">
            <Globe2 size={36} strokeWidth={iconStroke} />
            <p>Pick a dock on the left to open layers, filters, and live events.</p>
          </div>
        </section>
      )}
    </aside>
  );
}
