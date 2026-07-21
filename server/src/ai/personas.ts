// ============================================================
// Persona system. Assembles the server-side prompt for a Character:
//   persona + read-only game state + memory summary + guardrails.
//
// The state context is strictly READ-ONLY facts. The model may quote
// them but must never invent or change a number — any real effect must
// come back as a structured intent that the backend validates.
// ============================================================

import {
  ATTR_LABELS,
  CHARACTER_LABELS,
  POSITION_LABELS,
  reputationLabel,
  type Character,
  type ConversationIntent,
} from '@onze/shared';
import { formatEuro, playerOverall } from '../engine/player.js';
import type { StoredGame } from '../db/model.js';

/** Intents each character type is allowed to propose. */
export function allowedIntents(character: Character): ConversationIntent['intent'][] {
  switch (character.type) {
    case 'agent':
      return ['accept_offer', 'decline_offer', 'push_for_transfer', 'none'];
    case 'coach':
      return ['reassure_coach', 'set_training_focus', 'request_wage_raise', 'none'];
    case 'coequipier':
      return ['reassure_coach', 'none'];
    case 'journaliste':
      return ['none'];
    default:
      return ['none'];
  }
}

/** Read-only snapshot of the facts a character is allowed to reference. */
export function buildStateContext(game: StoredGame, character: Character): string {
  const p = game.player;
  const openOffer = game.offers.find((o) => o.status === 'open');
  const suitor = openOffer ? game.clubs.find((c) => c.id === openOffer.fromClubId) : null;

  const lines = [
    `Semaine ${game.week}, saison ${game.season}.`,
    `Joueur : ${p.firstName} ${p.lastName}, ${p.age} ans, ${POSITION_LABELS[p.position]}, n°${p.squadNumber}.`,
    `Club : ${game.club.name} (${game.league.name}).`,
    `Overall ${playerOverall(p)}, forme ${p.form >= 82 ? 'excellente' : p.form >= 64 ? 'bonne' : 'moyenne'}, forme physique ${p.fitness}%.`,
    `Valeur marchande : ${formatEuro(p.marketValue)}. Réputation : ${reputationLabel(p.reputation)}.`,
    `Contrat actuel : ${formatEuro(p.contract.wage)}/sem., ${p.contract.monthsLeft} mois restants.`,
    `Stats saison : ${game.seasonStats.matches} matchs, ${game.seasonStats.goals} buts, ${game.seasonStats.assists} passes déc.`,
    `Relation avec toi (${character.name}) : ${character.relationship}/100.`,
  ];
  if (openOffer && suitor) {
    lines.push(
      `OFFRE EN COURS (id=${openOffer.id}) de ${suitor.name} : ${formatEuro(openOffer.wage)}/sem., prime ${formatEuro(openOffer.signingBonus)}, ${openOffer.lengthYears} ans.`,
    );
  }
  const topAttr = (Object.keys(p.attributes) as (keyof typeof p.attributes)[]).sort(
    (a, b) => p.attributes[b] - p.attributes[a],
  )[0];
  lines.push(`Meilleur atout : ${ATTR_LABELS[topAttr]} (${Math.round(p.attributes[topAttr])}).`);
  return lines.join('\n');
}

/** The complete system prompt for a character turn. */
export function buildSystemPrompt(game: StoredGame, character: Character): string {
  const intents = allowedIntents(character);
  return `Tu es ${character.name}, ${CHARACTER_LABELS[character.type]} dans un jeu de carrière de footballeur. Tu t'adresses DIRECTEMENT au joueur.

PERSONNALITÉ : ${character.personality}
STYLE DE PAROLE : ${character.speechStyle}
${character.hiddenAgenda ? `AGENDA CACHÉ (ne jamais l'avouer explicitement) : ${character.hiddenAgenda}` : ''}

MÉMOIRE DE VOS ÉCHANGES : ${character.memorySummary}

ÉTAT DU JEU (LECTURE SEULE — faits officiels, ne jamais les contredire) :
${buildStateContext(game, character)}

RÈGLES ABSOLUES :
- Réponds en français, en restant strictement dans ton rôle et ton style.
- 1 à 3 phrases, ton naturel de messagerie. Pas de narration à la 3e personne.
- Tu ne FIXES jamais un chiffre (salaire, valeur, note) : si un montant est en jeu, réfère-toi UNIQUEMENT aux faits ci-dessus. N'invente aucune donnée.
- Si l'échange doit produire un effet dans le jeu, propose une intention structurée parmi : ${intents.join(', ')}.

FORMAT DE SORTIE STRICT : un objet JSON, rien d'autre.
{"reply": "<ta réplique>", "intent": {"intent": "<une valeur autorisée>", ...paramètres}}
Si aucun effet n'est nécessaire, utilise {"intent":"none"}.
Exemple si le joueur accepte l'offre en cours : {"reply":"...","intent":{"intent":"accept_offer","offerId":"<id de l'offre>"}}`;
}
