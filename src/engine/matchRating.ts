/** Versioned, deterministic ratings from saved actions. Never uses current skills,
 * form, club reputation or the final result. Older reports remain reproducible. */
export const MATCH_RATING_VERSION=1;
export function playerMatchRating(report:any,playerId:number):number|null{
 const p=report.individualStats?.find((p:any)=>p.id===playerId);
 if(!p||report.events?.some((e:any)=>e.id==='walkover'))return null;
 const side=p.side,starter=report.startingLineups?.[side]?.find((x:any)=>x.id===playerId);
 const entry=report.events?.find((e:any)=>e.type==='SUBSTITUTION'&&e.playerId===playerId);
 if(!starter&&!entry)return null;
 const slot=starter?.slot||entry?.slot;
 const keeper=slot==='goal',forward=String(slot).startsWith('0-'),back=String(slot).startsWith('2-');
 const weights:Record<string,number>={skott:forward?1.35:.9,korgskott:forward?.7:1,passningar:keeper?.65:forward?.35:.65,mottagningar:.35,lopningar:forward?.7:.5,brytningar:back?1.1:.65,raddningar:keeper?1.2:.5,korgraddningar:1.05,uppkast:.65,slagsmal:.2};
 let contribution=0,difficulty=0,attempts=0;
 for(const [key,w] of Object.entries(weights)){
  const s=p.stats?.[key];if(!s)continue;
  const n=Math.max(0,Number(s.antal||0)),ok=Math.max(0,Number(s.lyckade??s.vunna??0));
  const expected=['skott','korgskott'].includes(key)?.42:['passningar','mottagningar'].includes(key)?.65:.5;
  contribution+=w*(ok-expected*n);difficulty+=w*Number(s.viktat||0)/100;attempts+=n;
 }
 contribution+=Number(p.assists||0)*1.2;
 // Volume matters, but easy repeated passes cannot swamp a forward's goals.
 const signal=(contribution*.25+difficulty*.6)/Math.sqrt(1+attempts/12);
 const value=6+(signal>=0?4:6)*Math.tanh(signal/3);
 return Math.round(Math.max(0,Math.min(10,value))*10)/10;
}

export function teamMatchRating(report:any,side:string){const values=(report.individualStats||[]).filter((p:any)=>p.side===side).map((p:any)=>playerMatchRating(report,p.id)).filter((n:any)=>n!==null);return values.length?Math.round(values.reduce((sum:number,n:number)=>sum+n,0)/values.length*10)/10:null;}
