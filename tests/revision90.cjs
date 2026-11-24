const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
process.env.LOCAL_DB_DIR=':memory:';process.env.DATABASE_URL='';process.env.SQL_HOST='';process.env.RAILWAY_ENVIRONMENT='';
require.extensions['.ts']=(m,p)=>m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,p);
const {scoutTalent,scoutPotentialCost}=require('../src/engine/scoutTalent.ts');
const {imperialDisciplineName,imperialDisciplineKey}=require('../src/constants/imperialDisciplines.ts');
const {simulateImperialGames,imperialResult}=require('../src/engine/imperialGames.ts');
const {legendName}=require('../src/constants/legendNames.ts');
const {appearedInReport,publicMercenaryAppearance}=require('../src/server/mercenaryVisibility.ts');
const {db,initializeDatabase,closeDatabase}=require('../src/db/index.ts'),{clubs,worldState}=require('../src/db/schema.ts'),{put,record,records}=require('../src/server/records.ts'),{awardSeason}=require('../src/server/progression.ts');
let seed=90;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const a={snabbhet:3,kondition:3,markering:3,passning:3,teknik:3,speluppfattning:3,skott:3,malvakt:3,tuffhet:3,aggressivitet:3};
const sample=(deep)=>{let strong=0,excellent=0;for(let i=0;i<10000;i++){const next=scoutTalent(a,12,deep,rng),max=Math.max(...Object.values(next));if(max>=5.5)strong++;if(max>=7.3)excellent++;assert.equal(next.aggressivitet,3);assert.deepEqual(a,Object.fromEntries(Object.keys(a).map(k=>[k,3])));}return {strong:strong/100,excellent:excellent/100}};
const ordinary=sample(false),deep=sample(true);assert.ok(ordinary.strong>20&&ordinary.strong<27);assert.ok(deep.strong>ordinary.strong+8);assert.ok(ordinary.excellent>2&&ordinary.excellent<6);assert.equal(scoutPotentialCost(false),.5);assert.equal(scoutPotentialCost(true),1);
const p={id:1,name:'A',clubId:'c',race:'elf',attributes:a,artifacts:[],form:9};
assert.deepEqual(simulateImperialGames([p],1).competitions.map(c=>c.name),['Hinderbana','Passet','Skytte','Vakten','Brytet','Tvekamp']);
for(const old of ['Snabbhet','Passning','Målvakt','Markering']){const name=imperialDisciplineName(old);assert.equal(imperialDisciplineKey(name),old);assert.equal(imperialResult(p,name),imperialResult(p,old));assert.equal(legendName(name,43),legendName(old,43));}
const start=+new Date('2026-11-25T18:00Z'),report={date:new Date(start).toISOString(),homeClub:{id:'c'},awayClub:{id:'d'},startingLineups:{home:[{id:1}],away:[]},events:[{type:'SUBSTITUTION',playerId:2,teamSide:'home',minute:30}]};
assert.equal(appearedInReport(report,1,'c',start-1000,start-1),false);assert.equal(appearedInReport(report,1,'c',start-1000,start),true);assert.equal(appearedInReport(report,2,'c',start-1000,start+29*60000),false);assert.equal(appearedInReport(report,2,'c',start-1000,start+30*60000),true);assert.equal(appearedInReport(report,1,'c',start+1,start+60000),false);
(async()=>{await initializeDatabase();await db.insert(worldState).values({season:1});await db.insert(clubs).values({id:'c',userId:'u',name:'C',shortName:'C',race:'human',hometown:'Berunia',division:'Kejsarserien',gold:1000,ownerName:'U',lineup:{},trainingPoints:{}});
 await put('mercenary-contract','contract-1',{clubId:'c',hiredAt:new Date(start-1000).toISOString()});await put('live-match','live-test',{report});assert.equal(await publicMercenaryAppearance({id:1,clubId:'c'},new Date(start-1)),false);assert.equal(await publicMercenaryAppearance({id:1,clubId:'c'},new Date(start)),true);
 await put('fixture','f',{season:1,round:18,played:false,date:report.date});await awardSeason(new Date(start));assert.equal(await record('champion-mana-cluster-1'),null);
 await put('fixture','f',{season:1,round:18,played:true,date:report.date});await awardSeason(new Date(start));const first=(await db.select().from(clubs))[0].gold;assert.ok(first>1000);assert.equal((await record('champion-mana-cluster-1')).clubId,'c');await awardSeason(new Date(start));assert.equal((await db.select().from(clubs))[0].gold,first);
 // Old season prize already paid: add missing cluster, but never pay twice.
 const {gameRecords}=require('../src/db/schema.ts'),{eq}=require('drizzle-orm');await db.delete(gameRecords).where(eq(gameRecords.id,'champion-mana-cluster-1'));await awardSeason(new Date(start));assert.equal((await record('champion-mana-cluster-1')).clubId,'c');assert.equal((await db.select().from(clubs))[0].gold,first);
 await put('artifact-item','champion-mana-cluster-1',{artifactId:'mana-cluster',clubId:null,consumedByClubId:'c'});await awardSeason(new Date(start));assert.equal((await record('champion-mana-cluster-1')).clubId,null);
 await closeDatabase();console.log(JSON.stringify({ordinary,deep,checks:'scouting, names/results, mercenary visibility, prizes and idempotency passed'}));})().catch(e=>{console.error(e);process.exitCode=1});
