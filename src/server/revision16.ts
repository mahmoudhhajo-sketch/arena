import {db} from '../db';
import {clubs} from '../db/schema';
import {roundRobin} from '../engine/schedule';
import {record,records,put} from './records';

// Reapply the balanced home/away orientation to every club. Opponents, dates
// and fixture ids remain unchanged. Only Spetsöron YVK's announced round-two
// fixture keeps its current home/away assignment.
export async function initializeRevision16(){
 if(await record('revision-v16-weekly-home-away'))return;
 await db.transaction(async(tx:any)=>{
  const teams=await tx.select().from(clubs),fixtures=(await records('fixture',tx)).filter(f=>!f.played);
  const spets=teams.find(c=>c.name.replace(/ \(C\)$/,'')==='Spetsöron YVK');
  for(const division of new Set(fixtures.map(f=>f.division))){
   const ids=teams.filter(c=>c.division===division).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id)).slice(0,10).map(c=>c.id);
   if(ids.length!==10)continue;
   const desired=roundRobin(ids);
   for(const fixture of fixtures.filter(f=>f.division===division&&f.round>=2)){
    const pair=desired[fixture.round-1]?.find(([a,b])=>(a===fixture.homeId&&b===fixture.awayId)||(a===fixture.awayId&&b===fixture.homeId));
    if(!pair)continue;
    if(fixture.round===2&&spets&&(fixture.homeId===spets.id||fixture.awayId===spets.id))continue;
    await put('fixture',fixture.id,{...fixture,homeId:pair[0],awayId:pair[1]},tx);
   }
  }
  await put('system','revision-v16-weekly-home-away',{date:new Date().toISOString()},tx);
 });
}
