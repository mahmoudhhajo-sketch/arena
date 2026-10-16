import {eq,sql} from 'drizzle-orm';
import {randomInt} from 'node:crypto';
import {clubs,players,matches,tipsetCoupons,gameRecords} from '../db/schema';
import {db} from '../db';
import {put,records} from './records';

// Change the real identifier and all stored references together, never just the label.
export async function assignManagerClubIds(tx:any,onlyId?:string){
 await tx.execute(sql`SELECT pg_advisory_xact_lock(719092)`);
 const teams=await tx.select().from(clubs),used=new Set(teams.map((c:any)=>c.id));
 const mapping=new Map<string,string>();
 for(const c of teams){
  if(c.isBot||!c.userId||/^\d{5}$/.test(c.id)||(onlyId&&c.id!==onlyId))continue;
  if(used.size>=90000)throw Error('Inga lediga lagnummer.');
  let id=String(randomInt(10000,100000));while(used.has(id))id=String(randomInt(10000,100000));
  used.add(id);mapping.set(c.id,id);
 }
 if(!mapping.size)return mapping;
 const stored=await tx.select().from(gameRecords),games=await tx.select().from(matches);
 // Match identifiers themselves are permanent, including older IDs containing a club ID.
 const protectedIds=[...games.map((m:any)=>m.id),...stored.filter((r:any)=>r.kind==='fixture').map((r:any)=>r.id)].filter((id:string)=>[...mapping.keys()].some(old=>id.includes(old)));
 const pattern=new RegExp('(?<![A-Za-z0-9])(?:'+[...protectedIds,...mapping.keys()].sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![A-Za-z0-9])','g');
 const replace=(s:string)=>s.replace(pattern,id=>mapping.get(id)||id);
 const rewrite=(value:any):any=>typeof value==='string'?replace(value):Array.isArray(value)?value.map(rewrite):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[replace(k),rewrite(v)])):value;
 const ids=new Set<string>();
 for(const r of stored){const id=r.kind==='club-id-alias'?r.id:replace(r.id);if(ids.has(id))throw Error('Lag-ID-kollision i sparade uppgifter.');ids.add(id);}
 // Insert new parents before moving foreign keys. Remove old parents last.
 for(const c of teams)if(mapping.has(c.id))await tx.insert(clubs).values({...c,id:mapping.get(c.id)});
 for(const [old,id] of mapping){
  await tx.update(players).set({clubId:id}).where(eq(players.clubId,old));
  await tx.update(matches).set({homeClubId:id}).where(eq(matches.homeClubId,old));
  await tx.update(matches).set({awayClubId:id}).where(eq(matches.awayClubId,old));
  await tx.update(tipsetCoupons).set({clubId:id}).where(eq(tipsetCoupons.clubId,old));
 }
 for(const r of stored){
  // Preserve alias keys permanently so old links continue working.
  const id=r.kind==='club-id-alias'?r.id:replace(r.id),payload=rewrite(r.payload);
  if(id!==r.id){await tx.delete(gameRecords).where(eq(gameRecords.id,r.id));await tx.insert(gameRecords).values({...r,id,payload});}
  else if(JSON.stringify(payload)!==JSON.stringify(r.payload))await tx.update(gameRecords).set({payload}).where(eq(gameRecords.id,r.id));
 }
 for(const m of games){const report=rewrite(m.matchReport);if(JSON.stringify(report)!==JSON.stringify(m.matchReport))await tx.update(matches).set({matchReport:report}).where(eq(matches.id,m.id));}
 for(const c of teams){const changes={lineup:rewrite(c.lineup),arena:rewrite(c.arena),coach:rewrite(c.coach)};if(JSON.stringify(changes)!==JSON.stringify({lineup:c.lineup,arena:c.arena,coach:c.coach}))await tx.update(clubs).set(changes).where(eq(clubs.id,mapping.get(c.id)||c.id));}
 for(const [old,id] of mapping){await tx.delete(clubs).where(eq(clubs.id,old));await put('club-id-alias','club-id-alias-'+old,{oldId:old,clubId:id},tx);}
 return mapping;
}

export function registerClubIdAliases(app:any){
 let cached:Promise<Map<string,string>>|undefined,expires=0;
 app.use('/api',async(req:any,res:any,next:any)=>{
  try{
   // Share a short cache across requests; do not add a database read to every API call.
   if(!cached||Date.now()>expires){expires=Date.now()+10000;cached=records('club-id-alias',db).then(rows=>new Map(rows.map(a=>[a.oldId,a.clubId])));}
   const aliases=await cached;
   req.url=req.url.replace(/[^/?=&]+/g,(s:string)=>aliases.get(decodeURIComponent(s))||s);
   for(const data of [req.body,req.query])if(data)for(const key of ['clubId','targetClubId','homeClubId','awayClubId'])if(aliases.has(data[key]))data[key]=aliases.get(data[key]);
   next();
  }catch(e){next(e)}
 });
}
