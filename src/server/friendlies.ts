import {Express} from 'express';
import {randomUUID} from 'node:crypto';
import {eq,sql} from 'drizzle-orm';
import {db} from '../db';
import {clubs,worldState} from '../db/schema';
import {record,records,put} from './records';
import {FRIENDLY_VENUES,friendlyKickoff,swedishDay} from '../constants/friendlies';

export async function friendlyNotice(tx:any,club:any,id:string,title:string,body:string,extra:any={}){
 const date=new Date().toISOString();
 await put('team-news','news-'+id+'-'+club.id,{clubId:club.id,title,body,date,...extra},tx);
 if(club.userId)await put('mail','mail-'+id+'-'+club.id,{from:'arena',fromName:'Arenans matchkontor',to:club.userId,toName:club.ownerName,subject:title,body,date,read:false,...extra},tx);
}
export function registerFriendlies(app:Express){
 const route=(method:'get'|'post',path:string,fn:(req:any)=>Promise<any>)=>app[method](path,async(req,res)=>{try{res.json(await fn(req))}catch(e:any){res.status(400).json({error:e.message})}});
 const own=async(req:any,tx:any=db)=>{if(req.arenaUser?.guest)throw Error('Logga in med ditt lag.');const [club]=await tx.select().from(clubs).where(eq(clubs.userId,req.arenaUser?.userId||''));if(!club||club.isBot)throw Error('Du behöver ett eget lag.');return club;};
 const available=async(tx:any,ids:string[],date:string)=>{const fixtures=[...await records('fixture',tx),...await records('friendly-fixture',tx)];if(fixtures.some(f=>ids.some(id=>f.homeId===id||f.awayId===id)&&swedishDay(f.date)===swedishDay(date)))throw Error('Ett av lagen har redan en match den dagen.');};
 route('get','/api/friendly-options/:target',async req=>{const club=await own(req);return {canChallenge:club.id!==req.params.target,venues:FRIENDLY_VENUES};});
 route('post','/api/friendly-challenges',async req=>db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719143)`);
  const club=await own(req,tx),[target]=await tx.select().from(clubs).where(eq(clubs.id,String(req.body.targetId)));
  if(!target||target.isBot||!target.userId||target.id===club.id)throw Error('Välj ett annat managerstyrt lag.');
  const date=friendlyKickoff(String(req.body.day)),venue=FRIENDLY_VENUES.find(v=>v.id===req.body.venueId);
  if(!venue)throw Error('Välj en vänskapsarena.');
  await available(tx,[club.id,target.id],date);
  const duplicate=(await records('friendly-challenge',tx)).find(c=>c.status==='pending'&&c.homeId===club.id&&c.awayId===target.id&&c.date===date);
  if(duplicate)return duplicate;
  const id='challenge-'+randomUUID(),challenge={id,homeId:club.id,awayId:target.id,homeName:club.name,awayName:target.name,date,venueId:venue.id,status:'pending',createdAt:new Date().toISOString()};
  await put('friendly-challenge',id,challenge,tx);
  await friendlyNotice(tx,target,id,'Utmaning på vänskapsmatch',club.name+' vill möta er den '+swedishDay(date)+' kl. 19.00 svensk tid på '+venue.name+'.',{friendlyChallengeId:id});
  return challenge;
 }));
 route('get','/api/friendly-challenges/:id',async req=>{const club=await own(req),challenge=await record(req.params.id);if(!challenge||![challenge.homeId,challenge.awayId].includes(club.id))throw Error('Utmaningen saknas.');return {...challenge,canRespond:club.id===challenge.awayId&&challenge.status==='pending'&&Date.now()<+new Date(challenge.date)};});
 route('post','/api/friendly-challenges/:id/respond',async req=>db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719143)`);
  const club=await own(req,tx),c=await record(req.params.id,tx);
  if(!c||c.awayId!==club.id)throw Error('Bara det utmanade laget kan svara.');
  if(c.status!=='pending')return c;
  if(Date.now()>=+new Date(c.date))throw Error('Utmaningen har gått ut.');
  if(typeof req.body.accept!=='boolean')throw Error('Välj acceptera eller avböj.');
  const accepted=req.body.accept,fixtureId=accepted?'friendly-fixture-'+randomUUID():null;
  if(accepted){await available(tx,[c.homeId,c.awayId],c.date);const [world]=await tx.select().from(worldState);await put('friendly-fixture',fixtureId!,{friendly:true,homeId:c.homeId,awayId:c.awayId,date:c.date,venueId:c.venueId,division:'Vänskapsmatch',round:0,season:world.season,played:false,ticketPrice:0,bookingPaid:0},tx);}
  const result={...c,status:accepted?'accepted':'declined',fixtureId};await put('friendly-challenge',c.id,result,tx);
  for(const id of [c.homeId,c.awayId]){const [team]=await tx.select().from(clubs).where(eq(clubs.id,id));await friendlyNotice(tx,team,c.id+'-answer',accepted?'Vänskapsmatch bokad':'Vänskapsmatch avböjd',c.homeName+' – '+c.awayName+' · '+swedishDay(c.date)+' kl. 19.00 svensk tid.',{friendlyChallengeId:c.id,...(fixtureId?{matchId:fixtureId}:{})});}
  return result;
 }));
}
