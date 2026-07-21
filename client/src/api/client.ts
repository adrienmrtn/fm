// Thin typed wrapper over the backend. Everything the client knows about
// the game comes through here — no game logic lives in the browser.

import type {
  AdvanceWeekResult,
  Character,
  ConversationReplyResult,
  GameState,
  Message,
  NewCareerInput,
  MatchResult,
  TrainingFocus,
} from '@onze/shared';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  // Only advertise a JSON body when we actually send one — an empty POST
  // with content-type: application/json trips Fastify's body parser (400).
  const headers = init?.body ? { 'content-type': 'application/json', ...(init?.headers ?? {}) } : init?.headers;
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((body as { error?: string }).error ?? `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ThreadSummary {
  character: Character;
  lastMessage: string | null;
  lastRole: Message['role'] | null;
  suggestions: string[];
}

export interface ThreadDetail {
  character: Character;
  messages: Message[];
  suggestions: string[];
}

export const api = {
  health: () => req<{ ok: boolean; llm: string }>('/api/health'),

  resume: () => req<{ state: GameState | null }>('/api/game'),
  get: (id: string) => req<GameState>(`/api/game/${id}`),
  newCareer: (input: NewCareerInput) =>
    req<GameState>('/api/game/new', { method: 'POST', body: JSON.stringify(input) }),

  advance: (id: string) => req<AdvanceWeekResult>(`/api/game/${id}/advance`, { method: 'POST' }),
  resolveDecision: (id: string, optionId: string) =>
    req<{ state: GameState; result: MatchResult }>(`/api/game/${id}/match/decision`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    }),
  setTraining: (id: string, focus: TrainingFocus) =>
    req<GameState>(`/api/game/${id}/training`, { method: 'POST', body: JSON.stringify({ focus }) }),

  threads: (id: string) => req<ThreadSummary[]>(`/api/game/${id}/conversations`),
  thread: (id: string, cid: string) => req<ThreadDetail>(`/api/game/${id}/conversation/${cid}`),
  sendMessage: (id: string, cid: string, text: string) =>
    req<ConversationReplyResult>(`/api/game/${id}/conversation/${cid}`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
};
