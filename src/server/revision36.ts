import {eq,sql} from 'drizzle-orm';
import {db} from '../db';
import {clubs,gameRecords,matches,players} from '../db/schema';
import {TRAINING_GAIN_SCALE,reverseWeeklyPositionAttributes,trainingStepGains,weeklyPositionAttributes} from '../engine/calendar';
import {ATTRIBUTE_NAMES_SV,QUALITATIVE_ATTRIBUTE_LABELS} from '../constants/attributes';
import {put,record,records} from './records';

function appearancesFor(playerId:number,played:any[],after:number,before:number){
 const appearances:Array<{date:string;slots:string[]}>=[];
 for(const match of played){
  const report:any=match.matchReport,date=String(report?.date||match.playedAt||'');
  if(!date||+new Date(date)<=before||+new Date(date)>after||(report?.events||[]).some((event:any)=>event.id==='walkover'))continue;
  for(const side of ['home','away'] as const){
   const starts=(report?.startingLineups?.[side]||[]).filter((player:any)=>Number(player.id)===playerId).map((player:any)=>player.slot);
   const substitutions=(report?.events||[]).filter((event:any)=>event.type==='SUBSTITUTION'&&event.teamSide===side&&Number(event.playerId)===playerId).map((event:any)=>event.slot);
   const slots=[...new Set([...starts,...substitutions].filter(Boolean))] as string[];
   if(slots.length)appearances.push({date,slots});
  }
 }
 return appearances;
}

// Correct the last already-run Sunday update when the 15% reduction is first
// deployed. The ordinary clock had already discarded participation details, so
// the same slot history is rebuilt from the immutable match reports.
export async function initializeRevision36(){
 if(await record('revision-v36-training-and-monday-costs'))return;
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719136)`);
  if(await record('revision-v36-training-and-monday-costs',tx))return;
  const gains=await records('training-gain',tx),latest=Math.max(0,...gains.map((gain:any)=>+new Date(gain.date)));
  const now=Date.now(),recent=latest>0&&now-latest>=0&&now-latest<36*3600000&&new Date(latest).getUTCDay()===0;
  const corrected:any[]=[];
  if(recent){
   const at=new Date(latest),before=latest-7*86400000,latestGains=gains.filter((gain:any)=>+new Date(gain.date)===latest);
   const allClubs=await tx.select().from(clubs),clubById=new Map(allClubs.map((club:any)=>[club.id,club]));
   const played=await tx.select().from(matches),allPlayers=await tx.select().from(players),playerById=new Map(allPlayers.map((player:any)=>[player.id,player]));
   const reportRows=new Map<string,string[]>();
   for(const gain of latestGains){
    const player:any=playerById.get(Number(gain.playerId)),club:any=clubById.get(gain.clubId);if(!player||!club)continue;
    const appearances=appearancesFor(player.id,played,latest,before);
    let base=reverseWeeklyPositionAttributes(player.attributes,club.trainingPoints,appearances,latest,before,1);
    if(player.artifacts?.includes('seven-mile-boots')&&club.trainingPoints.kondition===0)base={...base,kondition:player.attributes.kondition};
    let attributes=player.isMercenary?base:weeklyPositionAttributes(base,club.trainingPoints,appearances,latest,before,TRAINING_GAIN_SCALE);
    if(player.artifacts?.includes('seven-mile-boots')&&club.trainingPoints.kondition===0)attributes={...attributes,kondition:base.kondition};
    const steps=player.isMercenary?[]:trainingStepGains(base,attributes);
    await tx.update(players).set({attributes}).where(eq(players.id,player.id));
    await put('training-gain',gain.id,{...gain,attributes:steps,before:base,after:attributes,correctedScale:player.isMercenary?0:TRAINING_GAIN_SCALE},tx);
    for(const key of steps){
     const from=Math.min(16,Math.floor(base[key])),to=Math.min(16,Math.floor(attributes[key]));
     if(from!==to){const rows=reportRows.get(gain.clubId)||[];rows.push(`${player.name}: ${ATTRIBUTE_NAMES_SV[key]} ${QUALITATIVE_ATTRIBUTE_LABELS[from]} → ${QUALITATIVE_ATTRIBUTE_LABELS[to]}`);reportRows.set(gain.clubId,rows)}
    }
    corrected.push({playerId:player.id,clubId:gain.clubId,mercenary:player.isMercenary});
   }
   for(const club of allClubs.filter((club:any)=>!club.isBot)){
    const newsId='news-training-'+at.toISOString()+'-'+club.id,news=await record(newsId,tx),rows=reportRows.get(club.id)||[];
    if(news)await put('team-news',newsId,{...news,body:rows.length?'Följande synliga egenskapsnivåer ökade:\n\n'+rows.join('\n'):'Träningen är genomförd. Ingen spelare passerade en ny synlig egenskapsnivå denna vecka.'},tx);
   }

   // The old clock debited this same update on Sunday. Refund it once, remove
   // those ledger rows and let the Monday clock perform the debit at 06:00.
   const weekly=(await records('ledger',tx)).filter((entry:any)=>entry.date===at.toISOString()&&entry.id.startsWith('week-'+at.toISOString()+'-'));
   const refunds=new Map<string,number>();
   for(const entry of weekly){refunds.set(entry.clubId,(refunds.get(entry.clubId)||0)-Number(entry.amount||0));await tx.delete(gameRecords).where(eq(gameRecords.id,entry.id));}
   for(const [clubId,amount] of refunds)await tx.update(clubs).set({gold:sql`${clubs.gold}+${amount}`}).where(eq(clubs.id,clubId));
   for(const club of allClubs){const billing=await record('magic-billing-'+club.id,tx);if(billing?.lastPaid!==undefined)await put('magic-billing','magic-billing-'+club.id,{...billing,accrued:Number(billing.accrued||0)+Number(billing.lastPaid||0),updatedAt:new Date().toISOString()},tx);}
  }
  await put('system','revision-v36-training-and-monday-costs',{date:new Date().toISOString(),trainingDate:latest?new Date(latest).toISOString():null,recent,corrected},tx);
 });
}
