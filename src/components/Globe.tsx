import { useMemo, useState, useEffect, useRef, type CSSProperties } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import {
  X, Mountain, Flame, Activity, CloudLightning, Waves, Snowflake,
  type LucideIcon,
} from 'lucide-react';
import { useStore, type EventData } from '../store/useStore';
import { extractLonLat, latLngToCartesian } from '../geo';
import { countryBorderSegments, loadCountries, type CountryFeature } from '../countries';
import OsmTiles from './OsmTiles';
import GibsOverlay from './GibsOverlay';
import { zoomFromDistance } from '../geo';

const CATEGORY_BY_LAYER: Record<string, string> = {
  volcanoes: 'volcanoes',
  wildfires: 'wildfires',
  earthquakes: 'earthquakes',
  storms: 'severeStorms',
  floods: 'floods',
  icebergs: 'icebergs',
};

const CATEGORY_LABEL: Record<string, string> = {
  volcanoes: 'Volcano',
  wildfires: 'Wildfire',
  earthquakes: 'Earthquake',
  severeStorms: 'Storm',
  floods: 'Flood',
  icebergs: 'Iceberg',
  drought: 'Drought',
  landSlides: 'Landslide',
};

const CATEGORY_ICON: Record<string, LucideIcon> = {
  volcanoes: Mountain,
  wildfires: Flame,
  earthquakes: Activity,
  severeStorms: CloudLightning,
  floods: Waves,
  icebergs: Snowflake,
};

function formatLat(lat: number) {
  return `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
}

function formatLng(lng: number) {
  return `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;
}

