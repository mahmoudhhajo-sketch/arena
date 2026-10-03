import {sql} from 'drizzle-orm';
import {db} from '../db';
import {put,record,records} from './records';

const STAFF_LIFETIME_MS=20*7*86400000;

// Convert season-bound staffs to a twenty-week lifetime. Existing staffs use
// their first completed acquisition when it can be recovered; otherwise their
// twenty weeks begin with this migration.
export async function initializeRevision30(){
 if(await record('revision-v30-moon-staff-weeks'))return;
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719130)`);
  if(await record('revision-v30-moon-staff-weeks',tx))return;
  const auctions=(await records('artifact-auction',tx)).filter((a:any)=>a.artifactId==='moon-staff'&&a.closed&&a.bidderId).sort((a:any,b:any)=>+new Date(a.endsAt)-+new Date(b.endsAt));
  let converted=0;
  for(const item of (await records('artifact-item',tx)).filter((i:any)=>i.artifactId==='moon-staff'&&i.clubId&&!i.expiresAt)){
   const acquired=auctions.find((a:any)=>a.itemId===item.id)?.endsAt||new Date().toISOString();
   await put('artifact-item',item.id,{...item,expiresAt:new Date(+new Date(acquired)+STAFF_LIFETIME_MS).toISOString()},tx);
   converted++;
  }
  await put('system','revision-v30-moon-staff-weeks',{date:new Date().toISOString(),converted},tx);
 });
}
