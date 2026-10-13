// @ts-nocheck
import assert from 'node:assert/strict';
import {db,initializeDatabase,closeDatabase} from '../src/db';
import {clubs,players,worldState} from '../src/db/schema';
import {put,record,records} from '../src/server/records';
import {registerArtifactMarket} from '../src/server/artifactMarket';
import {replenishArtifacts} from '../src/server/artifactSupply';
import {eq} from 'drizzle-orm';
async function main(){
 assert.equal(process.env.LOCAL_DB_DIR,':memory:');assert.ok(!process.env.DATABASE_URL&&!process.env.SQL_HOST);
 await initializeDatabase();
 try{
  await db.insert(worldState).values({season:1,round:0});
  await db.insert(clubs).values({id:'a',name:'A',shortName:'A',race:'human',hometown:'Berunia',division:'Kejsarserien',ownerName:'A',trainingPoints:{},lineup:{}});
  const [p]=await db.insert(players).values({clubId:'a',name:'Test',race:'human',shirtNumber:1,hometown:'Berunia',nominalPosition:'back',wage:1000,currentInjury:7,totalInjury:2.25,attributes:{}}).returning();
  const routes=new Map();registerArtifactMarket({get:(path,fn)=>routes.set(path,fn),post:(path,fn)=>routes.set(path,fn)});
  const use=async(id)=>{let status=200,body;await routes.get('/api/artifact-equip/:id')({params:{id},body:{clubId:'a',playerId:p.id}},{json:r=>body=r,status:n=>({json:r=>{status=n;body=r}})});return {status,body}};
  await put('artifact-item','brew',{artifactId:'herbal-brew',clubId:'a',playerId:null,listed:false});
  assert.equal((await use('brew')).status,200);
  let healed=(await db.select().from(players))[0];assert.equal(healed.currentInjury,0);assert.equal(healed.totalInjury,2.25);
  assert.equal((await record('brew')).injuryBefore,7);assert.equal((await record('brew')).consumedBy,p.id);
  assert.equal((await use('brew')).status,400);
  await put('artifact-item','unused',{artifactId:'herbal-brew',clubId:'a',playerId:null,listed:false});
  assert.equal((await use('unused')).status,400);assert.equal((await record('unused')).clubId,'a');
  const count=async()=> (await records('artifact-auction')).filter(a=>a.artifactId==='cantaniring'&&!a.sellerId).length;
  await replenishArtifacts(new Date('2026-10-12T10:00:00Z'));await replenishArtifacts(new Date('2026-10-12T10:00:00Z'));assert.equal(await count(),1);
  for(let round=1;round<=18;round++){
   await db.update(worldState).set({round});
   for(const a of await records('artifact-auction'))await put('artifact-auction',a.id,{...a,closed:true});
   await replenishArtifacts(new Date(Date.UTC(2026,9,12+round*7,10)));
  }
  assert.equal(await count(),3);
  await db.update(worldState).set({season:2,round:0});await replenishArtifacts(new Date('2027-04-01T10:00:00Z'));assert.equal(await count(),4);
  console.log('PASS full healing, permanent wear retained, consumable idempotency, healthy player rejection, three imperial rings per season and season rollover');
 }finally{await closeDatabase()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
