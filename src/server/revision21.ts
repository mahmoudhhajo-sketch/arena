import {db} from '../db';
import {clubs,players} from '../db/schema';
import {eq} from 'drizzle-orm';
import {calculateWage} from '../engine/playerGenerator';
import {PlayerAttributes} from '../types';
import {record,put} from './records';

function tuneWage(attributes:PlayerAttributes,target:number){
 const scaled=(factor:number)=>Object.fromEntries(Object.entries(attributes).map(([key,value])=>[
  key,key==='aggressivitet'?value:Math.round(Number(value)*factor*1000)/1000,
 ])) as unknown as PlayerAttributes;
 let low=1,high=1.6;
 for(let i=0;i<32;i++){const middle=(low+high)/2;if(calculateWage(scaled(middle))<target)low=middle;else high=middle;}
 const candidates=[scaled(low),scaled(high)];
 return candidates.sort((a,b)=>Math.abs(calculateWage(a)-target)-Math.abs(calculateWage(b)-target))[0];
}

// Keep all five goblin recruits above the retained squad's wage level.
export async function initializeRevision21(){
 if(await record('revision-v21-goblinboyz-five-wage-leaders'))return;
 await db.transaction(async(tx:any)=>{
  const team=(await tx.select().from(clubs)).find(c=>c.name.replace(/ \(C\)$/,'').toLocaleLowerCase('sv')==='goblinboyz');
  if(team){
   const goblins=(await tx.select().from(players).where(eq(players.clubId,team.id)))
    .filter(player=>player.race==='goblin')
    .sort((a,b)=>b.wage-a.wage||a.id-b.id);
   const targets=[1291,1257,1219];
   for(let index=0;index<Math.min(3,Math.max(0,goblins.length-2));index++){
    const player=goblins[index+2];
    const attributes=tuneWage(player.attributes as PlayerAttributes,targets[index]);
    await tx.update(players).set({attributes,wage:calculateWage(attributes)}).where(eq(players.id,player.id));
   }
  }
  await put('system','revision-v21-goblinboyz-five-wage-leaders',{date:new Date().toISOString()},tx);
 });
}
