import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { GIBS_BY_LAYER } from '../gibs';
import { createSphereTileGeometry, imageryDate, tileKey, type TileId } from '../tileGrid';
import { loadMapTexture, useVisibleTiles } from './OsmTiles';

function GibsTileMesh({ tile, layerId, date, specId, ext, maxZoom, opacity, radius }: {
  tile: TileId; layerId: string; date: string; specId: string; ext: string; maxZoom: number; opacity: number; radius: number;
}) {
  const z = Math.min(tile.z, maxZoom);
  const scale = 2 ** (tile.z - z);
  const x = Math.floor(tile.x / scale);
  const y = Math.floor(tile.y / scale);
  const [map, setMap] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let live = true;
    const url = `/api/gibs/${encodeURIComponent(specId)}/${date}/${maxZoom}/${z}/${x}/${y}.${ext}`;
    const key = `gibs:${specId}:${date}:${maxZoom}:${z}/${x}/${y}`;
    loadMapTexture(url, key).then((tex) => { if (live) setMap(tex); });
    return () => { live = false; };
  }, [specId, date, z, x, y, ext]);
  const geometry = useMemo(() => createSphereTileGeometry({ z: tile.z, x: tile.x, y: tile.y }, radius), [tile.z, tile.x, tile.y, radius]);
  if (!map) return null;
  return (<mesh geometry={geometry} renderOrder={10}><meshBasicMaterial map={map} transparent opacity={opacity} depthWrite={false} toneMapped={false} /></mesh>);
}

function GibsLayer({ layerId, radius, tiles }: { layerId: string; radius: number; tiles: TileId[] }) {
  const layer = useStore((s) => s.layers.find((l) => l.id === layerId));
  const timeSlider = useStore((s) => s.timeSlider);
  const spec = GIBS_BY_LAYER[layerId];
  if (!layer?.enabled || !spec) return null;
  const date = imageryDate(timeSlider, spec.period);
  return (<group>{tiles.map((t) => (<GibsTileMesh key={`${layerId}:${tileKey(t)}`} tile={t} layerId={layerId} date={date} specId={spec.id} ext={spec.ext} maxZoom={spec.maxZoom} opacity={layer.opacity} radius={radius} />))}</group>);
}

export default function GibsOverlay() {
  const tiles = useVisibleTiles(6);
  const layers = useStore((s) => s.layers);
  const overlayIds = layers.filter((l) => l.enabled && GIBS_BY_LAYER[l.id]).map((l) => l.id);
  if (overlayIds.length === 0) return null;
  return (<group>{overlayIds.map((id, i) => (<GibsLayer key={id} layerId={id} radius={2.01 + i * 0.004} tiles={tiles} />))}</group>);
}
