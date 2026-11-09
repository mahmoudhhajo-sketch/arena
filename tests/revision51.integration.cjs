const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
process.env.LOCAL_DB_DIR=':memory:';process.env.DATABASE_URL='';process.env.SQL_HOST='';process.env.RAILWAY_ENVIRONMENT='';
require.extensions['.ts']=(m,p)=>m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,p);
const {db,initializeDatabase,closeDatabase}=require('../src/db/index.ts'),{clubs,players,matches,worldState}=require('../src/db/schema.ts'),{put,record,records}=require('../src/server/records.ts'),{registerFriendlies}=require('../src/server/friendlies.ts'),{registerMatchPlanning}=require('../src/server/matchPlanning.ts'),{registerExpansion,playFixture}=require('../src/server/expansion.ts'),{friendlyKickoff}=require('../src/constants/friendlies.ts'),{SLOT_KEYS}=require('../src/engine/lineup.ts'),{eq}=require('drizzle-orm');
let server;
(async()=>{
 assert.equal(friendlyKickoff('2030-07-01',new Date('2030-01-01')),'2030-07-01T17:00:00.000Z');
 assert.equal(friendlyKickoff('2030-01-07',new Date('2030-01-01')),'2030-01-07T18:00:00.000Z');
 for(const d of ['2030-01-08','2030-01-11','2030-02-30','bad','2020-01-01'])assert.throws(()=>friendlyKickoff(d));
 const {artifactsForFixture,consumeFixtureSpells}=require('../src/constants/spells.ts');const sf={id:'series-test'},ff={id:'friendly-test',friendly:true};const effects=['boots','magic:aura:4','magic:leafwind:1:series-test','magic:stone:1:friendly-test'];assert.deepEqual(artifactsForFixture(effects,ff),['boots','magic:stone:1:friendly-test']);assert.deepEqual(consumeFixtureSpells(effects,ff),effects.slice(0,3));assert.deepEqual(consumeFixtureSpells(effects,sf),['boots','magic:aura:3:series','magic:stone:1:friendly-test']);
 const {chatVisibleStart}=require('../src/server/sharedChat.ts');
 assert.equal(chatVisibleStart(new Date('2026-10-19T03:00:00Z')).toISOString(),'2026-10-12T02:00:00.000Z');
 assert.equal(chatVisibleStart(new Date('2026-10-26T02:59:59Z')).toISOString(),'2026-10-12T02:00:00.000Z');
 assert.equal(chatVisibleStart(new Date('2026-10-26T03:00:00Z')).toISOString(),'2026-10-26T03:00:00.000Z');
 await initializeDatabase();await db.insert(worldState).values({id:1,season:1});
 const attrs={snabbhet:6,kondition:6,markering:6,passning:6,teknik:6,speluppfattning:6,skott:6,malvakt:6,tuffhet:6,aggressivitet:16};
 for(let n=0;n<3;n++){
  const lineup={slots:Object.fromEntries(SLOT_KEYS.map((k,i)=>[k,{slotKey:k,activePlayerIds:[n*20+i+1],reservePlayerIds:[n*20+11]}])),underlag:'Gräs',intrade:5,tactics:{uppspel:'Normal',spelvag:'Normal',skytte:'Normal'}};
  await db.insert(clubs).values({id:'team'+n,userId:'user'+n,name:'Lag '+n,shortName:'L'+n,ownerName:'Test '+n,race:'human',hometown:'Berunia',division:'Kejsarserien',trainingPoints:{},lineup,gold:100000});
  for(let i=1;i<=11;i++)await db.insert(players).values({id:n*20+i,clubId:'team'+n,name:'Spelare '+n+'-'+i,race:'human',shirtNumber:i,hometown:'Berunia',nominalPosition:'Innermitt',wage:1000,attributes:attrs,currentInjury:3,totalInjury:2,artifacts:i===1?['magic:aura:4']:[],isMercenary:i===2});
  await put('mercenary-contract','contract'+n,{clubId:'team'+n,playerId:n*20+2,hiredAt:'2026-01-01',completed:false});
 }
 const app=require('express')();app.use(require('express').json());app.use((req,res,next)=>{req.arenaUser={userId:req.headers['x-user']||'user0'};next()});registerFriendlies(app);registerMatchPlanning(app);registerExpansion(app);require('../src/server/magic.ts').registerMagic(app);require('../src/server/artifactMarket.ts').registerArtifactMarket(app);require('../src/server/features.ts').registerFeatures(app);
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;

 require('../src/server/community.ts').registerCommunity(app);
 await put('retired','retired-99999',{name:'Historiske Hjälten',clubId:'test0'});
 await put('auction','auction-retired',{playerId:99999,closed:true,bidderId:'test0',sellerId:null,price:1234,endsAt:'2030-01-01T00:00:00Z'});
 await put('bid','bid-retired',{playerId:99999,auctionId:'auction-retired',clubId:'test0',amount:1234,date:'2030-01-01T00:00:00Z'});
 const bids=await fetch(base+'/api/bids/test0').then(r=>r.json());assert.equal(bids.bids.find(b=>b.playerId===99999).playerName,'Historiske Hjälten');
 const transfers=await fetch(base+'/api/club-transfers/test0').then(r=>r.json());assert.equal(transfers.find(t=>t.playerId===99999).name,'Historiske Hjälten');
 console.log('Historical names preserved in bids and transfers');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(server)server.close();await closeDatabase()});
