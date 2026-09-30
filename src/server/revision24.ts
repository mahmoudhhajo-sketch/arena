import {db} from '../db';
import {clubs,matches,worldState} from '../db/schema';
import {eq} from 'drizzle-orm';
import {record,put} from './records';

// Restores the current season's table record after a bot club has been taken over.
// Match rows are authoritative, so this also repairs the two already-created clubs.
export async function initializeRevision24(){
 if(await record('revision-v24-inherited-standings'))return;
 await db.transaction(async(tx:any)=>{
  if(await record('revision-v24-inherited-standings',tx))return;
  const [world]=await tx.select().from(worldState),teams=await tx.select().from(clubs),played=(await tx.select().from(matches)).filter((m:any)=>m.season===(world?.season||1));
  for(const club of teams){
   let wins=0,draws=0,losses=0,goalsFor=0,goalsAgainst=0;
   for(const match of played){
    const home=match.homeClubId===club.id,away=match.awayClubId===club.id;if(!home&&!away)continue;
    const scored=home?match.homeScore:match.awayScore,conceded=home?match.awayScore:match.homeScore;
    goalsFor+=scored;goalsAgainst+=conceded;if(scored>conceded)wins++;else if(scored===conceded)draws++;else losses++;
   }
   await tx.update(clubs).set({wins,draws,losses,goalsFor,goalsAgainst,recordString:`${wins}/${draws}/${losses}`}).where(eq(clubs.id,club.id));
  }
  await put('system','revision-v24-inherited-standings',{date:new Date().toISOString(),season:world?.season||1,matches:played.length},tx);
 });
}
