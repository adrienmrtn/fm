// ============================================================
// Weekly tick — the heartbeat of the career.
//
//   startWeek()      applies training, then either hands back a
//                    LiveMatch to play, or fast-forwards a week with
//                    no player match (injury / bye).
//   finalizeMatch()  resolves the player's micro-decision, applies
//                    every numeric consequence, advances the week.
//
// All numeric consequences live here. The LLM is never involved.
// ============================================================

import { nanoid } from 'nanoid';
import {
  ENGINE,
  reputationLabel,
  type Club,
  type Fixture,
  type LiveMatch,
  type MatchResult,
  type NewsItem,
} from '@onze/shared';
import { Rng, makeSeed } from './rng.js';
import { refreshMarketValue } from './player.js';
import { applyTraining } from './training.js';
import { MatchContext, resolveMatch, simulateToDecision } from './match.js';
import { applyResult, simulateOtherFixtures, sortStandings } from './league.js';
import type { StoredGame } from '../db/model.js';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function playerFixture(game: StoredGame, week: number): Fixture | undefined {
  return game.allFixtures.find(
    (f) => f.week === week && !f.played && (f.homeClubId === game.player.clubId || f.awayClubId === game.player.clubId),
  );
}

function matchContext(game: StoredGame, fx: Fixture): MatchContext {
  const playerHome = fx.homeClubId === game.player.clubId;
  const opponentId = playerHome ? fx.awayClubId : fx.homeClubId;
  const opponent = game.clubs.find((c) => c.id === opponentId) as Club;
  return {
    week: game.week,
    seed: makeSeed(game.id, 'match', game.week),
    player: game.player,
    playerClub: game.club,
    opponent,
    playerHome,
  };
}

/**
 * Begin the week. Applies the chosen training focus, then:
 *  - if there is a fixture and the player is fit → returns a LiveMatch
 *    (the caller renders the match-day screen and later calls finalizeMatch)
 *  - otherwise resolves the week immediately and returns null.
 */
export function startWeek(game: StoredGame): LiveMatch | null {
  const trainSeed = makeSeed(game.id, 'train', game.week);

  // 1. training / recovery
  if (game.player.injuryWeeksLeft > 0) {
    // injured: only recovers, no training
    game.player.fitness = Math.min(100, game.player.fitness + ENGINE.passiveRecovery);
  } else if (game.trainingFocus) {
    applyTraining(game.player, game.trainingFocus, trainSeed);
  } else {
    game.player.fitness = Math.min(100, game.player.fitness + ENGINE.passiveRecovery);
  }

  const fx = playerFixture(game, game.week);
  const canPlay = fx && game.player.injuryWeeksLeft === 0;

  if (fx && canPlay) {
    const live = simulateToDecision(matchContext(game, fx));
    game.liveMatch = live;
    return live;
  }

  // no match this week (or injured) → simulate the round in the background
  if (fx && game.player.injuryWeeksLeft > 0) {
    // club plays without the player
    simulateOtherFixtures(
      game.week,
      game.allFixtures,
      game.clubs,
      game.standings,
      '__none__',
      makeSeed(game.id, 'round', game.week),
    );
    game.allFixtures.filter((f) => f.week === game.week).forEach((f) => (f.played = true));
  } else {
    simulateBackgroundRound(game);
  }
  advanceToNextWeek(game, null);
  return null;
}

