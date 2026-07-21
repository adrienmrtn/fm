// Server configuration, loaded once from the environment.
import 'dotenv/config';

function bool(v: string | undefined, def = false): boolean {
  if (v == null) return def;
  return /^(1|true|yes|on)$/i.test(v.trim());
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  databaseFile: process.env.DATABASE_FILE ?? './data/onze.db',

  llm: {
    apiKey: process.env.LLM_API_KEY ?? '',
    baseUrl: process.env.LLM_BASE_URL ?? 'https://api.anthropic.com/v1',
    provider: process.env.LLM_PROVIDER ?? 'anthropic',
    modelCheap: process.env.LLM_MODEL_CHEAP ?? 'claude-haiku-4-5-20251001',
    modelStrong: process.env.LLM_MODEL_STRONG ?? 'claude-opus-4-8',
    forceMock: bool(process.env.LLM_FORCE_MOCK, false),
  },
};

/** True when we should use the deterministic mock persona engine. */
export function useMockLLM(): boolean {
  return config.llm.forceMock || config.llm.apiKey.trim() === '';
}
