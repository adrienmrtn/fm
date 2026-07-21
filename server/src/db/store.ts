// Game repository. Loads/saves the StoredGame aggregate as JSON and
// tracks the most-recently-touched career for convenient resume.

import { getDb } from './database.js';
import type { StoredGame } from './model.js';

export function saveGame(game: StoredGame): void {
  const db = getDb();
  const now = Date.now();
  db.prepare(
    `INSERT INTO games (id, data, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).run(game.id, JSON.stringify(game), game.createdAt, now);
  db.prepare(
    `INSERT INTO meta (key, value) VALUES ('lastGameId', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(game.id);
}

export function loadGame(id: string): StoredGame | null {
  const db = getDb();
  const row = db.prepare('SELECT data FROM games WHERE id = ?').get(id) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as StoredGame) : null;
}

export function latestGameId(): string | null {
  const db = getDb();
  const row = db.prepare("SELECT value FROM meta WHERE key = 'lastGameId'").get() as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function deleteGame(id: string): void {
  getDb().prepare('DELETE FROM games WHERE id = ?').run(id);
}
