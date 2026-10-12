// @ts-nocheck
import assert from 'node:assert/strict';
import express from 'express';
import {db,initializeDatabase,closeDatabase} from '../src/db';
import {clubs} from '../src/db/schema';
import {put,records} from '../src/server/records';
import {registerContactPreferences} from '../src/server/contactPreferences';

async function main(){
 assert.equal(process.env.LOCAL_DB_DIR,':memory:');assert.ok(!process.env.DATABASE_URL&&!process.env.SQL_HOST);
 await initializeDatabase();
 await db.insert(clubs).values({id:'test-contact',userId:'test-manager',name:'Testlaget',shortName:'Test',race:'human',hometown:'Berunia',division:'Division 1 Västra',ownerName:'Test',trainingPoints:{},lineup:{}});
 await put('account','test-account',{userId:'test-manager',name:'Test',email:'test@example.invalid'});
 const app=express();app.use(express.json());app.use((req:any,_res,next)=>{req.arenaUser={userId:'test-manager'};next()});registerContactPreferences(app);
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.on('listening',r));
 const url='http://127.0.0.1:'+server.address().port+'/api/contact-preference';
 const post=body=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  assert.equal((await (await fetch(url)).json()).required,true);
  assert.equal((await post({})).status,400);
  assert.equal((await post({declined:true})).status,200);
  assert.equal((await (await fetch(url)).json()).required,false);
  assert.equal((await records('mail-outbox')).length,0);
  await put('account','test-account',{userId:'test-manager',name:'Test',email:'test@example.invalid'});
  assert.equal((await post({phone:'+46701234567'})).status,200);
  assert.equal((await post({phone:'+46701234567'})).status,200);
  const mails=await records('mail-outbox');assert.equal(mails.length,1);assert.ok(mails[0].text.includes('+46701234567'));
  assert.equal((await records('account'))[0].phone,'+46701234567');
  assert.equal((await (await fetch(url)).json()).required,false);
  console.log('PASS: decline persists without email; accepted phone persists with exactly one queued email; invalid choice rejected.');
 }finally{await new Promise<void>(r=>server.close(()=>r()));await closeDatabase()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
