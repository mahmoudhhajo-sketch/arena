import {randomUUID} from 'node:crypto';
import {sql} from 'drizzle-orm';
import {db} from '../db';
import {players} from '../db/schema';
import {PLACES} from '../constants/geography';
import {calculateWage,generateSinglePlayer} from '../engine/playerGenerator';
import {Race} from '../types';
import {record,put} from './records';
import {tuneMarketWage} from './progression';

const RELEASES:Array<{race:Race;targets:number[]}>= [
 {race:'dwarf',targets:[1847,1916,1983]},
 {race:'orc',targets:[1861,1929,1991]},
 {race:'human',targets:[1839,1907,1974]},
];
const ROLES=['defender','midfielder','attacker'] as const;

export async function initializeRevision27(){
 if(await record('revision-v27-nine-imperial-players'))return;
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719127)`);
  if(await record('revision-v27-nine-imperial-players',tx))return;
  const created:number[]=[];
  for(const release of RELEASES){
   const homes=PLACES.filter(place=>place.race===release.race);
   for(let index=0;index<3;index++){
    const home=homes[index%homes.length],player=generateSinglePlayer(0,release.race,'',home.name,1,ROLES[index]);
    player.attributes=tuneMarketWage(player.attributes,release.targets[index]);
    player.wage=calculateWage(player.attributes);
    const {id,positionRatingsWithForm,positionRatingsWithoutForm,...row}=player;
    const [inserted]=await tx.insert(players).values({...row,clubId:null}).returning();
    await put('auction','auction-'+randomUUID(),{playerId:inserted.id,sellerId:null,price:Math.max(100,Math.round(inserted.wage*5)),bidderId:null,listedAt:new Date().toISOString(),endsAt:new Date(Date.now()+7*86400000).toISOString(),closed:false,promotional:true},tx);
    created.push(inserted.id);
   }
  }
  await put('system','revision-v27-nine-imperial-players',{date:new Date().toISOString(),created},tx);
 });
}
