import {activeIds,reserveIds,SLOT_KEYS} from './lineup';
import {botLineup} from './botLineup';
// Test setup helper: retain legal starters and fill the bench without placing anyone twice on field.
export function completeReserves(lineup:any,squad:any[]){
 const ps=squad.filter(p=>!p.isDeceased&&p.currentInjury===0),ids=new Set(ps.map(p=>p.id)),used=new Set<number>();
 const plan=structuredClone(lineup||botLineup(ps));plan.slots||={};
 for(const k of SLOT_KEYS){const old=plan.slots[k]||{},active=activeIds(old).filter(id=>ids.has(id)&&!used.has(id)&&used.size<10).slice(0,2);active.forEach(id=>used.add(id));plan.slots[k]={...old,slotKey:k,activePlayerIds:active};}
 const ordered=Object.values(botLineup(ps).slots).flatMap((s:any)=>s.activePlayerIds).concat(ps.map(p=>p.id));
 for(const k of ['goal','1-1',...SLOT_KEYS.filter(k=>!['goal','1-1'].includes(k))])if(!plan.slots[k].activePlayerIds.length&&used.size<10){const next=ordered.find(id=>!used.has(id));if(next!==undefined){plan.slots[k].activePlayerIds=[next];used.add(next)}}
 const bench=ps.filter(p=>!used.has(p.id));
 for(const [i,k] of SLOT_KEYS.entries()){const s=plan.slots[k],rot=[...bench.slice(i%Math.max(1,bench.length)),...bench.slice(0,i%Math.max(1,bench.length))];if(k==='goal')rot.sort((a,b)=>b.attributes.malvakt-a.attributes.malvakt);s.reservePlayerIds=[...new Set([...reserveIds(s).filter(id=>bench.some(p=>p.id===id)),...rot.map(p=>p.id)])].slice(0,2);s.starterPlayerId=s.activePlayerIds[0]??null;s.subPlayerId=s.reservePlayerIds[0]??null;}
 return plan;
}
