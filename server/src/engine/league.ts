// ============================================================
// League mechanics — fixture generation (round-robin), standings
// maintenance, and background simulation of the other matches so
// the table and news stay alive around the player.
// ============================================================

import { nanoid } from 'nanoid';
import type { Club, Fixture, StandingRow } from '@onze/shared';
import { Rng } from './rng.js';

/**
 * Double round-robin schedule via the circle method.
 * With N clubs it yields 2*(N-1) matchdays; the player's club plays
 * exactly once per matchday.
 */
export function generateFixtures(clubIds: string[], seed: number): Fixture[] {
  const rng = new Rng(seed);
  const ids = [...clubIds];
  if (ids.length % 2 !== 0) ids.push('__BYE__');
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;

  // fixed first element, rotate the rest
  const arr = [...ids];
  const fixtures: Fixture[] = [];

  const firstLeg: [string, string][][] = [];
  for (let r = 0; r < rounds; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      if (home !== '__BYE__' && away !== '__BYE__') {
        // alternate home/away for variety
        pairs.push(r % 2 === 0 ? [home, away] : [away, home]);
      }
    }
    firstLeg.push(pairs);
    // rotate (keep arr[0] fixed)
    arr.splice(1, 0, arr.pop() as string);
  }

  let week = 1;
  for (const pairs of firstLeg) {
    for (const [h, a] of pairs) {
      fixtures.push({ id: nanoid(8), week, homeClubId: h, awayClubId: a, played: false, homeGoals: null, awayGoals: null });
    }
    week++;
  }
  // second leg: swap home/away
  for (const pairs of firstLeg) {
    for (const [h, a] of pairs) {
      fixtures.push({ id: nanoid(8), week, homeClubId: a, awayClubId: h, played: false, homeGoals: null, awayGoals: null });
    }
    week++;
  }

  // light shuffle of within-week ordering for realism (kept deterministic)
  void rng;
  return fixtures;
}

export function emptyStandings(clubIds: string[]): StandingRow[] {
  return clubIds.map((clubId) => ({
    clubId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    points: 0,
  }));
}

export function applyResult(
  standings: StandingRow[],
  homeId: string,
  awayId: string,
  hg: number,
  ag: number,
): void {
  const home = standings.find((s) => s.clubId === homeId);
  const away = standings.find((s) => s.clubId === awayId);
  if (!home || !away) return;
  home.played++;
  away.played++;
  home.gf += hg;
  home.ga += ag;
  away.gf += ag;
  away.ga += hg;
  if (hg > ag) {
    home.won++;
    home.points += 3;
    away.lost++;
  } else if (hg < ag) {
    away.won++;
    away.points += 3;
    home.lost++;
  } else {
    home.drawn++;
    away.drawn++;
    home.points++;
    away.points++;
  }
}

/** Sort helper: points, then goal difference, then goals for. */
export function sortStandings(standings: StandingRow[]): StandingRow[] {
  return [...standings].sort(
    (a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf,
  );
}

/**
 * Simulate every fixture of a matchday except the player's own, updating
 * the standings. Deterministic from the seed.
 */
export function simulateOtherFixtures(
  week: number,
  fixtures: Fixture[],
  clubs: Club[],
  standings: StandingRow[],
  playerClubId: string,
  seed: number,
): void {
  const byId = new Map(clubs.map((c) => [c.id, c]));
  const rng = new Rng(seed);
  for (const fx of fixtures) {
    if (fx.week !== week || fx.played) continue;
    if (fx.homeClubId === playerClubId || fx.awayClubId === playerClubId) continue;
    const home = byId.get(fx.homeClubId);
    const away = byId.get(fx.awayClubId);
    if (!home || !away) continue;
    const diff = home.strength + 5 - away.strength;
    const expHome = Math.max(0.2, Math.min(4.2, 1.4 + diff * 0.028));
    const expAway = Math.max(0.2, Math.min(4.2, 1.4 - diff * 0.028));
    const hg = rng.poisson(expHome);
    const ag = rng.poisson(expAway);
    fx.homeGoals = hg;
    fx.awayGoals = ag;
    fx.played = true;
    applyResult(standings, fx.homeClubId, fx.awayClubId, hg, ag);
  }
}
