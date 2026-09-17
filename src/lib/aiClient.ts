import { type AiProvider } from './aiProviders';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
}

interface ChatResponse {
  text: string;
  id?: string;
}

function extractText(data: any): string {
  const choice = data?.choices?.[0];
  const msg = choice?.message;
  if (typeof msg?.content === 'string' && msg.content) return msg.content;
  if (Array.isArray(msg?.content)) {
    const text = msg.content.map((c: any) => c.text || c.content || '').filter(Boolean).join('\n').trim();
    if (text) return text;
  }
  if (typeof msg?.reasoning_content === 'string' && msg.reasoning_content) return msg.reasoning_content;
  return '';
}

function formatMessages(messages: ChatMessage[]): any[] {
  return messages.map((msg) => {
    if (typeof msg.content === 'string') {
      return { role: msg.role, content: msg.content };
    }
    const parts: any[] = [];
    for (const item of msg.content) {
      if (!item) continue;
      if (item.type === 'input_text' || item.type === 'text') {
        parts.push({ type: 'text', text: item.text || '' });
      } else if (item.type === 'input_image' || item.type === 'image_url') {
        const url = typeof item.image_url === 'string' ? item.image_url : item.image_url?.url;
        if (url) parts.push({ type: 'image_url', image_url: { url } });
      } else if (item.text) {
        parts.push({ type: 'text', text: item.text });
      }
    }
    return { role: msg.role, content: parts.length ? parts : '' };
  });
}

async function callMiniMax(apiKey: string, model: string, messages: ChatMessage[]): Promise<ChatResponse> {
  const response = await fetch('https://api.minimax.io/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: formatMessages(messages),
      max_tokens: 4096,
      temperature: 0.4,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.error?.message || data.message || data.base_resp?.status_msg || `MiniMax API error ${response.status}`;
    throw new Error(errorMsg);
  }

  return { text: extractText(data), id: data.id };
}

async function callNvidia(apiKey: string, model: string, messages: ChatMessage[]): Promise<ChatResponse> {
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: formatMessages(messages),
      max_tokens: 4096,
      temperature: 0.4,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.error?.message || data.message || `NVIDIA API error ${response.status}`;
    throw new Error(errorMsg);
  }

  return { text: extractText(data), id: data.id };
}

export async function callAiProvider(
  provider: AiProvider,
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<ChatResponse> {
  if (provider === 'nvidia') {
    return callNvidia(apiKey, model, messages);
  }
  return callMiniMax(apiKey, model, messages);
}
