export function parseMiniSEED(data: Uint8Array, maxSamples = 50000): number[] {
  const all: number[] = [];
  let off = 0;
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  while (off + 64 <= data.byteLength) {
    try {
      const rec = parseRecord(dv, off);
      if (!rec) break;
      if (!isFinite(rec.len) || rec.len < 64) break;
      if (off + rec.len > data.byteLength) break;
      const prev = off;
      for (const s of rec.samples) { all.push(s); if (all.length >= maxSamples) break; }
      off += rec.len;
      if (off <= prev) break;
      if (all.length >= maxSamples) break;
    } catch { break; }
  }
  return all;
}

function parseRecord(dv: DataView, off: number) {
  if (off + 48 > dv.byteLength) return null;
  const ns = dv.getInt16(off + 30, false);
  const dbo = dv.getUint16(off + 44, false);
  const bbo = dv.getUint16(off + 46, false);
  if (ns <= 0 || dbo === 0) return null;
  let rl = 4096; let enc = 11;
  if (bbo > 0 && bbo < 512) {
    let bo = off + bbo;
    for (let i = 0; i < 10; i++) {
      if (bo + 4 > dv.byteLength) break;
      const bt = dv.getUint16(bo, false);
      const nb = dv.getUint16(bo + 2, false);
      if (bt === 1000 && bo + 8 <= dv.byteLength) { enc = dv.getUint8(bo + 4); rl = Math.pow(2, dv.getUint8(bo + 6)); break; }
      if (nb === 0 || nb <= bo - off) break;
      bo = off + nb;
    }
  }
  if (!isFinite(rl) || rl < 64 || rl > 65536) return null;
  if (dbo >= rl || off + rl > dv.byteLength) return null;
  return { samples: decodeSamples(dv, off + dbo, ns, enc), len: rl };
}

function decodeSamples(dv: DataView, doff: number, ns: number, enc: number): number[] {
  const s: number[] = [];
  if (enc === 1) { for (let i = 0; i < ns; i++) { const p = doff + i * 2; if (p + 2 > dv.byteLength) break; s.push(dv.getInt16(p, false)); } }
  else if (enc === 3 || enc === 11) { for (let i = 0; i < ns; i++) { const p = doff + i * 4; if (p + 4 > dv.byteLength) break; s.push(dv.getInt32(p, false)); } }
  else if (enc === 4 || enc === 12) { for (let i = 0; i < ns; i++) { const p = doff + i * 4; if (p + 4 > dv.byteLength) break; s.push(dv.getFloat32(p, false)); } }
  else if (enc === 5) { for (let i = 0; i < ns; i++) { const p = doff + i * 8; if (p + 8 > dv.byteLength) break; s.push(dv.getFloat64(p, false)); } }
  else if (enc === 10 || enc === 19) { return decodeSteim(dv, doff, ns); }
  else { for (let i = 0; i < ns; i++) { const p = doff + i * 4; if (p + 4 > dv.byteLength) break; s.push(dv.getInt32(p, false)); } }
  return s;
}

function decodeSteim(dv: DataView, doff: number, ns: number): number[] {
  const s: number[] = []; let last = 0; let fo = doff; let first = true;
  while (s.length < ns && fo + 64 <= dv.byteLength) {
    const cw = dv.getUint32(fo, false);
    for (let w = 1; w <= 15 && s.length < ns; w++) {
      const dn = (cw >>> (30 - w * 2)) & 3;
      const wv = dv.getInt32(fo + w * 4, false);
      if (first && w === 1) { last = wv; first = false; continue; }
      if (w === 2 && fo === doff) continue;
      if (dn === 0) continue;
      if (dn === 1) { for (let b = 3; b >= 0 && s.length < ns; b--) { const d = (wv >> (b * 8)) & 255; last += d & 128 ? d - 256 : d; s.push(last); } }
      else if (dn === 2) { for (let b = 1; b >= 0 && s.length < ns; b--) { const r = (wv >> (b * 16)) & 65535; last += r > 32767 ? r - 65536 : r; s.push(last); } }
      else if (dn === 3) { last += wv; s.push(last); }
    }
    fo += 64;
  }
  return s;
}
