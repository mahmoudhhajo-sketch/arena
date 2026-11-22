/** Ratings use recorded outcomes only. Skill levels and difficulty-weighted values never enter the model.
 * Recomputed when old reports are read, without changing results or historical player form. */
export const MATCH_RATING_VERSION=2;
export function playerMatchRating(report:any,playerId:number):number|null{
 const p=report.individualStats?.find((p:any)=>p.id===playerId);
 if(!p||report.live||report.events?.some((e:any)=>e.type==='MATCH_END'&&e.minute===0&&/WO|walkover/i.test(e.text)))return null;
 const starter=report.startingLineups?.[p.side]?.find((x:any)=>x.id===playerId);
 const entry=report.events?.find((e:any)=>e.type==='SUBSTITUTION'&&e.playerId===playerId);
 if(!starter&&!entry)return null;
 const slot=String(starter?.slot||entry?.slot||''),keeper=slot==='goal',forward=slot.startsWith('0-'),back=slot.startsWith('2-'),middle=slot.startsWith('1-'),centre=slot==='1-1';
 const counts=(key:string)=>{const s=p.stats?.[key]||{},ok=Math.max(0,Number(s.lyckade??s.vunna??0)||0),n=Math.max(ok,Number(s.antal)||0);return {ok,miss:n-ok};};
 let impact=0;
 // Goals are valuable even on a busy, wasteful afternoon. Misses have a modest,
 // bounded cost; a prolific scorer cannot become worse than an idle substitute.
 for(const [key,reward,missCost,maxCost] of [['skott',.65,.025,1.2],['korgskott',.40,.018,.8]] as const){const s=counts(key);impact+=reward*Math.pow(s.ok,.85)-Math.min(maxCost,s.miss*missCost);}
 const assists=Math.max(0,Number(p.assists??report.events?.filter((e:any)=>e.assistPlayerId===playerId).length??0));
 impact+=.42*Math.pow(assists,.85);
 const contribution=(key:string,reward:number,penalty:number,cap:number)=>{const s=counts(key);return reward*Math.pow(s.ok,.85)-Math.min(cap,penalty*s.miss);};
 impact+=contribution('raddningar',keeper?.19:.14,keeper?.12:.09,6);
 impact+=contribution('korgraddningar',middle?.16:.13,.08,4);
 impact+=contribution('brytningar',back?.17:middle?.13:.09,.035,2);
 impact+=contribution('uppkast',centre?.13:.05,.025,1.2);
 impact+=contribution('lopningar',forward?.10:middle?.08:.055,.045,1.8);
 // Routine circulation has diminishing returns and a ceiling: it supports a
 // performance, but hundreds of safe passes cannot alone earn a nine.
 const passes=counts('passningar'),receptions=counts('mottagningar');
 impact+=Math.min(1.1,(middle?.34:back?.27:.16)*Math.log1p(passes.ok/5))-Math.min(1.5,passes.miss*(middle?.045:.03));
 impact+=Math.min(.35,.15*Math.log1p(receptions.ok/8))-Math.min(.7,receptions.miss*.025);
 impact+=Math.min(.8,contribution('slagsmal',back?.07:.05,.015,.5));
 // No divide-by-attempts: actual contributions outweigh a perfect percentage
 // on one action. Exceptional volume can reach 9–10, poor play can fall below 3.
 const value=impact>=0?6+4*(1-Math.exp(-impact/2.3)):6*Math.exp(impact/3);
 return Math.round(Math.max(0,Math.min(10,value))*10)/10;
}
export function teamMatchRating(report:any,side:string){const values=(report.individualStats||[]).filter((p:any)=>p.side===side).map((p:any)=>playerMatchRating(report,p.id)).filter((n:any)=>n!==null);return values.length?Math.round(values.reduce((sum:number,n:number)=>sum+n,0)/values.length*10)/10:null;}
