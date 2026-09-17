import {
  cartesianToLatLng,
  extractLonLat,
  latLngToCartesian,
  latLngToTile,
  lngLatToMercatorPixels,
  splitRingOnAntimeridian,
  tileBounds,
  zoomFromDistance,
} from './geo';

function almost(a: number, b: number, eps = 1e-9) {
  if (Math.abs(a - b) > eps) {
    throw new Error(`expected ${b}, got ${a}`);
  }
}

function almostVec(
  got: [number, number, number],
  expected: [number, number, number],
  eps = 1e-9
) {
  almost(got[0], expected[0], eps);
  almost(got[1], expected[1], eps);
  almost(got[2], expected[2], eps);
}

const R = 2;

// Matches Three.js SphereGeometry UV: u=0 at 180W (-X), u=0.5 Greenwich (+X)
almostVec(latLngToCartesian(90, 0, R), [0, R, 0]);
almostVec(latLngToCartesian(-90, 0, R), [0, -R, 0]);
almostVec(latLngToCartesian(0, 0, R), [R, 0, 0]);
almostVec(latLngToCartesian(0, -90, R), [0, 0, R]);
almostVec(latLngToCartesian(0, 90, R), [0, 0, -R]);
almostVec(latLngToCartesian(0, 180, R), [-R, 0, 0]);
almostVec(latLngToCartesian(0, -180, R), [-R, 0, 0]);

// Oklahoma wildfire: GeoJSON [lng, lat] must sit on the Americas (+Z) hemisphere
const ok = latLngToCartesian(34.84, -98.68, R);
if (ok[2] <= 0) throw new Error(`Oklahoma should face +Z, z=${ok[2]}`);
if (ok[1] <= 0) throw new Error(`Oklahoma should be northern, y=${ok[1]}`);

// GeoJSON Point
const point = extractLonLat([-98.68, 34.84]);
almost(point![0], -98.68);
almost(point![1], 34.84);

// USGS [lng, lat, depth]
const usgs = extractLonLat([-118.2, 34.05, 10.5]);
almost(usgs![0], -118.2);
almost(usgs![1], 34.05);

// Polygon unwrap
const poly = extractLonLat([[[-155.6, 19.4], [-155.5, 19.5]]]);
almost(poly![0], -155.6);
almost(poly![1], 19.4);

const world = 256;
const origin = lngLatToMercatorPixels(0, 0, world);
almost(origin.x, 128, 1e-6);
almost(origin.y, 128, 1e-6);
almost(lngLatToMercatorPixels(-180, 0, world).x, 0, 1e-6);
almost(lngLatToMercatorPixels(180, 0, world).x, world, 1e-6);

const split = splitRingOnAntimeridian([
  [170, 0],
  [179, 0],
  [-179, 0],
  [-170, 0],
]);
if (split.length !== 2) throw new Error(`expected 2 parts, got ${split.length}`);

const worldTile = tileBounds(0, 0, 0);
almost(worldTile.west, -180, 1e-6);
almost(worldTile.east, 180, 1e-6);
if (worldTile.north < 84) throw new Error(`north ${worldTile.north}`);
if (worldTile.south > -84) throw new Error(`south ${worldTile.south}`);

const t00 = latLngToTile(0, -90, 2);
if (t00.x !== 1) throw new Error(`expected tile x 1 for 90W z2, got ${t00.x}`);

const ok3 = latLngToCartesian(34.84, -98.68, 2);
const back = cartesianToLatLng(ok3[0], ok3[1], ok3[2]);
almost(back.lat, 34.84, 1e-6);
almost(back.lng, -98.68, 1e-6);

if (zoomFromDistance(2.6) < 5) throw new Error('close camera should be high zoom');
if (zoomFromDistance(9) > 3) throw new Error('far camera should be low zoom');

console.log('geo tests passed');
