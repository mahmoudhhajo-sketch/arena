import {dailyUpdates} from './calendar';
// Home demand is bounded by the club's support, never by the number of rented seats.
export function attendanceDemand(home:any,away:any,ticket:number,variation=.5){
 const tier=home.division==='Kejsarserien'?0:Number(home.division?.match(/Division (\d)/)?.[1]||3);
 const base=[62000,41000,29000,20000,15000,11500][Math.min(5,tier)];
 const merit=1+.35*(1-Math.exp(-Math.max(0,home.merit||0)/15));
 const form=1+Math.max(-.15,Math.min(.18,((home.recentForm??.5)-.5)*.36));
 const history=1+Math.min(.12,(home.wins+home.draws+home.losses||0)*.005);
 const visiting=1.05+Math.min(.08,Math.max(0,away.merit||0)*.002);
 return Math.round(base*merit*form*history*visiting*Math.exp(-.13*(Math.max(0,ticket)-3))*(.94+variation*.12));
}
export function arenaConfidence(toughness:number,glory:number,dread:number,homeFans:number,isHome:boolean){
 const courage=.10*(1-Math.exp(-Math.max(0,glory)/20));
 const fear=.24*(1-Math.exp(-Math.max(0,dread)/(8+Math.max(0,toughness)*2)));
 const support=isHome?.08*(1-Math.exp(-Math.max(0,homeFans)/35000)):0;
 return {courage,fear,support,multiplier:1+courage+support-fear};
}
export function acquisitionMorale(events:{date:string;penalty:number}[],now=Date.now()){
 const changes=events.filter(e=>Number.isFinite(+new Date(e.date))&&+new Date(e.date)<=now).sort((a,b)=>+new Date(a.date)-+new Date(b.date));
 let morale=100,at=changes.length?+new Date(changes[0].date):now;
 const recover=(until:number)=>{morale=Math.min(100,morale+2*dailyUpdates(new Date(at),new Date(until)).filter(d=>d.getUTCDay()===0).length);at=until;};
 for(const e of changes){recover(+new Date(e.date));morale=Math.max(0,morale-Math.max(0,e.penalty));}
 recover(now);return morale;
}
// Even the full morale range changes effective abilities by at most two percent.
export function moraleFactor(morale=100){return .98+.02*Math.max(0,Math.min(100,morale))/100;}
