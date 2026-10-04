import {sql} from 'drizzle-orm';
import {db} from '../db';
import {clubs,players} from '../db/schema';
import {put,record,records} from './records';

// The requested correction concerns the current leader's last single bid on
// Thorasten. Resolve it from the auction itself rather than from a manager's
// display name, which may differ from the login name.
export async function initializeRevision32(){
 if(await record('revision-v32-thorasten-leading-max-bid'))return;
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719132)`);
  if(await record('revision-v32-thorasten-leading-max-bid',tx))return;
  const allPlayers=await tx.select().from(players),teams=await tx.select().from(clubs);
  const thorastenIds=new Set(allPlayers.filter((player:any)=>player.name.toLocaleLowerCase('sv').includes('thorasten')).map((player:any)=>player.id));
  const auction=(await records('auction',tx)).filter((item:any)=>!item.closed&&+new Date(item.endsAt)>Date.now()&&thorastenIds.has(item.playerId)&&item.bidderId).sort((a:any,b:any)=>+new Date(b.endsAt)-+new Date(a.endsAt))[0];
  const latest=auction?(await records('bid',tx)).filter((bid:any)=>bid.auctionId===auction.id&&bid.clubId===auction.bidderId&&bid.bidType!=='max').sort((a:any,b:any)=>+new Date(b.date)-+new Date(a.date))[0]:null;
  let changed=false;
  if(auction&&latest){
   const maxId='max-bid-player-'+auction.id+'-'+latest.clubId;
   await put('max-bid',maxId,{auctionId:auction.id,clubId:latest.clubId,market:'player',maxAmount:latest.amount,date:latest.date},tx);
   await put('bid',latest.id,{...latest,bidType:'max'},tx);
   changed=true;
   const team=teams.find((club:any)=>club.id===latest.clubId);
   console.log('Thorastens ledande engångsbud ändrades till maxbud:',latest.amount,'guld, lag',team?.name||latest.clubId);
  }else console.log('Thorasten-korrigeringen kunde inte hitta ett aktivt ledande engångsbud.');
  await put('system','revision-v32-thorasten-leading-max-bid',{date:new Date().toISOString(),changed,auctionId:auction?.id||null,bidId:latest?.id||null,amount:latest?.amount||null},tx);
 });
}
