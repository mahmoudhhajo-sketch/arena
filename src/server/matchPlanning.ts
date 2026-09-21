import {Express} from 'express';import {db} from '../db';import {clubs,players,gameRecords} from '../db/schema';import {eq,sql} from 'drizzle-orm';import {record,records,put} from './records';import {bookingFee,fixtureVenue,standardVenue,venueCatalog} from '../constants/venues';import {validateLineup} from '../engine/lineup';

export function registerMatchPlanning(app:Express){const route=(m:'get'|'post',path:string,fn:(r:any)=>Promise<any>)=>app[m](path,async(req,res)=>{try{res.json(await fn(req))}catch(e:any){res.status(400).json({error:e.message})}});

 route('get','/api/lineup-presets/:clubId',async req=>(await record('presets-'+req.params.clubId))?.presets||[]);

 route('post','/api/lineup-presets/:clubId',async req=>db.transaction(async(tx:any)=>{const [club]=await tx.select().from(clubs).where(eq(clubs.id,req.params.clubId)).for('update');if(!club||club.isBot)throw Error('Laget saknas');const slot=Number(req.body.slot),name=String(req.body.name||'').trim().slice(0,40);if(!Number.isInteger(slot)||slot<0||slot>2||!name)throw Error('Välj plats 1–3 och ett namn.');const squad=await tx.select().from(players).where(eq(players.clubId,club.id)),invalid=validateLineup(req.body.lineup,squad);if(invalid)throw Error(invalid);const presets=(await record('presets-'+club.id,tx))?.presets||[];presets[slot]={name,lineup:req.body.lineup};await put('lineup-presets','presets-'+club.id,{presets},tx);return {success:true};}));

 route('get','/api/match-plan/:id',async req=>{const f=await record(req.params.id);if(!f?.homeId)throw Error('Matchen saknas');const teams=await db.select().from(clubs),home=teams.find(c=>c.id===f.homeId),away=teams.find(c=>c.id===f.awayId),own=teams.find(c=>c.id===req.query.clubId),participant=own&&[f.homeId,f.awayId].includes(own.id),all=await records('fixture');return {fixture:f,homeName:home?.name,awayName:away?.name,venue:fixtureVenue(f,teams),venues:[standardVenue(f),...venueCatalog(teams).map(v=>({...v,booked:all.some(g=>g.id!==f.id&&g.date===f.date&&fixtureVenue(g,teams).id===v.id)}))],lineup:participant?((await record('match-lineup-'+f.id+'-'+own.id))?.lineup||(await record('presets-'+own.id))?.presets?.[0]?.lineup||own.lineup):null,canEdit:!!participant&&!f.played&&Date.now()<+new Date(f.date),canBook:own?.id===f.homeId&&!f.played&&Date.now()<+new Date(f.date)};});

 route('post','/api/match-plan/:id',async req=>db.transaction(async(tx:any)=>{

  // Serialize bookings for a kickoff to prevent two concurrent requests taking the same venue.

  await tx.execute(sql`SELECT pg_advisory_xact_lock(719041)`);

  const f=await record(req.params.id,tx),[club]=await tx.select().from(clubs).where(eq(clubs.id,req.body.clubId)).for('update');if(!f||!club||club.isBot||![f.homeId,f.awayId].includes(club.id)||f.played||Date.now()>=+new Date(f.date))throw Error('Matchplaneringen är stängd.');

  const teams=await tx.select().from(clubs);if(req.body.venueId!==undefined){if(f.homeId!==club.id)throw Error('Bara hemmalaget bokar arena.');const chosen=[standardVenue(f),...venueCatalog(teams)].find(v=>v.id===req.body.venueId);if(!chosen)throw Error('Arenan saknas.');if((await records('fixture',tx)).some(g=>g.id!==f.id&&g.date===f.date&&fixtureVenue(g,teams).id===chosen.id))throw Error('Arenan är redan bokad.');const fee=chosen.id==='club-'+club.id?0:bookingFee(chosen),difference=fee-(f.bookingPaid||0);if(club.gold<difference)throw Error('Du har inte tillräckligt med guld för bokningen.');if(difference){await tx.update(clubs).set({gold:club.gold-difference}).where(eq(clubs.id,club.id));await put('ledger','booking-'+f.id+'-'+Date.now(),{clubId:club.id,category:'Arenabokning',amount:-difference,date:new Date().toISOString()},tx);}const priorOwner=f.venueId?.startsWith('club-')?f.venueId.slice(5):null;const nextOwner=chosen.id.startsWith('club-')?chosen.id.slice(5):null;if(priorOwner&&priorOwner!==club.id&&f.bookingPaid){await tx.update(clubs).set({gold:sql`${clubs.gold}-${f.bookingPaid}`}).where(eq(clubs.id,priorOwner));await put('ledger','rent-refund-'+f.id+'-'+Date.now(),{clubId:priorOwner,category:'Återbetald arenahyra',amount:-f.bookingPaid,date:new Date().toISOString()},tx);}if(nextOwner&&nextOwner!==club.id&&fee){await tx.update(clubs).set({gold:sql`${clubs.gold}+${fee}`}).where(eq(clubs.id,nextOwner));await put('ledger','rent-income-'+f.id+'-'+Date.now(),{clubId:nextOwner,category:'Uthyrning av arena',amount:fee,date:new Date().toISOString()},tx);}f.bookingPaid=fee;f.venueId=chosen.id;await put('fixture',f.id,f,tx);}

  if(req.body.lineup){const squad=await tx.select().from(players).where(eq(players.clubId,club.id)),lineup=req.body.lineup,venue=fixtureVenue(f,teams);if(club.id!==f.homeId){const homePlan=(await record('match-lineup-'+f.id+'-'+f.homeId,tx))?.lineup||teams.find(c=>c.id===f.homeId)?.lineup;lineup.intrade=homePlan.intrade;lineup.underlag=venue.underlag==='Nimonimbus'?homePlan.underlag:venue.underlag;}else if(venue.underlag!=='Nimonimbus')lineup.underlag=venue.underlag;const invalid=validateLineup(lineup,squad);if(invalid)throw Error(invalid);await put('match-lineup','match-lineup-'+f.id+'-'+club.id,{lineup,clubId:club.id,fixtureId:f.id},tx);}

  return {success:true};

 }));

}

