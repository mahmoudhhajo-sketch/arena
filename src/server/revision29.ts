import {eq,sql} from 'drizzle-orm';
import {db} from '../db';
import {clubs,matches,players} from '../db/schema';
import {completeReserves} from '../engine/testLineup';
import {shouldAutofillInactiveLineup} from './inactiveLineups';
import {put,record,records} from './records';

// Repair the next matchday immediately. The same protection also runs when
// every future fixture starts, so later rounds cannot regress into easy WOs.
export async function initializeRevision29(){
 if(await record('revision-v29-inactive-lineup-safety'))return;
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719129)`);
  if(await record('revision-v29-inactive-lineup-safety',tx))return;
  const fixtures=(await records('fixture',tx)).filter((f:any)=>!f.played&&+new Date(f.date)>Date.now()-3600000).sort((a:any,b:any)=>+new Date(a.date)-+new Date(b.date));
  const next=fixtures[0],nextFixtures=fixtures.filter((f:any)=>f.round===next?.round&&(f.season||1)===(next?.season||1));
  const teams=await tx.select().from(clubs),loginEvents=await records('login-event',tx),playedMatches=await tx.select().from(matches);
  let completed=0;
  const divisions:Record<string,number>={};
  for(const fixture of nextFixtures)for(const clubId of [fixture.homeId,fixture.awayId]){
   const club=teams.find((team:any)=>team.id===clubId);
   if(!club||!shouldAutofillInactiveLineup(club,fixture,loginEvents,playedMatches))continue;
   const saved=await record('match-lineup-'+fixture.id+'-'+clubId,tx),preset=(await record('presets-'+clubId,tx))?.presets?.[0]?.lineup;
   const squad=await tx.select().from(players).where(eq(players.clubId,clubId));
   const lineup=completeReserves(saved&&!saved.automatic?saved.lineup:preset||saved?.lineup||club.lineup,squad);
   await put('match-lineup','match-lineup-'+fixture.id+'-'+clubId,{lineup,clubId,fixtureId:fixture.id,automatic:saved?.automatic??!saved,inactiveSafety:true},tx);
   completed++;divisions[fixture.division]=(divisions[fixture.division]||0)+1;
  }
  await put('system','revision-v29-inactive-lineup-safety',{date:new Date().toISOString(),matchDate:next?.date||null,season:next?.season||1,round:next?.round||null,completed,divisions},tx);
 });
}

