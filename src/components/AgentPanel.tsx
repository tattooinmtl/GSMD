import { useEffect, useRef, useState } from 'react';
import { Bot, ImagePlus, Camera, CircleDot, Send, X, Bookmark, Search, Globe2, Loader2, Paperclip } from 'lucide-react';
import { useStore } from '../store/useStore';
import { providerMeta } from '../lib/aiProviders';
import { indexAssistantReply, listMemories, listTurns, saveMemory, saveTurn, searchMemories, type ChatTurn, type MemoryRecord } from '../lib/librarian';
import { isSupportedImage, requestGlobeRecording, requestGlobeScreenshot, toPngDataUrl } from '../lib/globeCapture';
import { callAiProvider } from '../lib/aiClient';

type UiTurn = ChatTurn & { pending?: boolean };

function liveContext() {
  const { events, selectedEvent } = useStore.getState();
  const byCat = new Map<string, typeof events>();
  for (const e of events) { const list = byCat.get(e.category) || []; list.push(e); byCat.set(e.category, list); }
  const label: Record<string, string> = { earthquakes: 'Earthquakes', volcanoes: 'Volcanoes', severeStorms: 'Storms', wildfires: 'Wildfires', floods: 'Floods', icebergs: 'Icebergs' };
  const parts: string[] = [];
  for (const [cat, catLabel] of Object.entries(label)) {
    const list = byCat.get(cat) || [];
    if (list.length === 0) continue;
    const sample = list.slice(0, 4).map((e) => { const c = e.geometry?.[0]?.coordinates; const t = e.title.length > 70 ? e.title.slice(0, 70) + '…' : e.title; const mag = typeof e.magnitude === 'number' ? ` M${e.magnitude.toFixed(1)}` : ''; return `  - ${t}${mag}${c ? ` @ ${c[1].toFixed(2)},${c[0].toFixed(2)}` : ''}`; });
    parts.push(`${catLabel} (${list.length} total):\n${sample.join('\n')}`);
  }
  const sel = selectedEvent ? `\nUser clicked marker: "${selectedEvent.title}" [${selectedEvent.category}]` + (selectedEvent.geometry?.[0]?.coordinates ? ` @ ${selectedEvent.geometry[0].coordinates[1].toFixed(2)},${selectedEvent.geometry[0].coordinates[0].toFixed(2)}` : '') : '';
  return `Live global hazards data:\n${parts.join('\n\n') || '(no active events)'}${sel}`;
}

const SYSTEM_PROMPT = `You are a natural-disasters researcher assistant. Your expertise covers:
- Seismology: earthquakes, magnitudes, tectonic settings, aftershock sequences
- Volcanology: eruption types (VEI), lava vs. pyroclastic hazards, ash plumes, SO₂
- Meteorology: tropical cyclones (Saffir-Simpson), extratropical storms, atmospheric rivers
- Wildfire behavior, drought, flood dynamics, cryosphere and iceberg tracking

Data sources you have access to (real-time in the context below):
- NASA EONET (Earth Observatory Natural Event Tracker)
- USGS Earthquake Hazards Program (2.5+ mag, past week)
- EMSC / seismicportal.eu (European-Mediterranean, 2.5+ mag)
- Smithsonian GVP and USGS Volcanoes (Holocene-active list)

Style:
- Answer plainly and conversationally. It's fine to say "I don't know."
- Cite real coordinates and magnitudes when relevant.
- For "what's happening now" questions, use the live data below.
- For educational questions (how does X work?), explain clearly with real examples.
- Keep replies focused — a few paragraphs at most unless asked for detail.`;

