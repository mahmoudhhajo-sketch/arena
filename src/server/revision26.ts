import {eq,sql} from 'drizzle-orm';
import {db} from '../db';
import {players} from '../db/schema';
import {calculateWage} from '../engine/playerGenerator';
import {record,records,put} from './records';
import {tuneMarketWage} from './progression';

const MAIN_RACES=['human','elf','dwarf','orc'];

export async function initializeRevision26(){
 if(await record('revision-v26-balanced-imperial-quality'))return;
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719126)`);
  if(await record('revision-v26-balanced-imperial-quality',tx))return;
  const allPlayers=await tx.select().from(players),byId=new Map<number,any>(allPlayers.map((p:any)=>[p.id,p] as [number,any]));
  const bidAuctionIds=new Set((await records('bid',tx)).map((bid:any)=>bid.auctionId));
  const eligible=(await records('auction',tx)).filter((auction:any)=>!auction.closed&&+new Date(auction.endsAt)>Date.now()&&!auction.sellerId&&!auction.bidderId&&!bidAuctionIds.has(auction.id)&&MAIN_RACES.includes(byId.get(Number(auction.playerId))?.race));
  const pooled=eligible.map((auction:any)=>byId.get(Number(auction.playerId))).filter(Boolean).sort((a:any,b:any)=>a.wage-b.wage);
  const before:any={},after:any={};let changed=0;
  for(const race of MAIN_RACES){
   const group=eligible.map((auction:any)=>({auction,player:byId.get(Number(auction.playerId))})).filter((entry:any)=>entry.player?.race===race).sort((a:any,b:any)=>a.player.wage-b.player.wage);
   before[race]=group.length?Math.round(group.reduce((sum:number,entry:any)=>sum+entry.player.wage,0)/group.length):0;
   for(let i=0;i<group.length;i++){
    const target=pooled.length===1?pooled[0].wage:pooled[Math.round(i*(pooled.length-1)/Math.max(1,group.length-1))].wage;
    const attributes=tuneMarketWage(group[i].player.attributes,target),wage=calculateWage(attributes);
    await tx.update(players).set({attributes,wage}).where(eq(players.id,group[i].player.id));
    await put('auction',group[i].auction.id,{...group[i].auction,price:Math.max(100,Math.round(wage*5))},tx);
    group[i].player={...group[i].player,attributes,wage};changed++;
   }
   after[race]=group.length?Math.round(group.reduce((sum:number,entry:any)=>sum+entry.player.wage,0)/group.length):0;
  }
  await put('system','revision-v26-balanced-imperial-quality',{date:new Date().toISOString(),changed,before,after},tx);
 });
}
