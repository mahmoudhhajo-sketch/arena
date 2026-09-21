import {db} from '../db';import {sql} from 'drizzle-orm';import {record,put} from './records';import {ARTIFACTS} from '../constants/market';import {weatherFor} from '../engine/weather';import {SeededRNG} from '../engine/matchEngine';import {randomUUID} from 'node:crypto';
export async function replenishArtifacts(now:Date){
 const date=weatherFor('',now).date,week=new Date(date+'T12:00:00Z');week.setUTCDate(week.getUTCDate()-((week.getUTCDay()+6)%7));const key='artifact-supply-'+week.toISOString().slice(0,10);
 await db.transaction(async(tx:any)=>{await tx.execute(sql`SELECT pg_advisory_xact_lock(719092)`);if(await record(key,tx))return;
  const choices=ARTIFACTS.filter(a=>!['falcon-ring','silk-wraps'].includes(a.id));const total=choices.reduce((n,a)=>n+a.supply,0),rng=new SeededRNG(+week/86400000);
  for(let i=0;i<8;i++){let roll=rng.next()*total;const artifact=choices.find(a=>(roll-=a.supply)<0)||choices[0];const itemId='item-'+randomUUID();await put('artifact-item',itemId,{artifactId:artifact.id,clubId:null,playerId:null,listed:true},tx);await put('artifact-auction','artifact-auction-'+randomUUID(),{itemId,artifactId:artifact.id,sellerId:null,price:artifact.price,bidderId:null,endsAt:new Date(+now+7*86400000).toISOString(),closed:false},tx);}
  await put('system',key,{date:now.toISOString(),count:8},tx);
 });
}