function formatEventDate(iso?: string) {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isFacingCamera(pos: [number, number, number], camera: THREE.Camera, minDot = 0.16) {
  const clen = camera.position.length() || 1;
  const plen = Math.hypot(pos[0], pos[1], pos[2]) || 1;
  return (pos[0] * camera.position.x + pos[1] * camera.position.y + pos[2] * camera.position.z) / (plen * clen) > minDot;
}

function EarthSphere() {
  const { atmosphereEnabled, showGridLines } = useStore();

  return (
    <group>
      <mesh>
        <sphereGeometry args={[2, 96, 64]} />
        <meshBasicMaterial color="#aad3df" />
      </mesh>
      <OsmTiles />
      <GibsOverlay />

      {atmosphereEnabled && (
        <mesh scale={[1.02, 1.02, 1.02]}>
          <sphereGeometry args={[2, 64, 64]} />
          <meshPhongMaterial
            color="#4488ff"
            transparent
            opacity={0.08}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {showGridLines && <GridLines />}
    </group>
  );
}

function GridLines() {
  const latLines = useMemo(() => {
    const lines: [number, number, number][][] = [];
    for (let lat = -80; lat <= 80; lat += 20) {
      const points: [number, number, number][] = [];
      for (let lng = -180; lng <= 180; lng += 5) {
        points.push(latLngToCartesian(lat, lng, 2.01));
      }
      lines.push(points);
    }
    return lines;
  }, []);

  const lngLines = useMemo(() => {
    const lines: [number, number, number][][] = [];
    for (let lng = -180; lng < 180; lng += 30) {
      const points: [number, number, number][] = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        points.push(latLngToCartesian(lat, lng, 2.01));
      }
      lines.push(points);
    }
    return lines;
  }, []);

  return (
    <group>
      {latLines.map((points, i) => (
        <Line key={`lat-${i}`} points={points} color="#44aaff" transparent opacity={0.2} lineWidth={0.5} />
      ))}
      {lngLines.map((points, i) => (
        <Line key={`lng-${i}`} points={points} color="#44aaff" transparent opacity={0.2} lineWidth={0.5} />
      ))}
    </group>
  );
}

function EventIconMarker({
  event,
  lat,
  lng,
  color,
  selected,
  onSelect,
}: {
  event: EventData;
  lat: number;
  lng: number;
  color: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const pos = useMemo(() => latLngToCartesian(lat, lng, 2.03), [lat, lng]);
  const { camera } = useThree();
  const [front, setFront] = useState(true);
  const last = useRef(true);

  useFrame(() => {
    const facing = isFacingCamera(pos, camera, 0.05);
    if (facing !== last.current) {
      last.current = facing;
      setFront(facing);
    }
  });

  if (!front) return null;
  const Icon = CATEGORY_ICON[event.category] || Activity;

  return (
    <Html position={pos} center sprite zIndexRange={[30, 0]} wrapperClass="globe-marker-html">
      <button
        type="button"
        className={`globe-marker${selected ? ' is-on' : ''}`}
        style={{ '--marker-color': color } as CSSProperties}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        aria-label={event.title}
      >
        <Icon size={11} strokeWidth={2.4} />
      </button>
    </Html>
  );
}

function EventContextCard({
  event,
  lat,
  lng,
  color,
}: {
  event: EventData;
  lat: number;
  lng: number;
  color: string;
}) {
  const pos = useMemo(() => latLngToCartesian(lat, lng, 2.08), [lat, lng]);
  const { camera } = useThree();
  const [front, setFront] = useState(true);
  const last = useRef(true);
  const setSelectedEvent = useStore((s) => s.setSelectedEvent);
  const kind = CATEGORY_LABEL[event.category] || event.category;
  const mag = event.magnitude;

  useFrame(() => {
    const facing = isFacingCamera(pos, camera);
    if (facing !== last.current) {
      last.current = facing;
      setFront(facing);
    }
  });

  if (!front) return null;

  return (
    <Html position={pos} zIndexRange={[40, 0]} wrapperClass="globe-html">
      <div className="globe-html-anchor">
        <div
          className="globe-context"
          style={{ '--event-color': color } as CSSProperties}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="globe-context-accent" />
          <div className="globe-context-head">
            <span className="globe-context-kind">{kind}</span>
            <button
              type="button"
              className="globe-context-close"
              aria-label="Close event"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvent(null);
              }}
            >
              <X size={11} strokeWidth={2.4} />
            </button>
          </div>
          {typeof mag === 'number' && (
            <div className="globe-context-mag">M {mag.toFixed(1)}</div>
          )}
          <p className="globe-context-title">{event.title}</p>
          <dl className="globe-context-body">
            <div className="globe-context-row">
              <dt>Lat</dt>
              <dd>{formatLat(lat)}</dd>
            </div>
            <div className="globe-context-row">
              <dt>Lng</dt>
              <dd>{formatLng(lng)}</dd>
            </div>
            <div className="globe-context-row">
              <dt>Date</dt>
              <dd>{formatEventDate(event.geometry[0]?.date)}</dd>
            </div>
          </dl>
        </div>
        <div className="globe-context-caret" />
      </div>
    </Html>
  );
}

const PER_CATEGORY_CAP = 60;

function EventMarkers() {
  const { events, layers, selectedEvent, setSelectedEvent } = useStore();
  const activeEventLayers = layers.filter((l) => l.enabled && l.type === 'events');

  const visibleEvents = useMemo(() => {
    const enabledCategories = activeEventLayers
      .map((l) => CATEGORY_BY_LAYER[l.id])
      .filter(Boolean);
    const enabledSet = new Set(enabledCategories);
    const counts = new Map<string, number>();
    const out: EventData[] = [];
    for (const e of events) {
      if (!enabledSet.has(e.category)) continue;
      const c = counts.get(e.category) || 0;
      if (c >= PER_CATEGORY_CAP) continue;
      counts.set(e.category, c + 1);
      out.push(e);
    }
    return out;
  }, [events, activeEventLayers]);

  const selectedPair = selectedEvent?.geometry?.[0]
    ? extractLonLat(selectedEvent.geometry[0].coordinates)
    : null;
  const selectedLayer = selectedEvent
    ? activeEventLayers.find((l) => CATEGORY_BY_LAYER[l.id] === selectedEvent.category)
    : null;
  const selectedVisible =
    selectedEvent && visibleEvents.some((e) => e.id === selectedEvent.id);

  return (
    <group>
      {visibleEvents.map((event) => {
        const pair = event.geometry?.[0] ? extractLonLat(event.geometry[0].coordinates) : null;
        if (!pair) return null;
        const [lng, lat] = pair;
        const layer = activeEventLayers.find((l) => CATEGORY_BY_LAYER[l.id] === event.category);
        const color = layer?.color || '#ff0000';
        const isSelected = selectedEvent?.id === event.id;

        return (
          <EventIconMarker
            key={event.id}
            event={event}
            lat={lat}
            lng={lng}
            color={color}
            selected={isSelected}
            onSelect={() => setSelectedEvent(isSelected ? null : event)}
          />
        );
      })}
      {selectedVisible && selectedEvent && selectedPair && (
        <EventContextCard
          event={selectedEvent}
          lat={selectedPair[1]}
          lng={selectedPair[0]}
          color={selectedLayer?.color || '#ff0000'}
        />
      )}
    </group>
  );
}

function UserLocationMarker() {
  const { userLocation } = useStore();
  if (!userLocation) return null;

  const pos = latLngToCartesian(userLocation.lat, userLocation.lng, 2.06);
  return (
    <group position={pos} onUpdate={(g) => g.lookAt(0, 0, 0)}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.03, 0.08, 8]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>
      <Html zIndexRange={[30, 0]} wrapperClass="globe-html">
        <div className="globe-html-anchor">
          <div className="globe-pin">Your location</div>
        </div>
      </Html>
    </group>
  );
}

