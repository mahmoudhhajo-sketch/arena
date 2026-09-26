import {db} from '../db';
import {clubs,gameRecords,players} from '../db/schema';
import {eq,inArray} from 'drizzle-orm';
import {botLineup} from '../engine/botLineup';
import {calculateWage,generateSinglePlayer} from '../engine/playerGenerator';
import {PlayerAttributes} from '../types';
import {record,records,put} from './records';

function tuneWage(attributes:PlayerAttributes,target:number){
 const scaled=(factor:number)=>Object.fromEntries(Object.entries(attributes).map(([key,value])=>[
  key,key==='aggressivitet'?value:Math.round(Number(value)*factor*1000)/1000,
 ])) as unknown as PlayerAttributes;
 let low=.45,high=2;
 for(let i=0;i<32;i++){const middle=(low+high)/2;if(calculateWage(scaled(middle))<target)low=middle;else high=middle;}
 const candidates=[scaled(low),scaled(high)];
 return candidates.sort((a,b)=>Math.abs(calculateWage(a)-target)-Math.abs(calculateWage(b)-target))[0];
}

// One-time owner-requested rebuild of GoblinBoyZ's wage leaders.
export async function initializeRevision19(){
 if(await record('revision-v19-goblinboyz'))return;
 await db.transaction(async(tx:any)=>{
  const team=(await tx.select().from(clubs)).find(c=>c.name.replace(/ \(C\)$/,'').toLocaleLowerCase('sv')==='goblinboyz');
  if(team){
   const squad=(await tx.select().from(players).where(eq(players.clubId,team.id))).sort((a,b)=>b.wage-a.wage||a.id-b.id);
   const removed=squad.slice(0,5),removedIds=removed.map(p=>p.id);
   if(removedIds.length){
    const auctions=(await records('auction',tx)).filter(a=>removedIds.includes(a.playerId));
    const auctionIds=auctions.map(a=>a.id),bids=(await records('bid',tx)).filter(b=>auctionIds.includes(b.auctionId));
    const recordIds=[...auctionIds,...bids.map(b=>b.id)];
    if(recordIds.length)await tx.delete(gameRecords).where(inArray(gameRecords.id,recordIds));
    await tx.delete(players).where(inArray(players.id,removedIds));
   }
   const remaining=await tx.select().from(players).where(eq(players.clubId,team.id));
   const used=new Set(remaining.map(p=>p.shirtNumber)),numbers:number[]=[];
   for(let number=1;numbers.length<5;number++)if(!used.has(number))numbers.push(number);
   const targets=[2037,1837,1291,1257,1219];
   const roles=['attacker','defender','midfielder','goalkeeper','attacker'] as const;
   const created=[];
   for(let index=0;index<5;index++){
    const generated=generateSinglePlayer(0,'goblin',team.id,'Skrothåla',numbers[index],roles[index]);
    generated.attributes.snabbhet=Math.max(generated.attributes.snabbhet,5.4-index*.18);
    generated.attributes.aggressivitet=Math.max(generated.attributes.aggressivitet,7.2-index*.25);
    generated.attributes=tuneWage(generated.attributes,targets[index]);
    generated.wage=calculateWage(generated.attributes);
    const {id:unused,positionRatingsWithForm,positionRatingsWithoutForm,...row}=generated;
    const [inserted]=await tx.insert(players).values({...row,clubId:team.id,hometown:'Skrothåla'}).returning();
    created.push(inserted);
   }
   const finalSquad=[...remaining,...created];
   await tx.update(clubs).set({race:'orc',hometown:'Skrothåla',lineup:botLineup(finalSquad)}).where(eq(clubs.id,team.id));
  }
  await put('system','revision-v19-goblinboyz',{date:new Date().toISOString()},tx);
 });
}