export default function AgentPanel() {
  const { agentOpen, setAgentOpen, minimaxKey, nvidiaKey, aiProvider, aiModel, setShowApiKeyModal } = useStore();
  const provider = providerMeta(aiProvider);
  const activeKey = aiProvider === 'nvidia' ? nvidiaKey : minimaxKey;
  const [turns, setTurns] = useState<UiTurn[]>([]);
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showMemory, setShowMemory] = useState(false);
  const [memQuery, setMemQuery] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { listTurns(30).then(setTurns); listMemories(40).then(setMemories); }, []);
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight }); }, [turns, agentOpen]);
  if (!agentOpen) return null;

  const send = async (text: string, extraImages: string[] = []) => {
    const content = text.trim(); const imgs = [...images, ...extraImages];
    if (!content && imgs.length === 0) return;
    if (!activeKey) { setError(`Add a ${provider.label} key in Providers first.`); setShowApiKeyModal(true); return; }
    setError(''); setBusy(true); setDraft(''); setImages([]);
    const userTurn: UiTurn = { id: crypto.randomUUID(), role: 'user', content: content || '(image)', createdAt: new Date().toISOString(), images: imgs };
    setTurns((t) => [...t, userTurn]); await saveTurn(userTurn);
    const memHits = searchMemories(memories, content).slice(0, 3);
    const memBlock = memHits.length ? `\n\nRelevant prior notes:\n${memHits.map((m) => `- ${m.title}: ${m.text.slice(0, 120)}`).join('\n')}` : '';
    const supportsVision = aiProvider !== 'minimax';
    const input: unknown[] = [{ role: 'system', content: `${SYSTEM_PROMPT}\n\n${liveContext()}${memBlock}` }];
    const priorTurns = turns.slice(-8);
    for (const t of priorTurns) { if (t.role === 'user' || t.role === 'assistant') input.push({ role: t.role, content: t.content }); }
    const userContent: unknown[] = [];
    if (supportsVision) { for (const url of imgs.slice(0, 2)) userContent.push({ type: 'input_image', image_url: url, detail: 'high' }); }
    if (content) userContent.push({ type: 'input_text', text: content });
    const onlyText = userContent.length === 1 && content;
    input.push({ role: 'user', content: onlyText ? content : userContent });
    if (!supportsVision && imgs.length > 0) setError(`${provider.label} does not support image inputs. Sending text only.`);
    try {
      const data = await callAiProvider(aiProvider, activeKey, aiModel, input as any);
      const reply: UiTurn = { id: crypto.randomUUID(), role: 'assistant', content: data.text || '(no text)', createdAt: new Date().toISOString() };
      setTurns((t) => [...t, reply]); await saveTurn(reply);
      const indexed = await indexAssistantReply(reply.content);
      if (indexed) setMemories((m) => [indexed, ...m]);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setBusy(false); }
  };

  const attachFiles = async (files: FileList | null) => {
    if (!files) return; const next: string[] = [];
    for (const file of Array.from(files)) { if (!isSupportedImage(file)) continue; next.push(await toPngDataUrl(file)); }
    if (next.length) setImages((imgs) => [...imgs, ...next].slice(0, 4));
  };

  const capture = async () => { const shot = await requestGlobeScreenshot(); if (shot) setImages((imgs) => [...imgs, shot].slice(0, 4)); else setError('Could not capture the globe canvas.'); };

  const record = async () => {
    setBusy(true);
    try {
      const clip = await requestGlobeRecording(4);
      if (!clip?.poster) { setError('Recording failed. Try again after the globe has rendered.'); return; }
      setImages((imgs) => [...imgs, clip.poster].slice(0, 4));
      await saveMemory({ kind: 'capture', title: 'Live globe clip', text: '4 second recording of the live globe (poster frame stored).', tags: ['capture', 'globe', 'live'], dataUrl: clip.poster, source: 'recorder' });
      await send('Analyze this live globe recording frame. Describe visible land, markers, and any overlay artifacts.', [clip.poster]);
    } finally { setBusy(false); }
  };

  const pinMemory = async () => {
    const last = [...turns].reverse().find((t) => t.role === 'assistant');
    if (!last) return;
    const rec = await saveMemory({ kind: 'note', title: last.content.slice(0, 72), text: last.content.slice(0, 2000), tags: ['pinned'], source: 'user' });
    setMemories((m) => [rec, ...m]);
  };

  const shownMemories = searchMemories(memories, memQuery);

  return (
    <aside className="agent-panel" aria-label="AI agent">
      <div className="side-header">
        <div className="side-kicker"><span className="side-kicker-icon"><Bot size={14} /></span><h3>Researcher Agent</h3></div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" className="icon-btn" title="Pinned memory" onClick={pinMemory}><Bookmark size={14} /></button>
          <button type="button" className="icon-btn" title="Memory" onClick={() => setShowMemory((v) => !v)}><Search size={14} /></button>
          <button type="button" className="icon-btn" aria-label="Close agent" onClick={() => setAgentOpen(false)}><X size={15} /></button>
        </div>
      </div>
      {showMemory && (
        <div className="agent-memory">
          <input className="field-input" placeholder="Search notes..." value={memQuery} onChange={(e) => setMemQuery(e.target.value)} />
          <div className="event-list" style={{ marginTop: 8, maxHeight: 160, overflow: 'auto' }}>
            {shownMemories.length === 0 && <p className="layer-desc">No memories yet. Pin a reply or capture the globe.</p>}
            {shownMemories.map((m) => (<button key={m.id} type="button" className="event-item" onClick={() => setDraft((d) => `${d} ${m.title}`.trim())}><p className="event-title">{m.title}</p><p className="event-meta">{m.kind} · {new Date(m.createdAt).toLocaleString()}</p></button>))}
          </div>
        </div>
      )}
      <div className="agent-log custom-scrollbar" ref={scroller}>
        {turns.length === 0 && (
          <div className="side-empty"><Globe2 size={28} /><p>Ask about active earthquakes, volcanoes, storms, wildfires — or any question about natural disasters. Try:</p>
            <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 4, fontSize: 11 }}>
              <li>"What storms are active right now?"</li><li>"Explain the difference between a M6 and M7 quake."</li><li>"Which volcanoes are erupting today?"</li><li>"How do hurricanes form?"</li>
            </ul>
          </div>
        )}
        {turns.map((t) => (<div key={t.id} className={`agent-bubble ${t.role}`}>{t.images?.map((src) => (<img key={src.slice(-24)} src={src} alt="" className="agent-thumb" />))}<p>{t.content}</p></div>))}
        {busy && (<div className="agent-bubble assistant"><Loader2 size={14} className="spin" /> Thinking with live search...</div>)}
      </div>
      {error && <p className="agent-error">{error}</p>}
      {images.length > 0 && (<div className="agent-attach-row">{images.map((src) => (<img key={src.slice(-18)} src={src} alt="" className="agent-thumb" />))}</div>)}
      <form className="agent-composer" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
        <div className="agent-tools">
          <button type="button" className="icon-btn" title="Attach image" onClick={() => fileRef.current?.click()}><ImagePlus size={15} /></button>
          <button type="button" className="icon-btn" title="Screenshot globe" onClick={capture}><Camera size={15} /></button>
          <button type="button" className="icon-btn" title="Record live globe" onClick={record} disabled={busy}><CircleDot size={15} /></button>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp" multiple hidden onChange={(e) => attachFiles(e.target.files)} />
        <textarea className="field-input agent-input" rows={2} placeholder="Ask the researcher... drop a map screenshot" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); } }} />
        <button type="submit" className="ui-btn primary" disabled={busy} aria-label="Send"><Send size={14} /></button>
      </form>
      <p className="layer-desc" style={{ padding: '0 12px 10px' }}><Paperclip size={11} /> PNG, JPEG, WebP, GIF. Keys stay on this machine. Provider via /api/ai.</p>
    </aside>
  );
}
