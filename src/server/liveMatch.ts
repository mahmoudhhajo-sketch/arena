// Explicit public projection: no future stats, injuries, result or event payloads.
export function liveMatchView(report:any,now:Date){
 const minute=Math.max(0,Math.min(75,(+now-+new Date(report.date))/60000));
 if(minute>=75)return report;
 const events=report.events.filter((e:any)=>e.minute<=minute&&e.type!=='MATCH_END');
 const ended=new Set(events.filter((e:any)=>e.type==='PERIOD_END').map((e:any)=>e.period));
 const periods=report.periodScores.filter((p:any)=>ended.has(p.period));
 const current=Math.min(5,Math.floor(minute/15)+1);
 const injuredIds=new Set(events.flatMap((e:any)=>e.type==='INJURY'?[e.playerId]:e.type==='SUBSTITUTION'&&!e.id.startsWith('shadow-sub-')?[e.opponentPlayerId]:[]));
 const score={home:periods.reduce((s:number,p:any)=>s+p.homePeriodPoint,0),away:periods.reduce((s:number,p:any)=>s+p.awayPeriodPoint,0)};
 const end=report.events.find((e:any)=>e.type==='MATCH_END'&&e.minute<=minute);
 if(end&&/WO|walkover/i.test(end.text))return report;
 const last=events.filter((e:any)=>e.period===current&&['GOAL_NORMAL','GOAL_BASKET'].includes(e.type)).at(-1)?.scoreAfter||{home:0,away:0};
 if(!ended.has(current))periods.push({period:current,homeRawPoints:last.home,awayRawPoints:last.away,homePeriodPoint:0,awayPeriodPoint:0,ongoing:true});
 return {id:report.id,date:report.date,division:report.division,arenaName:report.arenaName,weather:report.weather,attendance:report.attendance,ticketPrice:report.ticketPrice,homeClub:report.homeClub,awayClub:report.awayClub,underlag:report.underlag,startingLineups:report.startingLineups,tactics:report.tactics,events,periodScores:periods,finalScore:score,live:true,elapsedMinute:Math.floor(minute),homeStats:{},awayStats:{},individualStats:[],ballDistribution:[],injuries:{home:(report.injuries.home||[]).filter((p:any)=>injuredIds.has(p.playerId)),away:(report.injuries.away||[]).filter((p:any)=>injuredIds.has(p.playerId))}};
}
