import {PlayerAttributes,TrainableAttribute} from '../types';
import {TRAINABLE_ATTRIBUTES} from '../constants/attributes';

const zone='Europe/Stockholm';
export const TRAINING_GAIN_SCALE=.85*.9;
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
// Training is measured as accumulated effort. Above 16 the first whole step costs
// exactly three times 15 -> 16; every subsequent whole step doubles that cost.
const trainingLog=Math.log(1.03);
const workAt16=Math.expm1(16*trainingLog)/trainingLog;
const eliteStepWork=3*(Math.exp(16*trainingLog)-Math.exp(15*trainingLog))/trainingLog;
export function trainingWork(value:number){
 const v=Math.max(0,value);if(v<=16)return Math.expm1(v*trainingLog)/trainingLog;
 const n=Math.floor(v-16),fraction=v-16-n;
 return workAt16+eliteStepWork*(Math.pow(2,n)-1+fraction*Math.pow(2,n));
}
export function advanceTraining(value:number,effort:number){
 const work=trainingWork(value)+Math.max(0,effort);
 if(work<=workAt16)return Math.log1p(work*trainingLog)/trainingLog;
 const extra=(work-workAt16)/eliteStepWork,n=Math.floor(Math.log2(extra+1));
 return 16+n+(extra-(Math.pow(2,n)-1))/Math.pow(2,n);
}
export type TrainingRemainders=Partial<Record<TrainableAttribute,number>>;
function attributeUpdate(attributes:PlayerAttributes,allocation:Record<TrainableAttribute,number>,matches:number,matchesByAttribute:Partial<Record<TrainableAttribute,number>>|undefined,gainScale:number,carry:TrainingRemainders={}){
 const result={...attributes},remainders:TrainingRemainders={};
 for(const key of TRAINABLE_ATTRIBUTES){
  const positionalMatches=matchesByAttribute?.[key],load=Math.min(2,Math.max(0,positionalMatches??matches));
  const participation=positionalMatches===undefined?[0.1,0.55,1][Math.round(load)]:load<=1?0.55*load:0.55+0.45*(load-1);
  const points=Math.min(10,Math.max(0,allocation[key]||0));
  const effort=gainScale*.25*points*participation*(key==='kondition'?2.25:key==='tuffhet'?.75:1);
  const exact=Math.max(0,advanceTraining(Math.max(0,attributes[key]+(carry[key]||0)),effort)-(key==='kondition'&&points===0?.15:0));
  result[key]=Math.round(exact*1000)/1000;remainders[key]=exact-result[key];
 }
 return {attributes:result,remainders};
}
export function weeklyAttributes(attributes:PlayerAttributes,allocation:Record<TrainableAttribute,number>,matches:number,matchesByAttribute?:Partial<Record<TrainableAttribute,number>>,gainScale=TRAINING_GAIN_SCALE):PlayerAttributes{
 return attributeUpdate(attributes,allocation,matches,matchesByAttribute,gainScale).attributes;
}

