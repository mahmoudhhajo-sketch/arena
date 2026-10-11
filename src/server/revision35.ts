import {eq,sql} from 'drizzle-orm';
import {db} from '../db';
import {clubs,players} from '../db/schema';
import {put,record,records} from './records';

const normalized=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('sv');

// One-time owner-requested correction: return Lethal Khazads' mithril armour
// from its current bearers to the club inventory so it can be assigned anew.
export async function initializeRevision35(){
 if(await record('revision-v35-release-lethal-mithril'))return;
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719135)`);
  if(await record('revision-v35-release-lethal-mithril',tx))return;
  const team=(await tx.select().from(clubs)).find((club:any)=>normalized(club.name).includes('lethal khazad'));
  const released:number[]=[];
  if(team){
   const items=(await records('artifact-item',tx)).filter((item:any)=>item.clubId===team.id&&item.artifactId==='mithril'&&item.playerId);
   for(const item of items){
    const [player]=await tx.select().from(players).where(eq(players.id,Number(item.playerId))).for('update');
    if(player)await tx.update(players).set({artifacts:(player.artifacts||[]).filter((id:string)=>id!=='mithril')}).where(eq(players.id,player.id));
    await put('artifact-item',item.id,{...item,playerId:null,listed:false},tx);
    released.push(Number(item.playerId));
   }
  }
  await put('system','revision-v35-release-lethal-mithril',{date:new Date().toISOString(),clubId:team?.id||null,released});
 });
}
