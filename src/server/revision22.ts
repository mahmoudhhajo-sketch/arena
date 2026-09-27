import {db} from '../db';
import {clubs,gameRecords} from '../db/schema';
import {eq} from 'drizzle-orm';
import {record,records,put} from './records';

// One-time owner-requested correction. Deliberately creates no player-facing news or ledger row.
export async function initializeRevision22(){
 if(await record('revision-v22-owner-bid-correction'))return;
 await db.transaction(async(tx:any)=>{
  if(await record('revision-v22-owner-bid-correction',tx))return;
  const owner=(await tx.select().from(clubs)).find((c:any)=>!c.isBot&&(c.ownerName==='Zagge'||c.name==='Spetsöron YVK'));
  if(owner){
   for(const auction of (await records('artifact-auction',tx)).filter((a:any)=>!a.closed&&a.artifactId==='keeper-gloves'&&a.bidderId===owner.id&&a.price===18000)){
    const ownerBids=(await records('artifact-bid',tx)).filter((b:any)=>b.auctionId===auction.id&&b.clubId===owner.id&&b.amount===18000);
    for(const bid of ownerBids)await tx.delete(gameRecords).where(eq(gameRecords.id,bid.id));
    const remaining=(await records('artifact-bid',tx)).filter((b:any)=>b.auctionId===auction.id&&b.clubId!==owner.id).sort((a:any,b:any)=>b.amount-a.amount);
    await put('artifact-auction',auction.id,{...auction,price:remaining[0]?.amount??auction.startPrice??18000,bidderId:remaining[0]?.clubId??null},tx);
   }
  }
  const teams=await tx.select().from(clubs),prices=await record('magic-weekly-prices',tx);
  if(prices){const humanIds=new Set(teams.filter((c:any)=>!c.isBot).map((c:any)=>c.id));await put('magic-prices','magic-weekly-prices',{...prices,teams:(prices.teams||[]).filter((c:any)=>humanIds.has(c.id))},tx);}
  await put('system','revision-v22-owner-bid-correction',{date:new Date().toISOString()},tx);
 });
}
