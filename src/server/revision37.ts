import {eq,sql} from 'drizzle-orm';
import {db} from '../db';
import {clubs,players} from '../db/schema';
import {put,record,records} from './records';

function normalized(value:unknown){
 return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
}

// Repair active mercenary contracts whose temporary squad link has gone
// missing. Zagge's latest returned mercenary is also restored once because the
// old UI hid him completely as soon as the link changed.
export async function initializeRevision37(){
 if(await record('revision-v37-mercenary-repair'))return;
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719137)`);
  if(await record('revision-v37-mercenary-repair',tx))return;
  const allClubs=await tx.select().from(clubs),allPlayers=await tx.select().from(players),contracts=await records('mercenary-contract',tx);
  const clubById=new Map(allClubs.map((club:any)=>[club.id,club])),playerById=new Map(allPlayers.map((player:any)=>[player.id,player]));
  const repaired:number[]=[];
  for(const contract of contracts.filter((entry:any)=>!entry.completed)){
   const player:any=playerById.get(Number(contract.playerId));
   if(!player||player.isDeceased||!clubById.has(contract.clubId)||player.clubId===contract.clubId||player.clubId)continue;
   await tx.update(players).set({clubId:contract.clubId}).where(eq(players.id,player.id));
   player.clubId=contract.clubId;repaired.push(player.id);
  }
  const zagge:any=allClubs.find((club:any)=>normalized(club.ownerName)==='zagge')||allClubs.find((club:any)=>normalized(club.name)==='spetsoronyvk');
  let restored:number|null=null;
  if(zagge){
   const latest=[...contracts].filter((entry:any)=>entry.clubId===zagge.id).sort((a:any,b:any)=>+new Date(b.hiredAt||0)-+new Date(a.hiredAt||0))[0];
   const player:any=latest&&playerById.get(Number(latest.playerId));
   if(latest?.completed&&player?.isMercenary&&!player.isDeceased&&!player.clubId){
    const squad=allPlayers.filter((entry:any)=>entry.clubId===zagge.id),used=new Set(squad.map((entry:any)=>entry.shirtNumber));let shirtNumber=1;while(used.has(shirtNumber))shirtNumber++;
    await tx.update(players).set({clubId:zagge.id,shirtNumber}).where(eq(players.id,player.id));
    await put('mercenary-contract',latest.id,{...latest,completed:false,hiredAt:new Date().toISOString(),restoredAt:new Date().toISOString()},tx);
    restored=player.id;
   }
  }
  await put('system','revision-v37-mercenary-repair',{date:new Date().toISOString(),repaired,restored},tx);
 });
}
