import {prepareLaunch} from './launch';
import {deliverWelcomeMail} from './welcomeMail';
import {replenishArtifacts} from './artifactSupply';
import {transitionSeason} from './seasonTransition';
import {liveMatchView} from './liveMatch';
import {botLineup,variedBotLineup} from '../engine/botLineup';
export {botLineup} from '../engine/botLineup';
import {clubMorale} from './revision13';
import {assertBidCapacity} from './solvency';
import {overdueEffects} from './loanConsequences';
import {statistics,teamNews} from './newsStatistics';
import {SeededRNG} from '../engine/matchEngine';
import {matchMerit,postMatchForm} from '../engine/matchEngine';
import {progressEconomy,releaseMarketPlayers,awardSeason} from './progression';
import {weatherFor} from '../engine/weather';
import {dailyUpdates} from '../engine/calendar';
import {consumeMatchSpells} from '../constants/spells';
import {ARTIFACTS} from '../constants/market';
import {advanceImperialGames} from './officialGames';
import {sendContact} from './contactMail';
import {settleTips} from './tipsSettlement';
import {fixtureVenue} from '../constants/venues';
import {finishArtifactAuction} from './artifactMarket';
import {advanceCalendar} from './calendar';
import {fixtureDates,roundRobin} from '../engine/schedule';
import {Express} from 'express';
import {db,localClient,createPool} from '../db';
import {clubs,players,matches,worldState,gameRecords} from '../db/schema';
import {eq,sql,inArray} from 'drizzle-orm';
import {records,record,put} from './records';
import {DIVISION_NAMES,LEGACY_DIVISIONS} from '../constants/leagues';
import {PLACES,nearbyPlaces} from '../constants/geography';
import {generateStarterSquad,generateSinglePlayer,calculateWage} from '../engine/playerGenerator';
import {generateProceduralBotClubName} from '../constants/mambenna';
import {simulateMatch} from '../engine/matchEngine';
import {activeIds} from '../engine/lineup';
import {Race,PlayerAttributes} from '../types';
import {randomUUID} from 'node:crypto';

const races:Race[]=['human','elf','dwarf','orc'];
const defaultLineup={slots:{},underlag:'Gräs',intrade:4,tactics:{uppspel:'Normal',spelvag:'Normal',skytte:'Normal'}};
const training={snabbhet:1,kondition:1,markering:1,passning:1,teknik:1,speluppfattning:1,skott:0,malvakt:0,tuffhet:0};
function playerRow(p:any,clubId:string|null){const {id,positionRatingsWithForm,positionRatingsWithoutForm,...row}=p;return {...row,clubId};}
function publicPlayer(p:any){const {attributes,positionRatingsWithForm,positionRatingsWithoutForm,...rest}=p;return rest;}

