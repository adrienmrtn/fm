// ============================================================
// Conversation orchestration. Same engine for every character type —
// only the persona + context change.
//
//   - With an API key: assembles the persona prompt (personas.ts),
//     calls the routed model (inference.ts), parses the strict JSON
//     {reply, intent}.
//   - Without a key: a deterministic, in-role MOCK so the full game
//     loop stays playable end-to-end right now.
//
// Either way the returned `intent` is validated + applied by intents.ts;
// the model never sets a number itself.
// ============================================================

import type { Character, ConversationIntent, Message } from '@onze/shared';
import { config, useMockLLM } from '../config.js';
import type { StoredGame } from '../db/model.js';
import { chatComplete, type ChatMessage } from './inference.js';
import { allowedIntents, buildSystemPrompt } from './personas.js';

export interface GeneratedReply {
  reply: string;
  intent: ConversationIntent;
}

const RECENT_TURNS = 8;

/** Produce a character reply (+ optional structured intent). */
export async function generateReply(
  game: StoredGame,
  character: Character,
  history: Message[],
  playerText: string,
): Promise<GeneratedReply> {
  if (useMockLLM()) {
    return mockReply(game, character, playerText);
  }
  try {
    return await llmReply(game, character, history, playerText);
  } catch (err) {
    // never break the game loop on an inference error — fall back to mock
    console.error('[inference] fallback to mock:', (err as Error).message);
    return mockReply(game, character, playerText);
  }
}

// ─── real LLM path ───────────────────────────────────────────
async function llmReply(
  game: StoredGame,
  character: Character,
  history: Message[],
  playerText: string,
): Promise<GeneratedReply> {
  const messages: ChatMessage[] = [{ role: 'system', content: buildSystemPrompt(game, character) }];
  for (const m of history.slice(-RECENT_TURNS)) {
    messages.push({ role: m.role === 'player' ? 'user' : 'assistant', content: m.text });
  }
  messages.push({ role: 'user', content: playerText });

  // route the strong model on key beats (an open offer on the table)
  const importance = game.offers.some((o) => o.status === 'open') && character.type === 'agent' ? 'key' : 'normal';
  const raw = await chatComplete({ messages, importance, temperature: 0.85, maxTokens: 320 });
  return parseModelJson(raw, character);
}

/** Defensively parse the model's JSON; degrade gracefully. */
function parseModelJson(raw: string, character: Character): GeneratedReply {
  const allowed = allowedIntents(character);
  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
    const obj = JSON.parse(slice) as { reply?: string; intent?: ConversationIntent };
    const reply = (obj.reply ?? '').trim() || raw.trim();
    let intent: ConversationIntent = obj.intent ?? { intent: 'none' };
    // guardrail: strip intents the character may not use
    if (!intent.intent || !allowed.includes(intent.intent)) intent = { intent: 'none' };
    return { reply, intent };
  } catch {
    return { reply: raw.trim(), intent: { intent: 'none' } };
  }
}

