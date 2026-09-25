import {db} from '../db';
import {clubs,worldState} from '../db/schema';
import {balanceExistingSchedule,scheduledGameKey} from '../engine/scheduleBalance';
import {record,records,put} from './records';

// Balance the real production fixtures using round one as the fixed starting
// point. Spetsöron YVK's already announced round-two fixture is also locked.
export async function initializeRevision17(){
 if(await record('revision-v17-production-home-away'))return;
 await db.transaction(async(tx:any)=>{
  const teams=await tx.select().from(clubs),[world]=await tx.select().from(worldState),allFixtures=await records('fixture',tx);
  const fixtures=allFixtures.filter(f=>(f.season||1)===(world?.season||1)),spets=teams.find(c=>c.name.replace(/ \(C\)$/,'')==='Spetsöron YVK');
  for(const division of new Set(fixtures.map(f=>f.division))){
   const byRound=Array.from({length:18},(_,index)=>fixtures.filter(f=>f.division===division&&f.round===index+1).sort((a,b)=>a.id.localeCompare(b.id)));
   if(byRound.some(round=>round.length!==5))continue;
   const locks=new Map<string,string>();
   for(let roundIndex=0;roundIndex<byRound.length;roundIndex++)for(const fixture of byRound[roundIndex]){
    if(roundIndex===0||fixture.played||(roundIndex===1&&spets&&(fixture.homeId===spets.id||fixture.awayId===spets.id))){
     locks.set(scheduledGameKey(roundIndex,fixture.homeId,fixture.awayId),fixture.homeId);
    }
   }
   const balanced=balanceExistingSchedule(byRound.map(round=>round.map(f=>[f.homeId,f.awayId])),locks);
   for(let roundIndex=1;roundIndex<byRound.length;roundIndex++)for(const [index,fixture] of byRound[roundIndex].entries())if(!fixture.played){
    await put('fixture',fixture.id,{...fixture,homeId:balanced[roundIndex][index][0],awayId:balanced[roundIndex][index][1]},tx);
   }
  }
  await put('system','revision-v17-production-home-away',{date:new Date().toISOString()},tx);
 });
}
