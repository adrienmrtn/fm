// ============================================================
// Derived player values — all deterministic, all owned by code.
// Overall rating, form label and market value are computed here
// from the raw attributes; nothing else may set them.
// ============================================================

import {
  ENGINE,
  type AttrKey,
  type Attributes,
  type FormLabel,
  type Player,
  type Position,
} from '@onze/shared';

/** How much each attribute matters per position (weights sum ≈ 1). */
const POSITION_WEIGHTS: Record<Position, Record<AttrKey, number>> = {
  GB: { finition: 0.05, vitesse: 0.1, passe: 0.15, physique: 0.25, mental: 0.3, technique: 0.15 },
  DEF: { finition: 0.05, vitesse: 0.2, passe: 0.15, physique: 0.3, mental: 0.2, technique: 0.1 },
  MIL: { finition: 0.12, vitesse: 0.15, passe: 0.28, physique: 0.13, mental: 0.15, technique: 0.17 },
  AIL: { finition: 0.2, vitesse: 0.26, passe: 0.13, physique: 0.06, mental: 0.1, technique: 0.25 },
  ATT: { finition: 0.32, vitesse: 0.2, passe: 0.08, physique: 0.14, mental: 0.11, technique: 0.15 },
};

/** Weighted overall rating (0..100) for a set of attributes at a position. */
export function overall(attributes: Attributes, position: Position): number {
  const w = POSITION_WEIGHTS[position];
  let sum = 0;
  (Object.keys(w) as AttrKey[]).forEach((k) => {
    sum += attributes[k] * w[k];
  });
  return Math.round(sum);
}

export function playerOverall(p: Player): number {
  return overall(p.attributes, p.position);
}

/** Map the hidden 0..100 form momentum to a French label. */
export function formLabel(form: number): FormLabel {
  if (form >= 82) return 'En feu';
  if (form >= 64) return 'Bonne';
  if (form >= 42) return 'Neutre';
  if (form >= 24) return 'Fébrile';
  return 'En berne';
}

/**
 * Market value in euros. Grows super-linearly with overall, is lifted
 * by youth + potential headroom, and nudged by form and reputation.
 */
export function computeMarketValue(p: Player): number {
  const ovr = playerOverall(p);
  const base = Math.pow(ovr, ENGINE.valueExp) * ENGINE.valueScale;

  // youth premium: a 19 y/o with high potential is worth far more
  const ageFactor = p.age <= 21 ? 1.35 : p.age <= 25 ? 1.1 : p.age <= 29 ? 0.9 : 0.6;
  const potentialHeadroom = Math.max(0, p.potential - ovr);
  const potentialFactor = 1 + potentialHeadroom * 0.03;

  const formFactor = 0.9 + (p.form / 100) * 0.2;
  const repFactor = 0.85 + (p.reputation / 100) * 0.4;

  const raw = base * ageFactor * potentialFactor * formFactor * repFactor;
  // round to a clean-ish figure (nearest 10k)
  return Math.max(50_000, Math.round(raw / 10_000) * 10_000);
}

/** Recompute market value in place after any attribute/form change. */
export function refreshMarketValue(p: Player): void {
  p.marketValue = computeMarketValue(p);
}

/** Format euros as the maquette does: "4,2 M€", "600 k€", "45 k€". */
export function formatEuro(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${m.toFixed(m >= 10 ? 0 : 1).replace('.', ',')} M€`;
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)} k€`;
  }
  return `${value} €`;
}
