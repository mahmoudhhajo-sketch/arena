import {db} from '../db';
import {clubs,gameRecords,players} from '../db/schema';
import {eq,inArray} from 'drizzle-orm';
import {record,records,put} from './records';

// Explicit owner correction: silently remove Djurpatrullen's bid on Kroggimorn.
// This deliberately creates no news item, audit entry or public change record.
export async function initializeRevision18(){
 if(await record('revision-v18-remove-djurpatrullen-kroggimorn-bid'))return;
 await db.transaction(async(tx:any)=>{
  const teams=await tx.select().from(clubs),squad=await tx.select().from(players);
  const club=teams.find(c=>c.name.replace(/ \(C\)$/,'').toLocaleLowerCase('sv')==='djurpatrullen');
  const player=squad.find(p=>p.name.toLocaleLowerCase('sv')==='kroggimorn');
  if(club&&player){
   const auctions=(await records('auction',tx)).filter(a=>a.playerId===player.id&&!a.closed);
   for(const auction of auctions){
    const bids=(await records('bid',tx)).filter(b=>b.auctionId===auction.id),remove=bids.filter(b=>b.clubId===club.id),remaining=bids.filter(b=>b.clubId!==club.id).sort((a,b)=>b.amount-a.amount||b.date.localeCompare(a.date));
    if(remove.length)await tx.delete(gameRecords).where(inArray(gameRecords.id,remove.map(b=>b.id)));
    if(auction.bidderId===club.id){
     const next=remaining[0],reset=auction.startPrice||Math.max(1,Math.round(player.wage*(auction.sellerId?4:5)));
     await put('auction',auction.id,{...auction,bidderId:next?.clubId||null,price:next?.amount||reset},tx);
    }
   }
  }
  await put('system','revision-v18-remove-djurpatrullen-kroggimorn-bid',{done:true},tx);
 });
}
