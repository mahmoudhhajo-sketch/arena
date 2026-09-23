process.env.LOCAL_DB_DIR=':memory:';delete process.env.DATABASE_URL;delete process.env.SQL_HOST;delete process.env.RAILWAY_ENVIRONMENT;
const ts=require('typescript'),fs=require('fs');require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const assert=require('node:assert/strict');
(async()=>{const {db,initializeDatabase,closeDatabase}=require('../src/db'),{players}=require('../src/db/schema'),{records,put}=require('../src/server/records'),{releaseMarketPlayers}=require('../src/server/progression'),{divisionHeadlineFixtures}=require('../src/engine/seriesPresentation');await initializeDatabase();try{
 const fixtures=[];for(let round=1;round<=6;round++)for(let game=0;game<2;game++)fixtures.push({id:`${round}-${game}`,round,date:new Date(Date.UTC(2026,0,round)).toISOString(),played:round<=2});
 assert.deepEqual([...new Set(divisionHeadlineFixtures(fixtures).map(x=>x.round))],[3,4,5]);
 fixtures.filter(f=>f.round===3).forEach(f=>f.played=true);assert.deepEqual([...new Set(divisionHeadlineFixtures(fixtures).map(x=>x.round))],[2,3,4]);
 const now=new Date('2026-09-23T12:00:00Z');await releaseMarketPlayers(now);let active=(await records('auction')).filter(a=>!a.closed);assert.equal(active.length,45);let marketPlayers=await db.select().from(players);assert.ok(marketPlayers.filter(p=>p.wage>=1500&&p.wage<=2000).length>=18);
 await releaseMarketPlayers(now);assert.equal((await records('auction')).filter(a=>!a.closed).length,45);
 for(const a of active.slice(0,5))await put('auction',a.id,{...a,closed:true});await releaseMarketPlayers(now);active=(await records('auction')).filter(a=>!a.closed);assert.equal(active.length,45);
 console.log('PASS division headline chronology and continuously replenished 45-player market with 40% middle wages');
 }finally{await closeDatabase()}})().catch(e=>{console.error(e);process.exitCode=1});
