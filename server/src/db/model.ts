// Internal server-side game aggregate. It is the client GameState plus
// a few fields the client never needs (the full fixture list, memory).
// The DB persists this whole object as JSON — it is the source of truth.

import type { Conversation, Fixture, GameState, LiveMatch } from '@onze/shared';

export interface StoredGame extends GameState {
  /** Full season schedule (client only receives the upcoming slice). */
  allFixtures: Fixture[];
  /** Per-character conversation history. */
  conversations: Conversation[];
  /** A match awaiting the player's micro-decision, if any. */
  liveMatch: LiveMatch | null;
}

/** Project the stored aggregate down to the client-facing GameState. */
export function toClientState(g: StoredGame): GameState {
  const upcoming = g.allFixtures
    .filter((f) => !f.played && f.week >= g.week)
    .sort((a, b) => a.week - b.week)
    .slice(0, 6);

  const {
    allFixtures: _a,
    conversations: _c,
    liveMatch: _l,
    ...client
  } = g;
  return { ...client, upcomingFixtures: upcoming };
}
