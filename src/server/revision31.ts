import {sql} from 'drizzle-orm';
import {db} from '../db';
import {clubs,players} from '../db/schema';
import {put,record,records} from './records';

const normalized=(value:string)=>value.trim().toLocaleLowerCase('sv');

// Correct the owner's most recent Thorasten bid, which was submitted as a
// single bid instead of a proxy maximum. This leaves the displayed price and
// the bid history intact; only the bidding mode changes.
export async function initializeRevision31(){
 if(await record('revision-v31-thorasten-max-bid'))return;
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719131)`);
  if(await record('revision-v31-thorasten-max-bid',tx))return;
  const teams=await tx.select().from(clubs),allPlayers=await tx.select().from(players);
  const ownerIds=new Set(teams.filter((club:any)=>!club.isBot&&normalized(club.ownerName)==='zagge').map((club:any)=>club.id));
  const playerIds=new Set(allPlayers.filter((player:any)=>normalized(player.name)==='thorasten').map((player:any)=>player.id));
  const open=(await records('auction',tx)).filter((auction:any)=>!auction.closed&&+new Date(auction.endsAt)>Date.now()&&playerIds.has(auction.playerId));
  const auctionIds=new Set(open.map((auction:any)=>auction.id));
  const latest=(await records('bid',tx)).filter((bid:any)=>auctionIds.has(bid.auctionId)&&ownerIds.has(bid.clubId)&&bid.bidType!=='max').sort((a:any,b:any)=>+new Date(b.date)-+new Date(a.date))[0];
  let changed=false;
  if(latest){
   const auction=open.find((item:any)=>item.id===latest.auctionId);
   const maxId='max-bid-player-'+latest.auctionId+'-'+latest.clubId;
   await put('max-bid',maxId,{auctionId:latest.auctionId,clubId:latest.clubId,market:'player',maxAmount:latest.amount,date:latest.date},tx);
   await put('bid',latest.id,{...latest,bidType:'max'},tx);
   changed=true;
   console.log('Thorastens senaste bud ändrades till maxbud:',latest.amount,'guld, auktion',auction?.id);
  }else console.log('Thorasten-korrigeringen hittade inget aktivt engångsbud från Zagge.');
  await put('system','revision-v31-thorasten-max-bid',{date:new Date().toISOString(),changed,bidId:latest?.id||null,amount:latest?.amount||null},tx);
 });
}
