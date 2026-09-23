import {dailyUpdates} from './calendar';
export function magicThresholds(clubId:string,teams:Array<{id:string;magicInvestment:number}>){const others=teams.filter(c=>c.id!==clubId&&c.magicInvestment>0);const reference=others.length?others.reduce((n,c)=>n+c.magicInvestment,0)/others.length:1000;return {reference:Math.round(reference),level2:Math.ceil(reference*1.25/10)*10,level3:Math.ceil(reference*1.5/10)*10,contributors:others.length};}
export function earnedMagicLevel(budget:number,thresholds:{level2:number;level3:number},weeks:number){return budget<=0?0:budget>=thresholds.level3&&weeks>=6?3:budget>=thresholds.level2?2:1}

// Daily income is bounded; saved mana has no storage limit.
export function manaPlan(budget:number,level:number,reference:number){
 const ratio=Math.max(0,budget)/Math.max(1,reference);
 const dailyGain=level<=0||budget<=0?0:Math.round(Math.min(24,[0,6,9,12][level]*Math.min(2,ratio))*10)/10;
 return {dailyGain};
}
export function regenerateMana(state:any,budget:number,level:number,reference:number,now=Date.now()){
 const plan=manaPlan(budget,level,reference);
 // Migrate an existing balance without granting an old stockpile of daily income.
 const previous=state?.version===2?state:null;
 const at=Math.max(now,Number(previous?.at||0));
 const days=previous?dailyUpdates(new Date(previous.at),new Date(at)).length:0;
 const mana=Math.max(0,Number(state?.mana||0))+days*Number(previous?.dailyGain||0);
 return {...plan,mana,at,version:2,cooldowns:{}};
}
