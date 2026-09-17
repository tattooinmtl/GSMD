import * as THREE from 'three';
import {
  cartesianToLatLng,
  latLngToCartesian,
  latLngToTile,
  tileBounds,
  zoomFromDistance,
} from './geo';

export const OSM_RADIUS = 2.003;
export const TILE_SEG = 10;
export const TILE_SPAN = 3;

export type TileId = { z: number; x: number; y: number };

export function tileKey(t: TileId) { return `${t.z}/${t.x}/${t.y}`; }

function wrapX(x: number, n: number) { return ((x % n) + n) % n; }

export function visibleTiles(camera: THREE.Camera, maxZoom = 6): TileId[] {
  const z = Math.min(maxZoom, zoomFromDistance(camera.position.length()));
  const n = 2 ** z;
  const look = cartesianToLatLng(camera.position.x, camera.position.y, camera.position.z);
  const center = latLngToTile(look.lat, look.lng, z);
  const span = z <= 3 ? 2 : TILE_SPAN;
  const out: TileId[] = [];
  const seen = new Set<string>();
  for (let dy = -span; dy <= span; dy++) {
    const y = center.y + dy;
    if (y < 0 || y >= n) continue;
    for (let dx = -span; dx <= span; dx++) {
      const x = wrapX(center.x + dx, n);
      const id = { z, x, y };
      const k = tileKey(id);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(id);
    }
  }
  out.sort((a, b) => tileKey(a).localeCompare(tileKey(b)));
  return out;
}

export function sameTiles(a: TileId[], b: TileId[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].z !== b[i].z || a[i].x !== b[i].x || a[i].y !== b[i].y) return false;
  }
  return true;
}

export function createSphereTileGeometry(tile: TileId, radius: number): THREE.BufferGeometry {
  const { west, east, north, south } = tileBounds(tile.z, tile.x, tile.y);
  const geo = new THREE.BufferGeometry();
  const verts: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= TILE_SEG; j++) {
    const tv = j / TILE_SEG;
    const lat = north + (south - north) * tv;
    for (let i = 0; i <= TILE_SEG; i++) {
      const tu = i / TILE_SEG;
      const lng = west + (east - west) * tu;
      const [px, py, pz] = latLngToCartesian(lat, lng, radius);
      verts.push(px, py, pz);
      uvs.push(tu, 1 - tv);
    }
  }
  const cols = TILE_SEG + 1;
  for (let j = 0; j < TILE_SEG; j++) {
    for (let i = 0; i < TILE_SEG; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export function imageryDate(timeSlider: number, period: 'daily' | 'monthly' | 'static' = 'daily'): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - Math.max(0, 7 - timeSlider));
  if (period === 'monthly' || period === 'static') { d.setUTCDate(1); }
  return d.toISOString().slice(0, 10);
}
