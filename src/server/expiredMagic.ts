import {db} from '../db';
import {players} from '../db/schema';
import {eq,sql} from 'drizzle-orm';
import {records} from './records';
import {clearFinishedFixtureSpells} from '../constants/spells';
export async function clearExpiredFixtureMagic(){
 await db.transaction(async(tx:any)=>{
  const finished=new Set<string>((await records('fixture',tx)).concat(await records('friendly-fixture',tx)).filter(f=>f.played).map(f=>f.id));
  if(!finished.size)return;
  const squad=await tx.select().from(players).where(sql`${players.artifacts}::text LIKE '%magic:%'`).for('update');
  for(const p of squad){const artifacts=clearFinishedFixtureSpells(p.artifacts,finished);if(JSON.stringify(artifacts)!==JSON.stringify(p.artifacts))await tx.update(players).set({artifacts}).where(eq(players.id,p.id));}
 });
}
