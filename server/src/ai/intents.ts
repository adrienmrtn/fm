// ============================================================
// Structured effects. A conversation can only move the numbers by
// returning a ConversationIntent, which the backend VALIDATES against
// the rules and the current state before applying. Free text from the
// model is never trusted for values — every figure below is set here.
// ============================================================

import { nanoid } from 'nanoid';
import {
  ATTR_KEYS,
  type AppliedEffect,
  type Character,
  type ConversationIntent,
} from '@onze/shared';
import { formatEuro, refreshMarketValue } from '../engine/player.js';
import type { StoredGame } from '../db/model.js';
import { allowedIntents } from './personas.js';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Validate an intent against the character's permissions and the game
 * rules, then apply it. Returns a French summary line, or null when the
 * intent is 'none' / rejected.
 */
export function applyIntent(
  game: StoredGame,
  character: Character,
  intent: ConversationIntent,
): AppliedEffect | null {
  if (!intent || intent.intent === 'none') return null;

  // permission gate: the character must be allowed to propose this
  if (!allowedIntents(character).includes(intent.intent)) {
    return { ok: false, summary: 'Cette demande sort du rôle de ton interlocuteur.' };
  }

  switch (intent.intent) {
    case 'accept_offer':
      return acceptOffer(game, character, intent.offerId);
    case 'decline_offer':
      return declineOffer(game, character, intent.offerId);
    case 'request_wage_raise':
      return requestWageRaise(game, character);
    case 'set_training_focus':
      return setTrainingFocus(game, intent.focus);
    case 'reassure_coach':
      return reassure(game, character);
    case 'push_for_transfer':
      return pushForTransfer(game, character);
    default:
      return null;
  }
}

function acceptOffer(game: StoredGame, agent: Character, offerId: string): AppliedEffect {
  const offer = game.offers.find((o) => o.id === offerId && o.status === 'open');
  if (!offer) return { ok: false, summary: 'Aucune offre valide à accepter.' };
  const suitor = game.clubs.find((c) => c.id === offer.fromClubId);
  if (!suitor) return { ok: false, summary: 'Club acheteur introuvable.' };

  // engine sets every figure — none of this comes from the LLM text
  offer.status = 'accepted';
  game.offers.forEach((o) => {
    if (o.id !== offerId && o.status === 'open') o.status = 'declined';
  });

  const p = game.player;
  p.clubId = suitor.id;
  p.contract = { clubId: suitor.id, wage: offer.wage, monthsLeft: offer.lengthYears * 12 };
  game.club = suitor;
  p.reputation = clamp(p.reputation + 6, 0, 100);
  p.morale = clamp(p.morale + 8, 0, 100);
  agent.relationship = clamp(agent.relationship + 5, 0, 100);
  refreshMarketValue(p);

  game.news.unshift({
    id: nanoid(6),
    week: game.week,
    category: 'TRANSFERT',
    subtitle: 'officiel',
    text: `Officiel : ${p.lastName} signe à ${suitor.name} (${formatEuro(offer.wage)}/sem., ${offer.lengthYears} ans).`,
    tone: 'good',
  });
  return { ok: true, summary: `Transfert conclu à ${suitor.name}. Nouveau contrat : ${formatEuro(offer.wage)}/sem., ${offer.lengthYears} ans.` };
}

function declineOffer(game: StoredGame, agent: Character, offerId: string): AppliedEffect {
  const offer = game.offers.find((o) => o.id === offerId && o.status === 'open');
  if (!offer) return { ok: false, summary: 'Aucune offre valide à refuser.' };
  offer.status = 'declined';
  agent.relationship = clamp(agent.relationship - 2, 0, 100);
  game.player.morale = clamp(game.player.morale + 2, 0, 100);
  return { ok: true, summary: 'Offre refusée. Tu restes à ton club pour l’instant.' };
}

function requestWageRaise(game: StoredGame, coach: Character): AppliedEffect {
  const p = game.player;
  // granted only if the player has earned it
  const deserves = p.reputation >= 45 && p.form >= 60 && game.seasonStats.avgRating >= 6.6;
  if (!deserves) {
    coach.relationship = clamp(coach.relationship - 2, 0, 100);
    return { ok: false, summary: 'Le club refuse la revalorisation pour l’instant. Continue à performer.' };
  }
  const raise = Math.round((p.contract.wage * 0.25) / 500) * 500;
  p.contract.wage += raise;
  p.contract.monthsLeft = Math.max(p.contract.monthsLeft, 18);
  p.morale = clamp(p.morale + 6, 0, 100);
  coach.relationship = clamp(coach.relationship + 3, 0, 100);
  return { ok: true, summary: `Salaire revalorisé : +${formatEuro(raise)}/sem. (désormais ${formatEuro(p.contract.wage)}).` };
}

function setTrainingFocus(game: StoredGame, focus: string): AppliedEffect {
  if (!ATTR_KEYS.includes(focus as never) && focus !== 'repos') {
    return { ok: false, summary: 'Focus d’entraînement invalide.' };
  }
  game.trainingFocus = focus as StoredGame['trainingFocus'];
  return { ok: true, summary: `Focus de la semaine réglé sur « ${focus} ».` };
}

function reassure(game: StoredGame, character: Character): AppliedEffect {
  character.relationship = clamp(character.relationship + 4, 0, 100);
  game.player.morale = clamp(game.player.morale + 3, 0, 100);
  return { ok: true, summary: `Relation avec ${character.name} renforcée.` };
}

function pushForTransfer(game: StoredGame, agent: Character): AppliedEffect {
  agent.relationship = clamp(agent.relationship + 2, 0, 100);
  game.player.morale = clamp(game.player.morale - 2, 0, 100);
  return { ok: true, summary: 'Ton agent va activer ses contacts. Une offre pourrait arriver.' };
}
