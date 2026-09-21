export type Race = 'human' | 'elf' | 'dwarf' | 'orc' | 'goblin' | 'troll';

export type NominalPosition = 
  | 'Målvakt'
  | 'Back'
  | 'Innermittfält'
  | 'Yttermittfält'
  | 'Anfall'
  | 'Fribrytare'
  | 'Övrig';

export type CanonStatus = 'CONFIRMED' | 'REMEMBERED' | 'RECONSTRUCTED' | 'UNKNOWN';

export interface PlayerAttributes {
  snabbhet: number;        // Speed
  kondition: number;       // Conditioning
  markering: number;       // Marking
  passning: number;        // Passing
  teknik: number;          // Technique
  speluppfattning: number; // Game Intelligence
  skott: number;           // Shooting
  malvakt: number;         // Goalkeeping
  aggressivitet: number;   // Aggression (not normally trainable)
  tuffhet: number;         // Toughness
}

export type TrainableAttribute = Exclude<keyof PlayerAttributes, 'aggressivitet'>;

export interface PositionRatings {
  // 3x3 matrix: row 0 (attack), row 1 (midfield), row 2 (defense) x col 0 (left), 1 (center), 2 (right)
  matrix: number[][]; // [row][col]
  goalBox: number;    // Goalkeeper slot
}

export interface Player {
  id: number;
  name: string;
  race: Race;
  shirtNumber: number;
  hometown: string;
  nominalPosition: NominalPosition;
  wage: number;
  clubId: string;
  isMercenary?: boolean;
  matches: number;
  seasonMatches: number;
  goals: number;
  seasonGoals: number;
  basketGoals: number;
  seasonBasketGoals: number;
  assists: number;
  seasonAssists: number;
  form: number; // 0 - 16
  totalInjury: number; // 0 - 9 (display integer, internal float)
  currentInjury: number; // 0 = healthy, 1 = "+", 2 = "++", etc.
  isDeceased: boolean;
  artifacts: string[];
  attributes: PlayerAttributes; // owner-visible rounded/capped values in API responses; engine may use hidden precision server-side
  positionRatingsWithForm?: PositionRatings;
  positionRatingsWithoutForm?: PositionRatings;
}

export type UppspelTactic = 'Normal' | 'Passning' | 'Löpning';
export type SpelvagTactic = 'Normal' | 'Kant' | 'Mitten';
export type SkytteTactic = 'Normal' | 'Korg' | 'Mål';
export type PitchUnderlag = 'Gräs' | 'Jord' | 'Sten' | 'Nimonimbus';

export interface TacticsConfig {
  uppspel: UppspelTactic;
  spelvag: SpelvagTactic;
  skytte: SkytteTactic;
}

// 10 players on field across 3x3 + 1 goal box.
// Each slot can take up to 2 players (starter and backup).
export interface FieldSlotAssignment {
  slotKey: string; // 'goal' | '0-0' | '0-1' | '0-2' | '1-0' | '1-1' | '1-2' | '2-0' | '2-1' | '2-2'
  activePlayerIds?: number[];
  reservePlayerIds?: number[];
  starterPlayerId: number | null;
  subPlayerId: number | null;
}

export interface LineupConfig {
  slots: Record<string, FieldSlotAssignment>;
  underlag: PitchUnderlag;
  intrade: number;
  tactics: TacticsConfig;
  savedPresetName?: string;
}

export interface Coach {
  id: string;
  name: string;
  race: Race;
  wage: number;
  trainingBonus: number; // e.g. 7
  tacticsBonus: number;  // e.g. 6
}

export interface ArenaConfig {
  additions?: string[];
  name: string;
  landscape: string;
  underlag: PitchUnderlag;
  capacity: number;
  typeDescription: string;
  ara: number;
  skrack: number;
  cost: number;
  weeklyRent: number;
  rentalPrice?: number;
}

export interface Club {
  id: string;
  name: string;
  shortName: string;
  race: Race;
  hometown: string;
  division: string;
  position: number;
  merit: number;
  gold: number;
  presentation: string;
  ownerName: string;
  ownerEmail?: string;
  marathonPoints: number;
  recordString: string; // e.g. "0/0/1"
  coach: Coach | null;
  arena: ArenaConfig | null;
  doctorInvestment: number;
  magicInvestment: number;
  trainingPoints: Record<TrainableAttribute, number>;
  lineup: LineupConfig;
  targetAggression?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  isBot?: boolean;
  goalsFor?: number;
  goalsAgainst?: number;
}

