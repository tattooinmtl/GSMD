import * as THREE from 'three';
import { lngLatToMercatorPixels } from './geo';

const NASA_MAPS = [
  '/earth-nasa.jpg',
  'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.jpg',
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function sealSeam(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const left = ctx.getImageData(0, 0, 3, h);
  ctx.putImageData(left, w - 3, 0);
}

function canvasToTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

async function loadTile(z: number, x: number, y: number): Promise<HTMLImageElement | null> {
  try { return await loadImage(`/api/osm/${z}/${x}/${y}.png`); } catch { return null; }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0;
  async function worker() { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

export async function loadOsmEarthTexture(zoom = 4): Promise<THREE.Texture> {
  const n = 2 ** zoom; const tileSize = 256; const world = n * tileSize;
  const merc = document.createElement('canvas'); merc.width = world; merc.height = world;
  const mctx = merc.getContext('2d')!; mctx.fillStyle = '#aad3df'; mctx.fillRect(0, 0, world, world);
  const jobs: { x: number; y: number }[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) jobs.push({ x, y });
  let painted = 0;
  await mapPool(jobs, 6, async ({ x, y }) => { const img = await loadTile(zoom, x, y); if (img) { mctx.drawImage(img, x * tileSize, y * tileSize, tileSize, tileSize); painted += 1; } });
  if (painted === 0) throw new Error('no OSM tiles');
  const eqW = world; const eqH = Math.floor(world / 2);
  const equirect = document.createElement('canvas'); equirect.width = eqW; equirect.height = eqH;
  const ectx = equirect.getContext('2d')!; ectx.fillStyle = '#aad3df'; ectx.fillRect(0, 0, eqW, eqH);
  const src = mctx.getImageData(0, 0, world, world);
  const dst = ectx.createImageData(eqW, eqH);
  for (let y = 0; y < eqH; y++) {
    const lat = 90 - (y / (eqH - 1)) * 180;
    const { y: my } = lngLatToMercatorPixels(0, lat, world);
    if (my < 0 || my >= world - 1) continue;
    const y0 = Math.floor(my); const y1 = Math.min(world - 1, y0 + 1); const fy = my - y0;
    for (let x = 0; x < eqW; x++) {
      const mx = (x / eqW) * world; const x0 = Math.floor(mx) % world; const x1 = (x0 + 1) % world; const fx = mx - Math.floor(mx);
      const i00 = (y0 * world + x0) * 4; const i10 = (y0 * world + x1) * 4; const i01 = (y1 * world + x0) * 4; const i11 = (y1 * world + x1) * 4;
      const o = (y * eqW + x) * 4;
      for (let c = 0; c < 3; c++) { const v0 = src.data[i00 + c] * (1 - fx) + src.data[i10 + c] * fx; const v1 = src.data[i01 + c] * (1 - fx) + src.data[i11 + c] * fx; dst.data[o + c] = v0 * (1 - fy) + v1 * fy; }
      dst.data[o + 3] = 255;
    }
  }
  ectx.putImageData(dst, 0, 0); sealSeam(ectx, eqW, eqH);
  return canvasToTexture(equirect);
}

export async function loadNasaEarthTexture(): Promise<THREE.Texture> {
  let img: HTMLImageElement | null = null;
  for (const src of NASA_MAPS) { try { img = await loadImage(src); break; } catch { img = null; } }
  if (!img) throw new Error('NASA Earth map failed to load');
  const w = img.naturalWidth; const h = img.naturalHeight;
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0, w, h); sealSeam(ctx, w, h);
  return canvasToTexture(canvas);
}

export async function loadGlobeBaseTexture(): Promise<THREE.Texture> {
  try { return await loadOsmEarthTexture(3); } catch { return loadNasaEarthTexture(); }
}

export async function loadGlobeDetailTexture(): Promise<THREE.Texture | null> {
  try { return await loadOsmEarthTexture(4); } catch { return null; }
}
