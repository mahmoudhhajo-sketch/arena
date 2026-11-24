import {db} from '../db';
import {matches} from '../db/schema';
import {and,or,eq,gte} from 'drizzle-orm';
import {record,records} from './records';
export function appearedInReport(report:any,playerId:number,clubId:string,since:number,now:number){
 if(!report||+new Date(report.date)<since||+new Date(report.date)>now)return false;
 const side=report.homeClub?.id===clubId?'home':report.awayClub?.id===clubId?'away':null;
 if(!side)return false;
 if(report.startingLineups?.[side]?.some((p:any)=>Number(p.id)===playerId))return true;
 const minute=(now-+new Date(report.date))/60000;
 return report.events?.some((e:any)=>e.type==='SUBSTITUTION'&&e.teamSide===side&&Number(e.playerId)===playerId&&e.minute<=minute)||false;
}
export async function publicMercenaryAppearance(player:any,now=new Date()){
 const contract=await record('contract-'+player.id),since=+new Date(contract?.hiredAt||'');
 if(!Number.isFinite(since)||contract.clubId!==player.clubId)return false;
 const visible=(r:any)=>appearedInReport(r,player.id,player.clubId,since,+now);
 if((await records('live-match')).some(r=>visible(r.report)))return true;
 if((await records('friendly-report')).some(visible))return true;
 const played=await db.select({report:matches.matchReport}).from(matches).where(and(or(eq(matches.homeClubId,player.clubId),eq(matches.awayClubId,player.clubId)),gte(matches.playedAt,new Date(since))));
 return played.some(r=>visible(r.report));
}
