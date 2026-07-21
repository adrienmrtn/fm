// ============================================================
// Match simulation — fully deterministic from a per-match seed.
//
// Two-phase handshake for the match-day screen:
//   1. simulateToDecision()  → commentary up to a micro-decision
//   2. resolveMatch()        → same seed + the player's choice → final
//
// The team score (Elo → expected goals → Poisson) and the player's
// individual line are all computed here. The LLM never touches any
// of these numbers.
// ============================================================

import { nanoid } from 'nanoid';
import type {
  Club,
  LiveMatch,
  MatchEvent,
  MatchResult,
  MicroDecision,
  Player,
  PlayerPerf,
} from '@onze/shared';
import { Rng } from './rng.js';
import { playerOverall } from './player.js';

export interface MatchContext {
  week: number;
  seed: number;
  player: Player;
  playerClub: Club;
  opponent: Club;
  playerHome: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const DECISION: Omit<MicroDecision, 'id' | 'minute'> = {
  prompt:
    'Dernier défenseur au sol, le gardien sort. Tu tentes le lob… ou tu temporises pour servir l’attaquant seul au second poteau ?',
  options: [
    { id: 'lob', label: 'Je tente le lob', desc: 'Gros risque, gloire possible.', risk: 0.7 },
    { id: 'tempo', label: 'Je temporise', desc: 'Passe décisive plus sûre.', risk: 0.3 },
  ],
};

/**
 * The complete, deterministic outcome of a match given the player's
 * micro-decision (or null to stop at the decision). Everything below is
 * derived purely from the seed + game state + the single choice.
 */
interface FullOutcome {
  decisionMinute: number;
  scoreAtDecision: [number, number]; // [player side, opponent] at decision time
  commentaryBefore: MatchEvent[];
  commentaryAfter: MatchEvent[];
  result: MatchResult | null; // null when choice not yet made
}

function runMatch(ctx: MatchContext, choice: string | null): FullOutcome {
  const { player, playerClub, opponent, playerHome, week, seed } = ctx;
  const rng = new Rng(seed);
  const ovr = playerOverall(player);
  const attr = player.attributes;

  // ── team expected goals from strength differential ──────────
  const homeAdv = 5;
  const sideStr = (playerHome ? playerClub.strength + homeAdv : playerClub.strength);
  const oppStr = (playerHome ? opponent.strength : opponent.strength + homeAdv);
  const diff = sideStr - oppStr;
  const expSide = clamp(1.4 + diff * 0.028, 0.2, 4.2);
  const expOpp = clamp(1.4 - diff * 0.028, 0.2, 4.2);

  let sideGoals = rng.poisson(expSide);
  const oppGoals = rng.poisson(expOpp);

  // ── individual attacking line ───────────────────────────────
  const finTech = (attr.finition + attr.technique) / 2;
  const posGoalMul = player.position === 'ATT' ? 1.1 : player.position === 'AIL' ? 0.92 : player.position === 'MIL' ? 0.6 : 0.3;
  const shareGoal = clamp((finTech / 100) * posGoalMul, 0.04, 0.85);
  const shareAssist = clamp((attr.passe / 100) * 0.55, 0.04, 0.7);

  let preGoals = 0;
  let preAssists = 0;
  for (let i = 0; i < sideGoals; i++) {
    if (rng.chance(shareGoal)) preGoals++;
    else if (rng.chance(shareAssist)) preAssists++;
  }

  const shots = clamp(Math.round((finTech / 100) * rng.float(2, 6)) + preGoals, 0, 9);
  const dribbles = clamp(Math.round(((attr.technique + attr.vitesse) / 2 / 100) * rng.float(2, 8)), 0, 12);
  const touches = clamp(Math.round(28 + (attr.passe / 100) * 40 + rng.gaussian(0, 6)), 12, 95);

  // ── base rating (before the decision) ───────────────────────
  const formAdj = ((player.form - 50) / 50) * 0.7;
  const fitAdj = ((player.fitness - 70) / 30) * 0.5;
  let baseRating =
    4.6 +
    ((ovr - 50) / 50) * 3.0 +
    formAdj +
    fitAdj +
    preGoals * 0.9 +
    preAssists * 0.5 +
    dribbles * 0.03 +
    rng.gaussian(0, 0.45);

  // ── the micro-decision ──────────────────────────────────────
  const decisionMinute = rng.int(58, 69);
  const pLob = clamp(0.28 + ((attr.finition + attr.technique + player.form) / 3 / 100) * 0.45, 0.12, 0.72);
  const pTempo = clamp(0.55 + ((attr.passe + attr.mental) / 2 / 100) * 0.35, 0.35, 0.9);

  let decisionGoal = 0;
  let decisionAssist = 0;
  let decisionDelta = 0;
  let decisionText = '';

  if (choice) {
    if (choice === 'lob') {
      if (rng.chance(pLob)) {
        decisionGoal = 1;
        decisionDelta = 1.7;
        decisionText = `${decisionMinute + 1}' — GÉNIE. Le lob retombe juste sous la barre. Le stade explose, tu viens de marquer un but somptueux.`;
      } else {
        decisionDelta = -0.5;
        decisionText = `${decisionMinute + 1}' — Le lob passe au-dessus. L’occasion s’envole, le banc soupire.`;
      }
    } else {
      // tempo
      if (rng.chance(pTempo)) {
        decisionAssist = 1;
        decisionDelta = 1.0;
        decisionText = `${decisionMinute + 1}' — Sang-froid parfait. Tu remises pour ton attaquant qui pousse au fond. Passe décisive.`;
      } else {
        decisionDelta = -0.15;
        decisionText = `${decisionMinute + 1}' — Tu temporises un poil trop, la défense revient et dégage. Rien à signaler.`;
      }
    }
  }

  // pre-decision score = side goals not counting the decision goal
  const decisionAddsGoal = decisionGoal + decisionAssist; // either scores one for your side
  const preDecisionSide = clamp(sideGoals - Math.max(0, decisionAddsGoal ? 0 : 0), 0, 20);
  // decision, when successful, adds one to the side total
  sideGoals = sideGoals + decisionAddsGoal;

  const finalGoals = preGoals + decisionGoal;
  const finalAssists = preAssists + decisionAssist;

  const rating = choice
    ? clamp(Math.round((baseRating + decisionDelta) * 10) / 10, 3.0, 10.0)
    : clamp(Math.round(baseRating * 10) / 10, 3.0, 10.0);

  // ── injury check (small, worse when tired) ──────────────────
  const injuryChance = clamp(0.02 + (70 - player.fitness) / 100 * 0.06, 0.01, 0.12);
  const injured = choice ? rng.chance(injuryChance) : false;

  // ── build score from the perspective of home/away ───────────
  const homeGoals = playerHome ? sideGoals : oppGoals;
  const awayGoals = playerHome ? oppGoals : sideGoals;

  // ── value delta from the performance ────────────────────────
  const won = sideGoals > oppGoals;
  const valueDelta = Math.round(
    ((rating - 6.4) * 45_000 + finalGoals * 40_000 + finalAssists * 20_000 + (won ? 12_000 : 0)) / 10_000,
  ) * 10_000;

  const manOfMatch = !!choice && rating >= 8.0 && sideGoals >= oppGoals;

  // ── commentary ──────────────────────────────────────────────
  const before: MatchEvent[] = [];
  before.push({ minute: 1, type: 'note', text: `Coup d’envoi. ${playerClub.name} ${playerHome ? 'reçoit' : 'se déplace chez'} ${opponent.name}.` });
  if (preGoals > 0) before.push({ minute: rng.int(15, 40), type: 'goal_for', text: `Tu te glisses dans la profondeur et tu conclus. ${player.lastName} lance ${playerClub.name} !` });
  if (preAssists > 0) before.push({ minute: rng.int(20, 50), type: 'assist', text: `Ton centre millimétré trouve une tête plongeante. Passe décisive pour ${player.lastName}.` });
  before.push({ minute: decisionMinute - 3, type: 'note', text: `${opponent.name} pousse, ça s’emballe. Ton latéral récupère et te cherche dans le dos de la défense…` });
  before.push({ minute: decisionMinute - 1, type: 'note', text: `Tu reçois plein axe, tu élimines ton vis-à-vis d’un crochet. La cage se rapproche.` });
  before.sort((a, b) => a.minute - b.minute);

  const after: MatchEvent[] = [];
  if (choice) {
    if (decisionText) after.push({ minute: decisionMinute + 1, type: decisionGoal ? 'goal_for' : decisionAssist ? 'assist' : 'chance', text: decisionText });
    if (injured) after.push({ minute: rng.int(70, 85), type: 'injury', text: `Tu ressens une gêne musculaire et tu cèdes ta place. Rien de grave a priori.` });
    after.push({
      minute: 90,
      type: 'note',
      text: `Coup de sifflet final. ${playerClub.name} ${homeGoals}–${awayGoals} ${opponent.name} ${playerHome ? '' : '(ext.)'}. ${won ? 'Victoire.' : sideGoals === oppGoals ? 'Match nul.' : 'Défaite.'}`,
    });
  }

  const result: MatchResult | null = choice
    ? {
        // deterministic id so a match replays bit-for-bit from its seed
        id: `m${seed.toString(36)}-${week}-${choice}`,
        week,
        seed,
        homeClubId: ctx.playerHome ? playerClub.id : opponent.id,
        awayClubId: ctx.playerHome ? opponent.id : playerClub.id,
        homeGoals,
        awayGoals,
        playerClubId: playerClub.id,
        opponentClubId: opponent.id,
        playerHome,
        perf: {
          rating,
          goals: finalGoals,
          assists: finalAssists,
          touches,
          shots,
          dribbles,
          manOfMatch,
          valueDelta,
          events: [...before, ...after].filter((e) => e.type !== 'note' || e.minute === 90),
        } satisfies PlayerPerf,
      }
    : null;

  const scoreAtDecision: [number, number] = [preDecisionSide, oppGoals >= 1 ? Math.min(oppGoals, oppGoals) : oppGoals];

  return {
    decisionMinute,
    scoreAtDecision,
    commentaryBefore: before,
    commentaryAfter: after,
    result,
  };
}

/** Phase 1: simulate up to the micro-decision. */
export function simulateToDecision(ctx: MatchContext): LiveMatch {
  const out = runMatch(ctx, null);
  return {
    id: nanoid(10),
    week: ctx.week,
    seed: ctx.seed,
    homeClubId: ctx.playerHome ? ctx.playerClub.id : ctx.opponent.id,
    awayClubId: ctx.playerHome ? ctx.opponent.id : ctx.playerClub.id,
    playerHome: ctx.playerHome,
    opponentClubId: ctx.opponent.id,
    phase: 'decision',
    clockAtDecision: out.decisionMinute,
    scoreAtDecision: out.scoreAtDecision,
    commentaryBeforeDecision: out.commentaryBefore,
    decision: { ...DECISION, id: nanoid(6), minute: out.decisionMinute },
    chosenOptionId: null,
    commentaryAfterDecision: [],
    result: null,
  };
}

/** Phase 2: resolve the same match with the player's choice. */
export function resolveMatch(ctx: MatchContext, chosenOptionId: string): LiveMatch {
  const out = runMatch(ctx, chosenOptionId);
  const base = simulateToDecision(ctx);
  return {
    ...base,
    phase: 'final',
    chosenOptionId,
    commentaryAfterDecision: out.commentaryAfter,
    result: out.result,
  };
}
