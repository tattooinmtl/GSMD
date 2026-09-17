import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OSM_RADIUS, createSphereTileGeometry, sameTiles, tileKey, visibleTiles, type TileId } from '../tileGrid';

const textureCache = new Map<string, THREE.Texture>();
const inflight = new Map<string, Promise<THREE.Texture | null>>();

export function loadMapTexture(url: string, cacheKey: string): Promise<THREE.Texture | null> {
  const hit = textureCache.get(cacheKey);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(cacheKey);
  if (pending) return pending;
  const job = new Promise<THREE.Texture | null>((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.needsUpdate = true;
      textureCache.set(cacheKey, tex);
      inflight.delete(cacheKey);
      resolve(tex);
    }, undefined, () => { inflight.delete(cacheKey); resolve(null); });
  });
  inflight.set(cacheKey, job);
  return job;
}

function OsmTileMesh({ tile }: { tile: TileId }) {
  const [map, setMap] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let live = true;
    const key = `osm:${tileKey(tile)}`;
    loadMapTexture(`/api/osm/${tile.z}/${tile.x}/${tile.y}.png`, key).then((tex) => { if (live) setMap(tex); });
    return () => { live = false; };
  }, [tile.z, tile.x, tile.y]);
  const geometry = useMemo(() => createSphereTileGeometry(tile, OSM_RADIUS), [tile.z, tile.x, tile.y]);
  if (!map) return null;
  return (<mesh geometry={geometry}><meshBasicMaterial map={map} toneMapped={false} /></mesh>);
}

export default function OsmTiles() {
  const { camera } = useThree();
  const [tiles, setTiles] = useState<TileId[]>([]);
  const last = useRef('');
  useFrame(() => {
    const next = visibleTiles(camera);
    const key = next.map(tileKey).join('|');
    if (key === last.current) return;
    last.current = key;
    setTiles((prev) => (sameTiles(prev, next) ? prev : next));
  });
  return (<group>{tiles.map((t) => (<OsmTileMesh key={tileKey(t)} tile={t} />))}</group>);
}

export function useVisibleTiles(maxZoom?: number): TileId[] {
  const { camera } = useThree();
  const [tiles, setTiles] = useState<TileId[]>([]);
  const last = useRef('');
  useFrame(() => {
    const next = visibleTiles(camera, maxZoom);
    const key = next.map(tileKey).join('|');
    if (key === last.current) return;
    last.current = key;
    setTiles((prev) => (sameTiles(prev, next) ? prev : next));
  });
  return tiles;
}