// ─── deterministic mock persona engine ───────────────────────
function mockReply(game: StoredGame, character: Character, playerText: string): GeneratedReply {
  const t = playerText.toLowerCase();
  const openOffer = game.offers.find((o) => o.status === 'open');
  const suitor = openOffer ? game.clubs.find((c) => c.id === openOffer.fromClubId) : null;
  const first = game.player.firstName;

  const yes = /\b(oui|ok|d'accord|daccord|accepte|banco|go|allons-y|je signe|signe)\b/.test(t);
  const no = /\b(non|refuse|reste|jamais|pas question|décline|decline)\b/.test(t);

  switch (character.type) {
    case 'agent': {
      if (openOffer && suitor) {
        if (yes) return { reply: `Parfait, ${first}. Je boucle avec ${suitor.name}, tu signes. Grosse étape — bravo.`, intent: { intent: 'accept_offer', offerId: openOffer.id } };
        if (no) return { reply: `Reçu. Je dis non à ${suitor.name} et on continue de bosser ici. Ta carrière, ton rythme.`, intent: { intent: 'decline_offer', offerId: openOffer.id } };
        return { reply: `${suitor.name} met ${fmt(openOffer.wage)}/sem. sur la table. C'est du sérieux. Tu veux qu'on y aille ou tu préfères rester encore ?`, intent: { intent: 'none' } };
      }
      if (/transfert|partir|plus haut|gros club|mercato/.test(t)) {
        return { reply: `Je te comprends. Je mets mes contacts en alerte — si une belle porte s'ouvre, tu seras le premier au courant.`, intent: { intent: 'push_for_transfer' } };
      }
      return { reply: `Content d'avoir de tes nouvelles, ${first}. Rien de brûlant côté marché, mais je veille. Enchaîne les perfs, le reste suivra.`, intent: { intent: 'none' } };
    }
    case 'coach': {
      if (/salaire|augment|revaloris|contrat|prime/.test(t)) {
        return { reply: `On peut regarder ton contrat, mais ça se mérite sur le terrain. Montre-moi de la constance et je monte au créneau pour toi.`, intent: { intent: 'request_wage_raise' } };
      }
      if (/entraîn|entrain|travaill|focus|bosser|progress/.test(t)) {
        if (/finition|but|frappe/.test(t)) return { reply: `Bonne mentalité. On met le paquet sur la finition cette semaine.`, intent: { intent: 'set_training_focus', focus: 'finition' } };
        if (/vitesse|sprint/.test(t)) return { reply: `D'accord, on travaille ta vitesse. Sois sérieux aux séances.`, intent: { intent: 'set_training_focus', focus: 'vitesse' } };
        return { reply: `J'aime cette envie de bosser. Dis-moi l'attribut et je cale la séance.`, intent: { intent: 'none' } };
      }
      if (/confiance|inquiet|douté|doute|forme|peur/.test(t)) {
        return { reply: `Garde la tête froide, petit. Tu as le niveau. Je crois en toi — rends-le moi sur le terrain.`, intent: { intent: 'reassure_coach' } };
      }
      return { reply: `Reste concentré sur le prochain match. Côté gauche, je compte sur toi.`, intent: { intent: 'none' } };
    }
    case 'coequipier': {
      if (/match|prêt|pret|ce week|samedi/.test(t)) return { reply: `On est chauds ! Toi tu prends ton couloir, moi je te trouve. On les fait déjouer.`, intent: { intent: 'none' } };
      return { reply: `Tranquille frérot, tu joues bien en ce moment. Continue comme ça et lâche rien.`, intent: { intent: 'reassure_coach' } };
    }
    case 'journaliste': {
      if (openOffer && suitor && /transfert|partir|rester|avenir/.test(t)) {
        return { reply: `Donc un départ vers ${suitor.name} n'est pas exclu… Une petite phrase pour nos lecteurs sur votre avenir ?`, intent: { intent: 'none' } };
      }
      return { reply: `Merci de m'accorder ce moment. Comment vivez-vous cette éclosion à ${game.club.name} ? On vous surnomme déjà « le prodige ».`, intent: { intent: 'none' } };
    }
    default:
      return { reply: `…`, intent: { intent: 'none' } };
  }

  function fmt(v: number): string {
    return v >= 1000 ? `${Math.round(v / 1000)} k€` : `${v} €`;
  }
}

// ─── suggested replies (contextual, French) ──────────────────
export function suggestionsFor(game: StoredGame, character: Character): string[] {
  const openOffer = game.offers.some((o) => o.status === 'open');
  switch (character.type) {
    case 'agent':
      return openOffer
        ? ['Je veux jouer. On reste.', 'Le grand saut me tente, on y va.', 'Fais monter le salaire d’abord.']
        : ['Où en est le marché pour moi ?', 'Je me sens prêt pour plus haut.', 'On reste concentrés sur la saison.'];
    case 'coach':
      return ['Sur quoi je dois bosser ?', 'On peut parler de mon contrat ?', 'J’ai un doute, rassure-moi.'];
    case 'coequipier':
      return ['Chaud pour le prochain match ?', 'Merci, ça fait du bien.', 'On répète les combinaisons ?'];
    case 'journaliste':
      return ['Je me concentre sur le terrain.', 'Verdun, c’est ma priorité.', 'L’avenir, on verra plus tard.'];
    default:
      return ['…'];
  }
}

// ─── compressed memory update (kept short) ───────────────────
export function updateMemory(character: Character, playerText: string, reply: string): void {
  const gist = `Récemment : le joueur a dit « ${truncate(playerText, 60)} », tu as répondu « ${truncate(reply, 60)} ».`;
  // keep the base summary + only the latest gist, so context stays small
  const base = character.memorySummary.split(' | Récemment')[0];
  character.memorySummary = `${base} | ${gist}`;
  void config; // provider config reserved for future summary routing
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
