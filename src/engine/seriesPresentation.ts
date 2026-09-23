export function divisionHeadlineFixtures(fixtures:any[]){
 const playedRounds=Array.from(new Set<number>(fixtures.filter(f=>f.played).map(f=>Number(f.round)))).sort((a,b)=>a-b);
 const futureRounds=Array.from(new Set<number>(fixtures.filter(f=>!f.played).map(f=>Number(f.round)))).sort((a,b)=>a-b);
 const rounds=playedRounds.length<3?futureRounds.slice(0,3):[...playedRounds.slice(-2),...futureRounds.slice(0,1)];
 return fixtures.filter(f=>rounds.includes(Number(f.round))).sort((a,b)=>Number(a.round)-Number(b.round)||+new Date(a.date)-+new Date(b.date)||String(a.id).localeCompare(String(b.id)));
}