function CaptureBridge() {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    const onCapture = (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      gl.render(scene, camera);
      detail.resolve(gl.domElement.toDataURL('image/png'));
    };

    const onRecord = (ev: Event) => {
      const { seconds = 4, resolve } = (ev as CustomEvent).detail;
      const canvas = gl.domElement as HTMLCanvasElement;
      let stream: MediaStream;
      try {
        stream = canvas.captureStream(30);
      } catch {
        resolve(null);
        return;
      }
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        gl.render(scene, camera);
        resolve({
          poster: canvas.toDataURL('image/png'),
          blob: new Blob(chunks, { type: 'video/webm' }),
        });
      };
      rec.start();
      window.setTimeout(() => rec.stop(), seconds * 1000);
    };

    window.addEventListener('earth-capture', onCapture);
    window.addEventListener('earth-record', onRecord);
    return () => {
      window.removeEventListener('earth-capture', onCapture);
      window.removeEventListener('earth-record', onRecord);
    };
  }, [gl, scene, camera]);

  return null;
}

function CountryBorders() {
  const [segs, setSegs] = useState<[number, number, number][][]>([]);

  useEffect(() => {
    let live = true;
    loadCountries().then((countries) => {
      if (live) setSegs(countryBorderSegments(countries, 2.012));
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <group>
      {segs.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color="#1f2937"
          lineWidth={1.1}
          transparent
          opacity={0.9}
        />
      ))}
    </group>
  );
}

function CountryLabel({ country }: { country: CountryFeature }) {
  const pos = useMemo(
    () => latLngToCartesian(country.label.lat, country.label.lng, 2.055),
    [country]
  );
  const { camera } = useThree();
  const [front, setFront] = useState(true);
  const last = useRef(true);

  useFrame(() => {
    const facing =
      (pos[0] * camera.position.x + pos[1] * camera.position.y + pos[2] * camera.position.z) /
        (Math.hypot(pos[0], pos[1], pos[2]) * camera.position.length() || 1) >
      0.28;
    if (facing !== last.current) {
      last.current = facing;
      setFront(facing);
    }
  });

  if (!front) return null;

  return (
    <Html position={pos} center sprite style={{ pointerEvents: 'none' }}>
      <div className="country-label">{country.name}</div>
    </Html>
  );
}

function CountryLabels() {
  const showLabels = useStore((s) => s.showLabels);
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const { camera } = useThree();
  const [zoom, setZoom] = useState(3);

  useEffect(() => {
    loadCountries().then(setCountries);
  }, []);

  useFrame(() => {
    const next = zoomFromDistance(camera.position.length());
    if (next !== zoom) setZoom(next);
  });

  if (!showLabels || countries.length === 0) return null;
  if (zoom >= 5) return null;

  const visible = [...countries].sort((a, b) => b.area - a.area).slice(0, 42);

  return (
    <group>
      {visible.map((c) => (
        <CountryLabel key={c.name} country={c} />
      ))}
    </group>
  );
}

function EarthGroup() {
  return (
    <group>
      <EarthSphere />
      <CountryBorders />
      <CountryLabels />
      <EventMarkers />
      <UserLocationMarker />
    </group>
  );
}

function FlyToCamera({
  controlsRef,
}: {
  controlsRef: { current: { enabled: boolean; target: THREE.Vector3; update: () => void } | null };
}) {
  const focusTarget = useStore((s) => s.focusTarget);
  const { camera } = useThree();
  const anim = useRef<{ from: THREE.Vector3; to: THREE.Vector3; t: number } | null>(null);
  const lastToken = useRef(0);

  useEffect(() => {
    if (!focusTarget || focusTarget.token === lastToken.current) return;
    lastToken.current = focusTarget.token;
    const current = camera.position.length();
    const dist = current > 6.2 ? 4.4 : Math.min(Math.max(current, 3.2), 5.8);
    const to = new THREE.Vector3(...latLngToCartesian(focusTarget.lat, focusTarget.lng, dist));
    anim.current = { from: camera.position.clone(), to, t: 0 };
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, [focusTarget, camera, controlsRef]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!a) return;
    a.t = Math.min(1, a.t + dt / 0.8);
    const k = 1 - (1 - a.t) ** 3;
    camera.position.lerpVectors(a.from, a.to, k);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
    if (a.t >= 1) {
      anim.current = null;
      if (controls) controls.enabled = true;
    }
  });

  return null;
}

function Scene() {
  const controlsRef = useRef<{ enabled: boolean; target: THREE.Vector3; update: () => void } | null>(null);
  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight position={[5, 3, 5]} intensity={0.2} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} />
      <EarthGroup />
      <CaptureBridge />
      <FlyToCamera controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef as never}
        enablePan={false}
        minDistance={2.5}
        maxDistance={10}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
      />
    </>
  );
}

export default function Globe() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0.35, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
