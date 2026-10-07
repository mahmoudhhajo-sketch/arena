import {eq,sql} from 'drizzle-orm';
import {db} from '../db';
import {players,worldState} from '../db/schema';
import {calculateLegacyWage,calculateWage} from '../engine/playerGenerator';
import {put,record,records} from './records';
import {tuneSpecializedMarketWage} from './progression';

function roleFor(player:any){
 const nominal=String(player.nominalPosition||'');
 if(nominal==='Målvakt')return 'goalkeeper';
 if(nominal==='Back')return 'defender';
 if(nominal==='Innermittfält'||nominal==='Yttermittfält')return 'midfielder';
 if(nominal==='Anfall')return 'attacker';
 const a=player.attributes||{};
 const scores:any={goalkeeper:Number(a.malvakt||0)*1.6+Number(a.speluppfattning||0)*.4,defender:Number(a.markering||0)+Number(a.tuffhet||0)*.8+Number(a.speluppfattning||0)*.35,midfielder:Number(a.passning||0)+Number(a.teknik||0)+Number(a.speluppfattning||0),attacker:Number(a.skott||0)*1.4+Number(a.snabbhet||0)*.7+Number(a.teknik||0)*.5};
 return Object.keys(scores).sort((x,y)=>scores[y]-scores[x])[0];
}

function seeded(playerId:number){let state=(playerId*1664525+1013904223)>>>0;return()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296}}

// Reshape only untouched imperial listings. Auctions with a bid keep the exact
// player that managers evaluated and bid on.
export async function initializeRevision34(){
 if(await record('revision-v34-positioned-imperial-market'))return;
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719134)`);
  if(await record('revision-v34-positioned-imperial-market',tx))return;
  const [world]=await tx.select().from(worldState),all=await tx.select().from(players),byId=new Map<number,any>(all.map((player:any)=>[player.id,player]));
  const bidAuctionIds=new Set((await records('bid',tx)).map((bid:any)=>bid.auctionId));
  for(const max of await records('max-bid',tx))bidAuctionIds.add(max.auctionId);
  const eligible=(await records('auction',tx)).filter((auction:any)=>!auction.closed&&+new Date(auction.endsAt)>Date.now()&&!auction.sellerId&&!auction.bidderId&&!bidAuctionIds.has(auction.id));
  const changed:any[]=[];
  for(const auction of eligible){
   const player=byId.get(Number(auction.playerId));if(!player)continue;
   const role=roleFor(player),attributes=tuneSpecializedMarketWage(player.attributes,calculateLegacyWage(player.attributes),role,seeded(player.id)),wage=calculateWage(attributes,world?.season||1);
   await tx.update(players).set({attributes,wage}).where(eq(players.id,player.id));
   await put('auction',auction.id,{...auction,price:Math.max(100,Math.round(wage*5))},tx);
   changed.push({playerId:player.id,role});
  }
  await put('system','revision-v34-positioned-imperial-market',{date:new Date().toISOString(),changed},tx);
 });
}
