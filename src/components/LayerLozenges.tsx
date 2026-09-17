import { useState, type CSSProperties } from 'react';
import { Activity, Cloud, CloudLightning, CloudRain, Droplet, Droplets, Flame, Layers, Leaf, Lightbulb, Mountain, MountainSnow, Snowflake, Sun, Thermometer, TreePine, Waves, Wind, Anchor, TrendingUp } from 'lucide-react';
import { useStore, type LayerConfig } from '../store/useStore';

const iconStroke = 1.75;
const iconMap: Record<string, typeof Cloud> = {
  mountain: Mountain, flame: Flame, activity: Activity, 'cloud-lightning': CloudLightning, waves: Waves,
  'tree-pine': TreePine, snowflake: Snowflake, thermometer: Thermometer, wind: Wind, droplets: Droplets,
  cloud: Cloud, sun: Sun, leaf: Leaf, lightbulb: Lightbulb, anchor: Anchor, 'cloud-rain': CloudRain,
  'trending-up': TrendingUp, droplet: Droplet, 'mountain-snow': MountainSnow,
};

function OpacitySlider({ value, color, onChange }: { value: number; color: string; onChange: (next: number) => void }) {
  const pct = Math.round(value * 100);
  return (
    <div className="slider-row">
      <input type="range" min={0} max={100} value={pct} aria-label="Layer opacity"
        onChange={(e) => onChange(parseInt(e.target.value, 10) / 100)}
        className="panel-slider"
        style={{ '--slider-fill': `${pct}%`, '--slider-accent': color } as CSSProperties} />
      <span className="slider-value">{pct}%</span>
    </div>
  );
}

export function LayerLozenge({ layer, focused, onToggle }: { layer: LayerConfig; focused?: boolean; onToggle: (id: string) => void }) {
  const Icon = iconMap[layer.icon] || Layers;
  return (
    <button type="button" className={`lozenge${layer.enabled ? ' is-on' : ''}${focused ? ' is-focus' : ''}`}
      style={{ '--glyph': layer.color } as CSSProperties} onClick={() => onToggle(layer.id)} aria-pressed={layer.enabled} title={layer.name}>
      <Icon size={13} strokeWidth={iconStroke} /><span>{layer.shortLabel}</span>
    </button>
  );
}

export function LozengeRow({ layers, showDetail = false }: { layers: LayerConfig[]; showDetail?: boolean }) {
  const { toggleLayer, setLayerOpacity } = useStore();
  const [focusedId, setFocusedId] = useState<string | null>(layers.find((l) => l.enabled)?.id ?? layers[0]?.id ?? null);
  if (layers.length === 0) return null;
  const focused = layers.find((l) => l.id === focusedId) ?? layers.find((l) => l.enabled);
  const onToggle = (id: string) => { toggleLayer(id); setFocusedId(id); };
  return (
    <div className="lozenge-block">
      <div className="lozenge-row">
        {layers.map((layer) => (<LayerLozenge key={layer.id} layer={layer} focused={showDetail && focused?.id === layer.id} onToggle={onToggle} />))}
      </div>
      {showDetail && focused && (
        <div className="lozenge-detail">
          <p className="layer-name">{focused.name}</p>
          <p className="layer-desc">{focused.description}</p>
          {focused.enabled && (<OpacitySlider value={focused.opacity} color={focused.color} onChange={(next) => setLayerOpacity(focused.id, next)} />)}
        </div>
      )}
    </div>
  );
}