export async function initializeExpansion(){
 if(await record('revision-original-v2'))return;
 await db.transaction(async(tx:any)=>{
  for(const [old,name] of Object.entries(LEGACY_DIVISIONS))await tx.update(clubs).set({division:name}).where(eq(clubs.division,old));
  const existing=await tx.select().from(clubs);
  for(const c of existing){
   const correction:any={};
   if(c.isBot&&!c.name.endsWith(' (C)'))correction.name=c.name+' (C)';
   if(c.presentation.startsWith('Välkommen till ')||c.presentation.includes('är ett fäste grundat inför'))correction.presentation='';
   if(Object.values(c.trainingPoints as any).reduce((a:number,b:any)=>a+Number(b),0)===7 && !(c.coach as any))correction.trainingPoints=training;
   if(Object.keys(correction).length)await tx.update(clubs).set(correction).where(eq(clubs.id,c.id));
  }
  // Rebalance only untouched starters; preserve identity and all played history.
  const oldPlayers=await tx.select().from(players);
  for(const p of oldPlayers){if(p.matches!==0||p.totalInjury!==0)continue;const attrs={...p.attributes} as PlayerAttributes;for(const key of Object.keys(attrs) as Array<keyof PlayerAttributes>)attrs[key]=Math.round(Math.min(7.4,attrs[key]*0.67)*100)/100;
   await tx.update(players).set({attributes:attrs,wage:calculateWage(attrs),nominalPosition:[1,18].includes(p.shirtNumber)?'Målvakt':p.nominalPosition}).where(eq(players.id,p.id));
  }
  let index=existing.length;
  for(const division of DIVISION_NAMES){
   const here=existing.filter((c:any)=>c.division===division);
   for(let n=here.length;n<10;n++){
    const race=races[index%4],place=PLACES.filter(s=>s.race===race)[index%PLACES.filter(s=>s.race===race).length],names=generateProceduralBotClubName(race,index);
    const id='computer-'+randomUUID();index++;
    await tx.insert(clubs).values({id,name:names.name+' (C)',shortName:names.shortName,race,hometown:place.name,division,position:n+1,gold:200000,ownerName:'Datorn',isBot:true,presentation:'',trainingPoints:training,lineup:defaultLineup,doctorInvestment:2500});
    const squad=await tx.insert(players).values(generateStarterSquad(race,id,place.name).map(p=>playerRow(p,id))).returning();
    await tx.update(clubs).set({lineup:botLineup(squad)}).where(eq(clubs.id,id));
   }
  }
  for(const c of existing.filter((c:any)=>c.isBot)){const squad=await tx.select().from(players).where(eq(players.clubId,c.id));await tx.update(clubs).set({lineup:botLineup(squad)}).where(eq(clubs.id,c.id));}
  const all=await tx.select().from(clubs),dates=fixtureDates();
  const fixtureRows:any[]=[];
  for(const division of DIVISION_NAMES){const ids=all.filter((c:any)=>c.division===division).slice(0,10).map((c:any)=>c.id);
   roundRobin(ids).forEach((pairs,r)=>pairs.forEach(([homeId,awayId])=>fixtureRows.push({id:'fixture-'+randomUUID(),kind:'fixture',payload:{division,round:r+1,homeId,awayId,date:dates[r],played:false}})));
  }
  for(let i=0;i<fixtureRows.length;i+=100)await tx.insert(gameRecords).values(fixtureRows.slice(i,i+100));
  for(let i=0;i<12;i++){const race=races[i%4],place=PLACES.find(s=>s.race===race)!;
   const p=generateSinglePlayer(0,race,'',place.name,1);
   const [row]=await tx.insert(players).values(playerRow(p,null)).returning();
   await put('auction','auction-'+randomUUID(),{playerId:row.id,sellerId:null,price:Math.round(p.wage*5),bidderId:null,endsAt:new Date(Date.now()+7*86400000).toISOString(),closed:false},tx);
  }
  await put('system','revision-original-v2',{createdAt:new Date().toISOString()},tx);
 });
}

