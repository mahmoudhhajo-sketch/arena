import {imperialAuctionEnd} from './auctionTiming';
import {worldState} from '../db/schema';
import {ARTIFACTS} from '../constants/market';
import {put,record,records} from './records';
import {randomUUID} from 'node:crypto';

/** Called under the shared imperial supply transaction lock. Player resales never consume this quota. */
export async function seasonalCantanirings(tx:any,now:Date,slots:number){
 const [world]=await tx.select().from(worldState);if(!world)return 0;
 const key='cantaniring-season-'+world.season;
 let state=await record(key,tx);
 if(!state){
  // Legacy auctions had no season stamp. Adopt them once instead of adding duplicates.
  const legacy=!(await record('cantaniring-season-accounting',tx));
  const existing=(await records('artifact-auction',tx)).filter(a=>a.artifactId==='cantaniring'&&!a.sellerId&&!a.cancelled&&(a.supplySeason===world.season||(legacy&&a.supplySeason==null)));
  state={count:existing.length};
  await put('system','cantaniring-season-accounting',{date:now.toISOString()},tx);
 }
 const released=Number(state.count||0),due=Math.min(3,1+Math.floor(Math.max(0,world.round)/6));
 const count=Math.min(Math.max(0,slots),Math.max(0,due-released));
 const artifact=ARTIFACTS.find(a=>a.id==='cantaniring')!;
 for(let i=0;i<count;i++){
  const itemId='item-'+randomUUID();
  await put('artifact-item',itemId,{artifactId:artifact.id,clubId:null,playerId:null,listed:true},tx);
  await put('artifact-auction','artifact-auction-'+randomUUID(),{itemId,artifactId:artifact.id,sellerId:null,price:artifact.price,bidderId:null,supplySeason:world.season,createdAt:now.toISOString(),endsAt:imperialAuctionEnd(now),closed:false},tx);
 }
 await put('system',key,{count:released+count,date:now.toISOString()},tx);
 return count;
}
