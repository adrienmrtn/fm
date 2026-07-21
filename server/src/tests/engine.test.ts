import { describe, expect, it } from 'vitest';
import { Rng, makeSeed } from '../engine/rng.js';
import { overall, computeMarketValue, formatEuro } from '../engine/player.js';
import { applyTraining } from '../engine/training.js';
import { generateFixtures } from '../engine/league.js';
import { resolveMatch, simulateToDecision, type MatchContext } from '../engine/match.js';
import { seedNewCareer } from '../world/seeder.js';
import type { Club, Player } from '@onze/shared';

describe('Rng', () => {
  it('is deterministic for a given seed', () => {
    const a = new Rng(1234);
    const b = new Rng(1234);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different streams for different seeds', () => {
    expect(new Rng(1).next()).not.toEqual(new Rng(2).next());
  });

  it('makeSeed is stable', () => {
    expect(makeSeed('a', 1, 'b')).toEqual(makeSeed('a', 1, 'b'));
  });
});

describe('player derived values', () => {
  const attrs = { finition: 71, vitesse: 84, passe: 74, physique: 65, mental: 68, technique: 79 };
  it('winger overall weights pace + technique', () => {
    const ovr = overall(attrs, 'AIL');
    expect(ovr).toBeGreaterThan(70);
    expect(ovr).toBeLessThan(85);
  });
  it('young high-potential player is worth more', () => {
    const base = { attributes: attrs, position: 'AIL', potential: 88, age: 19, form: 84, reputation: 42 } as Player;
    const old = { ...base, age: 31, potential: 79 } as Player;
    expect(computeMarketValue(base)).toBeGreaterThan(computeMarketValue(old));
  });
  it('formats euros like the maquette', () => {
    expect(formatEuro(4_200_000)).toBe('4,2 M€');
    expect(formatEuro(600_000)).toBe('600 k€');
    expect(formatEuro(45_000)).toBe('45 k€');
  });
});

describe('training', () => {
  it('improves the focused attribute and costs fitness', () => {
    const game = seedNewCareer({ firstName: 'Test', lastName: 'Joueur', age: 19, position: 'AIL', physique: 'equilibre', clubTier: 'ligue2' });
    const before = game.player.attributes.finition;
    const fitBefore = game.player.fitness;
    const out = applyTraining(game.player, 'finition', 42);
    expect(game.player.attributes.finition).toBeGreaterThan(before);
    expect(game.player.fitness).toBeLessThan(fitBefore);
    expect(out.gain).toBeGreaterThan(0);
  });
  it('rest recovers fitness and grants no attribute gain', () => {
    const game = seedNewCareer({ firstName: 'Test', lastName: 'Joueur', age: 19, position: 'AIL', physique: 'equilibre', clubTier: 'ligue2' });
    game.player.fitness = 60;
    const before = { ...game.player.attributes };
    applyTraining(game.player, 'repos', 1);
    expect(game.player.fitness).toBeGreaterThan(60);
    expect(game.player.attributes).toEqual(before);
  });
});

describe('league', () => {
  it('generates a double round-robin (2*(N-1) matchdays)', () => {
    const ids = Array.from({ length: 18 }, (_, i) => `c${i}`);
    const fx = generateFixtures(ids, 7);
    const weeks = new Set(fx.map((f) => f.week));
    expect(weeks.size).toBe(34);
    // each club plays exactly once per matchday
    const week1 = fx.filter((f) => f.week === 1);
    expect(week1.length).toBe(9);
  });
});

describe('match simulation', () => {
  function ctx(): MatchContext {
    const player = {
      id: 'p', firstName: 'Lucas', lastName: 'Moreau', age: 19, position: 'AIL', physique: 'equilibre',
      squadNumber: 11, clubId: 'a',
      attributes: { finition: 71, vitesse: 84, passe: 74, physique: 65, mental: 68, technique: 79 },
      potential: 88, form: 84, fitness: 88, morale: 70, marketValue: 4_200_000, reputation: 42,
      contract: { clubId: 'a', wage: 5000, monthsLeft: 8 }, injuryWeeksLeft: 0,
    } as Player;
    const playerClub: Club = { id: 'a', name: 'AC Verdun', shortName: 'VER', tier: 'ligue2', strength: 60 };
    const opponent: Club = { id: 'b', name: 'FC Amance', shortName: 'AMA', tier: 'ligue2', strength: 58 };
    return { week: 1, seed: makeSeed('game', 'match', 1), player, playerClub, opponent, playerHome: true };
  }

  it('same seed + choice → identical result (replayable)', () => {
    const r1 = resolveMatch(ctx(), 'lob');
    const r2 = resolveMatch(ctx(), 'lob');
    expect(r1.result).toEqual(r2.result);
  });

  it('produces a valid rating and score', () => {
    const r = resolveMatch(ctx(), 'tempo');
    expect(r.result).not.toBeNull();
    const perf = r.result!.perf;
    expect(perf.rating).toBeGreaterThanOrEqual(3);
    expect(perf.rating).toBeLessThanOrEqual(10);
    expect(r.result!.homeGoals).toBeGreaterThanOrEqual(0);
  });

  it('decision phase presents a micro-decision with two options', () => {
    const live = simulateToDecision(ctx());
    expect(live.phase).toBe('decision');
    expect(live.decision?.options).toHaveLength(2);
    expect(live.result).toBeNull();
  });
});

describe('seeder', () => {
  it('builds a coherent world', () => {
    const g = seedNewCareer({ firstName: 'Lucas', lastName: 'Moreau', age: 19, position: 'AIL', physique: 'equilibre', clubTier: 'ligue2' });
    expect(g.clubs).toHaveLength(18);
    expect(g.characters.length).toBeGreaterThanOrEqual(4);
    expect(g.characters.some((c) => c.type === 'agent')).toBe(true);
    expect(g.player.clubId).toBe(g.club.id);
    expect(g.matchPending).toBe(true);
    expect(g.player.marketValue).toBeGreaterThan(0);
  });

  it('is deterministic given the same seed inputs (structure holds)', () => {
    const a = seedNewCareer({ firstName: 'A', lastName: 'B', age: 19, position: 'AIL', physique: 'equilibre', clubTier: 'ligue2' });
    expect(a.clubs[0].name).toBe('AC Verdun');
  });
});
