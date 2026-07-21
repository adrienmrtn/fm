// ONZE backend entrypoint. Fastify HTTP API in front of the game store.
// Run with: node --experimental-sqlite --import tsx src/index.ts

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config, useMockLLM } from './config.js';
import { getDb } from './db/database.js';
import { gameRoutes } from './routes/game.js';
import { conversationRoutes } from './routes/conversation.js';

async function main(): Promise<void> {
  getDb(); // open + migrate up front so a bad DB fails fast

  const app = Fastify({ logger: { level: 'info', transport: undefined } });
  await app.register(cors, { origin: true });

  app.get('/api/health', async () => ({
    ok: true,
    llm: useMockLLM() ? 'mock' : `live:${config.llm.provider}`,
  }));

  await app.register(gameRoutes);
  await app.register(conversationRoutes);

  // uniform error shape
  app.setErrorHandler((err, _req, reply) => {
    const e = err as { statusCode?: number; message?: string };
    const status = e.statusCode ?? 500;
    if (status >= 500) app.log.error(err);
    reply.status(status).send({ error: e.message ?? 'Erreur serveur' });
  });

  await app.listen({ port: config.port, host: '0.0.0.0' });
  app.log.info(`ONZE server ready on :${config.port} — LLM ${useMockLLM() ? 'MOCK' : 'LIVE'}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
