import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { useNasaEvents, useEarthquakeData } from '../hooks/useNasaData';

function EarthSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const { atmosphereEnabled, showGridLines } = useStore();
  const [textureLoaded, setTextureLoaded] = useState(false);

  const earthTexture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const texture = loader.load(
      'https://image.qwenlm.ai/generated-images/a05e5b55-45a9-4391-9544-7e6e0a05d4e3/_result.png', 
      () => setTextureLoaded(true),
      undefined,
      () => {
        setTextureLoaded(false);
      }
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  const fallbackTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
    gradient.addColorStop(0, '#1a3a5c');
    gradient.addColorStop(0.3, '#1e4d7a');
    gradient.addColorStop(0.5, '#1a5276');
    gradient.addColorStop(0.7, '#1e4d7a');
    gradient.addColorStop(1, '#1a3a5c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2048, 1024);
    
    ctx.fillStyle = '#2d5a27';
    drawContinent(ctx, [[380, 180], [420, 160], [480, 170], [520, 200], [540, 250], [520, 300], [500, 350], [460, 380], [420, 370], [380, 340], [350, 300], [340, 250], [360, 200]]);
    drawContinent(ctx, [[480, 420], [510, 430], [530, 480], [540, 550], [530, 620], [510, 680], [490, 720], [470, 700], [460, 650], [450, 580], [460, 500], [470, 440]]);
    drawContinent(ctx, [[920, 180], [960, 170], [1000, 180], [1020, 200], [1010, 230], [990, 250], [960, 260], [930, 250], [910, 230], [910, 200]]);
    drawContinent(ctx, [[920, 300], [960, 290], [1000, 310], [1030, 360], [1040, 420], [1030, 500], [1010, 560], [980, 600], [950, 580], [930, 530], [910, 460], [900, 380], [910, 330]]);
    drawContinent(ctx, [[1020, 150], [1100, 130], [1200, 140], [1300, 160], [1380, 180], [1420, 220], [1400, 280], [1350, 320], [1280, 340], [1200, 330], [1120, 310], [1060, 280], [1030, 240], [1020, 200]]);
    drawContinent(ctx, [[1350, 520], [1400, 510], [1450, 520], [1480, 550], [1470, 590], [1440, 620], [1400, 630], [1360, 610], [1340, 570], [1340, 540]]);
    
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 920, 2048, 104);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const activeTexture = textureLoaded ? earthTexture : fallbackTexture;

  const bumpTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 1024, 512);
    
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 512;
      const brightness = Math.floor(Math.random() * 60 + 100);
      ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
      ctx.fillRect(x, y, 3, 3);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <group>
      {/* Earth */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial
          map={activeTexture}
          bumpMap={bumpTexture}
          bumpScale={0.05}
          specular={new THREE.Color('#333333')}
          shininess={15}
        />
      </mesh>
      
      {/* Atmosphere glow */}
      {atmosphereEnabled && (
        <mesh ref={atmosphereRef} scale={[1.02, 1.02, 1.02]}>
          <sphereGeometry args={[2, 64, 64]} />
          <meshPhongMaterial
            color="#4488ff"
            transparent
            opacity={0.1}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      
      {/* Grid lines */}
      {showGridLines && <GridLines />}
    </group>
  );
}

function drawContinent(ctx: CanvasRenderingContext2D, points: number[][]) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fill();
  
  // Add some variation
  ctx.strokeStyle = '#1a4a1a';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function GridLines() {
  const latLines = useMemo(() => {
    const lines: [number, number, number][][] = [];
    for (let lat = -80; lat <= 80; lat += 20) {
      const phi = (90 - lat) * (Math.PI / 180);
      const points: [number, number, number][] = [];
      for (let lng = 0; lng <= 360; lng += 5) {
        const theta = lng * (Math.PI / 180);
        const r = 2.01;
        points.push([
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        ]);
      }
      lines.push(points);
    }
    return lines;
  }, []);

  const lngLines = useMemo(() => {
    const lines: [number, number, number][][] = [];
    for (let lng = 0; lng < 360; lng += 30) {
      const theta = lng * (Math.PI / 180);
      const points: [number, number, number][] = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        const phi = (90 - lat) * (Math.PI / 180);
        const r = 2.01;
        points.push([
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        ]);
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

function EventMarkers() {
  const { events, layers, selectedEvent, setSelectedEvent } = useStore();
  const markersRef = useRef<THREE.Group>(null);
  
  const activeEventLayers = layers.filter(l => l.enabled && l.type === 'events');
  
  const visibleEvents = useMemo(() => {
    const categoryMap: Record<string, string> = {
      volcanoes: 'volcanoes',
      wildfires: 'wildfires',
      earthquakes: 'earthquakes',
      storms: 'severeStorms',
      floods: 'floods',
      icebergs: 'icebergs',
    };
    
    const enabledCategories = activeEventLayers.map(l => categoryMap[l.id]).filter(Boolean);
    return events.filter(e => enabledCategories.includes(e.category));
  }, [events, activeEventLayers]);

  return (
    <group ref={markersRef}>
      {visibleEvents.slice(0, 100).map((event) => {
        if (!event.geometry || event.geometry.length === 0) return null;
        const coords = event.geometry[0].coordinates;
        if (!coords || coords.length < 2) return null;
        
        const [lng, lat] = coords;
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lng + 180) * (Math.PI / 180);
        const r = 2.05;
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);
        
        const layer = activeEventLayers.find(l => {
          const categoryMap: Record<string, string> = {
            volcanoes: 'volcanoes',
            wildfires: 'wildfires',
            earthquakes: 'earthquakes',
            storms: 'severeStorms',
            floods: 'floods',
            icebergs: 'icebergs',
          };
          return categoryMap[l.id] === event.category;
        });
        
        const color = layer?.color || '#ff0000';
        const isSelected = selectedEvent?.id === event.id;
        
        return (
          <group key={event.id} position={[x, y, z]}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvent(isSelected ? null : event);
              }}
            >
              <sphereGeometry args={[isSelected ? 0.06 : 0.03, 8, 8]} />
              <meshBasicMaterial color={color} />
            </mesh>
            {/* Pulse ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.04, 0.06, 16]} />
              <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
            {isSelected && (
              <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
                <div className="bg-gray-900/95 text-white p-3 rounded-lg shadow-xl border border-gray-700 max-w-[250px] backdrop-blur-sm">
                  <h3 className="font-bold text-sm text-blue-300">{event.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{event.category}</p>
                  {event.geometry[0]?.date && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(event.geometry[0].date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

function PollutionOverlay() {
  const { layers } = useStore();
  const activePollutionLayers = layers.filter(l => l.enabled && l.type === 'overlay' && l.category === 'pollution');
  
  if (activePollutionLayers.length === 0) return null;
  
  return (
    <group>
      {activePollutionLayers.map((layer) => (
        <mesh key={layer.id} scale={[1.001 + activePollutionLayers.indexOf(layer) * 0.001, 1.001 + activePollutionLayers.indexOf(layer) * 0.001, 1.001 + activePollutionLayers.indexOf(layer) * 0.001]}>
          <sphereGeometry args={[2, 32, 32]} />
          <meshBasicMaterial
            color={layer.color}
            transparent
            opacity={layer.opacity * 0.15}
            side={THREE.FrontSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function WeatherOverlay() {
  const { layers } = useStore();
  const activeWeatherLayers = layers.filter(l => l.enabled && l.category === 'weather' && l.type !== 'overlay');
  
  if (activeWeatherLayers.length === 0) return null;
  
  return (
    <group>
      {activeWeatherLayers.map((layer, i) => (
        <mesh key={layer.id} scale={[1.002 + i * 0.001, 1.002 + i * 0.001, 1.002 + i * 0.001]}>
          <sphereGeometry args={[2, 32, 32]} />
          <meshBasicMaterial
            color={layer.color}
            transparent
            opacity={layer.opacity * 0.12}
            side={THREE.FrontSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function UserLocationMarker() {
  const { userLocation } = useStore();
  if (!userLocation) return null;
  
  const { lat, lng } = userLocation;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const r = 2.06;
  
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.cos(phi);
  const z = r * Math.sin(phi) * Math.sin(theta);
  
  return (
    <group position={[x, y, z]}>
      <mesh>
        <coneGeometry args={[0.03, 0.08, 8]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>
      <Html distanceFactor={6} style={{ pointerEvents: 'none' }}>
        <div className="bg-green-900/90 text-green-200 px-2 py-1 rounded text-xs whitespace-nowrap">
          📍 Your Location
        </div>
      </Html>
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <directionalLight position={[-5, -3, -5]} intensity={0.3} />
      <pointLight position={[10, 0, 0]} intensity={0.5} color="#ffffff" />
      
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} />
      
      <EarthSphere />
      <EventMarkers />
      <PollutionOverlay />
      <WeatherOverlay />
      <UserLocationMarker />
      
      <OrbitControls
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
  const { setEvents } = useStore();
  const { getEventsByCategory } = useNasaEvents();
  const { fetchEarthquakes } = useEarthquakeData();

  useEffect(() => {
    const loadAllData = async () => {
      const quakes = await fetchEarthquakes();
      if (quakes.length > 0) {
        const currentEvents = useStore.getState().events;
        setEvents([...currentEvents, ...quakes]);
      }
    };
    loadAllData();
  }, []);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