/** Resolve the player's micro-decision and finish the matchday. */
export function finalizeMatch(game: StoredGame, chosenOptionId: string): MatchResult {
  const fx = playerFixture(game, game.week);
  if (!fx || !game.liveMatch) {
    throw new Error('Aucun match en cours à résoudre.');
  }
  const ctx = matchContext(game, fx);
  const live = resolveMatch(ctx, chosenOptionId);
  const result = live.result as MatchResult;

  // ── apply the score to the fixture + table ──────────────────
  fx.homeGoals = result.homeGoals;
  fx.awayGoals = result.awayGoals;
  fx.played = true;
  applyResult(game.standings, fx.homeClubId, fx.awayClubId, result.homeGoals, result.awayGoals);

  // ── the rest of the round plays out ─────────────────────────
  simulateOtherFixtures(
    game.week,
    game.allFixtures,
    game.clubs,
    game.standings,
    game.player.clubId,
    makeSeed(game.id, 'round', game.week),
  );

  // ── numeric consequences on the player ──────────────────────
  const p = game.player;
  const perf = result.perf;
  const sideGoals = result.playerHome ? result.homeGoals : result.awayGoals;
  const oppGoals = result.playerHome ? result.awayGoals : result.homeGoals;
  const won = sideGoals > oppGoals;
  const draw = sideGoals === oppGoals;

  p.fitness = clamp(p.fitness - ENGINE.matchFatigue, 15, 100);
  p.form = clamp(p.form + (perf.rating - 6.3) * 6, 0, 100);
  p.morale = clamp(p.morale + (won ? 6 : draw ? 1 : -5) + (perf.manOfMatch ? 4 : 0), 0, 100);
  p.reputation = clamp(
    p.reputation + (perf.rating - 6.5) * 1.1 + perf.goals * 0.8 + (perf.manOfMatch ? 1.5 : 0),
    0,
    100,
  );
  if (live.commentaryAfterDecision.some((e) => e.type === 'injury')) {
    p.injuryWeeksLeft = Math.max(p.injuryWeeksLeft, new Rng(result.seed).int(1, 2));
  }

  const oldValue = p.marketValue;
  refreshMarketValue(p);
  perf.valueDelta = p.marketValue - oldValue;

  // ── season stats ────────────────────────────────────────────
  const s = game.seasonStats;
  const totalRatingBefore = s.avgRating * s.matches;
  s.matches += 1;
  s.goals += perf.goals;
  s.assists += perf.assists;
  if (perf.manOfMatch) s.motm += 1;
  s.avgRating = Math.round(((totalRatingBefore + perf.rating) / s.matches) * 10) / 10;

  // ── objectives ──────────────────────────────────────────────
  const goalsObj = game.objectives.find((o) => o.id === 'goals');
  if (goalsObj) goalsObj.current = s.goals;
  const starterObj = game.objectives.find((o) => o.id === 'starter');
  if (starterObj) starterObj.progress = clamp((starterObj.progress ?? 0) + (perf.rating >= 7 ? 6 : 2), 0, 100);

  game.lastMatch = result;
  game.liveMatch = null;

  advanceToNextWeek(game, result);
  return result;
}

function simulateBackgroundRound(game: StoredGame): void {
  simulateOtherFixtures(
    game.week,
    game.allFixtures,
    game.clubs,
    game.standings,
    '__none__',
    makeSeed(game.id, 'round', game.week),
  );
  game.allFixtures.filter((f) => f.week === game.week && !f.played).forEach((f) => (f.played = true));
}

/** Shared end-of-week bookkeeping: news, offers, contract clock, week++. */
function advanceToNextWeek(game: StoredGame, result: MatchResult | null): void {
  const rng = new Rng(makeSeed(game.id, 'week', game.week));

  // contract clock: lose a month every ~4 weeks
  if (game.week % 4 === 0 && game.player.contract.monthsLeft > 0) {
    game.player.contract.monthsLeft -= 1;
  }
  if (game.player.injuryWeeksLeft > 0) game.player.injuryWeeksLeft -= 1;

  generateNews(game, result, rng);
  maybeGenerateOffer(game, rng);

  game.trainingFocus = null;
  game.valueHistory.push(game.player.marketValue);
  if (game.valueHistory.length > 12) game.valueHistory.shift();

  game.week += 1;
  game.matchPending = !!playerFixture(game, game.week);
}

