import {PlayerAttributes,TrainableAttribute} from '../types';
import {TRAINABLE_ATTRIBUTES} from '../constants/attributes';

const zone='Europe/Stockholm';
// Use local noon to determine the offset; all updates are at 06:00, outside DST's repeated hour.
export function dailyUpdates(after:Date,until:Date):Date[]{
 const local=new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(after);
 const day=new Date(local+'T12:00:00Z'),result:Date[]=[];
 while(day.getTime()-86400000<=until.getTime()){
  const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',hour12:false}).format(day));
  const update=new Date(day);update.setUTCHours(6-(hour-12),0,0,0);
  if(update>after&&update<=until)result.push(update);
  if(update>until)break;
  day.setUTCDate(day.getUTCDate()+1);
 }
 return result;
}
// Reconstructed balance: no doctor heals one plus per three days; investment relative to
// the league-wide average increases this to at most one plus per daily update.
export function healingProgress(investment:number,average:number){return Math.min(1,1/3+Math.max(0,investment)/Math.max(1000,average)*2/3);}
export function weeklyAttributes(attributes:PlayerAttributes,allocation:Record<TrainableAttribute,number>,matches:number,matchesByAttribute?:Partial<Record<TrainableAttribute,number>>):PlayerAttributes{
 const result={...attributes};
 for(const key of TRAINABLE_ATTRIBUTES){
  const positionalMatches=matchesByAttribute?.[key];
  const participation=(positionalMatches===undefined?[0.1,0.55,1]:[0,0.55,1])[Math.min(2,Math.max(0,positionalMatches??matches))];
  const points=Math.min(10,Math.max(0,allocation[key]||0));
  const gain=0.25*points*participation*(key==='kondition'?2.25:1)/Math.pow(1+Math.max(0,attributes[key])/8,2);
  result[key]=Math.max(0,Math.round((attributes[key]+gain-(key==='kondition'&&points===0?0.15:0))*1000)/1000);
 }
 return result;
}

const trainingSlots:Record<TrainableAttribute,string[]>={
 snabbhet:['0-0','0-1','0-2','1-0','1-1','1-2','2-0','2-1','2-2'],
 kondition:['0-0','0-1','0-2','1-0','1-1','1-2','2-0','2-1','2-2'],
 markering:['1-0','1-1','1-2','2-0','2-1','2-2'],
 passning:['0-0','0-1','0-2','1-0','1-1','1-2','2-0','2-1','2-2'],
 teknik:['0-0','0-1','0-2','1-0','1-1','1-2','2-0','2-1','2-2'],
 speluppfattning:['0-0','0-1','0-2','1-0','1-1','1-2','2-0','2-1','2-2'],
 skott:['0-0','0-1','0-2','1-0','1-1','1-2'],
 malvakt:['goal','1-0','1-2'],
 tuffhet:['goal','0-0','0-1','0-2','1-0','1-1','1-2','2-0','2-1','2-2']
};
export function positionalTrainingMatches(appearances:Array<{date:string;slots:string[]}>,key:TrainableAttribute,after:number,before:number){return appearances.filter(a=>+new Date(a.date)>before&&+new Date(a.date)<=after&&a.slots.some(slot=>trainingSlots[key].includes(slot))).length;}
export function weeklyPositionAttributes(attributes:PlayerAttributes,allocation:Record<TrainableAttribute,number>,appearances:Array<{date:string;slots:string[]}>,after:number,before:number):PlayerAttributes{
 const matchesByAttribute=Object.fromEntries(TRAINABLE_ATTRIBUTES.map(key=>[key,positionalTrainingMatches(appearances,key,after,before)])) as Record<TrainableAttribute,number>;
 return weeklyAttributes(attributes,allocation,0,matchesByAttribute);
}

export function trainingStepGains(before:PlayerAttributes,after:PlayerAttributes){return TRAINABLE_ATTRIBUTES.filter(k=>Math.floor(after[k])>Math.floor(before[k]));}
