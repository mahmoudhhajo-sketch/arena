import {db} from '../db';
import {clubs,gameRecords} from '../db/schema';
import {record,put} from './records';
import {magicThresholds} from '../engine/magicEconomy';
const key='magic-weekly-prices';
export async function refreshMagicPrices(teams:any[],at:Date,tx:any=db){
 const previous=await record(key,tx);
 if(previous&&+new Date(previous.updatedAt)>=+at)return;
 await put('magic-prices',key,{updatedAt:at.toISOString(),teams:teams.map(c=>({id:c.id,magicInvestment:c.magicInvestment}))},tx);
}
export async function weeklyMagicThresholds(clubId:string,tx:any=db){
 let snapshot=await record(key,tx);
 if(!snapshot){
  const teams=await tx.select({id:clubs.id,magicInvestment:clubs.magicInvestment}).from(clubs);
  await tx.insert(gameRecords).values({id:key,kind:'magic-prices',payload:{updatedAt:new Date().toISOString(),teams}}).onConflictDoNothing();
  snapshot=await record(key,tx);
 }
 return {...magicThresholds(clubId,snapshot.teams),updatedAt:snapshot.updatedAt};
}