function generateNews(game: StoredGame, result: MatchResult | null, rng: Rng): void {
  const items: NewsItem[] = [];
  if (result) {
    const home = game.clubs.find((c) => c.id === result.homeClubId)!;
    const away = game.clubs.find((c) => c.id === result.awayClubId)!;
    const perf = result.perf;
    const line =
      perf.goals >= 2
        ? `${game.player.lastName} s’offre un doublé, ${game.club.name} enchaîne`
        : perf.goals === 1
          ? `${game.player.lastName} marque encore, note de ${perf.rating.toFixed(1).replace('.', ',')}`
          : perf.manOfMatch
            ? `${game.player.lastName} homme du match malgré tout`
            : `${home.name} ${result.homeGoals}–${result.awayGoals} ${away.name}`;
    items.push({ id: nanoid(6), week: game.week, category: 'TON CLUB', subtitle: 'résultat', text: line, tone: perf.rating >= 7 ? 'good' : perf.rating < 5.5 ? 'bad' : 'neutral' });
  }

  // a rival keeps up
  const rival = rng.pick(game.clubs.filter((c) => c.id !== game.player.clubId));
  items.push({ id: nanoid(6), week: game.week, category: 'RIVAL', subtitle: 'forme', text: `${rival.name} reste sur une bonne série et vise le haut de tableau.`, tone: 'neutral' });

  game.news = [...items, ...game.news].slice(0, 12);
}

/**
 * A stronger club may table an offer once the player is on the radar.
 * The engine sets every figure; the agent conversation only *talks* about it.
 */
function maybeGenerateOffer(game: StoredGame, rng: Rng): void {
  const hasOpen = game.offers.some((o) => o.status === 'open');
  const onRadar = game.player.reputation >= 48 && game.player.form >= 66;
  if (hasOpen || !onRadar || game.week < 5 || game.week > 30) return;
  if (!rng.chance(0.35)) return;

  // pick a clearly stronger club as the suitor
  const suitor = [...game.clubs]
    .filter((c) => c.id !== game.player.clubId)
    .sort((a, b) => b.strength - a.strength)[rng.int(0, 2)];
  if (!suitor) return;

  const wage = Math.round((game.player.contract.wage * rng.float(2.4, 3.6)) / 500) * 500;
  const offer = {
    id: nanoid(8),
    fromClubId: suitor.id,
    wage,
    signingBonus: Math.round(game.player.marketValue * rng.float(0.1, 0.2) / 10_000) * 10_000,
    lengthYears: rng.int(3, 4),
    week: game.week,
    status: 'open' as const,
  };
  game.offers.push(offer);

  const agent = game.characters.find((c) => c.type === 'agent');
  if (agent) {
    game.notifications.unshift({
      id: nanoid(6),
      characterId: agent.id,
      title: `${agent.name.split(' ')[0]} · ton agent`,
      text: `${suitor.name} passe à l’action. Offre concrète sur la table.`,
      week: game.week,
      unread: true,
      kind: 'decision',
    });
    const conv = game.conversations.find((c) => c.characterId === agent.id);
    const msg = { id: nanoid(6), role: 'character' as const, text: `${game.player.firstName}, ça y est : ${suitor.name} a envoyé une offre ferme. On en parle quand tu veux — c’est un vrai carrefour.`, week: game.week, ts: Date.now() };
    if (conv) conv.messages.push(msg);
    else game.conversations.push({ characterId: agent.id, messages: [msg] });
  }
  game.news.unshift({ id: nanoid(6), week: game.week, category: 'RUMEUR · TOI', subtitle: 'mercato', text: `${suitor.name} prêt à passer à l’action pour ${game.player.lastName} ?`, tone: 'neutral' });

  void reputationLabel;
}

/** Re-sort the table (call before sending state to the client). */
export function refreshStandings(game: StoredGame): void {
  game.standings = sortStandings(game.standings);
}
