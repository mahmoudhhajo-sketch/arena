import {Express} from 'express';
import {db} from '../db';import {clubs,players} from '../db/schema';import {eq} from 'drizzle-orm';
import {record,records,put} from './records';import {simulateImperialGames} from '../engine/imperialGames';import {simulateMatch} from '../engine/matchEngine';import {validateLineup} from '../engine/lineup';
export function registerExhibitions(app:Express){
 const route=(method:'get'|'post',path:string,fn:(req:any)=>Promise<any>)=>app[method](path,async(req,res)=>{try{res.json(await fn(req))}catch(e:any){res.status(400).json({error:e.message})}});
 route('get','/api/imperial-games',async()=>{const ps=new Map((await db.select().from(players)).map(p=>[p.id,p]));const current=(p:any)=>p?{...p,name:ps.get(p.id)?.name||p.name,clubId:ps.get(p.id)?.clubId||null,race:ps.get(p.id)?.race||p.race}:p;return {tests:[...(await records('imperial-official')),...(await records('imperial-test'))].sort((a,b)=>b.date.localeCompare(a.date)).map(run=>({...run,competitions:run.competitions.map((c:any)=>({...c,winner:current(c.winner),leaders:c.leaders.map(current),rounds:c.rounds.map((r:any)=>({...r,bouts:r.bouts.map((b:any)=>({...b,a:current(b.a),b:current(b.b),winner:current(b.winner)}))}))}))}))}});
 route('post','/api/imperial-games/test',async req=>{
  const id='imperial-test-'+String(req.body.requestId||'preview-1');const existing=await record(id);if(existing)return existing;
  const all=await db.select().from(players),teams=await db.select().from(clubs);const result={...simulateImperialGames(all as any,20260914,new Set((await records('legend')).map(l=>l.playerId))),date:new Date().toISOString(),test:true,clubs:teams.map(c=>({id:c.id,name:c.name}))};await put('imperial-test',id,result);return {id,...result};
 });
 route('get','/api/friendlies/:clubId',async req=>(await records('friendly')).filter(r=>r.homeClub.id===req.params.clubId||r.awayClub.id===req.params.clubId));
 route('get','/api/friendly/:id',async req=>{const r=await record(req.params.id);if(!r?.friendly)throw Error('Träningsmatchen saknas.');return r});
 route('post','/api/friendly',async req=>{
  const id='friendly-'+String(req.body.clubId)+'-'+String(req.body.requestId||'preview-1');const existing=await record(id);if(existing)return existing;
  const [home]=await db.select().from(clubs).where(eq(clubs.id,req.body.clubId));if(!home||home.isBot)throw Error('Välj ditt lag.');
  const hs=await db.select().from(players).where(eq(players.clubId,home.id));const invalid=validateLineup(home.lineup as any,hs as any);if(invalid)throw Error('Spara en giltig uppställning först: '+invalid);
  const bots=(await db.select().from(clubs)).filter(c=>c.isBot),away=bots[Math.floor(Math.random()*bots.length)],as=await db.select().from(players).where(eq(players.clubId,away.id));
  const report=simulateMatch(home as any,away as any,hs as any,as as any,Date.now(),(home.arena as any)?.underlag||'Sten');
  const result={...report,id,date:new Date().toISOString(),division:'Vänskapsmatch · test',friendly:true,arenaName:(home.arena as any)?.name||'Kejsardömets träningsarena',attendance:Math.min(30000,report.attendance)};
  await put('friendly',id,result);return result;
 });
}
