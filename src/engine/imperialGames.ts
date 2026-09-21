import {legendName} from '../constants/legendNames';
import {Player} from '../types';
import {effectiveAttributes} from '../constants/market';
import {SeededRNG} from './matchEngine';

export function imperialAttributes(p:Player){return effectiveAttributes({...p,artifacts:(p.artifacts||[]).filter(a=>!a.startsWith('effect:dragon-blood:'))});}

// A test uses copies and returns results; no prizes, injuries or league state are written.
export function simulateImperialGames(players:Player[], seed:number, legendIds:Set<number>=new Set()) {
 const rng=new SeededRNG(seed), entrants=players.filter(p=>!p.isDeceased&&p.clubId&&!p.isMercenary);
 const events=[{name:'Snabbhet',day:'Måndag',weights:{snabbhet:.8,kondition:.2}},{name:'Passning',day:'Tisdag',weights:{passning:1}},{name:'Skytte',day:'Onsdag',weights:{skott:1}},{name:'Målvakt',day:'Torsdag',weights:{malvakt:1}},{name:'Tvekamp',day:'Fredag',weights:{tuffhet:.8,aggressivitet:.2}}];
 const score=(p:Player,weights:Record<string,number>)=>{const a=imperialAttributes(p);return Object.entries(weights).reduce((s,[k,w])=>s+(a as any)[k]*w,0)*(.85+p.form/80)*(0.9+rng.next()*.2)};
 const names=new Map<number,string>();const identity=(p:Player)=>({id:p.id,name:names.get(p.id)||p.name,clubId:p.clubId,race:p.race});const champion=(p:Player,event:string)=>{if(!legendIds.has(p.id)&&!names.has(p.id))names.set(p.id,p.name+' '+legendName(event,seed));return {...identity(p),legendName:names.has(p.id)?names.get(p.id)!.slice(p.name.length+1):''}};
 return {seed,entrants:entrants.length,competitions:events.map(event=>{
  const ranked=entrants.map(p=>({p,score:event.name==='Tvekamp'?score(p,event.weights as any):imperialResult(p,event.name)})).sort((a,b)=>event.name==='Snabbhet'?a.score-b.score||a.p.id-b.p.id:b.score-a.score||a.p.id-b.p.id);
  const rounds:any[]=[];const duelWins=new Map<number,number>();
  if(event.name==='Tvekamp'){
   let field=ranked.map(x=>x.p);
   while(field.length>1){const bouts=[];const target=2**Math.floor(Math.log2(field.length-1)),byeCount=2*target-field.length;const winners:Player[]=field.slice(0,byeCount);const playing=field.slice(byeCount);for(let i=0;i<playing.length/2;i++){const a=playing[i],b=playing[playing.length-1-i];const winner=score(a,event.weights as any)>=score(b,event.weights as any)?a:b;winners.push(winner);duelWins.set(winner.id,(duelWins.get(winner.id)||0)+1);bouts.push({a:identity(a),b:identity(b),winner:identity(winner)});}
    if(winners.length!==target){throw Error('Ogiltig tävlingslottning');}
    rounds.push({entrants:field.length,name:field.length===2?'Final':field.length===4?'Semifinal':field.length===8?'Kvartsfinal':field.length+' deltagare',bouts});field=winners;
   }
   return {...event,weights:undefined,winner:field[0]?champion(field[0],event.name):null,rounds,leaders:[...ranked].sort((a,b)=>(duelWins.get(b.p.id)||0)-(duelWins.get(a.p.id)||0)||b.score-a.score).slice(0,100).map((x,i)=>({...identity(x.p),place:i+1,score:duelWins.get(x.p.id)||0}))};
  }
  return {...event,weights:undefined,winner:ranked[0]?champion(ranked[0].p,event.name):null,rounds,leaders:ranked.slice(0,100).map((x,i)=>({...identity(x.p),place:i+1,score:event.name==='Snabbhet'?Math.round(x.score):x.score}))};
 })};
}

export function imperialResult(p:Player,event:string){const a=imperialAttributes(p);if(event==='Snabbhet')return Math.round(((a.snabbhet*.8+a.kondition*.2<=16?250-Math.max(0,a.snabbhet*.8+a.kondition*.2)*210/16:40/(1+(a.snabbhet*.8+a.kondition*.2-16)*.12)))*100)/100;if(event==='Passning')return Math.max(1,Math.round(1+Math.max(0,a.passning)*199/16));if(event==='Skytte')return Math.max(1,Math.round(1+Math.max(0,a.skott)*199/16));return Math.max(1,Math.round(1+Math.max(0,a.malvakt)*149/16));}
