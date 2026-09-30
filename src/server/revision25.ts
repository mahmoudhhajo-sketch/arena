import {sql} from 'drizzle-orm';
import {db} from '../db';
import {clubs,gameRecords,matches,shoutboxMessages} from '../db/schema';
import {put,record} from './records';

// Keep the sport's canonical name consistent in manager-authored and older stored text.
export async function initializeRevision25(){
 if(await record('revision-v25-yaraaz-vigil-spelling'))return;
 await db.transaction(async(tx:any)=>{
  if(await record('revision-v25-yaraaz-vigil-spelling',tx))return;
  const pattern='Yara{1,2}z[[:space:]]+Vi{1,2}gill?';
  await tx.update(clubs).set({name:sql`regexp_replace(${clubs.name},${pattern},'Yaraaz Vigil','gi')`,presentation:sql`regexp_replace(${clubs.presentation},${pattern},'Yaraaz Vigil','gi')`});
  await tx.update(shoutboxMessages).set({content:sql`regexp_replace(${shoutboxMessages.content},${pattern},'Yaraaz Vigil','gi')`});
  await tx.execute(sql`UPDATE ${gameRecords} SET payload=regexp_replace(payload::text,${pattern},'Yaraaz Vigil','gi')::jsonb WHERE payload::text ~* ${pattern}`);
  await tx.execute(sql`UPDATE ${matches} SET match_report=regexp_replace(match_report::text,${pattern},'Yaraaz Vigil','gi')::jsonb WHERE match_report::text ~* ${pattern}`);
  await put('system','revision-v25-yaraaz-vigil-spelling',{date:new Date().toISOString()},tx);
 });
}
