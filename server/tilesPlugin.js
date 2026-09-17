const OSM_UA = "EarthMonitor/1.0 (local 3D globe; OSM attribution in UI)";
const SOURCES = [
  (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
  (z: number, x: number, y: number) => `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
];

function send(res: any, status: number, body: any, headers: Record<string, string> = {}) {
  res.statusCode = status;
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(body);
}

export function tilesPlugin() {
  return {
    name: "osm-tile-proxy",
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url?.split("?")[0] || "";
        const gibsMatch = url.match(/^\/api\/gibs\/([^/]+)\/(\d{4}-\d{2}-\d{2})\/(\d+)\/(\d+)\/(\d+)\/(\d+)\.(png|jpg|jpeg)$/);
        if (gibsMatch) {
          if (req.method !== "GET") { send(res, 405, "method not allowed"); return; }
          const layer = decodeURIComponent(gibsMatch[1]); const date = gibsMatch[2]; const level = Number(gibsMatch[3]); const z = Number(gibsMatch[4]); const x = Number(gibsMatch[5]); const y = Number(gibsMatch[6]); const ext = gibsMatch[7];
          const n = 2 ** z;
          if (z < 0 || z > 7 || z > level || x < 0 || y < 0 || x >= n || y >= n) { send(res, 400, "bad tile"); return; }
          const upstreamUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level${level}/${z}/${y}/${x}.${ext}`;
          try {
            const r = await fetch(upstreamUrl, { headers: { Accept: "image/png,image/jpeg,image/*", "User-Agent": OSM_UA } });
            if (!r.ok) { send(res, r.status, "gibs tile failed"); return; }
            const buf = Buffer.from(await r.arrayBuffer());
            send(res, 200, buf, { "Content-Type": r.headers.get("content-type") || `image/${ext}`, "Cache-Control": "public, max-age=3600" });
          } catch (err) { send(res, 500, err instanceof Error ? err.message : "gibs error"); }
          return;
        }
        const match = url.match(/^\/api\/osm\/(\d+)\/(\d+)\/(\d+)\.png$/);
        if (!match) return next();
        if (req.method !== "GET") { send(res, 405, "method not allowed"); return; }
        const z = Number(match[1]); const x = Number(match[2]); const y = Number(match[3]); const n = 2 ** z;
        if (!Number.isInteger(z) || z < 0 || z > 7 || x < 0 || y < 0 || x >= n || y >= n) { send(res, 400, "bad tile"); return; }
        try {
          let upstream = null;
          for (const make of SOURCES) { const r = await fetch(make(z, x, y), { headers: { "User-Agent": OSM_UA, Accept: "image/png,image/*" } }); if (r.ok) { upstream = r; break; } }
          if (!upstream) { send(res, 502, "tile fetch failed"); return; }
          const buf = Buffer.from(await upstream.arrayBuffer());
          send(res, 200, buf, { "Content-Type": upstream.headers.get("content-type") || "image/png", "Cache-Control": "public, max-age=86400" });
        } catch (err) { send(res, 500, err instanceof Error ? err.message : "tile error"); }
      });
    },
  };
}
