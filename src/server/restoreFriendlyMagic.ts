import {db} from '../db';
import {players} from '../db/schema';
import {eq,sql} from 'drizzle-orm';
import {record,records,put} from './records';
import {spellById} from '../constants/spells';
import {matchParticipation} from '../engine/matchParticipation';

/** One-off compensation for the first friendly implementation, which consumed
 * unbound competitive magic. Only recorded, participating players are credited. */
export async function restoreFriendlyMagic(){
 const key='friendly-magic-compensation-v2';
 if(await record(key))return;
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(7192043)`);
  if(await record(key,tx))return;
  const restored:any[]=[];
  for(const report of await records('friendly-report',tx)){
   if(report.magicFixtureVersion===2)continue;
   for(const side of ['home','away'] as const){
    const credit=matchParticipation(report,side);
    if(!credit.started)continue;
    for(const event of report.events){
     const prefix='magic-'+side+'-'+event.playerId+'-';
     if(!event.id?.startsWith(prefix)||!credit.slots.has(event.playerId))continue;
     const spell=spellById(event.id.slice(prefix.length));if(!spell)continue;
     const [p]=await tx.select().from(players).where(eq(players.id,event.playerId)).for('update');
     if(!p||p.isDeceased)continue;
     const artifacts=[...p.artifacts];
     const index=artifacts.findIndex((a:string)=>a.startsWith('magic:'+spell.id+':')&&(!a.split(':')[3]||a.split(':')[3]==='series'));
     if(index<0)artifacts.push('magic:'+spell.id+':1:series');
     else artifacts[index]='magic:'+spell.id+':'+(Number(artifacts[index].split(':')[2])+1)+':series';
     await tx.update(players).set({artifacts}).where(eq(players.id,p.id));
     restored.push({fixtureId:report.id,playerId:p.id,spellId:spell.id,uses:1});
    }
   }
  }
  await put('maintenance',key,{date:new Date().toISOString(),restored},tx);
 });
}
