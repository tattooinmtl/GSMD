import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Radio, Search, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CHANNEL_PRIORITY, DATA_CENTERS, centerList, type DataCenter, type DataCenterId } from '../lib/fdsnCenters';
import { parseMiniSEED } from '../lib/miniseed';

type StationStatus = 'pending' | 'checking' | 'online' | 'offline' | 'partial';
interface Station { code: string; net: string; sta: string; lat: number; lon: number; elev: number; name: string; }
interface StreamChoice { cha: string; loc: string; }
const WINDOW_OPTIONS: { label: string; seconds: number }[] = [{ label: '1 min', seconds: 60 }, { label: '10 min', seconds: 600 }, { label: '1 hr', seconds: 3600 }];
const STATUS_BATCH = 4;

function dotTitle(status: StationStatus): string {
  switch (status) { case 'online': return 'Online — live MiniSEED data available'; case 'offline': return 'Offline — no data in last 24 h'; case 'partial': return 'Partial — station registered but no recent waveform data'; case 'checking': return 'Checking…'; default: return 'Status unknown'; }
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController(); const tid = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { signal: ctrl.signal }); } finally { clearTimeout(tid); }
}

function getDataselectCandidates(activeId: DataCenterId): { label: string; url: string }[] {
  const active = DATA_CENTERS[activeId];
  const others = centerList().filter((c) => c.dataselectUrl !== active.dataselectUrl);
  return [{ label: active.label, url: active.dataselectUrl }, ...others.map((c) => ({ label: c.label, url: c.dataselectUrl }))];
}

async function fetchMiniseed(activeId: DataCenterId, station: Station, cha: string, loc: string, windowSec: number): Promise<ArrayBuffer | null> {
  const end = new Date(); const start = new Date(end.getTime() - windowSec * 1000);
  const si = start.toISOString().replace('Z', ''); const ei = end.toISOString().replace('Z', '');
  for (const ep of getDataselectCandidates(activeId)) {
    const u = ep.url + '?net=' + encodeURIComponent(station.net) + '&sta=' + encodeURIComponent(station.sta) + '&loc=' + encodeURIComponent(loc) + '&cha=' + encodeURIComponent(cha) + '&starttime=' + encodeURIComponent(si) + '&endtime=' + encodeURIComponent(ei) + '&format=miniseed';
    try { const r = await fetchWithTimeout(u, 8000); if (!r.ok) continue; const b = await r.arrayBuffer(); if (b.byteLength > 0) return b; } catch { continue; }
  }
  return null;
}

async function discoverStream(activeId: DataCenterId, station: Station): Promise<StreamChoice | null> {
  const c = DATA_CENTERS[activeId]; const start = new Date(Date.now() - 86400000).toISOString(); const end = new Date().toISOString();
  const urls = [c.stationUrl + '?level=channel&format=text&net=' + encodeURIComponent(station.net) + '&sta=' + encodeURIComponent(station.sta) + '&starttime=' + encodeURIComponent(start) + '&endtime=' + encodeURIComponent(end),
    c.stationUrl + '?level=channel&format=text&network=' + encodeURIComponent(station.net) + '&station=' + encodeURIComponent(station.sta) + '&starttime=' + encodeURIComponent(start) + '&endtime=' + encodeURIComponent(end)];
  for (const url of urls) {
    try {
      const res = await fetch(url); if (!res.ok) continue;
      const text = await res.text();
      const chs = text.split('\n').filter((l) => l && !l.startsWith('#')).map((r) => r.split('|')).filter((p) => p.length >= 4);
      for (const cName of CHANNEL_PRIORITY) {
        const match = chs.find((p) => p[3] === cName); if (!match) continue;
        const loc = match[2] && match[2] !== '--' ? match[2] : '*';
        const buf = await fetchMiniseed(activeId, station, cName, loc, 60);
        if (buf && buf.byteLength > 0) return { cha: cName, loc };
      }
    } catch { continue; }
  }
  return null;
}

