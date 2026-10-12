import type {MatchReport} from '../types';

/** Starters receive training credit even when the opponent forfeits before kickoff.
 * Unused reserves never count as appearances. Injuries still require actual play. */
export function matchParticipation(report:MatchReport,side:'home'|'away'){
 const started=!report.events.some(e=>e.id==='walkover');
 const slots=new Map<number,Set<string>>();
 const add=(id:number,slot:string)=>{if(!Number.isFinite(id)||!slot)return;const list=slots.get(id)||new Set<string>();list.add(slot);slots.set(id,list)};
 for(const p of report.startingLineups[side])add(p.id,p.slot);
 if(started)for(const e of report.events)if(e.type==='SUBSTITUTION'&&e.teamSide===side)add(e.playerId,e.slot);
 return {started,slots};
}

export function accumulatedMatchInjury(current:number,started:boolean,injured:boolean,toughness:number){
 const protection=Math.pow(1.02,16-Math.min(16,Math.max(0,toughness)));
 return started?Math.min(9,current+(0.0075+(injured?0.075:0))*protection):current;
}
