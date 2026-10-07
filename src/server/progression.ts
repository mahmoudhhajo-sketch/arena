import {seasonPrizeNotice} from './seasonPrizeNotice';
import {seasonPrize} from '../constants/prizes';
import {progressLoanConsequences,overdueEffects} from './loanConsequences';
import {Express} from 'express';import {db} from '../db';import {clubs,players,gameRecords,worldState} from '../db/schema';import {eq,sql} from 'drizzle-orm';import {records,record,put} from './records';import {PLACES} from '../constants/geography';import {venueCatalog} from '../constants/venues';import {weatherFor} from '../engine/weather';import {generateSinglePlayer,calculateWage,calculateLegacyWage,generateAggression} from '../engine/playerGenerator';import {SeededRNG} from '../engine/matchEngine';import {COACHES} from '../constants/market';import {randomUUID} from 'node:crypto';
import {LOANS} from '../constants/loans';export {LOANS};
import {progressSolvency} from './solvency';
export async function initializeRevision8(){if(await record('revision-v8'))return;await db.transaction(async(tx:any)=>{if(await record('revision-v8',tx))return;for(const p of await tx.select().from(players)){const attributes={...p.attributes},rng=new SeededRNG(p.id*197+832);attributes.aggressivitet=generateAggression(p.race,()=>rng.next());await tx.update(players).set({attributes,wage:calculateWage(attributes)}).where(eq(players.id,p.id));}for(const c of await tx.select().from(clubs))if(c.coach){const coach=COACHES.find(p=>p.id===c.coach.id);if(coach)await tx.update(clubs).set({coach}).where(eq(clubs.id,c.id));}await put('system','revision-v8',{date:new Date().toISOString()},tx);});}
let lastEconomyCheck=0;
export async function progressEconomy(now:Date){if(+now-lastEconomyCheck<5*60000)return;lastEconomyCheck=+now;await progressLoanConsequences(now);await progressSolvency(now)}
const IMPERIAL_PLAYER_MARKET_TARGET=32;
const IMPERIAL_MARKET_MAX_WAGE=2800;
const IMPERIAL_MARKET_MAX_ATTRIBUTE=8;
export function tuneMarketWage(attributes:any,target:number){
 let low=.2,high=4,best={...attributes};
 for(let n=0;n<30;n++){
  const factor=(low+high)/2;
  const candidate=Object.fromEntries(Object.entries(attributes).map(([key,value])=>[key,key==='aggressivitet'?value:Math.round(Math.min(IMPERIAL_MARKET_MAX_ATTRIBUTE,Number(value)*factor)*1000)/1000]));
  best=candidate;
  if(calculateLegacyWage(candidate as any)<target)low=factor;else high=factor;
 }
 return best;
}

type MarketQualityBand='budget'|'middle'|'strong';
function marketQualityBand(wage:number):MarketQualityBand{return wage<1500?'budget':wage<=2000?'middle':'strong'}
function marketBandTargets(total:number){const middle=Math.round(total*.4),strong=Math.round(total*.2);return {budget:total-middle-strong,middle,strong}}
function nextMarketBand(race:string,total:number,auctions:any[],playerById:Map<number,any>,rotation:number):MarketQualityBand{
 const desired=marketBandTargets(total),counts:{budget:number;middle:number;strong:number}={budget:0,middle:0,strong:0};
 for(const auction of auctions){const player=playerById.get(Number(auction.playerId));if(player?.race===race)counts[marketQualityBand(calculateLegacyWage(player.attributes))]++;}
 const order=(['budget','middle','strong'] as MarketQualityBand[]).slice(rotation%3).concat((['budget','middle','strong'] as MarketQualityBand[]).slice(0,rotation%3));
 return order.sort((a,b)=>(desired[b]-counts[b])-(desired[a]-counts[a]))[0];
}
function marketBandWage(band:MarketQualityBand,random=Math.random){return band==='budget'?700+Math.floor(random()*751):band==='middle'?1500+Math.floor(random()*501):2050+Math.floor(random()*(IMPERIAL_MARKET_MAX_WAGE-2049))}