async function probeStation(activeId: DataCenterId, station: Station, tokenRef: { current: symbol }, ownToken: symbol): Promise<StationStatus> {
  const end = new Date(); const start = new Date(end.getTime() - 120 * 1000);
  const si = start.toISOString().replace('Z', ''); const ei = end.toISOString().replace('Z', '');
  for (const ep of getDataselectCandidates(activeId)) {
    if (tokenRef.current !== ownToken) return 'pending';
    const u = ep.url + '?net=' + encodeURIComponent(station.net) + '&sta=' + encodeURIComponent(station.sta) + '&loc=*&cha=BHZ,HHZ,EHZ,SHZ,LHZ' + '&starttime=' + encodeURIComponent(si) + '&endtime=' + encodeURIComponent(ei) + '&format=miniseed';
    try {
      const r = await fetchWithTimeout(u, 6000); if (tokenRef.current !== ownToken) return 'pending';
      if (!r.ok) return r.status === 404 || r.status === 204 ? 'offline' : 'partial';
      const b = await r.arrayBuffer(); if (tokenRef.current !== ownToken) return 'pending';
      return b.byteLength > 0 ? 'online' : 'partial';
    } catch { continue; }
  }
  return 'offline';
}

function formatAmp(v: number): string { if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M'; if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + 'k'; return v.toFixed(0); }

function drawWaveform(canvas: HTMLCanvasElement, data: number[]) {
  const parent = canvas.parentElement; if (!parent) return;
  const rect = parent.getBoundingClientRect(); canvas.width = rect.width; canvas.height = rect.height;
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const w = canvas.width; const h = canvas.height;
  ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#06080f'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#1e2535'; ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, (h * i) / 4); ctx.lineTo(w, (h * i) / 4); ctx.stroke(); }
  let min = Infinity; let max = -Infinity;
  for (const v of data) { if (v < min) min = v; if (v > max) max = v; }
  const range = max - min || 1; const mid = (max + min) / 2; const padded = range * 1.2;
  const yMin = mid - padded / 2; const yMax = mid + padded / 2;
  ctx.strokeStyle = '#5ab0ff'; ctx.lineWidth = 1; ctx.beginPath();
  for (let i = 0; i < data.length; i++) { const x = (i / (data.length - 1)) * w; const y = h - ((data[i] - yMin) / (yMax - yMin)) * h; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.stroke();
  ctx.strokeStyle = '#2d3650'; ctx.lineWidth = 0.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#3a4a6a'; ctx.font = '9px Arial'; ctx.fillText(formatAmp(yMax), 4, 12); ctx.fillText(formatAmp(yMin), 4, h - 4);
}

export default function LiveStationsPanel() {
  const stationsOpen = useStore((s) => s.stationsOpen);
  const setStationsOpen = useStore((s) => s.setStationsOpen);
  const [centerId, setCenterId] = useState<DataCenterId>('earthscope');
  const [networkCode, setNetworkCode] = useState<string>('IU');
  const [stations, setStations] = useState<Station[]>([]);
  const [filter, setFilter] = useState('');
  const [statusMap, setStatusMap] = useState<Map<string, StationStatus>>(new Map());
  const [listMessage, setListMessage] = useState<{ kind: 'loading' | 'error' | 'empty'; text: string } | null>({ kind: 'loading', text: 'Loading stations…' });
  const [selected, setSelected] = useState<Station | null>(null);
  const [stream, setStream] = useState<StreamChoice | null>(null);
  const [windowSec, setWindowSec] = useState(60);
  const [viewerStatus, setViewerStatus] = useState('Click a station to view live waveform');
  const [hasWaveform, setHasWaveform] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveTimerRef = useRef<number | null>(null);
  const sweepTokenRef = useRef<symbol>(Symbol('init'));
  const selectedRef = useRef<Station | null>(null);
  const streamRef = useRef<StreamChoice | null>(null);
  const windowSecRef = useRef(60);
  const centerIdRef = useRef<DataCenterId>(centerId);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({ x: Math.max(24, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 900 - 24), y: 80 }));
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { streamRef.current = stream; }, [stream]);
  useEffect(() => { windowSecRef.current = windowSec; }, [windowSec]);
  useEffect(() => { centerIdRef.current = centerId; }, [centerId]);

  const clearLiveTimer = useCallback(() => { if (liveTimerRef.current !== null) { window.clearInterval(liveTimerRef.current); liveTimerRef.current = null; } }, []);
  const clearWaveformCanvas = useCallback(() => { setHasWaveform(false); const c = canvasRef.current; if (c) { const ctx = c.getContext('2d'); if (ctx) ctx.clearRect(0, 0, c.width, c.height); } }, []);
  const setStatus = useCallback((code: string, status: StationStatus) => { setStatusMap((prev) => { const next = new Map(prev); next.set(code, status); return next; }); }, []);

  const runSweep = useCallback(async (list: Station[], token: symbol) => {
    const activeId = centerIdRef.current;
    const initial = new Map<string, StationStatus>();
    for (const s of list) initial.set(s.code, 'checking');
    setStatusMap(initial);
    for (let i = 0; i < list.length; i += STATUS_BATCH) {
      if (sweepTokenRef.current !== token) return;
      const batch = list.slice(i, i + STATUS_BATCH);
      const results = await Promise.all(batch.map((s) => probeStation(activeId, s, sweepTokenRef, token)));
      if (sweepTokenRef.current !== token) return;
      setStatusMap((prev) => { const next = new Map(prev); batch.forEach((s, idx) => { if (results[idx] !== 'pending') next.set(s.code, results[idx]); }); return next; });
      await new Promise((r) => setTimeout(r, 300));
    }
  }, []);

  const loadStations = useCallback(async (activeId: DataCenterId, net: string) => {
    setListMessage({ kind: 'loading', text: 'Loading stations…' }); setStations([]); setStatusMap(new Map()); setFilter('');
    clearLiveTimer(); clearWaveformCanvas(); setSelected(null); setStream(null); setViewerStatus('Click a station to view live waveform');
    const token = Symbol('sweep'); sweepTokenRef.current = token;
    const c = DATA_CENTERS[activeId];
    const urls = [c.stationUrl + '?net=' + encodeURIComponent(net) + '&format=text&level=station', c.stationUrl + '?network=' + encodeURIComponent(net) + '&format=text&level=station'];
    let text = ''; let lastStatus: string | number = '';
    for (const url of urls) { try { const res = await fetchWithTimeout(url, 12000); lastStatus = res.status; if (res.ok) { text = await res.text(); break; } } catch (e) { lastStatus = e instanceof Error ? e.message : String(e); continue; } }
    if (sweepTokenRef.current !== token) return;
    if (!text) { setListMessage({ kind: 'error', text: `Could not load stations (HTTP ${lastStatus})` }); return; }
    const rows = text.split('\n').filter((l) => l && !l.startsWith('#'));
    const seen = new Set<string>(); const parsed: Station[] = [];
    for (const r of rows) { const p = r.split('|'); if (p.length < 6) continue; const key = p[0] + '.' + p[1]; if (seen.has(key)) continue; seen.add(key); parsed.push({ code: key, net: p[0], sta: p[1], lat: parseFloat(p[2]), lon: parseFloat(p[3]), elev: parseFloat(p[4]), name: (p[5] || '').trim() }); }
    if (parsed.length === 0) { setListMessage({ kind: 'empty', text: `No stations returned for network ${net}` }); return; }
    setStations(parsed); setListMessage(null); runSweep(parsed, token);
  }, [clearLiveTimer, clearWaveformCanvas, runSweep]);

  useEffect(() => {
    if (!stationsOpen) return;
    const c = DATA_CENTERS[centerId]; const nets = Object.keys(c.networks);
    if (!nets.includes(networkCode)) { setNetworkCode(nets[0]); return; }
    loadStations(centerId, networkCode);
  }, [stationsOpen, centerId, networkCode, loadStations]);

  useEffect(() => { return () => { clearLiveTimer(); sweepTokenRef.current = Symbol('unmount'); }; }, [clearLiveTimer]);

  const fetchAndDraw = useCallback(async () => {
    const s = selectedRef.current; const st = streamRef.current; if (!s || !st) return;
    try {
      const buf = await fetchMiniseed(centerIdRef.current, s, st.cha, st.loc, windowSecRef.current);
      if (!buf || buf.byteLength === 0) { setViewerStatus('No MiniSEED data currently available'); return; }
      const parsed = parseMiniSEED(new Uint8Array(buf), 50000);
      if (parsed.length === 0) { setViewerStatus('No samples in MiniSEED data'); return; }
      const step = Math.ceil(parsed.length / 5000); const ds = parsed.filter((_, i) => i % step === 0);
      const c = canvasRef.current; if (c) drawWaveform(c, ds);
      setHasWaveform(true); setViewerStatus(`${s.code} · ${st.cha}/${st.loc} · ${parsed.length.toLocaleString()} pts`);
    } catch { setViewerStatus('Waveform fetch failed'); }
  }, []);

  const openStation = useCallback(async (station: Station) => {
    setSelected(station); setStream(null); clearLiveTimer(); clearWaveformCanvas(); setViewerStatus(`Discovering channels for ${station.code}…`);
    const found = await discoverStream(centerIdRef.current, station);
    if (!found) { setViewerStatus('No live channels available'); return; }
    setStream(found); streamRef.current = found; setViewerStatus(`Live · ${found.cha}/${found.loc}…`);
    await fetchAndDraw(); clearLiveTimer(); liveTimerRef.current = window.setInterval(fetchAndDraw, 10000);
  }, [clearLiveTimer, clearWaveformCanvas, fetchAndDraw]);

  useEffect(() => { if (!selected || !stream) return; fetchAndDraw(); }, [windowSec, selected, stream, fetchAndDraw]);

  const filtered = useMemo(() => { const q = filter.trim().toLowerCase(); if (!q) return stations; return stations.filter((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sta.toLowerCase().includes(q)); }, [stations, filter]);

  const center: DataCenter = DATA_CENTERS[centerId];
  const networks = Object.entries(center.networks);

  const startDrag = (e: React.PointerEvent) => { const el = panelRef.current; if (!el) return; const rect = el.getBoundingClientRect(); dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }; el.setPointerCapture(e.pointerId); };
  const onDragMove = (e: React.PointerEvent) => { const d = dragRef.current; if (!d) return; const w = panelRef.current?.offsetWidth ?? 900; const h = panelRef.current?.offsetHeight ?? 560; const x = Math.max(0, Math.min(window.innerWidth - w, e.clientX - d.dx)); const y = Math.max(0, Math.min(window.innerHeight - h, e.clientY - d.dy)); setPos({ x, y }); };
  const endDrag = (e: React.PointerEvent) => { dragRef.current = null; panelRef.current?.releasePointerCapture(e.pointerId); };
  const closeViewer = () => { clearLiveTimer(); setSelected(null); setStream(null); setViewerStatus('Click a station to view live waveform'); clearWaveformCanvas(); };

  if (!stationsOpen) return null;

  return (
    <div ref={panelRef} className="stations-panel" style={{ left: pos.x, top: pos.y }} role="dialog" aria-label="Live stations monitoring">
      <div className="stations-header" onPointerDown={startDrag} onPointerMove={onDragMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <div className="stations-title"><Radio size={13} strokeWidth={2.2} /><span>Live Stations Monitoring</span></div>
        <button type="button" className="stations-close" aria-label="Close stations panel" onClick={() => setStationsOpen(false)} onPointerDown={(e) => e.stopPropagation()}><X size={14} strokeWidth={2.2} /></button>
      </div>
      <div className="stations-body">
        <aside className="stations-sidebar">
          <div className="stations-controls">
            <select value={centerId} onChange={(e) => setCenterId(e.target.value as DataCenterId)}>{centerList().map((c) => (<option key={c.id} value={c.id}>{c.label}</option>))}</select>
            <select value={networkCode} onChange={(e) => setNetworkCode(e.target.value)}>{networks.map(([code, label]) => (<option key={code} value={code}>{code} — {label}</option>))}</select>
            <div className="stations-search"><Search size={12} strokeWidth={2} /><input type="text" placeholder="Filter stations…" value={filter} onChange={(e) => setFilter(e.target.value)} autoComplete="off" /></div>
          </div>
          <div className="stations-stats">{listMessage ? listMessage.text : filtered.length === stations.length ? `${stations.length} stations · ${center.label} · ${networkCode}` : `${filtered.length} / ${stations.length} stations · ${networkCode}`}</div>
          <div className="stations-list custom-scrollbar">
            {listMessage && listMessage.kind !== 'empty' && (<div className={`stations-msg ${listMessage.kind}`}>{listMessage.text}</div>)}
            {!listMessage && filtered.length === 0 && (<div className="stations-msg loading">No stations match</div>)}
            {filtered.map((s) => { const status = statusMap.get(s.code) || 'pending'; const isActive = selected?.code === s.code; return (
              <button key={s.code} type="button" className={`station-item${isActive ? ' is-on' : ''}`} onClick={() => openStation(s)}>
                <div className="station-row"><span className={`sdot ${status}`} title={dotTitle(status)} /><span className="station-code">{s.code}</span></div>
                <div className="station-name">{s.name}</div>
                <div className="station-meta">{s.lat.toFixed(3)}°, {s.lon.toFixed(3)}°</div>
              </button>); })}
          </div>
        </aside>
        <section className="stations-viewer">
          <div className="viewer-header"><span className="viewer-title">{selected ? `${selected.code} · ${selected.name}` : 'Waveform Viewer'}</span><button type="button" className="viewer-close" aria-label="Close waveform" onClick={closeViewer}><X size={12} strokeWidth={2.2} /></button></div>
          <div className="viewer-controls">
            <span className="viewer-window-label">Window:</span>
            <div className="viewer-window-btns">{WINDOW_OPTIONS.map((opt) => (<button key={opt.seconds} type="button" className={`window-btn${windowSec === opt.seconds ? ' is-on' : ''}`} onClick={() => setWindowSec(opt.seconds)}>{opt.label}</button>))}</div>
            <span className="viewer-status">{viewerStatus}</span>
          </div>
          <div className="viewer-chart">
            {!hasWaveform && (<div className="viewer-placeholder">{selected ? 'Waiting for MiniSEED data…' : 'Select a station'}<span>{selected ? `${selected.code} — fetching live samples` : 'Click any station in the list to load its live MiniSEED waveform'}</span></div>)}
            <canvas ref={canvasRef} style={{ display: hasWaveform ? 'block' : 'none' }} />
          </div>
          {selected && (<div className="viewer-info"><div className="info-item"><div className="info-label">Code</div><div className="info-value">{selected.sta}</div></div><div className="info-item"><div className="info-label">Network</div><div className="info-value">{selected.net}</div></div><div className="info-item"><div className="info-label">Latitude</div><div className="info-value">{selected.lat.toFixed(4)}°</div></div><div className="info-item"><div className="info-label">Longitude</div><div className="info-value">{selected.lon.toFixed(4)}°</div></div><div className="info-item"><div className="info-label">Channel</div><div className="info-value">{stream ? `${stream.cha} / ${stream.loc}` : '—'}</div></div><div className="info-item"><div className="info-label">Data Center</div><div className="info-value">{center.label}</div></div></div>)}
        </section>
      </div>
    </div>
  );
}
