import {records,put} from './records';
import {BidMode,nextBid,resolveProxyPrice} from '../engine/proxyBid';
import {gameRecords} from '../db/schema';
import {eq} from 'drizzle-orm';

export type AuctionKind='auction'|'artifact-auction';
export async function activeMaxBids(tx:any,clubId:string,excludeAuctionId?:string){
 const open=[...await records('auction',tx),...await records('artifact-auction',tx)].filter((a:any)=>!a.closed&&+new Date(a.endsAt)>Date.now());
 const ledIds=new Set(open.filter((a:any)=>a.bidderId===clubId).map((a:any)=>a.id));
 return (await records('max-bid',tx)).filter((b:any)=>b.clubId===clubId&&b.auctionId!==excludeAuctionId&&ledIds.has(b.auctionId));
}

export async function placeProxyBid({tx,auction,club,amount,mode,auctionKind}:{tx:any;auction:any;club:any;amount:number;mode:BidMode;auctionKind:AuctionKind}){
 if(!Number.isInteger(amount))throw Error('Budet måste anges i hela guld.');
 const minimum=auction.bidderId===club.id?auction.price:(auction.bidderId?nextBid(auction.price):auction.price);
 if(amount<minimum)throw Error('Minsta bud är '+minimum+' guld.');
 const maxBids=await records('max-bid',tx),market=auctionKind==='auction'?'player':'artifact';
 const own=maxBids.find((b:any)=>b.auctionId===auction.id&&b.clubId===club.id);
 let replacedOwnMax=false;
 if(mode==='max'){
  const active=await activeMaxBids(tx,club.id,auction.id),ownIsActive=auction.bidderId===club.id&&!!own;
  if(!ownIsActive&&active.length>=3)throw Error('Du kan ha högst tre aktiva maxbud samtidigt.');
  if(amount>club.gold)throw Error('Maxbudet kan inte vara högre än din nuvarande kassa.');
  const committed=active.reduce((sum:number,b:any)=>sum+Number(b.maxAmount||0),0);
  if(committed+amount>club.gold)throw Error('Dina aktiva maxbud kan tillsammans inte överstiga din nuvarande kassa.');
  await put('max-bid','max-bid-'+market+'-'+auction.id+'-'+club.id,{auctionId:auction.id,clubId:club.id,market,maxAmount:amount,date:new Date().toISOString()},tx);
 }else if(own&&amount>Number(own.maxAmount)){
  // A deliberate single bid above the manager's existing ceiling replaces the
  // proxy instruction. It must not remain hidden and bid again later.
  await tx.delete(gameRecords).where(eq(gameRecords.id,own.id));
  replacedOwnMax=true;
 }
 const incumbentMax=maxBids.find((b:any)=>b.auctionId===auction.id&&b.clubId===auction.bidderId)?.maxAmount;
 const {bidderId,price}=resolveProxyPrice(auction,club.id,amount,mode,incumbentMax);
 return {auction:{...auction,bidderId,price},leading:bidderId===club.id,previousBidderId:auction.bidderId,minimum,replacedOwnMax};
}
