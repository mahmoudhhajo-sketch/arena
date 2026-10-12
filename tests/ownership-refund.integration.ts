// @ts-nocheck
import assert from 'node:assert/strict';
import {db,initializeDatabase,closeDatabase} from '../src/db';
import {releaseMarketPlayers} from '../src/server/progression';
import {replenishArtifacts} from '../src/server/artifactSupply';
import {clubs,matches,players} from '../src/db/schema';
import {put,records,record} from '../src/server/records';
import {initializeRevision38} from '../src/server/revision38';
import {statistics} from '../src/server/newsStatistics';
import {clubMorale} from '../src/server/revision13';

async function main(){
 assert.equal(process.env.LOCAL_DB_DIR,':memory:');assert.ok(!process.env.DATABASE_URL&&!process.env.SQL_HOST);
 await initializeDatabase();
 try{
  for(const [id,userId,isBot] of [['new','u',false],['old','old-u',false],['bot',null,true]])await db.insert(clubs).values({id,userId,isBot,name:id,shortName:id,race:'human',hometown:'Berunia',division:'Kejsarserien',ownerName:id,gold:1000,trainingPoints:{},lineup:{}});
  await put('mail-outbox','welcome-u',{createdAt:'2026-10-10T12:00:00Z'});
  await put('mail-outbox','welcome-old-u',{createdAt:'2026-09-10T12:00:00Z'});
  for(const clubId of ['new','old','bot'])await put('ledger','week-'+clubId,{clubId,category:'Spelarlöner',amount:-12345,date:'2026-10-12T04:00:00.000Z'});
  await put('ledger','purchase',{clubId:'new',category:'Spelarköp',amount:-90000,date:'2026-10-12T04:00:00.000Z'});
  await initializeRevision38();await initializeRevision38();
  const teams=await db.select().from(clubs);
  assert.equal(teams.find(t=>t.id==='new').gold,13345);assert.equal(teams.find(t=>t.id==='old').gold,1000);assert.equal(teams.find(t=>t.id==='bot').gold,1000);
  assert.equal((await records('ledger')).filter(l=>l.sourceLedgerId).length,1);
  assert.equal((await record('week-new')).amount,-12345);
  for(const [id,date,home] of [['pre','2026-10-09T19:00:00Z','new'],['post','2026-10-11T19:00:00Z','new'],['bot-game','2026-10-11T19:00:00Z','bot']])await db.insert(matches).values({id,homeClubId:home,awayClubId:'old',homeScore:1,awayScore:0,division:'Kejsarserien',playedAt:new Date(date),matchReport:{homeClub:{id:home,name:home},awayClub:{id:'old',name:'old'},engineVersion:10,individualStats:[],startingLineups:{home:[],away:[]},events:[],homeStats:{skott:{antal:10,lyckade:2}},awayStats:{skott:{antal:5,lyckade:1}}}});
  const human=await statistics(undefined,'total',undefined,undefined,false);
  assert.equal(human.teams.find(t=>t.id==='new').matches,1);assert.equal(human.teams.some(t=>t.id==='bot'),false);
  assert.equal(human.teams.find(t=>t.id==='old').matches,3);
  const all=await statistics();assert.equal(all.teams.find(t=>t.id==='new').matches,1);assert.equal(all.teams.find(t=>t.id==='bot').matches,1);
  const now=Date.now();await put('morale-change','test-morale',{clubId:'new',date:new Date(now).toISOString(),penalty:20});
  assert.equal(await clubMorale('new',db,now),80);
  await put('artifact-item','oath',{artifactId:'warlords-oath',clubId:'new',listed:false,playerId:null});assert.equal(await clubMorale('new',db,now),100);
  await put('artifact-item','oath',{artifactId:'warlords-oath',clubId:'new',listed:true,playerId:null});assert.equal(await clubMorale('new',db,now),80);
  await releaseMarketPlayers(new Date('2026-10-12T10:00:00Z'));
  const marketPlayers=(await db.select().from(players)).filter(p=>!p.clubId);
  assert.equal(marketPlayers.length,37);assert.ok(marketPlayers.filter(p=>p.wage>2000).length>=4);
  assert.ok(marketPlayers.filter(p=>p.wage>=1698&&p.wage<=1802).length>=15);
  const counts=['human','elf','dwarf','orc'].map(r=>marketPlayers.filter(p=>p.race===r).length);assert.ok(Math.max(...counts)-Math.min(...counts)<=1);
  await put('system','artifact-supply-v2-2026-10-12',{count:16});
  await replenishArtifacts(new Date('2026-10-12T10:00:00Z'));await replenishArtifacts(new Date('2026-10-12T10:00:00Z'));
  assert.equal((await records('artifact-auction')).length,5);assert.equal((await record('artifact-supply-v2-2026-10-12')).count,21);
  console.log('PASS player supply 37, balanced races, 1700–1800 focus with 2000+ specialists; artifact top-up once.');
  console.log('PASS manager-era statistics, bot filters, idempotent scoped refunds, original ledger preservation and team oath morale.');
 }finally{await closeDatabase()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
