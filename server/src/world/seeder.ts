// ============================================================
// "Nouvelle carrière" seeder — builds a coherent fictional world:
// one division of ~18 clubs, the player, the starting PNJs, the
// season schedule and the opening notifications/news.
// Deterministic from the game id.
// ============================================================

import { nanoid } from 'nanoid';
import {
  POSITION_SHORT,
  TIER_BASE_STRENGTH,
  reputationLabel,
  type Attributes,
  type Character,
  type Club,
  type NewCareerInput,
  type NewsItem,
  type Notification,
  type Objective,
  type Physique,
  type Player,
  type Position,
} from '@onze/shared';
import { Rng, makeSeed } from '../engine/rng.js';
import { computeMarketValue } from '../engine/player.js';
import { emptyStandings, generateFixtures } from '../engine/league.js';
import type { StoredGame } from '../db/model.js';
import {
  AGENT_NAMES,
  CITY_ROOTS,
  CLUB_PREFIXES,
  COACH_NAMES,
  JOURNALIST_NAMES,
  TEAMMATE_NAMES,
  shortTag,
} from './names.js';

const NUM_CLUBS = 18;
const SEASON = '25 · 26';

/** Baseline attribute template per position (a promising young player). */
const BASE_ATTRS: Record<Position, Attributes> = {
  GB: { finition: 30, vitesse: 55, passe: 60, physique: 74, mental: 72, technique: 58 },
  DEF: { finition: 45, vitesse: 70, passe: 66, physique: 78, mental: 71, technique: 64 },
  MIL: { finition: 64, vitesse: 72, passe: 78, physique: 68, mental: 72, technique: 76 },
  AIL: { finition: 71, vitesse: 84, passe: 74, physique: 65, mental: 68, technique: 79 },
  ATT: { finition: 80, vitesse: 79, passe: 66, physique: 72, mental: 70, technique: 74 },
};

function applyPhysique(attrs: Attributes, physique: Physique): void {
  if (physique === 'leger') {
    attrs.vitesse += 4;
    attrs.technique += 2;
    attrs.physique -= 5;
  } else if (physique === 'puissant') {
    attrs.physique += 6;
    attrs.finition += 1;
    attrs.vitesse -= 4;
  }
}

function makeClubs(rng: Rng, tier: NewCareerInput['clubTier']): Club[] {
  const base = TIER_BASE_STRENGTH[tier];
  const roots = [...CITY_ROOTS];
  // shuffle roots deterministically
  for (let i = roots.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [roots[i], roots[j]] = [roots[j], roots[i]];
  }

  const clubs: Club[] = [];
  // player's club is always AC Verdun, mid-table ambitious
  clubs.push({
    id: nanoid(8),
    name: 'AC Verdun',
    shortName: 'VER',
    tier,
    strength: Math.round(base + 2),
  });

  for (let i = 0; i < NUM_CLUBS - 1; i++) {
    const root = roots[i % roots.length];
    const prefix = rng.pick(CLUB_PREFIXES);
    const name = `${prefix} ${root}`;
    const strength = Math.round(base + rng.gaussian(0, 9));
    clubs.push({
      id: nanoid(8),
      name,
      shortName: shortTag(name),
      tier,
      strength: Math.max(30, Math.min(95, strength)),
    });
  }
  return clubs;
}

function makePlayer(rng: Rng, input: NewCareerInput, clubId: string): Player {
  const attrs: Attributes = { ...BASE_ATTRS[input.position] };
  applyPhysique(attrs, input.physique);
  // tier nudges the starting level
  const tierBump = input.clubTier === 'ligue1' ? 3 : input.clubTier === 'national' ? -3 : 0;
  (Object.keys(attrs) as (keyof Attributes)[]).forEach((k) => {
    attrs[k] = Math.max(30, Math.min(92, Math.round(attrs[k] + tierBump + rng.gaussian(0, 2))));
  });

  const potential = Math.max(...Object.values(attrs)) + rng.int(4, 12);
  const wage =
    input.clubTier === 'ligue1' ? rng.int(9, 16) * 1000 :
    input.clubTier === 'ligue2' ? rng.int(3, 7) * 1000 :
    rng.int(1, 3) * 1000;

  const player: Player = {
    id: nanoid(8),
    firstName: input.firstName,
    lastName: input.lastName,
    age: input.age,
    position: input.position,
    physique: input.physique,
    squadNumber: input.position === 'AIL' ? 11 : rng.int(2, 30),
    clubId,
    attributes: attrs,
    potential: Math.min(99, potential),
    form: 84,
    fitness: 88,
    morale: 72,
    marketValue: 0,
    reputation: 42,
    contract: { clubId, wage, monthsLeft: 8 },
    injuryWeeksLeft: 0,
  };
  player.marketValue = computeMarketValue(player);
  return player;
}

