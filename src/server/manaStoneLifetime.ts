import {sql,eq} from 'drizzle-orm';
import {gameRecords} from '../db/schema';
import {records,put} from './records';
export async function initializeManaStoneLifetimes(tx:any,now:Date){
 await tx.execute(sql`SELECT pg_advisory_xact_lock(719189)`);
 const items=(await records('artifact-item',tx)).filter(i=>i.artifactId==='mana-stone'&&i.clubId&&!i.expiresAt);
 if(!items.length)return;
 const auctions=await records('artifact-auction',tx);
 for(const candidate of items){
  const [row]=await tx.select().from(gameRecords).where(eq(gameRecords.id,candidate.id)).for('update');const item=row?.payload as any;
  if(!item?.clubId||item.expiresAt)continue;
  const first=auctions.filter(a=>a.itemId===candidate.id&&a.closed&&!a.cancelled&&a.bidderId).sort((a,b)=>+new Date(a.endsAt)-+new Date(b.endsAt))[0];
  const acquiredAt=item.acquiredAt||first?.endsAt||now.toISOString();
  await put('artifact-item',candidate.id,{...item,acquiredAt,expiresAt:new Date(+new Date(acquiredAt)+20*7*86400000).toISOString()},tx);
 }
}