let stressPlayed=0;let busy=false;
export async function tickWorld(now=new Date()){
 if(busy)return;busy=true;
 let worker:any;
 try{
 if(!localClient){worker=await createPool().connect();const lock=await worker.query('SELECT pg_try_advisory_lock(719202) AS acquired');if(!lock.rows[0].acquired)return;}
 await deliverWelcomeMail();
 const matchesStarted=await prepareLaunch(now);
 if(!await record('calendar-clock'))await advanceCalendar(now);
 const due=[...(await records('artifact-auction')).filter(a=>!a.closed&&new Date(a.endsAt)<=now).map(item=>({type:'artifact',date:item.endsAt,item})),...(await records('auction')).filter(a=>!a.closed&&new Date(a.endsAt)<=now).map(item=>({type:'auction',date:item.endsAt,item})),...(await records('scout')).filter(s=>s.destination&&new Date(s.returnsAt)<=now).map(item=>({type:'scout',date:item.returnsAt,item})),...(await records('fixture')).filter(f=>matchesStarted&&!f.played&&new Date(f.date)<=now).map(item=>({type:'fixture',date:item.date,item}))].sort((a,b)=>a.date.localeCompare(b.date));
 for(const event of due){
  await advanceCalendar(new Date(event.date));
  if(event.type==='artifact'){await finishArtifactAuction(event.item.id,event.date);}
  else if(event.type==='fixture'){const fixture=event.item;
  await playFixture(fixture,now);if(process.env.ARENA_STRESS_LOG==='1'&&++stressPlayed%25===0)console.log('Provspelade matcher: '+stressPlayed);
 }else if(event.type==='auction'){const auction=event.item;
  await db.transaction(async(tx:any)=>{await tx.execute(sql`SELECT pg_advisory_xact_lock(719084)`);const a=await record(auction.id,tx);if(a.closed||+new Date(a.endsAt)>+now)return;
   if(a.bidderId){if(a.unreserved)await tx.update(clubs).set({gold:sql`${clubs.gold}-${a.price}`}).where(eq(clubs.id,a.bidderId));const squad=await tx.select().from(players).where(eq(players.clubId,a.bidderId));const nums=new Set(squad.map((p:any)=>p.shirtNumber));let number=1;while(nums.has(number))number++;
    if(!await record('origin-'+a.playerId,tx))await put('player-origin','origin-'+a.playerId,{clubId:a.sellerId||null},tx);await tx.update(players).set({clubId:a.bidderId,shirtNumber:number}).where(eq(players.id,a.playerId));
    for(const item of (await records('artifact-item',tx)).filter(i=>i.playerId===a.playerId))await put('artifact-item',item.id,{...item,clubId:a.bidderId},tx);
    if(a.sellerId){await tx.update(clubs).set({gold:sql`${clubs.gold}+${a.price}`}).where(eq(clubs.id,a.sellerId));await put('ledger','sale-'+a.id,{clubId:a.sellerId,category:'Spelarförsäljningar',amount:a.price,date:event.date},tx);}
    const bought=(await tx.select().from(players).where(eq(players.id,a.playerId)))[0],buyer=(await tx.select().from(clubs).where(eq(clubs.id,a.bidderId)))[0];await put('morale-change','morale-'+a.id,{clubId:a.bidderId,date:event.date,penalty:bought.race===buyer.race?0:5},tx);await put('ledger','purchase-'+a.id,{clubId:a.bidderId,category:'Spelarköp',amount:-a.price,date:event.date},tx);
   }
   await put('auction',a.id,{...a,closed:true},tx);
  });
 }else if(event.type==='scout'){const scout=event.item;
  await db.transaction(async(tx:any)=>{const s=await record(scout.id,tx);if(!s.destination)return;const [club]=await tx.select().from(clubs).where(eq(clubs.id,s.clubId));const place=PLACES.find(p=>p.id===s.destination)!;
   const squad=await tx.select().from(players).where(eq(players.clubId,club.id));
   if(squad.length>=99){await put('scout',s.id,{...s,destination:null,message:'Truppen är full. Talangscouten återvände utan en spelare.'},tx);return;}
   const nums=new Set(squad.map((p:any)=>p.shirtNumber));let n=1;while(nums.has(n))n++;
   const p=generateSinglePlayer(0,place.race,club.id,place.name,n);
   const potential=(await record('potential-'+place.id,tx))?.value??place.potential;
   for(const k of Object.keys(p.attributes) as Array<keyof PlayerAttributes>)p.attributes[k]*=0.7+potential/20*0.3;
   p.wage=calculateWage(p.attributes);
   const [created]=await tx.insert(players).values({...playerRow(p,null),shirtNumber:0,createdAt:new Date(event.date)}).returning();
   await teamNews(tx,club.id,'scout-'+created.id,'Talangscouten har hittat en spelare',created.name+' väntar på ditt beslut i '+place.name+'.',{kind:'player',id:created.id});
   await put('scout',s.id,{...s,destination:null,locationId:place.id,returnsAt:null,message:'Talangscouten hittade '+created.name+' i '+place.name+'. Granska spelaren och välj om du vill värva honom.',candidatePlayerId:created.id,lastPlayerId:null},tx);
  });
 }
 }
 await advanceCalendar(now);
 await settleTips();
 if(matchesStarted){await advanceImperialGames(now);await awardSeason(now);await transitionSeason(now);}
 await progressEconomy(now);
 await releaseMarketPlayers(now);
 await replenishArtifacts(now);
 }finally{if(worker){try{await worker.query('SELECT pg_advisory_unlock(719202)')}finally{worker.release();}}busy=false;}
}

