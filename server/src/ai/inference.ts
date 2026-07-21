// ============================================================
// LLM inference client. ALL model calls go through here, server-side
// only — the API key never reaches the browser.
//
// - Model routing: cheap model by default, strong model on key beats.
// - Small in-memory cache keyed by the exact request.
// - Provider-agnostic: Anthropic Messages API or any OpenAI-compatible
//   /chat/completions endpoint, chosen by LLM_PROVIDER.
//
// The real endpoint + key are supplied later via env. Until then the
// conversation layer uses a deterministic mock (see conversation.ts),
// so this module is only exercised once a key is present.
// ============================================================

import { config } from '../config.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface InferenceRequest {
  messages: ChatMessage[];
  importance?: 'normal' | 'key'; // routes cheap vs strong model
  maxTokens?: number;
  temperature?: number;
}

/** Pick the model for this request based on importance. */
export function routeModel(importance: 'normal' | 'key' = 'normal'): string {
  return importance === 'key' ? config.llm.modelStrong : config.llm.modelCheap;
}

// ─── tiny LRU cache ──────────────────────────────────────────
const cache = new Map<string, string>();
const CACHE_MAX = 200;

function cacheKey(model: string, messages: ChatMessage[]): string {
  return model + '::' + JSON.stringify(messages);
}
function cacheGet(k: string): string | undefined {
  const v = cache.get(k);
  if (v !== undefined) {
    cache.delete(k);
    cache.set(k, v); // bump recency
  }
  return v;
}
function cacheSet(k: string, v: string): void {
  cache.set(k, v);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
}

/**
 * Run a completion and return the raw assistant text.
 * Throws if no API key is configured — callers should check useMockLLM()
 * first and route to the mock when appropriate.
 */
export async function chatComplete(req: InferenceRequest): Promise<string> {
  if (!config.llm.apiKey) {
    throw new Error('LLM_API_KEY manquant : aucune inférence réelle disponible.');
  }
  const model = routeModel(req.importance);
  const key = cacheKey(model, req.messages);
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  const text =
    config.llm.provider === 'anthropic'
      ? await callAnthropic(model, req)
      : await callOpenAICompatible(model, req);

  cacheSet(key, text);
  return text;
}

// ─── Anthropic Messages API ──────────────────────────────────
async function callAnthropic(model: string, req: InferenceRequest): Promise<string> {
  const system = req.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const messages = req.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  const res = await fetch(`${config.llm.baseUrl}/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.llm.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 512,
      temperature: req.temperature ?? 0.8,
      system,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { content: { type: string; text?: string }[] };
  return json.content.map((c) => c.text ?? '').join('').trim();
}

// ─── OpenAI-compatible /chat/completions ─────────────────────
async function callOpenAICompatible(model: string, req: InferenceRequest): Promise<string> {
  const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? 512,
      temperature: req.temperature ?? 0.8,
      messages: req.messages,
    }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content?.trim() ?? '';
}