function specializeMarketPlayer(attributes:any,role:string,random=Math.random){
 // Most imperial listings are built for a recognisable job. A minority remain
 // genuine hybrids, so unusual marking/shooting combinations can still exist.
 if(random()<.16)return attributes;
 const factors:Record<string,Record<string,number>>={
  goalkeeper:{skott:.42,markering:.62},
  defender:{skott:.52,malvakt:.38,passning:.88},
  midfielder:{malvakt:.35,skott:.86,markering:.86},
  attacker:{markering:.48,malvakt:.32},
 };
 const out={...attributes};
 for(const [key,factor] of Object.entries(factors[role]||{}))out[key]=Math.round(Number(out[key]||0)*factor*1000)/1000;
 return out;
}

let lastMarketCheck=0;
export async function releaseMarketPlayers(now:Date){
 if(+now-lastMarketCheck<5*60000)return;lastMarketCheck=+now;
 const day=weatherFor('',now).date;
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719082)`);
  const [currentWorld]=await tx.select().from(worldState);const wageSeason=currentWorld?.season||1;
  const allOpen=(await records('auction',tx)).filter(a=>!a.closed&&+new Date(a.endsAt)>+now);
  // One-time promotional releases may temporarily sit above the ordinary
  // supply and disappear naturally when their auctions end.
  let auctions=allOpen.filter(a=>!a.sellerId&&!a.promotional);
  const allPlayers=await tx.select().from(players),playerById=new Map<number,any>(allPlayers.map((p:any)=>[p.id,p] as [number,any]));
  // Keep the four main peoples close to one another while leaving a smaller
  // goblin and troll supply. The rotating extra place prevents the market from
  // looking mechanically identical every day.
  const main=['human','elf','dwarf','orc'],rotation=Math.abs([...day].reduce((a,c)=>a+c.charCodeAt(0),0))%4;
  const targets:any={goblin:4,troll:3};main.forEach((race,i)=>targets[race]=i===rotation?7:6);
  const counts=()=>auctions.reduce((m:any,a:any)=>{const race=(playerById.get(Number(a.playerId)) as any)?.race;if(race)m[race]=(m[race]||0)+1;return m;},{});
  let raceCounts=counts();
  // Let the old 45-player supply expire naturally. Once the market has reached
  // its new size, no-bid listings may again be rotated to preserve the mix.
  for(const race of auctions.length<=IMPERIAL_PLAYER_MARKET_TARGET?Object.keys(targets):[])while((raceCounts[race]||0)>targets[race]){
   const surplus=auctions.find(a=>!a.bidderId&&(playerById.get(Number(a.playerId)) as any)?.race===race);
   if(!surplus)break;
   await put('auction',surplus.id,{...surplus,closed:true,replaced:true},tx);auctions=auctions.filter(a=>a.id!==surplus.id);raceCounts=counts();
  }
  const missing=Math.max(0,IMPERIAL_PLAYER_MARKET_TARGET-auctions.length);
  if(!missing){if(!await record('market-day-'+day,tx))await put('system','market-day-'+day,{date:day,active:auctions.length},tx);return;}
  const roles:any[]=['goalkeeper','defender','midfielder','attacker'];
  for(let i=0;i<missing;i++){
   raceCounts=counts();const race=Object.keys(targets).sort((a,b)=>(targets[b]-(raceCounts[b]||0))-(targets[a]-(raceCounts[a]||0))||a.localeCompare(b))[0];
   const homes=PLACES.filter(p=>p.race===race),home=homes[Math.floor(Math.random()*homes.length)],role=roles[(auctions.length+i)%roles.length];
   const p=generateSinglePlayer(0,race as any,'',home.name,1,role,false,wageSeason);
   p.attributes=specializeMarketPlayer(p.attributes,role);
   // Every race receives the same broad quality curve: roughly 40% useful
   // middle-class players, 20% stronger listings and 40% cheaper prospects.
   const band=nextMarketBand(race,targets[race],auctions,playerById,rotation+i);
   p.attributes=tuneMarketWage(p.attributes,marketBandWage(band));
   p.wage=calculateWage(p.attributes,wageSeason);
   const {id,positionRatingsWithForm,positionRatingsWithoutForm,...row}=p;
   const [created]=await tx.insert(players).values({...row,clubId:null}).returning();
   await put('auction','auction-'+randomUUID(),{playerId:created.id,sellerId:null,price:Math.max(100,Math.round(p.wage*5)),bidderId:null,endsAt:new Date(+now+7*86400000).toISOString(),closed:false},tx);
   playerById.set(created.id,created as any);auctions.push({id:'new-'+created.id,playerId:created.id,sellerId:null,bidderId:null});
  }
  await put('system','market-day-'+day,{date:day,added:missing,target:IMPERIAL_PLAYER_MARKET_TARGET},tx);
 });
}
export async function awardSeason(now:Date){const [currentWorld]=await db.select().from(worldState);const f=(await records('fixture')).filter(f=>(f.season||1)===currentWorld.season);if(!f.length||f.some(f=>!f.played)||Math.max(...f.map(f=>f.round))<18)return;await db.transaction(async(tx:any)=>{await tx.execute(sql`SELECT pg_advisory_xact_lock(719083)`);const [w]=await tx.select().from(worldState);if(await record('season-award-'+w.season,tx))return;const all=await tx.select().from(clubs);for(const division of new Set<string>(all.map((c:any)=>c.division))){const ordered=all.filter((c:any)=>c.division===division).sort((a:any,b:any)=>(b.wins*3+b.draws)-(a.wins*3+a.draws)||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst)||a.id.localeCompare(b.id));const tier=division==='Kejsarserien'?0:Number(division.match(/Division (\d)/)?.[1]||3);for(let i=0;i<ordered.length;i++){const prize=seasonPrize(tier,i+1);if(!prize)continue;await tx.update(clubs).set({gold:sql`${clubs.gold}+${prize}`}).where(eq(clubs.id,ordered[i].id));await put('ledger','season-prize-'+w.season+'-'+ordered[i].id,{clubId:ordered[i].id,category:'Säsongspris, plats '+(i+1),amount:prize,date:now.toISOString()},tx);await seasonPrizeNotice(tx,ordered[i],w.season,division,i+1,prize,now.toISOString());} if(division==='Kejsarserien'&&ordered[0])await put('trophy','kodudorf-'+w.season,{clubId:ordered[0].id,season:w.season,name:'Kodudorfpokalen',date:now.toISOString()},tx);}await put('system','season-award-'+w.season,{date:now.toISOString()},tx);});}
export function registerProgression(app:Express){const route=(method:'get'|'post',path:string,fn:(req:any)=>Promise<any>)=>app[method](path,async(req,res)=>{try{res.json(await fn(req))}catch(e:any){res.status(400).json({error:e.message})}});
 route('get','/api/weather',async req=>weatherFor(String(req.query.place||'')));
 route('get','/api/venues',async()=>venueCatalog(await db.select().from(clubs)));
 route('get','/api/club-extras/:id',async req=>({image:(await record('club-image-'+req.params.id))?.data||null,trophies:(await records('trophy')).filter(t=>t.clubId===req.params.id)}));
 route('get','/api/loans/:clubId',async req=>({offers:LOANS,loans:(await records('loan')).filter(l=>l.clubId===req.params.clubId),effects:overdueEffects(await records('loan'),req.params.clubId,new Date())}));
 route('post','/api/loans/:clubId',async req=>db.transaction(async(tx:any)=>{const [c]=await tx.select().from(clubs).where(eq(clubs.id,req.params.clubId)).for('update');if(!c||c.isBot||c.userId!==req.arenaUser.userId)throw Error('Laget tillhör inte dig.');if(req.body.repay){const l=await record(req.body.repay,tx);if(!l||l.clubId!==c.id||l.paid)throw Error('Lånet saknas.');if(c.gold<l.total)throw Error('Kassan räcker inte till hela återbetalningen.');await tx.update(clubs).set({gold:c.gold-l.total}).where(eq(clubs.id,c.id));await put('loan',l.id,{...l,paid:true,paidAt:new Date().toISOString()},tx);const solvency=await record('solvency-'+c.id,tx);if(solvency&&(await records('loan',tx)).filter(x=>x.clubId===c.id&&!x.paid).reduce((s,x)=>s+x.total,0)<=2000000)await put('solvency',solvency.id,{...solvency,debtSince:null},tx);await put('ledger','repayment-'+l.id,{clubId:c.id,category:'Återbetalning till '+l.lender,amount:-l.total,date:new Date().toISOString()},tx);return {success:true};}const offer=LOANS.find(l=>l.id===req.body.offer);if(!offer||c.merit<offer.merit)throw Error('Meriten räcker inte för detta lån.');if((await records('loan',tx)).some(l=>l.clubId===c.id&&!l.paid&&l.offerId===offer.id))throw Error('Betala tillbaka det befintliga lånet innan du använder samma kreditbrev igen.');const id='loan-'+randomUUID(),now=new Date();await put('loan',id,{...offer,id,offerId:offer.id,clubId:c.id,paid:false,takenAt:now.toISOString(),dueAt:new Date(+now+offer.weeks*7*86400000).toISOString()},tx);const debt=(await records('loan',tx)).filter(x=>x.clubId===c.id&&!x.paid).reduce((s,x)=>s+x.total,0);if(debt>2000000){const solvency=await record('solvency-'+c.id,tx)||{};await put('solvency','solvency-'+c.id,{...solvency,debt,debtSince:solvency.debtSince||now.toISOString(),cashSince:null},tx);}await tx.update(clubs).set({gold:c.gold+offer.amount}).where(eq(clubs.id,c.id));await put('ledger','borrow-'+id,{clubId:c.id,category:'Lån från '+offer.lender,amount:offer.amount,date:now.toISOString()},tx);return {success:true};}));
 route('post','/api/club-settings/:clubId',async req=>db.transaction(async(tx:any)=>{const [c]=await tx.select().from(clubs).where(eq(clubs.id,req.params.clubId)).for('update');if(!c||c.isBot||c.userId!==req.arenaUser.userId)throw Error('Laget tillhör inte dig.');const update:any={};let cost=0;if(req.body.shortName!==undefined){const shortName=String(req.body.shortName).trim();if(!shortName||shortName.length>25)throw Error('Kortnamnet ska ha 1–25 tecken.');update.shortName=shortName;}if(req.body.name!==undefined){const name=String(req.body.name).trim();if(name.length<3||name.length>50)throw Error('Lagnamnet ska ha 3–50 tecken.');if((await tx.select().from(clubs)).some((t:any)=>t.id!==c.id&&t.name.toLocaleLowerCase('sv')===name.toLocaleLowerCase('sv')))throw Error('Lagnamnet är upptaget.');if(name!==c.name){update.name=name;cost+=100000;}}if(req.body.hometown!==undefined){const place=PLACES.find(p=>p.name===req.body.hometown);if(!place)throw Error('Välj en ort på kartan.');if(place.name!==c.hometown){update.hometown=place.name;cost+=100000;}}if(cost>0&&c.gold<cost)throw Error('Kassan räcker inte.');if(req.body.image!==undefined){const data=String(req.body.image);if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data))throw Error('Välj PNG, JPEG eller WebP.');const bytes=Buffer.from(data.split(',')[1],'base64');const valid=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes[0]===255&&bytes[1]===216||bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';if(!valid||bytes.length>500000)throw Error('Bilden ska vara en giltig bild under 500 kB.');await put('club-image','club-image-'+c.id,{data},tx);}if(Object.keys(update).length)await tx.update(clubs).set({...update,gold:c.gold-cost}).where(eq(clubs.id,c.id));if(cost)await put('ledger','identity-'+randomUUID(),{clubId:c.id,amount:-cost,category:'Klubbnamn / hemort',date:new Date().toISOString()},tx);return {success:true};}));
}
