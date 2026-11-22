import {db} from '../db';
import {gameRecords} from '../db/schema';
import {sql} from 'drizzle-orm';
export function latestActivity(userId:string,sessions:any[],events:any[],saved:any[]){
 const known=[...sessions.filter(s=>s.userId===userId&&!s.guest).map(s=>Number(s.lastSeen)),...saved.filter(s=>s.userId===userId).map(s=>Number(s.lastSeen)),...events.filter(e=>e.userId===userId).map(e=>+new Date(e.date))].filter(n=>Number.isFinite(n)&&n>0&&n<=Date.now()+60000);
 return known.length?Math.max(...known):null;
}
export async function rememberActivity(userId:string,lastSeen:number,tx:any=db){
 if(!userId||!Number.isFinite(lastSeen)||lastSeen<=0)return;
 await tx.insert(gameRecords).values({id:'user-activity-'+userId,kind:'user-activity',payload:{userId,lastSeen}}).onConflictDoUpdate({target:gameRecords.id,set:{payload:sql`jsonb_build_object('userId',${userId}::text,'lastSeen',greatest(coalesce((${gameRecords.payload}->>'lastSeen')::bigint,0),${lastSeen}::bigint))`}});
}
