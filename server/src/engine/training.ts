// ============================================================
// Training progression — deterministic attribute growth with an
// explicit progress-vs-fatigue/injury trade-off.
// ============================================================

import {
  ATTR_LABELS,
  ENGINE,
  type AttrKey,
  type Player,
  type TrainingFocus,
} from '@onze/shared';
import { Rng } from './rng.js';
import { playerOverall, refreshMarketValue } from './player.js';

export interface TrainingOutcome {
  focus: TrainingFocus;
  gain: number; // attribute points gained (0 for rest)
  fitnessDelta: number;
  injuryWeeks: number;
  summary: string; // French, for the news / system line
}

function ageFactor(age: number): number {
  if (age <= 20) return 1.3;
  if (age <= 23) return 1.1;
  if (age <= 27) return 0.8;
  if (age <= 30) return 0.55;
  return 0.35;
}

/**
 * Apply a week of training to the player (mutates in place).
 * Seeded so the injury dice are reproducible.
 */
export function applyTraining(player: Player, focus: TrainingFocus, seed: number): TrainingOutcome {
  const rng = new Rng(seed);

  if (focus === 'repos') {
    const before = player.fitness;
    player.fitness = Math.min(100, player.fitness + ENGINE.restRecovery);
    return {
      focus,
      gain: 0,
      fitnessDelta: player.fitness - before,
      injuryWeeks: 0,
      summary: `Semaine de récupération : forme physique ${player.fitness}%.`,
    };
  }

  const key = focus as AttrKey;
  const cap = Math.min(99, player.potential + 2);
  const headroom = Math.max(0, cap - player.attributes[key]);
  const headroomFactor = Math.min(1.4, Math.max(0.1, headroom / 14));
  // low fitness → less effective, more risk
  const fitnessFactor = 0.6 + (player.fitness / 100) * 0.5;

  let gain = ENGINE.baseTrainingGain * ageFactor(player.age) * headroomFactor * fitnessFactor;
  gain = Math.round(gain * 10) / 10;

  player.attributes[key] = Math.min(cap, Math.round((player.attributes[key] + gain) * 10) / 10);

  // fatigue cost
  const before = player.fitness;
  player.fitness = Math.max(20, player.fitness - 8);
  const fitnessDelta = player.fitness - before;

  // injury risk: worse when pushing hard on an already-tired body
  const injuryChance = ENGINE.injuryBaseChance + (100 - before) / 100 * 0.06;
  let injuryWeeks = 0;
  if (rng.chance(injuryChance)) {
    injuryWeeks = rng.int(1, 3);
    player.injuryWeeksLeft = Math.max(player.injuryWeeksLeft, injuryWeeks);
  }

  refreshMarketValue(player);

  const summary = injuryWeeks
    ? `Focus ${ATTR_LABELS[key]} (+${gain}) mais tu te blesses à l’entraînement (${injuryWeeks} sem.).`
    : `Focus ${ATTR_LABELS[key]} : +${gain}. Overall ${playerOverall(player)}.`;

  return { focus, gain, fitnessDelta, injuryWeeks, summary };
}
