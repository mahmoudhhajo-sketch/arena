import assert from 'node:assert/strict';
import { describeEvent } from '../src/engine/commentary.ts';
import { liveMatchView } from '../src/server/liveMatch.ts';

const eventTypes = [
  'GOAL_NORMAL', 'GOAL_BASKET', 'SAVE_NORMAL', 'SAVE_BASKET', 'SHOT_NORMAL',
  'RUN_SUCCESS', 'PASS_SUCCESS', 'INTERCEPTION', 'UPPKAST', 'RESTART',
] as const;

for (const type of eventTypes) {
  const texts = new Set(Array.from({ length: 125 }, (_, index) => describeEvent({
    id: `${type}-${index}`,
    period: 1,
    minute: 4,
    type,
    teamSide: 'home',
    playerName: 'Aldor',
    opponentPlayerName: 'Branor',
    text: 'fallback',
  } as any, index)));
  assert.ok(texts.size >= 25, `${type} only generated ${texts.size} distinct reports`);
}

for (const important of [false, true]) {
  const texts = new Set(Array.from({ length: 125 }, (_, index) => describeEvent({
    id: `fight-${important}-${index}`,
    period: 1,
    minute: 4,
    type: 'FIGHT_RESULT',
    teamSide: 'home',
    playerName: 'Aldor',
    opponentPlayerName: 'Branor',
    text: 'fallback',
    important,
  } as any, index)));
  assert.ok(texts.size >= 25, `fight(${important}) only generated ${texts.size} distinct reports`);
}

const start = new Date('2026-10-07T17:00:00.000Z');
const report: any = {
  id: 'live-boundary', date: start.toISOString(), division: 'Kejsarserien',
  arenaName: 'Mintrion', weather: {}, attendance: 10_000, ticketPrice: 6,
  homeClub: { id: 'home', name: 'Hemmalag' }, awayClub: { id: 'away', name: 'Bortalag' },
  underlag: 'Gräs', startingLineups: { home: [], away: [] }, tactics: {},
  periodScores: [{ period: 1, homeRawPoints: 3, awayRawPoints: 1, homePeriodPoint: 1, awayPeriodPoint: 0 }],
  finalScore: { home: 1, away: 0 }, homeStats: {}, awayStats: {}, individualStats: [], ballDistribution: [],
  injuries: { home: [], away: [] },
  events: [
    { id: 'same-minute-a', period: 1, minute: 10, type: 'PASS_SUCCESS', teamSide: 'home', text: 'A' },
    { id: 'same-minute-b', period: 1, minute: 10, type: 'INTERCEPTION', teamSide: 'away', text: 'B' },
    { id: 'minute-fifteen', period: 1, minute: 15, type: 'GOAL_NORMAL', teamSide: 'home', text: 'C', scoreAfter: { home: 3, away: 1 } },
    { id: 'p1-end', period: 1, minute: 15, type: 'PERIOD_END', teamSide: 'neutral', text: 'D' },
    { id: 'p2-start', period: 2, minute: 15, type: 'PERIOD_START', teamSide: 'neutral', text: 'E' },
  ],
};

const afterMinuteTen = liveMatchView(report, new Date(+start + 10 * 60_000));
assert.equal(afterMinuteTen.events.filter((event: any) => event.minute === 10).length, 2);
const beforeBoundary = liveMatchView(report, new Date(+start + 15 * 60_000 - 1));
assert.equal(beforeBoundary.events.some((event: any) => event.id === 'minute-fifteen'), false);
const atBoundary = liveMatchView(report, new Date(+start + 15 * 60_000));
assert.equal(atBoundary.events.some((event: any) => event.id === 'minute-fifteen'), true);
assert.equal(atBoundary.events.some((event: any) => event.id === 'p1-end'), true);

console.log('PASS: every gameplay family has at least 25 distinct reports; multiple events share a minute; final-minute events unlock at the period boundary.');
