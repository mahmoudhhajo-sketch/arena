// @ts-nocheck
import assert from 'node:assert/strict';
import express from 'express';
import {scryptSync} from 'node:crypto';
import {db,initializeDatabase,closeDatabase} from '../src/db';
import {put} from '../src/server/records';
import {registerAuth} from '../src/server/auth';

async function main(){
 assert.equal(process.env.LOCAL_DB_DIR,':memory:');assert.ok(!process.env.DATABASE_URL&&!process.env.SQL_HOST);
 await initializeDatabase();
 const password='test-password-12345',salt='test-only-salt';
 await put('account','account-test',{name:'test-login',managerName:'Testmanager',email:'test@example.invalid',userId:'u',salt,hash:scryptSync(password,salt,64).toString('hex')});
 // Cross-namespace collisions must not select the wrong account.
 await put('account','account-collision',{name:'Testmanager',managerName:'Someone else',email:'other@example.invalid',userId:'other',salt,hash:scryptSync('different-password',salt,64).toString('hex')});
 const app=express();app.use(express.json());registerAuth(app);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
 const url='http://127.0.0.1:'+server.address().port+'/api/auth/login';
 try{
  for(const name of ['test-login','Testmanager','TEST@example.invalid']){
   const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,password})});
   assert.equal(response.status,200);assert.equal((await response.json()).userId,'u');assert.match(response.headers.get('set-cookie'),/HttpOnly/);
  }
  const bad=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Testmanager',password:'incorrect-password'})});
  assert.equal(bad.status,400);assert.equal(bad.headers.get('set-cookie'),null);
  console.log('PASS login by username, manager name or email, namespace collisions and incorrect password rejection.');
 }finally{server.close();await closeDatabase()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
