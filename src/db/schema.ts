import { pgTable, serial, text, integer, timestamp, jsonb, boolean, doublePrecision } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// World state tracking (Season 1, Day 0, Round 0)
export const worldState = pgTable('world_state', {
  id: serial('id').primaryKey(),
  season: integer('season').notNull().default(1),
  round: integer('round').notNull().default(0),
  day: integer('day').notNull().default(0),
  totalMatchesPlayed: integer('total_matches_played').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or manager account identifier
  email: text('email').notNull(),
  managerName: text('manager_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Clubs table
export const clubs = pgTable('clubs', {
  id: text('id').primaryKey(), // unique slug/uuid
  userId: text('user_id'), // null for bots, user.uid for managers
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  race: text('race').notNull(), // 'human' | 'elf' | 'dwarf' | 'orc'
  hometown: text('hometown').notNull(),
  division: text('division').notNull(), // 'Kejsarserien', 'Division 1:1', 'Division 2:1', 'Division 3:1' etc.
  position: integer('position').notNull().default(1),
  gold: integer('gold').notNull().default(200000), // starts at 200,000
  merit: doublePrecision('merit').notNull().default(0),
  marathonPoints: integer('marathon_points').notNull().default(0),
  wins: integer('wins').notNull().default(0),
  draws: integer('draws').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  goalsFor: integer('goals_for').notNull().default(0),
  goalsAgainst: integer('goals_against').notNull().default(0),
  recordString: text('record_string').notNull().default('0/0/0'),
  presentation: text('presentation').notNull().default(''),
  ownerName: text('owner_name').notNull(),
  ownerEmail: text('owner_email').notNull().default(''),
  isBot: boolean('is_bot').notNull().default(false),
  doctorInvestment: integer('doctor_investment').notNull().default(1000),
  magicInvestment: integer('magic_investment').notNull().default(0),
  trainingPoints: jsonb('training_points').notNull(), // Record<TrainableAttribute, number>
  lineup: jsonb('lineup').notNull(), // LineupConfig
  coach: jsonb('coach'), // null or coach obj
  arena: jsonb('arena'), // null or arena config
  createdAt: timestamp('created_at').defaultNow(),
});

// Players table
export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  clubId: text('club_id').references(() => clubs.id),
  name: text('name').notNull(),
  race: text('race').notNull(),
  shirtNumber: integer('shirt_number').notNull(),
  hometown: text('hometown').notNull(),
  nominalPosition: text('nominal_position').notNull(),
  wage: integer('wage').notNull(),
  isMercenary: boolean('is_mercenary').notNull().default(false),
  matches: integer('matches').notNull().default(0),
  seasonMatches: integer('season_matches').notNull().default(0),
  goals: integer('goals').notNull().default(0),
  seasonGoals: integer('season_goals').notNull().default(0),
  basketGoals: integer('basket_goals').notNull().default(0),
  seasonBasketGoals: integer('season_basket_goals').notNull().default(0),
  assists: integer('assists').notNull().default(0),
  seasonAssists: integer('season_assists').notNull().default(0),
  form: integer('form').notNull().default(9),
  totalInjury: doublePrecision('total_injury').notNull().default(0),
  currentInjury: doublePrecision('current_injury').notNull().default(0),
  isDeceased: boolean('is_deceased').notNull().default(false),
  attributes: jsonb('attributes').notNull(), // PlayerAttributes
  artifacts: jsonb('artifacts').notNull().default('[]'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Matches table
export const matches = pgTable('matches', {
  id: text('id').primaryKey(),
  season: integer('season').notNull().default(1),
  round: integer('round').notNull().default(1),
  division: text('division').notNull(),
  homeClubId: text('home_club_id').references(() => clubs.id).notNull(),
  awayClubId: text('away_club_id').references(() => clubs.id).notNull(),
  homeScore: integer('home_score').notNull(),
  awayScore: integer('away_score').notNull(),
  matchReport: jsonb('match_report').notNull(), // complete MatchReport object
  playedAt: timestamp('played_at').defaultNow(),
});

// Shoutbox messages table
export const shoutboxMessages = pgTable('shoutbox_messages', {
  id: serial('id').primaryKey(),
  userId: text('user_id'),
  authorName: text('author_name').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Tipset coupons table
export const tipsetCoupons = pgTable('tipset_coupons', {
  id: serial('id').primaryKey(),
  clubId: text('club_id').references(() => clubs.id).notNull(),
  season: integer('season').notNull().default(1),
  round: integer('round').notNull().default(1),
  predictions: jsonb('predictions').notNull(), // Record<number, '1'|'X'|'2'>
  pointsAwarded: integer('points_awarded').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const clubsRelations = relations(clubs, ({ many }) => ({
  players: many(players),
}));

export const playersRelations = relations(players, ({ one }) => ({
  club: one(clubs, {
    fields: [players.clubId],
    references: [clubs.id],
  }),
}));

export const gameRecords = pgTable('game_records', {id: text('id').primaryKey(), kind: text('kind').notNull(), payload: jsonb('payload').notNull()});
