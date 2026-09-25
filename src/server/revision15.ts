import {db} from '../db';
import {clubs} from '../db/schema';
import {roundRobin} from '../engine/schedule';
import {record,records,put} from './records';

// Correct the original home/away orientation without changing opponents, dates or fixture ids.
// Spetsöron YVK's already announced round-two fixture is deliberately left untouched.
export async function initializeRevision15(){
 if(await record('revision-v15-balanced-schedule'))return;
 await db.transaction(async(tx:any)=>{
  const teams=await tx.select().from(clubs),fixtures=(await records('fixture',tx)).filter(f=>!f.played);
  for(const division of [...new Set(fixtures.map(f=>f.division))]){
   const ids=teams.filter(c=>c.division===division).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id)).slice(0,10).map(c=>c.id);
   if(ids.length!==10)continue;
   const desired=roundRobin(ids);
   for(const fixture of fixtures.filter(f=>f.division===division&&f.round>=2)){
    const pair=desired[fixture.round-1]?.find(([a,b])=>(a===fixture.homeId&&b===fixture.awayId)||(a===fixture.awayId&&b===fixture.homeId));
    if(!pair)continue;
    const spets=teams.find(c=>c.name.replace(/ \(C\)$/,'')==='Spetsöron YVK');
    if(fixture.round===2&&spets&&(fixture.homeId===spets.id||fixture.awayId===spets.id))continue;
    await put('fixture',fixture.id,{...fixture,homeId:pair[0],awayId:pair[1]},tx);
   }
  }
  await put('system','revision-v15-balanced-schedule',{date:new Date().toISOString()},tx);
 });
}