const trainingSlotWeights:Record<TrainableAttribute,Record<string,number>>={
 snabbhet:{'0-0':1,'0-2':1,'1-0':1,'1-2':1,'2-0':1,'2-2':1},
 kondition:{goal:1,'0-0':1,'0-1':1,'0-2':1,'1-0':1,'1-1':1,'1-2':1,'2-0':1,'2-1':1,'2-2':1},
 markering:{'1-0':1,'1-1':1,'1-2':1,'2-0':1,'2-1':1,'2-2':1},
 passning:{'0-0':0.5,'0-1':0.5,'0-2':0.5,'1-0':1,'1-1':1,'1-2':1,'2-0':1,'2-1':1,'2-2':1},
 teknik:{'0-0':1,'0-1':1,'0-2':1,'1-0':1,'1-1':1,'1-2':1,'2-0':1,'2-1':1,'2-2':1},
 speluppfattning:{'0-0':0.2,'0-1':1,'0-2':0.2,'1-0':0.2,'1-1':1,'1-2':0.2,'2-0':0.2,'2-1':1,'2-2':0.2},
 skott:{'0-0':1,'0-1':1,'0-2':1,'1-0':1,'1-1':1,'1-2':1},
 malvakt:{goal:1,'1-0':1,'1-2':1},
 tuffhet:{goal:.5,'0-0':.5,'0-1':.5,'0-2':.5,'1-0':.75,'1-1':.75,'1-2':.75,'2-0':1,'2-1':1,'2-2':1}
};
export function positionalTrainingMatches(appearances:Array<{date:string;slots:string[]}>,key:TrainableAttribute,after:number,before:number){return appearances.filter(a=>+new Date(a.date)>before&&+new Date(a.date)<=after).reduce((sum,a)=>sum+Math.max(0,...a.slots.map(slot=>trainingSlotWeights[key][slot]||0)),0);}
export function weeklyPositionTraining(attributes:PlayerAttributes,allocation:Record<TrainableAttribute,number>,appearances:Array<{date:string;slots:string[]}>,after:number,before:number,carry:TrainingRemainders={},gainScale=TRAINING_GAIN_SCALE){
 const weights=Object.fromEntries(TRAINABLE_ATTRIBUTES.map(key=>[key,positionalTrainingMatches(appearances,key,after,before)]));
 return attributeUpdate(attributes,allocation,0,weights,gainScale,carry);
}
export function weeklyPositionAttributes(attributes:PlayerAttributes,allocation:Record<TrainableAttribute,number>,appearances:Array<{date:string;slots:string[]}>,after:number,before:number,gainScale=TRAINING_GAIN_SCALE):PlayerAttributes{
 return weeklyPositionTraining(attributes,allocation,appearances,after,before,{},gainScale).attributes;
}

// Kept for one-time historical repairs, which must invert the original curve.
export function legacyWeeklyPositionAttributes(attributes:PlayerAttributes,allocation:Record<TrainableAttribute,number>,appearances:Array<{date:string;slots:string[]}>,after:number,before:number,gainScale=.85):PlayerAttributes{
 const result={...attributes};for(const key of TRAINABLE_ATTRIBUTES){const load=Math.min(2,Math.max(0,(key==='tuffhet'?appearances.filter(a=>+new Date(a.date)>before&&+new Date(a.date)<=after).length:positionalTrainingMatches(appearances.map(a=>({...a,slots:key==='kondition'?a.slots.filter(s=>s!=='goal'):a.slots})),key,after,before)))),participation=load<=1?.55*load:.55+.45*(load-1),points=Math.min(10,Math.max(0,allocation[key]||0)),gain=gainScale*.25*points*participation*(key==='kondition'?2.25:1)/Math.pow(1.03,Math.max(0,attributes[key]));result[key]=Math.max(0,Math.round((attributes[key]+gain-(key==='kondition'&&points===0?.15:0))*1000)/1000)}return result;
}
// Recover the three-decimal base values that produced an already applied
// weekly update. This is used only by data corrections; ordinary training
// always moves forward through weeklyPositionAttributes.
export function reverseWeeklyPositionAttributes(afterAttributes:PlayerAttributes,allocation:Record<TrainableAttribute,number>,appearances:Array<{date:string;slots:string[]}>,after:number,before:number,gainScale=1):PlayerAttributes{
 const result={...afterAttributes};
 for(const key of TRAINABLE_ATTRIBUTES){
  let low=Math.max(0,afterAttributes[key]-7),high=afterAttributes[key]+1;
  for(let n=0;n<55;n++){
   const mid=(low+high)/2,input={...afterAttributes,[key]:mid};
   const value=legacyWeeklyPositionAttributes(input,allocation,appearances,after,before,gainScale)[key];
   if(value<afterAttributes[key])low=mid;else high=mid;
  }
  const center=Math.round(((low+high)/2)*1000)/1000;
  const candidates=Array.from({length:21},(_,i)=>Math.max(0,Math.round((center+(i-10)/1000)*1000)/1000));
  const exact=candidates.filter(value=>legacyWeeklyPositionAttributes({...afterAttributes,[key]:value},allocation,appearances,after,before,gainScale)[key]===afterAttributes[key]);
  result[key]=(exact.sort((a,b)=>Math.abs(a-center)-Math.abs(b-center))[0]??center);
 }
 return result;
}

export function trainingStepGains(before:PlayerAttributes,after:PlayerAttributes){return TRAINABLE_ATTRIBUTES.filter(k=>Math.min(16,Math.floor(after[k]))>Math.min(16,Math.floor(before[k])));}
