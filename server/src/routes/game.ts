// Game routes: create a career, read state, advance the week, resolve
// the match micro-decision, set the training focus.

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AdvanceWeekResult, GameState } from '@onze/shared';
import { seedNewCareer } from '../world/seeder.js';
import { loadGame, saveGame, latestGameId } from '../db/store.js';
import { toClientState, type StoredGame } from '../db/model.js';
import { finalizeMatch, refreshStandings, startWeek } from '../engine/tick.js';

const NewCareerSchema = z.object({
  firstName: z.string().min(1).max(20),
  lastName: z.string().min(1).max(20),
  age: z.number().int().min(16).max(38),
  position: z.enum(['GB', 'DEF', 'MIL', 'AIL', 'ATT']),
  physique: z.enum(['leger', 'equilibre', 'puissant']),
  clubTier: z.enum(['national', 'ligue2', 'ligue1']),
});

function client(game: StoredGame): GameState {
  refreshStandings(game);
  return toClientState(game);
}

function requireGame(id: string): StoredGame {
  const g = loadGame(id);
  if (!g) throw { statusCode: 404, message: 'Carrière introuvable.' };
  return g;
}

export async function gameRoutes(app: FastifyInstance): Promise<void> {
  // create a new career
  app.post('/api/game/new', async (req) => {
    const input = NewCareerSchema.parse(req.body);
    const game = seedNewCareer(input);
    saveGame(game);
    return client(game);
  });

  // resume the latest career (or null)
  app.get('/api/game', async () => {
    const id = latestGameId();
    if (!id) return { state: null };
    const g = loadGame(id);
    return { state: g ? client(g) : null };
  });

  // read a specific career
  app.get<{ Params: { id: string } }>('/api/game/:id', async (req) => {
    return client(requireGame(req.params.id));
  });

  // advance the week: apply training, then hand back a match to play (or fast-forward)
  app.post<{ Params: { id: string } }>('/api/game/:id/advance', async (req): Promise<AdvanceWeekResult> => {
    const game = requireGame(req.params.id);
    const liveMatch = startWeek(game);
    saveGame(game);
    return { state: client(game), liveMatch };
  });

  // resolve the in-match micro-decision → final result + advance week
  app.post<{ Params: { id: string }; Body: unknown }>('/api/game/:id/match/decision', async (req) => {
    const { optionId } = z.object({ optionId: z.string().min(1) }).parse(req.body);
    const game = requireGame(req.params.id);
    const result = finalizeMatch(game, optionId);
    saveGame(game);
    return { state: client(game), result };
  });

  // set the training focus for the current week
  app.post<{ Params: { id: string }; Body: unknown }>('/api/game/:id/training', async (req) => {
    const { focus } = z
      .object({
        focus: z.enum(['finition', 'vitesse', 'passe', 'physique', 'mental', 'technique', 'repos']),
      })
      .parse(req.body);
    const game = requireGame(req.params.id);
    game.trainingFocus = focus;
    saveGame(game);
    return client(game);
  });
}
