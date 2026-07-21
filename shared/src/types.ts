// ============================================================
// ONZE — shared domain types.
// The single vocabulary spoken by the deterministic engine, the
// database, the API and the React client. Everything numeric is
// owned by the engine; the LLM layer only ever reads these.
// ============================================================

// ─── Enums / unions ──────────────────────────────────────────

export type Position = 'GB' | 'DEF' | 'MIL' | 'AIL' | 'ATT';
export type Physique = 'leger' | 'equilibre' | 'puissant';
export type ClubTier = 'national' | 'ligue2' | 'ligue1';

/** The six canonical attributes owned by the engine. */
export type AttrKey =
  | 'finition'
  | 'vitesse'
  | 'passe'
  | 'physique'
  | 'mental'
  | 'technique';

export type Attributes = Record<AttrKey, number>;

export type FormLabel = 'En feu' | 'Bonne' | 'Neutre' | 'Fébrile' | 'En berne';

export type CharacterType = 'agent' | 'coach' | 'coequipier' | 'journaliste';

// ─── World entities ──────────────────────────────────────────

export interface Club {
  id: string;
  name: string;
  shortName: string; // 3-letter tag, e.g. "VER"
  tier: ClubTier;
  strength: number; // 0..100 team strength (Elo-ish baseline)
}

export interface Fixture {
  id: string;
  week: number;
  homeClubId: string;
  awayClubId: string;
  played: boolean;
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface StandingRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

export interface League {
  id: string;
  name: string;
  tier: ClubTier;
  season: string; // e.g. "25 · 26"
  clubIds: string[];
}

// ─── Player ──────────────────────────────────────────────────

export interface Contract {
  clubId: string;
  wage: number; // € per week
  monthsLeft: number;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  position: Position;
  physique: Physique;
  squadNumber: number;
  clubId: string;

  attributes: Attributes;
  potential: number; // 0..100 ceiling

  form: number; // 0..100 hidden momentum
  fitness: number; // 0..100 physical condition (fatigue = 100 - fitness)
  morale: number; // 0..100
  marketValue: number; // € (source of truth, formatted client-side)
  reputation: number; // 0..100

  contract: Contract;
  injuryWeeksLeft: number;
}

// ─── Non-player characters ───────────────────────────────────

export interface Character {
  id: string;
  type: CharacterType;
  name: string;
  initials: string;
  personality: string; // free text, feeds the persona prompt
  speechStyle: string;
  hiddenAgenda: string | null;
  relationship: number; // 0..100 toward the player
  memorySummary: string; // compressed memory of past exchanges
  accentColor: string; // UI avatar tint
}

// ─── Match ───────────────────────────────────────────────────

export type MatchEventType =
  | 'goal_for'
  | 'assist'
  | 'chance'
  | 'yellow'
  | 'red'
  | 'injury'
  | 'goal_against'
  | 'note';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  text: string;
}

export interface MicroOption {
  id: string;
  label: string;
  desc: string;
  /** relative risk 0..1, used by the engine to weight the dice */
  risk: number;
}

export interface MicroDecision {
  id: string;
  minute: number;
  prompt: string;
  options: MicroOption[];
}

export interface PlayerPerf {
  rating: number; // 0..10, one decimal
  goals: number;
  assists: number;
  touches: number;
  shots: number;
  dribbles: number;
  manOfMatch: boolean;
  valueDelta: number; // € change from this match
  events: MatchEvent[];
}

export interface MatchResult {
  id: string;
  week: number;
  seed: number;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
  playerClubId: string;
  opponentClubId: string;
  playerHome: boolean;
  perf: PlayerPerf;
}

/**
 * A match presented to the match-day screen. The engine simulates
 * everything up to the micro-decision, hands the client the timeline
 * and the pending choice, then resolves the remainder once the player
 * commits. `phase` tracks that handshake.
 */
