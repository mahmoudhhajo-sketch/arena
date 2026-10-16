import {db} from '../db';
import {players} from '../db/schema';
import {eq,sql} from 'drizzle-orm';
import {record,put} from './records';
import {assignManagerClubIds} from './clubIds';

export async function initializeRevision39(){
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719139)`);
  if(await record('revision-v39',tx))return;
  const mapping=await assignManagerClubIds(tx);
  const changed:number[]=[];
  for(const p of await tx.select().from(players)){
   if(p.race!=='orc'||!p.isMercenary||p.isDeceased)continue;
   const attrs={...p.attributes,tuffhet:Math.round((Number(p.attributes.tuffhet)+1)*1000)/1000};
   await tx.update(players).set({attributes:attrs}).where(eq(players.id,p.id));changed.push(p.id);
  }
  await put('system','revision-v39',{date:new Date().toISOString(),clubIds:Object.fromEntries(mapping),mercenaries:changed},tx);
 });
}
