export type MemoryKind = 'note' | 'event' | 'capture' | 'source' | 'conversation';

export interface MemoryRecord {
  id: string;
  kind: MemoryKind;
  title: string;
  text: string;
  tags: string[];
  createdAt: string;
  source?: string;
  dataUrl?: string;
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  images?: string[];
}

const DB_NAME = 'earth-monitor-librarian';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('memories')) {
        const mem = db.createObjectStore('memories', { keyPath: 'id' });
        mem.createIndex('createdAt', 'createdAt');
        mem.createIndex('kind', 'kind');
      }
      if (!db.objectStoreNames.contains('turns')) {
        const turns = db.createObjectStore('turns', { keyPath: 'id' });
        turns.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function saveMemory(partial: Omit<MemoryRecord, 'id' | 'createdAt'> & { id?: string }): Promise<MemoryRecord> {
  const record: MemoryRecord = {
    id: partial.id || crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...partial,
  };
  const db = await openDb();
  const tx = db.transaction('memories', 'readwrite');
  tx.objectStore('memories').put(record);
  await txDone(tx);
  db.close();
  return record;
}

export async function listMemories(limit = 80): Promise<MemoryRecord[]> {
  const db = await openDb();
  const tx = db.transaction('memories', 'readonly');
  const req = tx.objectStore('memories').index('createdAt').getAll();
  const rows: MemoryRecord[] = await new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

export function searchMemories(records: MemoryRecord[], query: string): MemoryRecord[] {
  const q = query.toLowerCase().trim();
  if (!q) return records.slice(0, 12);
  const terms = q.split(/\s+/).filter(Boolean);
  return records
    .map((r) => {
      const hay = `${r.title} ${r.text} ${r.tags.join(' ')}`.toLowerCase();
      const score = terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0);
      return { r, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.r.createdAt.localeCompare(a.r.createdAt))
    .slice(0, 12)
    .map((x) => x.r);
}

export async function saveTurn(turn: Omit<ChatTurn, 'id' | 'createdAt'> & { id?: string }): Promise<ChatTurn> {
  const record: ChatTurn = {
    id: turn.id || crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...turn,
  };
  const db = await openDb();
  const tx = db.transaction('turns', 'readwrite');
  tx.objectStore('turns').put(record);
  await txDone(tx);
  db.close();
  return record;
}

export async function listTurns(limit = 40): Promise<ChatTurn[]> {
  const db = await openDb();
  const tx = db.transaction('turns', 'readonly');
  const req = tx.objectStore('turns').getAll();
  const rows: ChatTurn[] = await new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-limit);
}

export function indexAssistantReply(text: string): Promise<MemoryRecord | null> {
  const coords = text.match(/-?\d{1,3}\.\d+\s*°,?\s*-?\d{1,3}\.\d+\s*°/);
  const eventish = /(earthquake|volcano|wildfire|storm|usgs|eonet|plume|magnitude)/i.test(text);
  if (!coords && !eventish) return Promise.resolve(null);
  const title = text.split(/[.!\n]/)[0].slice(0, 80) || 'Indexed note';
  return saveMemory({
    kind: 'event',
    title,
    text: text.slice(0, 1200),
    tags: ['auto', eventish ? 'hazard' : 'geo'],
    source: 'assistant',
  });
}