export interface LiveMatch {
  id: string;
  week: number;
  seed: number;
  homeClubId: string;
  awayClubId: string;
  playerHome: boolean;
  opponentClubId: string;
  phase: 'decision' | 'final';
  clockAtDecision: number;
  scoreAtDecision: [number, number];
  commentaryBeforeDecision: MatchEvent[];
  decision: MicroDecision | null;
  chosenOptionId: string | null;
  // Present only when phase === 'final'
  commentaryAfterDecision: MatchEvent[];
  result: MatchResult | null;
}

// ─── Progression / meta ──────────────────────────────────────

export type TrainingFocus = AttrKey | 'repos';

export interface SeasonStats {
  matches: number;
  goals: number;
  assists: number;
  motm: number; // man-of-the-match awards
  avgRating: number; // running average, one decimal
}

export interface Objective {
  id: string;
  label: string;
  kind: 'progress' | 'count' | 'decision';
  progress?: number; // 0..100 for 'progress'
  current?: number; // for 'count'
  target?: number; // for 'count'
}

export interface TransferOffer {
  id: string;
  fromClubId: string;
  wage: number; // € per week
  signingBonus: number; // €
  lengthYears: number;
  week: number;
  status: 'open' | 'accepted' | 'declined';
}

export interface NewsItem {
  id: string;
  week: number;
  category: string; // "TON CLUB", "RUMEUR · TOI", "RIVAL", "LIGUE 2"
  subtitle: string; // "résultat", "mercato", ...
  text: string;
  tone: 'neutral' | 'good' | 'bad';
}

export interface Notification {
  id: string;
  characterId: string | null;
  title: string;
  text: string;
  week: number;
  unread: boolean;
  kind: 'message' | 'press' | 'system' | 'decision';
}

// ─── Conversation ────────────────────────────────────────────

export type MessageRole = 'player' | 'character' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  week: number;
  ts: number;
}

export interface Conversation {
  characterId: string;
  messages: Message[];
}

/**
 * The only way a conversation can move numbers: the LLM proposes a
 * structured intent, the backend validates it against the rules and
 * the game state, then the engine applies the effect. Free text from
 * the model is never trusted for values.
 */
export type ConversationIntent =
  | { intent: 'none' }
  | { intent: 'accept_offer'; offerId: string }
  | { intent: 'decline_offer'; offerId: string }
  | { intent: 'request_wage_raise' }
  | { intent: 'set_training_focus'; focus: AttrKey }
  | { intent: 'reassure_coach' }
  | { intent: 'push_for_transfer'; clubId?: string };

export interface AppliedEffect {
  ok: boolean;
  summary: string; // French, shown to the player as a system line
}

// ─── The full game snapshot the client renders ───────────────

export interface GameState {
  id: string;
  createdAt: number;
  season: string;
  week: number;

  player: Player;
  club: Club; // the player's club (denormalised for convenience)
  league: League;
  clubs: Club[];
  standings: StandingRow[];
  upcomingFixtures: Fixture[];
  lastMatch: MatchResult | null;

  characters: Character[];
  notifications: Notification[];
  objectives: Objective[];
  offers: TransferOffer[];

  news: NewsItem[];
  rumors: string[];

  seasonStats: SeasonStats;
  valueHistory: number[]; // market value snapshots for the profile sparkline

  trainingFocus: TrainingFocus | null;
  /** true when the next "advance week" lands on a match to be played */
  matchPending: boolean;
}

// ─── API DTOs ────────────────────────────────────────────────

export interface NewCareerInput {
  firstName: string;
  lastName: string;
  age: number;
  position: Position;
  physique: Physique;
  clubTier: ClubTier;
}

export interface AdvanceWeekResult {
  state: GameState;
  liveMatch: LiveMatch | null; // set when the week landed on a match
}

export interface ConversationReplyResult {
  message: Message; // the character's reply
  effect: AppliedEffect | null; // present when an intent was applied
  state: GameState; // refreshed snapshot (numbers may have changed)
  suggestions: string[]; // fresh suggested replies
}
