import {db} from '../db';
import {players,gameRecords} from '../db/schema';
import {eq,sql} from 'drizzle-orm';
import {record,put} from './records';
export function correctAermirReferences(value:any):any{
 if(typeof value==='string')return value.replaceAll('Aermir Vindfoten','Aermir Vindfot');
 if(Array.isArray(value))return value.map(correctAermirReferences);
 if(value&&typeof value==='object'){
  const result=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,correctAermirReferences(v)]));
  if((Number(value.id)===8175||Number(value.playerId)===8175)&&result.legendName==='Vindfoten')result.legendName='Vindfot';
  return result;
 }
 return value;
}
/** Explicit owner-requested correction of the season-one Hinderbana winner. */
export async function correctAermirLegend92(){
 if(await record('revision-legend-name-92'))return;
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719192)`);
  if(await record('revision-legend-name-92',tx))return;
  const [player]=await tx.select().from(players).where(eq(players.id,8175)).for('update');
  if(!player||player.clubId!=='72844'||!['Aermir Vindfoten','Aermir Vindfot'].includes(player.name))return;
  await tx.update(players).set({name:'Aermir Vindfot'}).where(eq(players.id,8175));
  const affected=await tx.select().from(gameRecords).where(sql`${gameRecords.payload}::text LIKE ${'%Aermir Vindfoten%'}`);
  for(const row of affected)await tx.update(gameRecords).set({payload:correctAermirReferences(row.payload)}).where(eq(gameRecords.id,row.id));
  await put('system','revision-legend-name-92',{playerId:8175,from:'Aermir Vindfoten',to:'Aermir Vindfot',at:new Date().toISOString()},tx);
 });
}
