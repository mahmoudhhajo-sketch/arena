import {PlayerAttributes} from '../types';import {SeededRNG} from './matchEngine';
const ROLES=[['malvakt','speluppfattning','snabbhet','passning'],['markering','tuffhet','snabbhet','aggressivitet'],['passning','speluppfattning','teknik','kondition'],['snabbhet','teknik','skott','malvakt'],['skott','snabbhet','teknik','speluppfattning'],['tuffhet','aggressivitet','markering','kondition']] as const;
export function marketProfile(index:number,mercenary:boolean):PlayerAttributes{
 const rng=new SeededRNG(9187+index*719),role=ROLES[(Math.floor(index/6)+index)%ROLES.length],elite=mercenary&&index<10;
 for(let j=0;j<8;j++)rng.next();
 const peak=mercenary?(elite?11.5+rng.next()*3.5:3+index%8+rng.next()):2.5+(index%6)+rng.next()*.45;
 const attrs={} as PlayerAttributes;
 for(const k of ['snabbhet','kondition','markering','passning','teknik','speluppfattning','skott','malvakt','aggressivitet','tuffhet'] as const){
  const rank=(role as readonly string[]).indexOf(k);let value=rank===0?peak:rank===1?peak*(.9+rng.next()*.08):rank===2?peak*(.82+rng.next()*.13):rank===3?peak*(.75+rng.next()*.16):.8+rng.next()*3.5;
  if(k==='malvakt'&&role[0]!=='malvakt'&&role[0]!=='snabbhet')value=.2+rng.next()*2;
  if(k==='skott'&&role[0]==='malvakt')value=.3+rng.next()*2;
  attrs[k]=Math.round(Math.min(mercenary?15:7.99,value)*1000)/1000;
 }
 return attrs;
}

export function mercenaryFee(attrs:PlayerAttributes){const values=Object.values(attrs).sort((a,b)=>b-a);const quality=values[0]*.4+values[1]*.3+values[2]*.2+values[3]*.1;return Math.min(100000,Math.max(3000,Math.round((3000+Math.pow(Math.max(0,quality-3),2.2)*650)/1000)*1000));}