export interface MatchPeriodResult {
  period: number;
  homeRawPoints: number;
  awayRawPoints: number;
  homePeriodPoint: number; // 1 or 0
  awayPeriodPoint: number; // 1 or 0
}

export type MatchEventType = 
  | 'PERIOD_START'
  | 'UPPKAST'
  | 'RUN_ATTEMPT'
  | 'RUN_SUCCESS'
  | 'PASS_ATTEMPT'
  | 'PASS_SUCCESS'
  | 'INTERCEPTION'
  | 'SHOT_NORMAL'
  | 'GOAL_NORMAL'
  | 'SHOT_BASKET'
  | 'GOAL_BASKET'
  | 'SAVE_NORMAL'
  | 'SAVE_BASKET'
  | 'FIGHT_START'
  | 'FIGHT_RESULT'
  | 'INJURY'
  | 'SUBSTITUTION'
  | 'PERIOD_END'
  | 'MATCH_END';

export interface MatchEvent {
  id: string;
  period: number;
  minute: number;
  type: MatchEventType;
  teamSide: 'home' | 'away' | 'neutral';
  playerId?: number;
  playerName?: string;
  opponentPlayerId?: number;
  opponentPlayerName?: string;
  text: string;
  scoreAfter?: { home: number; away: number };
  basketsAfter?: { leftOwner: 'home' | 'away' | null; rightOwner: 'home' | 'away' | null };
}

export interface DetailedCategoryStats {
  antal: number;
  lyckade: number;
  lyckadeProcent: number;
  viktat: number;
}

export interface DetailedFightStats {
  antal: number;
  startade: number;
  vunna: number;
  vunnaProcent: number;
  viktat: number;
}

export interface TeamMatchStats {
  lopningar: DetailedCategoryStats;
  passningar: DetailedCategoryStats;
  mottagningar: DetailedCategoryStats;
  skott: DetailedCategoryStats;
  korgskott: DetailedCategoryStats;
  uppkast: { antal: number; vunna: number; vunnaProcent: number; viktat: number };
  raddningar: DetailedCategoryStats;
  korgraddningar: DetailedCategoryStats;
  slagsmal: DetailedFightStats;
}

export interface MatchReport {
  engineVersion?:number;
  portSurcharge?:number;
  underlag?: PitchUnderlag;
  individualStats?: Array<{id:number;name:string;number:number;side:string;stats:TeamMatchStats}>;
  id: string;
  date: string;
  division: string;
  arenaName: string;
  weather: {
    temp: number;
    condition: string;
    wind: number;
  };
  attendance: number;
  ticketPrice: number;
  homeClub: { id: string; name: string; race: Race };
  awayClub: { id: string; name: string; race: Race };
  periodScores: MatchPeriodResult[];
  finalScore: { home: number; away: number };
  events: MatchEvent[];
  homeStats: TeamMatchStats;
  awayStats: TeamMatchStats;
  tactics: {
    home: TacticsConfig;
    away: TacticsConfig;
  };
  injuries: {
    home: Array<{ playerName: string; severity: number; playerId?: number }>;
    away: Array<{ playerName: string; severity: number; playerId?: number }>;
  };
  ballDistribution: number[][]; // 3x3 percentage of play
  startingLineups: {
    home: Array<{ id?:number; number: number; name: string; slot: string; position: string }>;
    away: Array<{ id?:number; number: number; name: string; slot: string; position: string }>;
  };
}

export interface TipsetMatch {
  id: number | string;
  homeTeam: string;
  awayTeam: string;
  pct1: number;
  pctX: number;
  pct2: number;
  userPrediction?: '1' | 'X' | '2';
  userPick?: '1' | 'X' | '2';
  actualResult?: '1' | 'X' | '2';
  pointsAwarded?: number;
}

export interface TipsetRound {
  roundNumber: number;
  matches: TipsetMatch[];
  potGold: number;
  userPoints: number;
  leaderboard: Array<{ rank: number; teamName: string; points: number }>;
}
