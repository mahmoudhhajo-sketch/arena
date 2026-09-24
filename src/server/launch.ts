import {db} from '../db';
import {worldState} from '../db/schema';
import {sql} from 'drizzle-orm';
import {record,records,put} from './records';
import {fixtureDates} from '../engine/schedule';

// Local test worlds continue normally. Hosted worlds require an explicit operator start.
export function launchControlled(){return !!process.env.RAILWAY_ENVIRONMENT||process.env.ARENA_REQUIRE_LAUNCH==='true';}
export async function launchStatus(){
 const state=await record('world-launch');
 return {paused:launchControlled()&&!state?.startedAt,startedAt:state?.startedAt||null,firstMatchAt:state?.firstMatchAt||null};
}
export function launchFixtures(at:Date,count=18){
 if(count<=0)return [];
 return [at.toISOString(),...fixtureDates(new Date(+at+1),count-1)];
}
export async function prepareLaunch(now:Date){
 if(!launchControlled())return true;
 return db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719203)`);
  let state=await record('world-launch',tx);
  if(state?.startedAt)return true;
  if(!state){state={pausedAt:now.toISOString()};await put('system','world-launch',state,tx);}
  const configured=process.env.ARENA_LAUNCH_AT;
  if(!configured)return false;
  const start=new Date(configured);
  if(!Number.isFinite(+start))throw Error('ARENA_LAUNCH_AT must be an ISO timestamp.');
  if(+start<+new Date(state.pausedAt))throw Error('Launch time cannot precede the pause.');
  if(state.firstMatchAt!==start.toISOString()){
   const [world]=await tx.select().from(worldState),fixtures=(await records('fixture',tx)).filter(f=>!f.played&&(f.season||1)===world.season),rounds=[...new Set<number>(fixtures.map(f=>f.round))].sort((a,b)=>a-b),dates=launchFixtures(start,rounds.length);
   for(const f of fixtures)await put('fixture',f.id,{...f,date:dates[rounds.indexOf(f.round)]},tx);
   state={...state,firstMatchAt:dates[0],scheduledAt:now.toISOString()};await put('system','world-launch',state,tx);
  }
  if(start>now)return false;
  await put('system','world-launch',{...state,startedAt:start.toISOString(),firstMatchAt:start.toISOString()},tx);
  return true;
 });
}
