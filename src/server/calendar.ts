import {magicThresholds,earnedMagicLevel,regenerateMana} from '../engine/magicEconomy';
import {calculateWage} from '../engine/playerGenerator';
import {db} from '../db';
import {clubs,players,worldState} from '../db/schema';
import {eq,sql} from 'drizzle-orm';
import {records,record,put} from './records';
import {dailyUpdates,healingProgress,weeklyAttributes,trainingStepGains} from '../engine/calendar';
import {PLACES} from '../constants/geography';

export async function advanceCalendar(until:Date){
 const clock=await record('calendar-clock');
 // Installing this feature never retroactively charges the user's existing club.
 if(!clock){await put('system','calendar-clock',{last:until.toISOString()});return;}
 for(const at of dailyUpdates(new Date(clock.last),until)){
  await db.transaction(async(tx:any)=>{
   const latest=await record('calendar-clock',tx);if(new Date(latest.last)>=at)return;
   const all=await tx.select().from(clubs),squad=await tx.select().from(players);
   const average=all.reduce((sum:number,c:any)=>sum+c.doctorInvestment,0)/Math.max(1,all.length);
   const recovery=new Map((await records('recovery',tx)).map(r=>[r.playerId,r]));
   const participation=new Map((await records('participation',tx)).map(r=>[r.playerId,r]));
   const sunday=at.getUTCDay()===0,weekStart=at.getTime()-7*86400000;
   const byClub=new Map(all.map((c:any)=>[c.id,c]));
   for(const p of squad){
    if(p.isDeceased||p.createdAt>at)continue;
    const c:any=byClub.get(p.clubId),update:any={};
    if(p.currentInjury>0){
     const credit=(recovery.get(p.id)?.credit||0)+healingProgress(c?.doctorInvestment||0,average);
     const healed=credit>=1-1e-8?1:0;
     update.currentInjury=Math.max(0,p.currentInjury-healed);
     await put('recovery','recovery-'+p.id,{playerId:p.id,credit:update.currentInjury?credit-healed:0},tx);
    }
    if(sunday&&c){
     const dates=(participation.get(p.id)?.dates||[]).filter((d:string)=>+new Date(d)>weekStart&&+new Date(d)<=+at);
     update.attributes=weeklyAttributes(p.attributes,c.trainingPoints,dates.length);
     if(p.artifacts?.includes('seven-mile-boots')&&c.trainingPoints.kondition===0)update.attributes.kondition=p.attributes.kondition;
     await put('training-gain','gain-'+p.id,{playerId:p.id,clubId:p.clubId,date:at.toISOString(),attributes:trainingStepGains(p.attributes,update.attributes)},tx);
     update.wage=calculateWage(update.attributes);
     update.form=Math.min(16,Math.max(0,p.form+(dates.length>=2?1:dates.length===0?-1:0)));
     await put('participation','participation-'+p.id,{playerId:p.id,dates:[]},tx);
    }
    if(Object.keys(update).length)await tx.update(players).set(update).where(eq(players.id,p.id));
   }
   if(sunday){
    const scouts=new Map((await records('scout',tx)).map(s=>[s.clubId,s]));
    for(const c of all){
     if(c.createdAt>at)continue;
     const costs:Array<[string,number]>=[['Spelarlöner',squad.filter((p:any)=>p.clubId===c.id&&!p.isDeceased&&!p.isMercenary&&p.createdAt<=at).reduce((s:number,p:any)=>s+p.wage,0)],['Tränare',c.coach?.wage||0],['Läkare',c.doctorInvestment],['Talangscout',scouts.get(c.id)?.hired?3000:0],['Arenadrift',c.arena?.weeklyRent||0],['Magi',c.magicInvestment||0]];
     // Magic now regenerates mana and is paid as a weekly investment.
     const total=costs.reduce((s,[,v])=>s+v,0);
     const thresholds=magicThresholds(c.id,all),progress=await record('magic-progress-'+c.id,tx);const qualified=c.magicInvestment>=thresholds.level3&&c.gold>=total;
     await put('magic-progress','magic-progress-'+c.id,{weeks:qualified?(progress?.weeks||0)+1:0,lastPayment:at.toISOString(),premium:thresholds.level3,paid:c.magicInvestment},tx);
     await tx.update(clubs).set({gold:sql`${clubs.gold}-${total}`}).where(eq(clubs.id,c.id));
     for(const [category,amount] of costs)if(amount)await put('ledger','week-'+at.toISOString()+'-'+c.id+'-'+category,{clubId:c.id,category,amount:-amount,date:at.toISOString()},tx);
    }
   }
   // One daily credit at the world's normal morning update, including while matches are paused.
   for(const snapshot of all){
    const [c]=await tx.select().from(clubs).where(eq(clubs.id,snapshot.id)).for('update');
    if(c.createdAt>at)continue;
    const thresholds=magicThresholds(c.id,all),progress=await record('magic-progress-'+c.id,tx);
    const state=regenerateMana(await record('mana-'+c.id,tx),c.magicInvestment,earnedMagicLevel(c.magicInvestment,thresholds,progress?.weeks||0),thresholds.reference,+at);
    await put('mana','mana-'+c.id,state,tx);
   }
   // Recover one potential point every seven full days since the last scout visit/recovery.
   for(const p of await records('potential',tx))if(+at-+new Date(p.date)>=7*86400000){
    const place=PLACES.find(x=>'potential-'+x.id===p.id);if(place)await put('potential',p.id,{...p,value:Math.min(20,p.value+1),date:at.toISOString()},tx);
   }
   await tx.update(worldState).set({day:sql`${worldState.day}+1`,updatedAt:at});
   await put('system','calendar-clock',{last:at.toISOString()},tx);
  });
 }
}
