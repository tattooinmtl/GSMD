import fs from "node:fs";
import path from "node:path";

function readEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) { val = val.slice(1, -1); }
    if (!process.env[key]) process.env[key] = val;
  }
}

function readBody(req: any, limit = 12_000_000) {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []; let size = 0;
    req.on("data", (c: Buffer) => { size += c.length; if (size > limit) { reject(new Error("payload too large")); req.destroy(); return; } chunks.push(c); });
    req.on("end", () => { try { const raw = Buffer.concat(chunks).toString("utf8") || "{}"; resolve(JSON.parse(raw)); } catch (err) { reject(err); } });
    req.on("error", reject);
  });
}

function sendJson(res: any, status: number, data: any) {
  res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data));
}

function stripHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 12000);
}

function toChatMessages(input: any) {
  if (!Array.isArray(input)) return [];
  return input.map((item: any) => {
    const role = item?.role || "user";
    if (typeof item.content === "string") return { role, content: item.content };
    if (Array.isArray(item.content)) {
      const parts: any[] = [];
      for (const c of item.content) {
        if (!c) continue;
        if (c.type === "input_text" || c.type === "text") parts.push({ type: "text", text: c.text || "" });
        else if (c.type === "input_image" || c.type === "image_url") { const url = typeof c.image_url === "string" ? c.image_url : c.image_url?.url; if (url) parts.push({ type: "image_url", image_url: { url } }); }
        else if (c.text) parts.push({ type: "text", text: c.text });
      }
      return { role, content: parts.length ? parts : "" };
    }
    return { role, content: item.content == null ? "" : String(item.content) };
  });
}

function chatOutputText(data: any) {
  const choice = data?.choices?.[0]; const msg = choice?.message;
  if (typeof msg?.content === "string" && msg.content) return msg.content;
  if (Array.isArray(msg?.content)) { const text = msg.content.map((c: any) => c.text || c.content || "").filter(Boolean).join("\n").trim(); if (text) return text; }
  if (typeof msg?.reasoning_content === "string" && msg.reasoning_content) return msg.reasoning_content;
  return "";
}

async function openaiChat({ url, apiKey, model, messages, extra }: any) {
  const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages, max_tokens: 4096, temperature: 0.4, ...extra }) });
  const raw = await response.text(); let data = {};
  try { data = JSON.parse(raw); } catch {}
  if (!response.ok) { const msg = (data as any).error?.message || (data as any).message || (data as any).base_resp?.status_msg || (raw ? raw.slice(0, 240) : `LLM ${response.status}`); throw new Error(msg); }
  return data;
}

export function aiPlugin() {
  readEnvFile();
  return {
    name: "earth-ai-proxy",
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url?.split("?")[0] || "";
        if (!url.startsWith("/api/ai/")) return next();
        if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
        try {
          if (req.method === "POST" && url === "/api/ai/chat") {
            const payload = await readBody(req) as any;
            const provider = payload.provider || "minimax";
            const input = Array.isArray(payload.input) ? payload.input : [];
            if (provider === "nvidia") {
              const apiKey = payload.apiKey || process.env.NVIDIA_API_KEY;
              if (!apiKey) { sendJson(res, 400, { error: "Missing NVIDIA key." }); return; }
              const model = payload.model || "nvidia/llama-3.1-nemotron-70b-instruct";
              const data = await openaiChat({ url: "https://integrate.api.nvidia.com/v1/chat/completions", apiKey, model, messages: toChatMessages(input) });
              sendJson(res, 200, { text: chatOutputText(data), id: data.id, citations: [] }); return;
            }
            if (provider !== "minimax") { sendJson(res, 400, { error: `Unknown provider "${provider}".` }); return; }
            const apiKey = payload.apiKey || process.env.MINIMAX_API_KEY;
            if (!apiKey) { sendJson(res, 400, { error: "Missing MiniMax key." }); return; }
            const model = payload.model || "MiniMax-M3";
            const data = await openaiChat({ url: "https://api.minimax.io/v1/chat/completions", apiKey, model, messages: toChatMessages(input) });
            sendJson(res, 200, { text: chatOutputText(data), id: data.id, citations: [] }); return;
          }
          if (req.method === "POST" && url === "/api/ai/fetch") {
            const payload = await readBody(req) as any;
            const target = String(payload.url || "");
            if (!/^https?:\/\//i.test(target)) { sendJson(res, 400, { error: "url must be http(s)" }); return; }
            const upstream = await fetch(target, { headers: { "User-Agent": "EarthMonitorLibrarian/1.0" }, redirect: "follow" });
            const ctype = upstream.headers.get("content-type") || "";
            if (ctype.includes("application/json")) { const json = await upstream.json(); sendJson(res, 200, { url: target, status: upstream.status, text: JSON.stringify(json).slice(0, 12000) }); return; }
            const html = await upstream.text();
            sendJson(res, 200, { url: target, status: upstream.status, text: stripHtml(html) }); return;
          }
          sendJson(res, 404, { error: "not found" });
        } catch (err) { sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) }); }
      });
    },
  };
}
