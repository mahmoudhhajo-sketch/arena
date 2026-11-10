import {db} from '../db';
import {clubs,players} from '../db/schema';
import {eq,sql} from 'drizzle-orm';
import {record,records,put} from './records';
import {dailyUpdates} from '../engine/calendar';
import {teamNews} from './newsStatistics';
export function coachContract(start:string){const date=new Date(start),minimum=new Date(+date+20*7*86400000);const end=dailyUpdates(new Date(+minimum-1),new Date(+minimum+8*86400000)).find(d=>d.getUTCDay()===1)!;return {hiredAt:date.toISOString(),expiresAt:end.toISOString()};}
export async function initializeRules52(){await db.transaction(async(tx:any)=>{await tx.execute(sql`SELECT pg_advisory_xact_lock(719052)`);if(await record('rules52',tx))return;
 const all=await tx.select().from(clubs),ledger=await records('ledger',tx),ps=await tx.select({id:players.id}).from(players);
 await put('system','training-potential-start',{lastExistingId:Math.max(0,...ps.map((p:any)=>p.id)),date:new Date().toISOString()},tx);
 for(const c of all){if(!c.coach)continue;const first=ledger.filter(l=>l.clubId===c.id&&l.category==='Tränare'&&l.amount<0&&l.date).sort((a,b)=>a.date.localeCompare(b.date))[0];const start=c.coach.hiredAt||first?.date||new Date().toISOString();await tx.update(clubs).set({coach:{...c.coach,...coachContract(start),contractDateSource:c.coach.hiredAt?'saved':first?'first-wage':'no-history'}}).where(eq(clubs.id,c.id));}
 await put('system','rules52',{date:new Date().toISOString()},tx);
});}
export async function expireCoaches(at:Date,tx:any=db){await tx.execute(sql`SELECT pg_advisory_xact_lock(719090)`);for(const c of await tx.select().from(clubs)){if(c.coach?.expiresAt&&+new Date(c.coach.expiresAt)<=+at){const points={...c.trainingPoints};let remaining=6;for(const key of Object.keys(points)){points[key]=Math.min(remaining,Math.max(0,points[key]||0));remaining-=points[key];}await tx.update(clubs).set({coach:null,trainingPoints:points}).where(eq(clubs.id,c.id));await teamNews(tx,c.id,'coach-ended-'+c.coach.id+'-'+c.coach.expiresAt,'Tränarens kontrakt har löpt ut',c.coach.name+' har lämnat klubben efter sitt kontrakt. Se över träningsfördelningen och anlita en ny tränare om du vill.');}}}
