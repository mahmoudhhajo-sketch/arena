import {db} from '../db';import {sql} from 'drizzle-orm';import {record,put,records} from './records';import {ARTIFACT_MARKET_CAP,ARTIFACT_MARKET_WEIGHTS,MARKET_ARTIFACTS} from '../constants/market';import {weatherFor} from '../engine/weather';import {SeededRNG} from '../engine/matchEngine';import {randomUUID} from 'node:crypto';
import {seasonalCantanirings} from './seasonalArtifacts';
export async function replenishArtifacts(now:Date){
 const date=weatherFor('',now).date,week=new Date(date+'T12:00:00Z');week.setUTCDate(week.getUTCDate()-((week.getUTCDay()+6)%7));const key='artifact-supply-v2-'+week.toISOString().slice(0,10);
 await db.transaction(async(tx:any)=>{await tx.execute(sql`SELECT pg_advisory_xact_lock(719092)`);const previous=Number((await record(key,tx))?.count||0);
  const choices=MARKET_ARTIFACTS.filter(a=>a.id!=='cantaniring'),total=choices.reduce((n,a)=>n+ARTIFACT_MARKET_WEIGHTS[a.id],0),rng=new SeededRNG(+week/86400000+previous*197);
  const imperialOpen=(await records('artifact-auction',tx)).filter(a=>!a.closed&&!a.sellerId&&+new Date(a.endsAt)>+now).length;
  const count=Math.min(Math.max(0,21-previous),Math.max(0,ARTIFACT_MARKET_CAP-imperialOpen));
  const rings=await seasonalCantanirings(tx,now,count);
  for(let i=rings;i<count;i++){let roll=rng.next()*total;const artifact=choices.find(a=>(roll-=ARTIFACT_MARKET_WEIGHTS[a.id])<0)||choices[0];const itemId='item-'+randomUUID();await put('artifact-item',itemId,{artifactId:artifact.id,clubId:null,playerId:null,listed:true},tx);await put('artifact-auction','artifact-auction-'+randomUUID(),{itemId,artifactId:artifact.id,sellerId:null,price:artifact.price,bidderId:null,endsAt:new Date(+now+7*86400000).toISOString(),closed:false},tx);}
  if(count)await put('system',key,{date:now.toISOString(),count:previous+count},tx);
 });
}
