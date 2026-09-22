import {registerSharedChat} from '../src/server/sharedChat';
import {deliverWelcomeMail} from '../src/server/welcomeMail';
import assert from 'node:assert/strict';import express from 'express';
import {initializeDatabase,closeDatabase,db} from '../src/db';
import {registerAuth} from '../src/server/auth';import {clubs,worldState} from '../src/db/schema';
import {initializeSeason1World,createHumanClub} from '../src/server/worldService';import {initializeExpansion,tickWorld} from '../src/server/expansion';import {records,record,put} from '../src/server/records';import {launchFixtures,prepareLaunch,launchStatus} from '../src/server/launch';import {eq} from 'drizzle-orm';
await initializeDatabase();await initializeSeason1World();await initializeExpansion();
process.env.ARENA_REQUIRE_LAUNCH='true';
const pause=new Date('2026-09-21T10:00:00Z');await prepareLaunch(pause);
await put('system','calendar-clock',{last:pause.toISOString()});
const worldBefore=await db.select().from(worldState),fixturesBefore=await records('fixture');await tickWorld(new Date('2026-09-22T12:00:00Z'));assert.ok((await db.select().from(worldState))[0].day>worldBefore[0].day);assert.deepEqual(await records('fixture'),fixturesBefore);assert.equal((await launchStatus()).paused,true);
for(const [input,expected] of [['2026-09-21','2026-09-22'],['2026-09-22','2026-09-25'],['2026-09-23','2026-09-25'],['2026-09-24','2026-09-25'],['2026-09-25','2026-09-29'],['2026-09-26','2026-09-29'],['2026-09-27','2026-09-29']])assert.ok(launchFixtures(new Date(input+'T08:00:00Z'))[0].startsWith(expected));
assert.equal(launchFixtures(new Date('2026-10-23T08:00:00Z'))[0],'2026-10-27T18:00:00.000Z');
const ksBots=(await db.select().from(clubs)).filter(c=>c.isBot&&c.division==='Kejsarserien').length;
for(let i=0;i<ksBots+1;i++){const c=await createHumanClub({userId:'check-'+i,managerName:'Check '+i,clubName:'Check Club '+i,shortName:'CHK',race:'elf'});assert.equal(c.club.division,i<ksBots?'Kejsarserien':'Division 1 Östra');}
assert.equal((await records('fixture')).length,fixturesBefore.length);
const app=express();app.use(express.json());registerAuth(app);registerSharedChat(app);app.post('/api/test-mutation',(_req,res)=>res.json({ok:true}));const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));const base='http://127.0.0.1:'+(server.address() as any).port;
try{
 const signup=(email:string,name:string)=>fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({register:true,name,email,password:'IsolatedTestPassword123'})});
 assert.equal((await signup('invalid','Invalid')).status,400);
 const r=await signup('manager@example.invalid','LaunchTester');assert.equal(r.status,200);const cookie=r.headers.get('set-cookie')!.split(';')[0];
 assert.equal((await records('mail-outbox')).length,2);assert.equal((await records('mail-outbox'))[0].sentAt,null);
 assert.equal((await signup('MANAGER@example.invalid','Duplicate')).status,400);
 assert.equal((await fetch(base+'/api/test-mutation',{method:'POST',headers:{cookie}})).status,200);
 const auth=await (await fetch(base+'/api/auth/status')).json();assert.equal(auth.launch.paused,true);
 const chat=await fetch(base+'/api/shoutbox',{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({content:'Ett beständigt testmeddelande'})});assert.equal(chat.status,200);
 assert.ok((await (await fetch(base+'/api/shoutbox',{headers:{cookie}})).json()).some((m:any)=>m.content==='Ett beständigt testmeddelande'));
 const realFetch=globalThis.fetch;let deliveries=0;
 process.env.GMAIL_CLIENT_ID='test';process.env.GMAIL_CLIENT_SECRET='test';process.env.GMAIL_REFRESH_TOKEN='test';
 try{globalThis.fetch=(async(url:any,options:any)=>{if(String(url).includes('/token'))return new Response(JSON.stringify({access_token:'mock'}));assert.equal(String(url),'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');assert.ok(JSON.parse(options.body).raw);deliveries++;return new Response(JSON.stringify({id:'mock-delivery'}));}) as any;await deliverWelcomeMail();await deliverWelcomeMail();assert.equal(deliveries,2);}finally{globalThis.fetch=realFetch;delete process.env.GMAIL_CLIENT_ID;delete process.env.GMAIL_CLIENT_SECRET;delete process.env.GMAIL_REFRESH_TOKEN;}
 process.env.ARENA_LAUNCH_AT='2026-09-24T10:00:00Z';await prepareLaunch(new Date('2026-09-24T10:00:00Z'));assert.equal((await launchStatus()).paused,false);
 const dates=(await records('fixture')).filter(f=>f.round===1).map(f=>f.date);assert.ok(dates.every(d=>d==='2026-09-25T17:00:00.000Z'));
 const once=await records('fixture');await prepareLaunch(new Date('2026-09-26T10:00:00Z'));assert.deepEqual(await records('fixture'),once);
 assert.notEqual((await record('calendar-clock')).last,'2026-09-24T10:00:00.000Z');
 console.log('PASS: only matches paused, other game functions active; all 7 launch weekdays and DST; Kejsarserien -> Division 1 Östra; email validation/uniqueness/queue; launch reschedules once without advancing world.');
}finally{await new Promise<void>(r=>server.close(()=>r()));await closeDatabase();}
