import {PlayerAttributes} from '../types';
/** Potential improves the odds, not every attribute. Deep searches find strong prospects more often. */
export function scoutTalent(attributes:PlayerAttributes,potential:number,deep:boolean,random:()=>number){
 const p=Math.max(0,Math.min(20,potential))/20,roll=random();
 const exceptional=roll<.025+p*.045+(deep?.035:0);
 const promising=exceptional||roll<.16+p*.13+(deep?.12:0);
 const quality=.98+p*.12+random()*.16+(deep?.06:0);
 const out={...attributes};
 for(const key of Object.keys(out) as Array<keyof PlayerAttributes>)if(key!=='aggressivitet')out[key]=Math.round(out[key]*quality*1000)/1000;
 if(promising){
  const keys=(Object.keys(out) as Array<keyof PlayerAttributes>).filter(k=>k!=='aggressivitet'&&k!=='kondition');
  // Both natural strengths and unexpected specialists should appear.
  const pool=random()<.65?[...keys].sort((a,b)=>out[b]-out[a]).slice(0,3):keys;
  const primary=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
  out[primary]=Math.round(Math.max(out[primary],exceptional?7+random()*2:5.5+random()*1.8)*1000)/1000;
  if(exceptional){const others=keys.filter(k=>k!==primary),secondary=others[Math.min(others.length-1,Math.floor(random()*others.length))];out[secondary]=Math.round(Math.max(out[secondary],5+random()*1.5)*1000)/1000;}
 }
 return out;
}
export const scoutPotentialCost=(deep:boolean)=>deep?1:.5;
