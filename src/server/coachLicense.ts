import type {Express} from 'express';
import {eq,sql} from 'drizzle-orm';
import {db} from '../db';
import {clubs,players,gameRecords} from '../db/schema';
import {record,records,put} from './records';
import {activeIds,reserveIds,validateLineup} from '../engine/lineup';
import {simulateMatch} from '../engine/matchEngine';
import {LICENSE_TASKS,LICENSE_GOALS,licenseComplete} from '../constants/coachLicense';

export async function createCoachLicense(userId:string,tx:any=db){
 const id='coach-license-'+userId;if(await record(id,tx))return;
 await put('coach-license',id,{userId,status:'active',minimized:false,startedAt:new Date().toISOString(),done:{}},tx);
}
async function change(userId:string,fn:(state:any,tx:any)=>Promise<void>){
 return db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`coach-license-${userId}`}))`);
  const state=await record('coach-license-'+userId,tx);if(!state)return null;
  const before=JSON.stringify(state);await fn(state,tx);
  if(licenseComplete(state.done)&&!state.completedAt){state.completedAt=new Date().toISOString();state.status='complete';}
  if(JSON.stringify(state)!==before)await put('coach-license',state.id,state,tx);return state;
 });
}
async function mark(userId:string,ids:string[]){
 if(!ids.length)return;
 await change(userId,async s=>{if(s.status!=='active')return;for(const id of ids)if(!s.done[id])s.done[id]=new Date().toISOString();});
}
async function fixturesFor(clubId:string,tx:any=db){
 return (await tx.select().from(gameRecords).where(sql`${gameRecords.kind}='fixture' AND (${gameRecords.payload}->>'homeId'=${clubId} OR ${gameRecords.payload}->>'awayId'=${clubId})`)).map((r:any)=>({id:r.id,...r.payload}));
}
async function context(userId:string){
 const [club]=await db.select().from(clubs).where(eq(clubs.userId,userId));if(!club||club.isBot)return null;
 const fixtures=await fixturesFor(club.id),next=fixtures.filter(f=>!f.played&&!f.friendly&&+new Date(f.date)>Date.now()).sort((a,b)=>+new Date(a.date)-+new Date(b.date))[0];
 return {club,fixtures,next};
}

// Observe only successful, authenticated game responses. Saving an invalid
// lineup or simply clicking a mission never completes a mission.
export function registerCoachLicense(app:Express){
 const practiceAt=new Map<string,number>();
 app.post('/api/coach-license/practice',async(req:any,res)=>{try{
  const userId=req.arenaUser.userId,now=Date.now();
  if(now-(practiceAt.get(userId)||0)<30000)return res.status(429).json({error:'Vänta en halv minut mellan övningsmatcher.'});
  practiceAt.set(userId,now);for(const [id,date] of practiceAt)if(now-date>60000)practiceAt.delete(id);
  const [home]=await db.select().from(clubs).where(eq(clubs.userId,userId));if(!home||home.isBot)throw Error('Ditt lag saknas.');
  const hs=await db.select().from(players).where(eq(players.clubId,home.id));
  const preset=(await record('presets-'+home.id))?.presets?.[0]?.lineup;
  const lineup=preset||home.lineup,invalid=validateLineup(lineup as any,hs as any);if(invalid)throw Error('Spara Standard 1 först: '+invalid);
  const bots=await db.select().from(clubs).where(eq(clubs.isBot,true));let away:any,as:any[]=[];
  for(const bot of bots.slice(0,30)){const squad=await db.select().from(players).where(eq(players.clubId,bot.id));if(!validateLineup(bot.lineup as any,squad as any)){away=bot;as=squad;break;}}
  if(!away)throw Error('Ingen övningsmotståndare är tillgänglig just nu.');
  // The pure engine receives detached copies. No report, injury, economy,
  // player, fixture or training write occurs anywhere in this endpoint.
  const report=simulateMatch(structuredClone({...home,lineup}) as any,structuredClone(away),structuredClone(hs) as any,structuredClone(as) as any,now,(lineup as any).underlag);
  res.json({...report,id:'practice-'+now,date:new Date(now).toISOString(),division:'Övningsmatch · påverkar inte spelvärlden',friendly:true});
 }catch(e:any){res.status(400).json({error:e.message})}});
 app.use('/api', (req:any,res,next)=>{
  if(!req.arenaUser||req.arenaUser.guest)return next();
  const path=req.path,watched=/^\/(player-detail\/|club-detail\/|match\/|economy\/|lineup-presets\/|match-plan\/|clubs\/[^/]+\/training$)/.test(path);
  if(!watched)return next();
  const json=res.json.bind(res);
  res.json=((data:any)=>{
   if(res.statusCode>=400||data?.error)return json(data);
   const observe=async()=>{
    const state=await record('coach-license-'+req.arenaUser.userId);if(state?.status!=='active')return;
    const ids:string[]=[];
    if(req.method==='GET'){
     if(path.startsWith('/player-detail/')){if(data.owned)ids.push('player');if(data.auction&&!data.owned)ids.push('market');}
     if(path.startsWith('/economy/'))ids.push('economy');
     if(path.startsWith('/club-detail/')){const c=await context(req.arenaUser.userId);if(c?.next&&data.id===(c.next.homeId===c.club.id?c.next.awayId:c.next.homeId))ids.push('opponent');}
    }else if(req.method==='POST'&&data.success){
     if(path.endsWith('/training')&&Object.values(req.body.trainingPoints||{}).some((v:any)=>v>0))ids.push('training');
     if((path.startsWith('/lineup-presets/')||path.startsWith('/match-plan/'))&&req.body.lineup){
      const slots=Object.values(req.body.lineup.slots||{}),starters=slots.flatMap(activeIds);
      if(new Set(starters).size===10){ids.push('lineup');if(slots.filter(s=>activeIds(s).length).every(s=>reserveIds(s).length))ids.push('reserves');if(path.startsWith('/match-plan/'))ids.push('preparation');}
     }
    }
    await mark(req.arenaUser.userId,ids);
   };
   // Preserve the successful game response even if the optional tutorial fails.
   void observe().catch(e=>console.error('Coach license progress:',e.message)).finally(()=>json(data));return res;
  }) as any;next();
 });
 app.get('/api/coach-license',async(req:any,res)=>{try{
  res.setHeader('Cache-Control','no-store');
  let state=await record('coach-license-'+req.arenaUser.userId);if(!state)return res.json({available:true,status:'not-started'});
  if(state.status==='complete'||state.status==='paused')return res.json(state);
  const c=await context(req.arenaUser.userId);
  const played=c?.fixtures.filter(f=>f.played&&!f.friendly&&+new Date(f.date)>=+new Date(state.startedAt)).sort((a,b)=>+new Date(b.date)-+new Date(a.date))||[];
  if(state.status==='active'&&played.length&&!state.done.match){await mark(req.arenaUser.userId,['match']);state=await record(state.id);}
  res.setHeader('Cache-Control','no-store');res.json({...state,nextFixtureId:c?.next?.id,nextDate:c?.next?.date,opponentId:c?.next?(c.next.homeId===c.club.id?c.next.awayId:c.next.homeId):null,reportId:played[0]?.id});
 }catch{res.status(500).json({error:'Tränarlicensen kunde inte hämtas.'})}});
 app.post('/api/coach-license',async(req:any,res)=>{try{
  const userId=req.arenaUser.userId,action=req.body.action;
  if(action==='start'){if(!await context(userId))throw Error('Skapa ett lag först.');await db.transaction(async(tx:any)=>{await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`coach-license-${userId}`}))`);await createCoachLicense(userId,tx);});}
  else if(['pause','resume','minimize','expand','goal','report'].includes(action))await change(userId,async(s,tx)=>{
   if(action==='pause'&&s.status!=='complete')s.status='paused';
   if(action==='resume'&&s.status!=='complete')s.status='active';
   if(action==='minimize'||action==='expand')s.minimized=action==='minimize';
   if(action==='goal'&&s.status==='active'){if(!LICENSE_GOALS.includes(req.body.goal))throw Error('Välj en målsättning.');s.goal=req.body.goal;s.done.goal=new Date().toISOString();}
   if(action==='report'&&s.status==='active'){
    const [club]=await tx.select().from(clubs).where(eq(clubs.userId,userId)),f=await record(String(req.body.fixtureId),tx);
    if(!club||!f?.played||f.friendly||![f.homeId,f.awayId].includes(club.id)||+new Date(f.date)<+new Date(s.startedAt))return;
    s.done.match ||=new Date().toISOString();s.done.report ||=new Date().toISOString();
   }
  });else throw Error('Okänt val.');
  res.json({success:true});
 }catch(e:any){res.status(400).json({error:e.message})}});
 app.get('/api/administration/coach-license',async(req:any,res)=>{try{
  const all=await records('coach-license'),logins=await records('login-event'),week=7*86400000,eligible=all.filter(s=>Date.now()-+new Date(s.startedAt)>=week);
  res.json({started:all.length,chapterOne:all.filter(s=>LICENSE_TASKS.filter(t=>t.chapter===1).every(t=>s.done[t.id])).length,completed:all.filter(s=>s.completedAt).length,paused:all.filter(s=>s.status==='paused').length,weekEligible:eligible.length,returned:eligible.filter(s=>logins.some(e=>e.userId===s.userId&&+new Date(e.date)>=+new Date(s.startedAt)+week)).length,steps:LICENSE_TASKS.map(t=>({title:t.title,completed:all.filter(s=>s.done[t.id]).length,waiting:all.filter(s=>!s.completedAt&&LICENSE_TASKS.find(x=>!s.done[x.id])?.id===t.id).length}))});
 }catch{res.status(500).json({error:'Uppföljningen kunde inte hämtas.'})}});
}