function makeCharacters(rng: Rng, playerLast: string): Character[] {
  const agent = rng.pick(AGENT_NAMES);
  const coach = rng.pick(COACH_NAMES);
  const journalist = rng.pick(JOURNALIST_NAMES);
  const [t1, t2] = [TEAMMATE_NAMES[0], TEAMMATE_NAMES[1]];

  const initials = (n: string) =>
    n.replace('Coach ', '').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return [
    {
      id: nanoid(8),
      type: 'agent',
      name: agent,
      initials: initials(agent),
      personality: 'Franc, ambitieux, protecteur mais opportuniste. Parle vite, va au but.',
      speechStyle: 'Tutoie, phrases courtes, argot du foot, chiffres en tête.',
      hiddenAgenda: `Pousser ${playerLast} vers un plus gros club pour sa commission, sans le brusquer.`,
      relationship: 78,
      memorySummary: `Agent de ${playerLast} depuis ses débuts. Confiance solide. Surveille le marché.`,
      accentColor: '#b98cff',
    },
    {
      id: nanoid(8),
      type: 'coach',
      name: coach,
      initials: initials(coach),
      personality: 'Exigeant, paternaliste, loyal au club. Déteste les egos.',
      speechStyle: 'Vouvoie parfois, ton posé, exige de l’engagement.',
      hiddenAgenda: 'Garder son meilleur jeune une saison de plus pour viser la montée.',
      relationship: 64,
      memorySummary: `Coach de l’AC Verdun. A lancé ${playerLast} en pro. Attend de la constance.`,
      accentColor: '#8cb3ff',
    },
    {
      id: nanoid(8),
      type: 'coequipier',
      name: t1,
      initials: t1.split(' ').map((w) => w[0]).join('').toUpperCase(),
      personality: 'Blagueur, soudé au vestiaire, capitaine dans l’âme.',
      speechStyle: 'Détendu, chambreur, encourageant.',
      hiddenAgenda: null,
      relationship: 70,
      memorySummary: `Coéquipier et ami de ${playerLast}. Bonne alchimie sur le terrain.`,
      accentColor: '#8cffb3',
    },
    {
      id: nanoid(8),
      type: 'journaliste',
      name: journalist,
      initials: journalist.split(' ').map((w) => w[0]).join('').toUpperCase(),
      personality: 'Curieuse, flatteuse en surface, cherche la petite phrase.',
      speechStyle: 'Polie, questions ouvertes, relances insistantes.',
      hiddenAgenda: `Décrocher une déclaration sur l’avenir de ${playerLast} (mercato).`,
      relationship: 50,
      memorySummary: `Suit l’éclosion de ${playerLast}. A déjà titré « le prodige de Verdun ».`,
      accentColor: '#ffb98c',
    },
    {
      id: nanoid(8),
      type: 'coequipier',
      name: t2,
      initials: t2.split(' ').map((w) => w[0]).join('').toUpperCase(),
      personality: 'Concurrent au poste, cordial mais rival.',
      speechStyle: 'Direct, un peu sur la réserve.',
      hiddenAgenda: 'Récupérer la place de titulaire.',
      relationship: 55,
      memorySummary: `Joue au même poste que ${playerLast}. Rivalité saine pour la place.`,
      accentColor: '#ffd28c',
    },
  ];
}

