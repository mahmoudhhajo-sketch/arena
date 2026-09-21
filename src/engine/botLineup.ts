const defaultLineup={slots:{},underlag:'Gräs',intrade:4,tactics:{uppspel:'Normal',spelvag:'Normal',skytte:'Normal'}};
export function botLineup(squad:any[]){
 const healthy=squad.filter(p=>!p.isDeceased&&p.currentInjury===0);
 const keepers=healthy.filter(p=>p.nominalPosition==='Målvakt');
 const goalkeeper=keepers[0]||healthy[0];
 const out=healthy.filter(p=>p.id!==goalkeeper?.id&&p.nominalPosition!=='Målvakt');
 const starters=[goalkeeper,...out,...keepers.slice(1)].filter(Boolean).slice(0,10);
 const bench=healthy.filter(p=>!starters.some(s=>s.id===p.id));
 return {...defaultLineup,slots:Object.fromEntries(['goal','2-0','2-1','2-2','1-0','1-1','1-2','0-0','0-1','0-2'].map((k,i)=>{
  const candidates=k==='goal'?[...bench].sort((a,b)=>Number(b.nominalPosition==='Målvakt')-Number(a.nominalPosition==='Målvakt')):[...bench.slice(i%Math.max(1,bench.length)),...bench.slice(0,i%Math.max(1,bench.length))];
  const reservePlayerIds=candidates.slice(0,2).map(p=>p.id);
  return [k,{slotKey:k,activePlayerIds:starters[i]?[starters[i].id]:[],reservePlayerIds,starterPlayerId:starters[i]?.id??null,subPlayerId:reservePlayerIds[0]??null}];
 }))};
}
export function variedBotLineup(squad:any[],fixtureId:string,previous:any){
 const seed=[...fixtureId].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,17),base=botLineup(squad),keys=['goal','2-0','2-1','2-2','1-0','1-1','1-2','0-0','0-1','0-2'];
 const patterns=[keys,keys,keys,keys,['goal','1-1','1-1','0-0','0-0','0-2','0-2','2-1','2-1','0-1'],['goal','2-0','2-0','2-1','2-1','2-2','2-2','1-1','1-1','0-1'],['goal','0-0','0-0','0-1','0-1','0-2','0-2','1-1','1-1','2-1']];
 const starters=keys.flatMap(k=>base.slots[k].activePlayerIds),pattern=patterns[seed%patterns.length];for(const k of keys)base.slots[k].activePlayerIds=[];starters.forEach((id,i)=>base.slots[pattern[i]].activePlayerIds.push(id));for(const k of keys)base.slots[k].starterPlayerId=base.slots[k].activePlayerIds[0]??null;
 return {...previous,...base,intrade:previous?.intrade??4,underlag:previous?.underlag||'Gräs',tactics:{uppspel:['Normal','Passning','Löpning'][seed%3],spelvag:['Normal','Kant','Mitten'][Math.floor(seed/3)%3],skytte:['Normal','Mål','Korg'][Math.floor(seed/9)%3]}};
}
