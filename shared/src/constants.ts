// ============================================================
// ONZE — shared constants, labels and engine tuning.
// French copy for anything shown in-game; English for code.
// ============================================================

import type {
  AttrKey,
  ClubTier,
  Physique,
  Position,
  TrainingFocus,
} from './types.js';

export const ATTR_KEYS: AttrKey[] = [
  'vitesse',
  'technique',
  'passe',
  'finition',
  'physique',
  'mental',
];

export const ATTR_LABELS: Record<AttrKey, string> = {
  finition: 'Finition',
  vitesse: 'Vitesse',
  passe: 'Passe',
  physique: 'Physique',
  mental: 'Mental',
  technique: 'Technique',
};

export const POSITION_LABELS: Record<Position, string> = {
  GB: 'Gardien',
  DEF: 'Défenseur',
  MIL: 'Milieu',
  AIL: 'Ailier gauche',
  ATT: 'Attaquant',
};

export const POSITION_SHORT: Record<Position, string> = {
  GB: 'GB',
  DEF: 'DÉF',
  MIL: 'MIL',
  AIL: 'AIL',
  ATT: 'ATT',
};

export const PHYSIQUE_LABELS: Record<Physique, string> = {
  leger: 'Léger & rapide',
  equilibre: 'Équilibré',
  puissant: 'Puissant',
};

export const TIER_LABELS: Record<ClubTier, string> = {
  national: 'National',
  ligue2: 'Ligue 2',
  ligue1: 'Ligue 1',
};

export const TIER_BLURB: Record<ClubTier, string> = {
  national: 'Tout à prouver. Attributs modestes, pression faible.',
  ligue2: 'Milieu de tableau ambitieux. Bon équilibre progression / temps de jeu.',
  ligue1: 'Grande scène, banc probable. Pression maximale.',
};

/** Baseline team strength (0..100) of the division for each tier. */
export const TIER_BASE_STRENGTH: Record<ClubTier, number> = {
  national: 46,
  ligue2: 58,
  ligue1: 72,
};

export const FOCUS_LABELS: Record<TrainingFocus, string> = {
  finition: 'Finition',
  vitesse: 'Vitesse',
  passe: 'Passe',
  physique: 'Physique',
  mental: 'Mental',
  technique: 'Technique',
  repos: 'Se reposer',
};

export const FOCUS_BLURB: Record<TrainingFocus, string> = {
  finition: 'Frappes, sang-froid devant le but.',
  vitesse: 'Accélération, sprints répétés.',
  passe: 'Vision, précision des centres.',
  physique: 'Puissance, résistance aux duels.',
  mental: 'Concentration, gestion de la pression.',
  technique: 'Contrôle, dribble, qualité de touche.',
  repos: 'Récupère de la forme physique, zéro risque. Aucun gain d’attribut.',
};

// ─── Engine tuning ───────────────────────────────────────────

export const ENGINE = {
  /** matches per season (weeks with a fixture) */
  fixturesPerSeason: 34,
  /** fitness lost by playing a full match */
  matchFatigue: 14,
  /** fitness recovered by a "repos" week */
  restRecovery: 15,
  /** fitness recovered passively each week */
  passiveRecovery: 6,
  /** base attribute gain for a training focus at low age */
  baseTrainingGain: 0.9,
  /** injury base probability when training hard at low fitness */
  injuryBaseChance: 0.05,
  /** market value is roughly overall^valueExp * valueScale */
  valueScale: 1.6,
  valueExp: 3.15,
} as const;

/** Reputation buckets → French label shown on the profile. */
export function reputationLabel(rep: number): string {
  if (rep >= 85) return 'Mondiale';
  if (rep >= 68) return 'Continentale';
  if (rep >= 50) return 'Nationale';
  if (rep >= 30) return 'Régionale';
  return 'Locale';
}

/** Format euros the way the maquette does: "4,2 M€", "600 k€", "45 k€". */
export function formatEuro(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${m.toFixed(m >= 10 ? 0 : 1).replace('.', ',')} M€`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)} k€`;
  return `${value} €`;
}

/** French decimal rating, e.g. 8.6 → "8,6". */
export function formatRating(r: number): string {
  return r.toFixed(1).replace('.', ',');
}

export const CHARACTER_LABELS: Record<string, string> = {
  agent: 'ton agent',
  coach: 'ton coach',
  coequipier: 'coéquipier',
  journaliste: 'presse',
};