export function seedNewCareer(input: NewCareerInput): StoredGame {
  const id = nanoid(10);
  const seed = makeSeed(id, input.firstName, input.lastName, input.position, input.clubTier);
  const rng = new Rng(seed);

  const clubs = makeClubs(rng, input.clubTier);
  const playerClub = clubs[0];
  const player = makePlayer(rng, input, playerClub.id);
  const characters = makeCharacters(rng, player.lastName);
  const agent = characters.find((c) => c.type === 'agent')!;
  const coach = characters.find((c) => c.type === 'coach')!;
  const journalist = characters.find((c) => c.type === 'journaliste')!;

  const allFixtures = generateFixtures(clubs.map((c) => c.id), seed ^ 0x51ed);
  const standings = emptyStandings(clubs.map((c) => c.id));

  const objectives: Objective[] = [
    { id: 'starter', label: 'Devenir titulaire indiscutable', kind: 'progress', progress: 30 },
    { id: 'goals', label: '10 buts cette saison', kind: 'count', current: 0, target: 10 },
  ];

  const notifications: Notification[] = [
    { id: nanoid(6), characterId: agent.id, title: `${agent.name.split(' ')[0]} · ton agent`, text: 'Des clubs se renseignent sur toi. On en parle ?', week: 1, unread: true, kind: 'message' },
    { id: nanoid(6), characterId: coach.id, title: coach.name, text: 'Point d’avant-match bientôt. Sois prêt.', week: 1, unread: true, kind: 'message' },
    { id: nanoid(6), characterId: journalist.id, title: `${journalist.name} · presse`, text: 'Interview : « le prodige de Verdun »', week: 1, unread: true, kind: 'press' },
  ];

  const news: NewsItem[] = [
    { id: nanoid(6), week: 1, category: 'TON CLUB', subtitle: 'saison', text: `${playerClub.name} lance sa saison en ${input.clubTier === 'ligue1' ? 'Ligue 1' : input.clubTier === 'ligue2' ? 'Ligue 2' : 'National'} avec de l’ambition.`, tone: 'good' },
    { id: nanoid(6), week: 1, category: 'RUMEUR · TOI', subtitle: 'mercato', text: `Un jeune ailier de Verdun attire déjà les recruteurs. Info ou intox ?`, tone: 'neutral' },
    { id: nanoid(6), week: 1, category: 'LIGUE', subtitle: 'avant-match', text: `Le championnat reprend ce week-end. Tous les yeux sur les promus.`, tone: 'neutral' },
  ];

  const game: StoredGame = {
    id,
    createdAt: Date.now(),
    season: SEASON,
    week: 1,
    player,
    club: playerClub,
    league: { id: nanoid(8), name: input.clubTier === 'ligue1' ? 'Ligue 1' : input.clubTier === 'ligue2' ? 'Ligue 2' : 'National', tier: input.clubTier, season: SEASON, clubIds: clubs.map((c) => c.id) },
    clubs,
    standings,
    upcomingFixtures: [],
    lastMatch: null,
    characters,
    notifications,
    objectives,
    offers: [],
    news,
    rumors: [`${player.lastName} (Verdun) dans les petits papiers de clubs plus huppés.`],
    seasonStats: { matches: 0, goals: 0, assists: 0, motm: 0, avgRating: 0 },
    valueHistory: [player.marketValue],
    trainingFocus: null,
    matchPending: true,
    allFixtures,
    conversations: [
      {
        characterId: agent.id,
        messages: [
          { id: nanoid(6), role: 'character', text: `${player.firstName}, faut qu’on parle. Ça bouge autour de toi : des clubs se renseignent depuis tes derniers matchs.`, week: 1, ts: Date.now() - 60000 },
          { id: nanoid(6), role: 'character', text: `Rien de concret encore, mais reste concentré sur le terrain. Le reste, je m’en occupe.`, week: 1, ts: Date.now() - 30000 },
        ],
      },
    ],
    liveMatch: null,
  };

  // Note: reputationLabel is used by the client; referenced here to keep
  // the label logic co-located and typechecked.
  void reputationLabel;
  void POSITION_SHORT;
  return game;
}
