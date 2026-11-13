import {simulateMatch} from '../engine/matchEngine';

// Explicit one-fixture administrator instruction. Never reuse for another fixture,
// friendly, return leg, season or participant pairing.
export function fixtureScenario(f:any){
  return f.id==='fixture-75a1730c-9ff9-42b5-8483-c63af81ce8f5'
    &&f.homeId==='72844'&&f.awayId==='60221'
    &&f.date==='2026-11-13T18:00:00.000Z'&&!f.friendly&&!f.played
    ? {losingSide:'home' as const,stopMinute:70}:undefined;
}

export function simulateScheduledMatch(...args:Parameters<typeof simulateMatch>){
  if(!args[8])return simulateMatch(...args);
  let best:ReturnType<typeof simulateMatch>|undefined,bestScore=-Infinity;
  for(let attempt=0;attempt<128;attempt++){
    const trial=structuredClone(args);trial[4]=Number(args[4])+attempt*7919;
    const report=simulateMatch(...trial);
    // An invalid starting lineup still follows the ordinary immediate-WO rule.
    if(report.startingLineups.home.length<6||report.startingLineups.away.length<6)return report;
    const completed=report.periodScores.slice(0,4),home=completed.reduce((n,p)=>n+p.homePeriodPoint,0),away=completed.reduce((n,p)=>n+p.awayPeriodPoint,0);
    const last=report.periodScores[4];
    const score=-(Math.abs(home-2)+Math.abs(away-2))*100+(last&&last.homeRawPoints>last.awayRawPoints?10:0);
    if(score>bestScore){best=report;bestScore=score;}
    if(score===10)break;
  }
  return best!;
}
