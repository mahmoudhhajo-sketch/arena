import { simulateMatch } from './matchEngine';
import { generateStarterSquad } from './playerGenerator';
import { Club } from '../types';

export function runMatchEngineTests(): { passed: number; failed: number; log: string[] } {
  const log: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      log.push(`[PASS] ${testName}`);
    } else {
      failed++;
      log.push(`[FAIL] ${testName}`);
    }
  }

  const dummyHomeClub: Club = {
    id: 'club-test-1',
    name: 'Anthrax',
    shortName: 'Anthrax',
    race: 'orc',
    hometown: 'Shraknek',
    division: 'Kejsarserien',
    position: 1,
    merit: 25,
    gold: 200000,
    presentation: 'Test club',
    ownerName: 'TestManager',
    marathonPoints: 0,
    recordString: '0/0/0',
    coach: null,
    arena: {
      name: 'Mintrion',
      landscape: 'På en grässlätt',
      underlag: 'Gräs',
      capacity: 30000,
      typeDescription: 'Endast långsidor',
      ara: 1,
      skrack: 0,
      cost: 100000,
      weeklyRent: 1000,
    },
    doctorInvestment: 1000,
    magicInvestment: 0,
    trainingPoints: {
      snabbhet: 2,
      kondition: 1,
      markering: 2,
      passning: 2,
      teknik: 1,
      speluppfattning: 1,
      skott: 2,
      malvakt: 1,
      tuffhet: 1,
    },
    lineup: {
      slots: {},
      underlag: 'Gräs',
      intrade: 8,
      tactics: { uppspel: 'Normal', spelvag: 'Normal', skytte: 'Normal' },
    },
  };

  const dummyAwayClub: Club = {
    ...dummyHomeClub,
    id: 'club-test-2',
    name: 'Veddige BK',
    shortName: 'Veddige',
    race: 'human',
  };

  const homePlayers = generateStarterSquad('orc', dummyHomeClub.id, 'Shraknek');
  const awayPlayers = generateStarterSquad('human', dummyAwayClub.id, 'Berunia');

  for(const [club,squad] of [[dummyHomeClub,homePlayers],[dummyAwayClub,awayPlayers]] as const){
    club.lineup={...club.lineup,slots:Object.fromEntries(['goal','2-0','2-1','2-2','1-0','1-1','1-2','0-0','0-1','0-2'].map((slotKey,i)=>[slotKey,{slotKey,starterPlayerId:squad[i].id,subPlayerId:null,activePlayerIds:[squad[i].id],reservePlayerIds:[]}]))};
  }
  // Test 1: Exactly five periods occur
  const report1 = simulateMatch(dummyHomeClub, dummyAwayClub, homePlayers, awayPlayers, 42);
  assert(report1.periodScores.length === 5, 'Exactly five periods occur');

  // Test 2: Period winner gets exactly one match point & final score matches sum of period points
  let calculatedHomeScore = 0;
  let calculatedAwayScore = 0;
  let allPeriodsValid = true;
  for (const p of report1.periodScores) {
    if (p.homeRawPoints > p.awayRawPoints) {
      if (p.homePeriodPoint !== 1 || p.awayPeriodPoint !== 0) allPeriodsValid = false;
      calculatedHomeScore += 1;
    } else if (p.awayRawPoints > p.homeRawPoints) {
      if (p.awayPeriodPoint !== 1 || p.homePeriodPoint !== 0) allPeriodsValid = false;
      calculatedAwayScore += 1;
    } else {
      // Tied period awards no match points
      if (p.homePeriodPoint !== 0 || p.awayPeriodPoint !== 0) allPeriodsValid = false;
    }
  }
  assert(allPeriodsValid, 'Period winner gets 1 match point, tie gives 0');
  assert(
    report1.finalScore.home === calculatedHomeScore && report1.finalScore.away === calculatedAwayScore,
    'Final score accurately reflects period match points'
  );

  // Test 3: Same RNG seed produces identical match
  const report2 = simulateMatch(dummyHomeClub, dummyAwayClub, homePlayers, awayPlayers, 42);
  const isIdentical =
    report1.finalScore.home === report2.finalScore.home &&
    report1.finalScore.away === report2.finalScore.away &&
    report1.events.length === report2.events.length;
  assert(isIdentical, 'Same RNG seed reproduces identical match');

  // Test 4: Walkover when under 6 players
  const smallSquad = homePlayers.slice(0, 4);
  const walkoverReport = simulateMatch(dummyHomeClub, dummyAwayClub, smallSquad, awayPlayers, 99);
  assert(
    walkoverReport.finalScore.home === 0 && walkoverReport.finalScore.away === 5,
    'Team with fewer than 6 players forfeits 0-5 on walkover'
  );

  // Test 5: Uppkast events tracked
  assert(report1.homeStats.uppkast.antal > 0, 'Uppkast jump balls are tracked');

  // Test 6: 3x3 Ball distribution generated
  assert(report1.ballDistribution.length === 3 && report1.ballDistribution[0].length === 3, '3x3 Ball distribution matrix computed');

  return { passed, failed, log };
}