function route(app:Express,method:'get'|'post',path:string,fn:(req:any)=>Promise<any>){app[method](path,async(req,res)=>{try{res.json(await fn(req))}catch(e:any){res.status(400).json({error:e.message})}});}
export function registerExpansion(app:Express){
 route(app,'get','/api/match/:id',async(req)=>{const [m]=await db.select().from(matches).where(eq(matches.id,req.params.id));if(!m){const f=await record(req.params.id);if(f?.homeId&&!f.played){const live=await record('live-'+f.id);if(live)return liveMatchView(live.report,new Date());return {upcoming:true,id:f.id};}if(f?.friendly)return f;throw Error('Matchen saknas.');}return m.matchReport;});
 route(app,'get','/api/series',async()=>DIVISION_NAMES);
 route(app,'get','/api/fixtures',async(req)=>{
  const all=await db.select().from(clubs);const [world]=await db.select().from(worldState);return (await records('fixture')).filter(f=>(f.season||1)===Number(req.query.season||world.season)).filter(f=>(!req.query.division||f.division===req.query.division)&&(!req.query.clubId||f.homeId===req.query.clubId||f.awayId===req.query.clubId)).sort((a,b)=>a.date.localeCompare(b.date)).map(f=>({...f,homeName:all.find(c=>c.id===f.homeId)?.name,awayName:all.find(c=>c.id===f.awayId)?.name}));
 });
 route(app,'get','/api/search',async(req)=>{const q=String(req.query.q||'').trim().toLocaleLowerCase('sv');if(q.length<2)return{players:[],clubs:[],managers:[]};
 const all=await db.select().from(clubs),ps=await db.select().from(players);
 return{players:ps.filter(p=>p.name.toLowerCase().includes(q)||String(p.id)===q).slice(0,50).map(p=>({...publicPlayer(p),clubName:all.find(c=>c.id===p.clubId)?.name||'Inget lag'})),clubs:all.filter(c=>c.name.toLowerCase().includes(q)).map(c=>({id:c.id,name:c.name,division:c.division,race:c.race})).slice(0,50),managers:all.filter(c=>!c.isBot&&c.ownerName.toLowerCase().includes(q)).map(c=>({name:c.ownerName,clubName:c.name}))};});
 route(app,'get','/api/places',async()=>{const potentials=await records('potential');return PLACES.map(p=>({...p,potential:potentials.find(v=>v.id==='potential-'+p.id)?.value??p.potential}));});
 route(app,'get','/api/market',async()=>{const ps=await db.select().from(players),all=await db.select().from(clubs);return (await records('auction')).filter(a=>!a.closed).map(a=>({...a,player:ps.find(p=>p.id===a.playerId),bidderName:all.find(c=>c.id===a.bidderId)?.name||'Inga bud',sellerName:all.find(c=>c.id===a.sellerId)?.name||'Inget lag'}));});
 route(app,'post','/api/market/:id/bid',async(req)=>db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719084)`);const a=await record(req.params.id,tx),[club]=await tx.select().from(clubs).where(eq(clubs.id,req.body.clubId));
  if(!a||a.closed||new Date(a.endsAt)<=new Date())throw Error('Budgivningen är avslutad.');
  if(!club||club.isBot||club.id===a.sellerId)throw Error('Ogiltig budgivare.');
  const amount=Number(req.body.amount),minimum=a.bidderId?Math.ceil(a.price*1.03):a.price;
  if(!Number.isInteger(amount)||amount<minimum)throw Error('Minsta bud är '+minimum+' guld.');
  await assertBidCapacity(tx,club,amount,a.id);
  const squad=await tx.select().from(players).where(eq(players.clubId,club.id));
  const pending=(await records('auction',tx)).filter(x=>!x.closed&&x.bidderId===club.id&&x.id!==a.id).length;
  if(squad.length+pending>=99)throw Error('Truppen har inte plats för fler spelare.');
  
  
  const endsAt=+new Date(a.endsAt)-Date.now()<600000?new Date(+new Date(a.endsAt)+60000).toISOString():a.endsAt;
  await put('auction',a.id,{...a,price:amount,bidderId:club.id,endsAt,unreserved:true},tx);
  if(a.bidderId&&a.bidderId!==club.id)await teamNews(tx,a.bidderId,a.id+'-'+amount,'Du har blivit överbjuden','Ett nytt bud på '+amount+' guld har lagts. Inga pengar har dragits för ditt bud.',{kind:'player',id:a.playerId});if(a.sellerId)await teamNews(tx,a.sellerId,a.id+'-'+amount,'Din spelare har fått ett bud','Högsta budet är nu '+amount+' guld.',{kind:'player',id:a.playerId});
  await put('bid','bid-'+randomUUID(),{auctionId:a.id,playerId:a.playerId,clubId:club.id,amount,date:new Date().toISOString()},tx);
  return{success:true};
 }));
 route(app,'get','/api/bids/:clubId',async(req)=>{const auctions=[...(await records('auction')),...(await records('artifact-auction'))],ps=await db.select().from(players),teams=await db.select().from(clubs);return [...(await records('bid')),...(await records('artifact-bid'))].filter(b=>b.clubId===req.params.clubId).sort((a,b)=>b.amount-a.amount||b.date.localeCompare(a.date)).filter((b,i,all)=>all.findIndex(x=>x.auctionId===b.auctionId)===i).map(b=>{const a=auctions.find(a=>a.id===b.auctionId);return {...b,kind:a?.artifactId?'Artefakt':'Spelare',playerName:a?.artifactId?ARTIFACTS.find(x=>x.id===a.artifactId)?.name:ps.find(p=>p.id===b.playerId)?.name||'Spelare #'+b.playerId,highestBid:a?.price,bidderName:teams.find(c=>c.id===a?.bidderId)?.name||'Inga bud',status:!a?'Historiskt bud':a.cancelled?'Återbetalat':a.closed?(a.bidderId===b.clubId&&a.price===b.amount?'Vunnet':'Avslutat'):a.bidderId===b.clubId&&a.price===b.amount?'Ledande':'Överbjudet',endsAt:a?.endsAt||b.date}}).sort((a,b)=>b.date.localeCompare(a.date));});
 route(app,'post','/api/market/list',async(req)=>db.transaction(async(tx:any)=>{
  const [p]=await tx.select().from(players).where(eq(players.id,Number(req.body.playerId)));
  if(!p||p.clubId!==req.body.clubId||p.isDeceased||p.isMercenary)throw Error('Spelaren kan inte säljas.');
  if((await records('auction',tx)).some(a=>a.playerId===p.id&&!a.closed))throw Error('Spelaren är redan till salu.');
  const price=Number(req.body.price);if(!Number.isInteger(price)||price<1)throw Error('Ange ett giltigt utgångspris.');
  await put('auction','auction-'+randomUUID(),{playerId:p.id,sellerId:p.clubId,price,bidderId:null,listedAt:new Date().toISOString(),endsAt:new Date(Date.now()+7*86400000).toISOString(),closed:false},tx);return{success:true};
 }));
 route(app,'get','/api/forum',async(req)=>{const posts=(await records('forum')).filter(p=>p.category===(req.query.category||'Allmänt'));return posts.filter(p=>!p.threadId).map(p=>({...p,replies:posts.filter(r=>r.threadId===p.id).length,lastDate:posts.filter(r=>r.threadId===p.id).at(-1)?.date||p.date})).sort((a,b)=>b.lastDate.localeCompare(a.lastDate));});
 route(app,'get','/api/forum-overview',async()=>{const posts=(await records('forum')).filter(p=>!p.removed);return ['Allmänt','Spelfrågor','Transfer','Förslag',...DIVISION_NAMES].map(category=>{const roots=posts.filter(p=>p.category===category&&!p.threadId);const latest=roots.map(root=>{const activity=[root,...posts.filter(p=>p.threadId===root.id)].sort((a,b)=>b.date.localeCompare(a.date))[0];return {category,id:root.id,title:root.title||'Diskussion',author:activity.author,text:activity.text,date:activity.date};}).sort((a,b)=>b.date.localeCompare(a.date))[0];return latest||{category,id:null};});});
 route(app,'get','/api/forum-thread/:id',async(req)=>{const thread=await record(req.params.id);if(!thread?.category)throw Error('Tråden saknas.');return {thread,posts:[thread,...(await records('forum')).filter(p=>p.threadId===thread.id).sort((a,b)=>a.date.localeCompare(b.date))]};});
 route(app,'post','/api/forum',async(req)=>{const {clubId,category,text,title,threadId}=req.body;const [club]=await db.select().from(clubs).where(eq(clubs.id,clubId));const parent=threadId?await record(threadId):null;if(!club||!String(text||'').trim()||String(text).length>5000||![...DIVISION_NAMES,'Allmänt','Spelfrågor','Transfer','Förslag'].includes(category)||threadId&&(!parent||parent.threadId||parent.category!==category||parent.locked||parent.removed)||!threadId&&!String(title||'').trim())throw Error('Kontrollera rubrik, kategori och meddelande.');const id='post-'+randomUUID();await put('forum',id,{category,threadId:threadId||null,text:String(text).trim(),title:parent?.title||String(title).slice(0,120),author:club.ownerName,clubId:club.id,date:new Date().toISOString()});return{id:threadId||id};});
 route(app,'post','/api/contact',async(req)=>{const {subject,message,clubId}=req.body;if(!String(subject||'').trim()||!String(message||'').trim()||String(message).length>10000)throw Error('Fyll i ämne och meddelande.');const id='SL-'+randomUUID().slice(0,8);await put('contact',id,{subject,message,clubId,date:new Date().toISOString(),status:'Mottaget lokalt'});const emailed=await sendContact(id,String(subject).slice(0,150),String(message),String(clubId));if(emailed)await put('contact',id,{subject,message,clubId,date:new Date().toISOString(),status:'Skickat till spelledningen'});return{id,emailed};});
 route(app,'get','/api/scout/:clubId',async(req)=>{const scout=await record('scout-'+req.params.clubId)||{hired:false};const [candidate]=scout.candidatePlayerId?await db.select().from(players).where(eq(players.id,Number(scout.candidatePlayerId))):[];return {...scout,candidate};});
 route(app,'post','/api/scout/:clubId',async(req)=>{const id='scout-'+req.params.clubId;const [club]=await db.select().from(clubs).where(eq(clubs.id,req.params.clubId));if(!club)throw Error('Laget saknas.');
 const current=await record(id);
 if(req.body.action==='hire'){if(current?.hired)return current;await put('scout',id,{clubId:club.id,hired:true,wage:3000,destination:null});}
 else if(req.body.action==='recruit'||req.body.action==='decline'){if(!current?.candidatePlayerId)throw Error('Det finns ingen talang att ta ställning till.');await db.transaction(async(tx:any)=>{await tx.execute(sql`SELECT pg_advisory_xact_lock(719114)`);const fresh=await record(id,tx);const [candidate]=await tx.select().from(players).where(eq(players.id,Number(fresh?.candidatePlayerId))).for('update');if(!fresh?.candidatePlayerId||!candidate||candidate.clubId)throw Error('Talangen är inte längre tillgänglig.');if(req.body.action==='recruit'){const squad=await tx.select().from(players).where(eq(players.clubId,club.id));if(squad.length>=99)throw Error('Truppen är full.');const nums=new Set(squad.map((p:any)=>p.shirtNumber));let number=1;while(nums.has(number))number++;await tx.update(players).set({clubId:club.id,shirtNumber:number}).where(eq(players.id,candidate.id));const place=PLACES.find(p=>p.name===candidate.hometown);if(place){const potential=(await record('potential-'+place.id,tx))?.value??place.potential;await put('potential','potential-'+place.id,{value:Math.max(0,potential-2),date:new Date().toISOString()},tx);}await put('scout',id,{...fresh,candidatePlayerId:null,lastPlayerId:candidate.id,message:candidate.name+' har värvats till laget.'},tx);}else{await tx.delete(players).where(eq(players.id,candidate.id));await put('scout',id,{...fresh,candidatePlayerId:null,lastPlayerId:null,message:'Du avstod från '+candidate.name+'. Ortens talangpotential är oförändrad.'},tx);}});}
 else if(req.body.action==='cancel'){if(!current?.destination)throw Error('Scouten är inte på resa.');await put('scout',id,{...current,destination:null,returnsAt:null,message:'Resan avbröts. Scouten stannar på sin senaste ort.'});}
 else if(req.body.action==='send'){if(!current?.hired||current.destination||current.candidatePlayerId)throw Error('Ta först ställning till talangen som scoutats fram.');const dest=PLACES.find(p=>p.id===req.body.destination);if(!dest)throw Error('Välj en ort.');const home=PLACES.find(p=>p.id===current.locationId)||PLACES.find(p=>p.name===club.hometown)||PLACES[0];const neighbor=nearbyPlaces(home.id).find(p=>p.id===dest.id);if(!neighbor)throw Error('Scouten kan bara resa till en närliggande ort. Res vidare i etapper.');const days=neighbor.days;await put('scout',id,{...current,destination:dest.id,returnsAt:dailyUpdates(new Date(),new Date(Date.now()+(days+2)*86400000))[days-1].toISOString(),message:''});}
 else throw Error('Okänd åtgärd.');return await record(id);
 });
 route(app,'post','/api/magic/:clubId',async(req)=>{const cost=Number(req.body.cost);if(!Number.isInteger(cost)||cost<0||cost>100000)throw Error('Ogiltig magikostnad.');await db.update(clubs).set({magicInvestment:cost}).where(eq(clubs.id,req.params.clubId));return{success:true};});
 route(app,'get','/api/economy/:clubId',async(req)=>({ledger:(await records('ledger')).filter(r=>r.clubId===req.params.clubId),scout:await record('scout-'+req.params.clubId),reserved:[...(await records('auction')),...(await records('artifact-auction'))].filter(a=>!a.closed&&a.bidderId===req.params.clubId).reduce((s,a)=>s+a.price,0)}));
 route(app,'get','/api/statistics',async(req)=>statistics(req.query.division as string,String(req.query.season||"total")));
}


export async function playFixture(fixture:any,now:Date,early=false){
await db.transaction(async(tx:any)=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(719086)`);const stored=await record(fixture.id,tx);if(!stored||stored.played)return;const pending=await record('live-'+stored.id,tx);if(!early&&pending&&+now<+new Date(stored.date)+75*60000)return;const f=early?{...stored,scheduledDate:stored.date,date:now.toISOString()}:stored;
   const [home]=await tx.select().from(clubs).where(eq(clubs.id,f.homeId)),[away]=await tx.select().from(clubs).where(eq(clubs.id,f.awayId));
   const hs=await tx.select().from(players).where(pending?.homeIds?.length?inArray(players.id,pending.homeIds):eq(players.clubId,home.id)),as=await tx.select().from(players).where(pending?.awayIds?.length?inArray(players.id,pending.awayIds):eq(players.clubId,away.id));
   home.lineup=(await record('match-lineup-'+f.id+'-'+home.id,tx))?.lineup||(await record('presets-'+home.id,tx))?.presets?.[0]?.lineup||home.lineup;
   away.lineup=(await record('match-lineup-'+f.id+'-'+away.id,tx))?.lineup||(await record('presets-'+away.id,tx))?.presets?.[0]?.lineup||away.lineup;
   if(!Object.values(home.lineup?.slots||{}).some((slot:any)=>activeIds(slot).length))home.lineup=botLineup(hs);
   if(!Object.values(away.lineup?.slots||{}).some((slot:any)=>activeIds(slot).length))away.lineup=botLineup(as);
   if(home.isBot&&!await record('match-lineup-'+f.id+'-'+home.id,tx))home.lineup=variedBotLineup(hs,f.id+home.id,home.lineup);if(away.isBot&&!await record('match-lineup-'+f.id+'-'+away.id,tx))away.lineup=variedBotLineup(as,f.id+away.id,away.lineup);
   const recent=await tx.select({homeClubId:matches.homeClubId,awayClubId:matches.awayClubId,homeScore:matches.homeScore,awayScore:matches.awayScore,playedAt:matches.playedAt}).from(matches);for(const c of [home,away]){const past=recent.filter((m:any)=>m.homeClubId===c.id||m.awayClubId===c.id).sort((a:any,b:any)=>+new Date(b.playedAt)-+new Date(a.playedAt)).slice(0,5);(c as any).recentForm=past.length?past.reduce((n:number,m:any)=>{const h=m.homeClubId===c.id;const a=h?m.homeScore:m.awayScore,b=h?m.awayScore:m.homeScore;return n+(a>b?1:a===b?.5:0)},0)/past.length:.5;}(home as any).morale=await clubMorale(home.id,tx,+new Date(f.date));(away as any).morale=await clubMorale(away.id,tx,+new Date(f.date));home.arena=fixtureVenue(f,await tx.select().from(clubs));
   home.lineup={...home.lineup,underlag:home.arena.underlag==='Nimonimbus'?home.lineup.underlag:home.arena.underlag};
   const ward=await record('ward-'+f.id,tx);const originalSpells=new Map<number,string[]>(pending?.originalSpells||[...hs,...as].map(p=>[p.id,p.artifacts]));const currentArtifacts=new Map([...hs,...as].map(p=>[p.id,[...p.artifacts]]));if(ward)for(const p of [...hs,...as])p.artifacts=p.artifacts.filter((a:string)=>!a.startsWith('magic:')&&!a.startsWith('spell:'));const enchantment=ward?null:await record('weather-'+f.id,tx);const effect=enchantment?.effect;const weather=effect?{temp:effect==='rain'?8:15,condition:effect==='rain'?'Regn':effect==='fog'?'Dimma':'Klart',wind:effect==='wind'?(enchantment.spellId==='stormcall'?14:0):3}:weatherFor(home.hometown,new Date(f.date));
   const basketSpell=ward?null:await record('baskets-'+f.id,tx);if(basketSpell)(weather as any).basketsBlocked=true;const chainSpell=ward?null:await record('chains-'+f.id,tx);(weather as any).chainsBlocked=!!chainSpell;(weather as any).spells=[ward?.spellId,enchantment?.spellId,basketSpell?.spellId,chainSpell?.spellId].filter(Boolean);
   const report=pending?.report||simulateMatch(home,away,hs,as,Number(new Date(f.date))+(home.id+away.id).split('').reduce((a,c)=>a+c.charCodeAt(0),0),home.lineup.underlag,weather,overdueEffects(await records('loan',tx),home.id,new Date(f.date)));
   report.id=f.id;report.date=f.date;
   if(!early&&+now<+new Date(f.date)+75*60000){await put('live-match','live-'+f.id,{report,homeIds:hs.map(p=>p.id),awayIds:as.map(p=>p.id),originalSpells:[...originalSpells]},tx);return;}
   await tx.insert(matches).values({id:f.id,round:f.round,division:f.division,homeClubId:home.id,awayClubId:away.id,homeScore:report.finalScore.home,awayScore:report.finalScore.away,matchReport:report,season:f.season||1,playedAt:new Date(f.date)});
   for(const [c,scored,conceded] of [[home,report.finalScore.home,report.finalScore.away],[away,report.finalScore.away,report.finalScore.home]] as any[]){
    const wins=c.wins+(scored>conceded?1:0),draws=c.draws+(scored===conceded?1:0),losses=c.losses+(scored<conceded?1:0);
    const income=c.id===home.id?report.attendance*report.ticketPrice:0;
    await tx.update(clubs).set({wins,draws,losses,goalsFor:c.goalsFor+scored,goalsAgainst:c.goalsAgainst+conceded,recordString:wins+'/'+draws+'/'+losses,gold:c.gold+income,merit:Math.round((c.merit+matchMerit(c.division,scored,conceded))*1000000)/1000000}).where(eq(clubs.id,c.id));
    if(income)await put('ledger','income-'+f.id,{clubId:c.id,amount:income,category:'Matchintäkter',date:f.date},tx);
   }
   for(const [side,squad,club] of [['home',hs,home],['away',as,away]] as any[]){
    const selected=report.events.some(e=>e.id==='walkover')?[]:[...report.startingLineups[side as 'home'|'away'].map((p:any)=>p.id),...report.events.filter(e=>e.type==='SUBSTITUTION'&&e.teamSide===side).map(e=>e.playerId)];
    for(const p of squad){if(!selected.includes(p.id)||p.isDeceased||p.currentInjury>0)continue;
     const injury=report.injuries[side].find((i:any)=>i.playerId===p.id);
     const goals=report.events.filter(e=>e.playerId===p.id&&e.type==='GOAL_NORMAL').length,baskets=report.events.filter(e=>e.playerId===p.id&&e.type==='GOAL_BASKET').length;
     await tx.update(players).set({form:postMatchForm(p.form,side==='home'?report.finalScore.home>report.finalScore.away:report.finalScore.away>report.finalScore.home,!!injury,new SeededRNG(p.id+Number(new Date(f.date))).next()),assists:p.assists+report.events.filter((e:any)=>e.assistPlayerId===p.id).length,seasonAssists:p.seasonAssists+report.events.filter((e:any)=>e.assistPlayerId===p.id).length,artifacts:[...consumeMatchSpells(originalSpells.get(p.id)||p.artifacts),...(currentArtifacts.get(p.id)||[]).filter((a:string)=>!(originalSpells.get(p.id)||p.artifacts).includes(a))],matches:p.matches+1,seasonMatches:p.seasonMatches+1,goals:p.goals+goals,seasonGoals:p.seasonGoals+goals,basketGoals:p.basketGoals+baskets,seasonBasketGoals:p.seasonBasketGoals+baskets,currentInjury:injury?injury.severity:p.currentInjury,totalInjury:Math.min(9,p.totalInjury+0.015+(injury?0.2:0)),isDeceased:p.totalInjury+0.015+(injury?0.2:0)>=9}).where(eq(players.id,p.id));
     const participation=await record('participation-'+p.id,tx);
     await put('participation','participation-'+p.id,{playerId:p.id,dates:[...(participation?.dates||[]).filter((d:string)=>+new Date(d)>+new Date(f.date)-14*86400000),f.date]},tx);
    }
   }
   for(const contract of (await records('mercenary-contract',tx)).filter(c=>[home.id,away.id].includes(c.clubId)&&!c.completed&&+new Date(c.hiredAt)<=+new Date(f.date))){await tx.update(players).set({clubId:null}).where(eq(players.id,contract.playerId));await put('mercenary-contract',contract.id,{...contract,completed:true},tx);}
   await put('fixture',f.id,{...f,played:true,homeScore:report.finalScore.home,awayScore:report.finalScore.away},tx);await tx.delete(gameRecords).where(eq(gameRecords.id,'live-'+f.id));
   await tx.update(worldState).set({round:f.round,totalMatchesPlayed:sql`${worldState.totalMatchesPlayed}+1`,updatedAt:now});
  });
}
