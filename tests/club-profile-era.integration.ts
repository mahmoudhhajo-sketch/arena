// @ts-nocheck
import assert from 'node:assert/strict';
import {db,initializeDatabase,closeDatabase} from '../src/db';
import {clubs,matches,worldState} from '../src/db/schema';
import {put} from '../src/server/records';
import {registerFeatures} from '../src/server/features';
async function main(){
 assert.equal(process.env.LOCAL_DB_DIR,':memory:');assert.ok(!process.env.DATABASE_URL&&!process.env.SQL_HOST);await initializeDatabase();
 try{
  await db.insert(worldState).values({season:1});
  for(const id of ['new','bot'])await db.insert(clubs).values({id,userId:id==='new'?'u':null,isBot:id==='bot',name:id,shortName:id,race:'human',hometown:'Berunia',division:'Kejsarserien',ownerName:id,trainingPoints:{},lineup:{},recordString:'4/0/0',wins:4});
  await put('club-ownership','club-ownership-new',{clubId:'new',userId:'u',startedAt:'2026-10-12T12:00:00Z'});
  for(const [id,date] of [['before','2026-10-11T12:00:00Z'],['after','2026-10-13T12:00:00Z']])await db.insert(matches).values({id,homeClubId:'new',awayClubId:'bot',homeScore:3,awayScore:1,division:'Kejsarserien',playedAt:new Date(date),matchReport:{attendance:100,individualStats:[],homeStats:{},awayStats:{}}});
  const routes=new Map();registerFeatures({get:(p,f)=>routes.set(p,f),post:(p,f)=>routes.set(p,f)});
  const query=async(id,summary)=>{let out;await routes.get('/api/club-statistics/:id')({params:{id},query:{summary}}, {json:r=>out=r,status:()=>({json:r=>{throw Error(JSON.stringify(r))}})});return out};
  assert.equal((await query('new','true')).recordString,'1/0/0');assert.equal((await query('new','')).matches,1);assert.equal((await query('bot','true')).recordString,'0/0/2');
  const saved=(await db.select().from(clubs)).find(c=>c.id==='new');assert.equal(saved.wins,4);assert.equal(saved.recordString,'4/0/0');
  console.log('PASS profile and detailed stats exclude predecessor matches; inherited standings remain unchanged');
 }finally{await closeDatabase()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
