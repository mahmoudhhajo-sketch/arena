import {db} from '../db';
import {clubs,players} from '../db/schema';
import {eq} from 'drizzle-orm';
import {activeIds} from '../engine/lineup';
import {completeReserves} from '../engine/testLineup';
import {record,records,put} from './records';

// Fill only the next matchday for teams without ten selected starters.
// Existing selections are retained while missing starters and reserves are added.
export async function initializeRevision23(){
 if(await record('revision-v23-next-round-lineups'))return;
 await db.transaction(async(tx:any)=>{
  if(await record('revision-v23-next-round-lineups',tx))return;
  const fixtures=(await records('fixture',tx)).filter((f:any)=>!f.played&&+new Date(f.date)>Date.now()-3600000).sort((a:any,b:any)=>+new Date(a.date)-+new Date(b.date));
  const next=fixtures[0],nextFixtures=fixtures.filter((f:any)=>f.round===next?.round&&(f.season||1)===(next?.season||1)),teams=await tx.select().from(clubs);
  let completed=0;
  for(const fixture of nextFixtures)for(const clubId of [fixture.homeId,fixture.awayId]){
   const club=teams.find((c:any)=>c.id===clubId);if(!club)continue;
   const saved=await record('match-lineup-'+fixture.id+'-'+clubId,tx),preset=(await record('presets-'+clubId,tx))?.presets?.[0]?.lineup,effective=saved?.lineup||preset||club.lineup;
   const active=Object.values(effective?.slots||{}).flatMap((slot:any)=>activeIds(slot)).length;
   if(active>=10)continue;
   const squad=await tx.select().from(players).where(eq(players.clubId,clubId));
   const lineup=completeReserves(effective,squad);
   await put('match-lineup','match-lineup-'+fixture.id+'-'+clubId,{lineup,clubId,fixtureId:fixture.id,automatic:true},tx);completed++;
  }
  await put('system','revision-v23-next-round-lineups',{date:new Date().toISOString(),matchDate:next?.date||null,season:next?.season||1,round:next?.round||null,completed},tx);
 });
}
