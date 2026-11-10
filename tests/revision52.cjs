const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
process.env.LOCAL_DB_DIR=':memory:';process.env.DATABASE_URL='';process.env.SQL_HOST='';process.env.RAILWAY_ENVIRONMENT='';
require.extensions['.ts']=(m,p)=>m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,p);
const {db,initializeDatabase,closeDatabase}=require('../src/db/index.ts');
const {clubs,players}=require('../src/db/schema.ts'),{put,record}=require('../src/server/records.ts');
const {coachContract,initializeRules52,expireCoaches}=require('../src/server/coachContracts.ts');
const {weeklyPositionTraining,trainingWork,trainingPotential,trainingStepGains}=require('../src/engine/calendar.ts');
const {weatherEffects}=require('../src/engine/weather.ts');
const attrs={snabbhet:6,kondition:6,markering:6,passning:6,teknik:6,speluppfattning:6,skott:6,malvakt:6,tuffhet:6,aggressivitet:6};
const until=Date.parse('2026-11-15T05:00:00Z'),since=until-7*86400000;
function train(slots,allocation){return weeklyPositionTraining(attrs,allocation,slots.map((s,i)=>({date:`2026-11-${10+i}T18:00:00Z`,slots:[s]})),until,since)}
function work(result,key){return trainingWork(result.attributes[key]+result.remainders[key])-trainingWork(6)}
function near(a,b){assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)}
let server;
(async()=>{
 const one=train(['goal'],{malvakt:4,kondition:4}),two=train(['goal','goal'],{malvakt:4});
 near(work(two,'malvakt')/work(one,'malvakt'),1.5);
 near(work(train(['goal','1-1'],{malvakt:4}),'malvakt')/work(one,'malvakt'),.75);
 assert.ok(one.attributes.kondition>6);
 assert.equal(train(['0-1'],{snabbhet:10}).attributes.snabbhet,6);
 assert.ok(work(train(['0-0'],{skott:4}),'skott')>work(train(['1-0'],{skott:4}),'skott'));
 assert.ok(work(train(['1-1'],{skott:4}),'skott')>0);
 assert.ok(work(train(['2-0'],{tuffhet:4}),'tuffhet')>work(train(['0-0'],{tuffhet:4}),'tuffhet'));
 assert.ok(work(train(['0-0'],{snabbhet:2}),'snabbhet')<2*work(train(['0-0'],{snabbhet:1}),'snabbhet'));
 assert.equal(trainingPotential(99,100),1);for(let id=101;id<300;id++){const p=trainingPotential(id,100);assert.ok(p>=.9&&p<=1.1);assert.equal(p,trainingPotential(id,100));}
 assert.deepEqual(trainingStepGains({...attrs,skott:11.187},{...attrs,skott:11.515}),['skott']);
 assert.deepEqual(trainingStepGains({...attrs,skott:16},{...attrs,skott:17}),[]);
 const dry=weatherEffects({condition:'Klart',temp:15,wind:0},'Gräs');
 const rainy=weatherEffects({condition:'Kraftigt regn',temp:15,wind:10},'Jord');
 assert.equal(rainy.longShotsAllowed,false);assert.ok(rainy.runFactor<dry.runFactor);assert.ok(rainy.passFactor<dry.passFactor);assert.ok(rainy.fatigueFactor>dry.fatigueFactor);
 assert.equal(weatherEffects({condition:'Klart',temp:25,wind:0},'Jord').longShotsAllowed,false);
 for(const start of ['2026-06-01T04:00:00Z','2026-07-15T19:00:00Z','2026-10-25T05:00:00Z']){const c=coachContract(start),end=new Date(c.expiresAt);assert.ok(+end-Date.parse(start)>=140*86400000);assert.ok(+end-Date.parse(start)<147*86400000);assert.equal(end.getUTCDay(),1);assert.equal(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',hour:'2-digit',hour12:false}).format(end),'06');}
 const {simulateMatch,SeededRNG}=require('../src/engine/matchEngine.ts');
 const {tuneSpecializedMarketWage}=require('../src/server/progression.ts'),{calculateWage}=require('../src/engine/playerGenerator.ts');
 let incomplete=0;const wages=[];
 for(let seed=1;seed<=80;seed++){const rng=new SeededRNG(seed*7919),a=tuneSpecializedMarketWage(attrs,1850,'attacker',()=>rng.next(),'orc',1);wages.push(calculateWage(a,1));if(a.skott>6&&(a.teknik<4.5||a.speluppfattning<4.5))incomplete++;assert.ok(Object.entries(a).filter(([k])=>k!=='aggressivitet').every(([,v])=>v<=8));}
 assert.ok(incomplete>=20,'Need visibly incomplete attacking profiles');assert.ok(wages.filter(w=>w>=1800&&w<=1900).length>=72,'Keep salary range');
 const slots=['goal','0-0','0-1','0-2','1-0','1-1','1-2','2-0','2-1','2-2'];
 const squad=base=>slots.map((slot,i)=>({id:base+i,name:'P'+(base+i),race:'human',shirtNumber:i+1,form:9,currentInjury:0,totalInjury:0,isDeceased:false,artifacts:[],attributes:{...attrs,aggressivitet:0,tuffhet:12}}));
 const matchClub=(base,morale)=>({id:String(base),name:'C'+base,race:'human',morale,division:'Kejsarserien',merit:1,lineup:{intrade:5,tactics:{uppspel:'Normal',spelvag:'Normal',skytte:'Normal'},slots:Object.fromEntries(slots.map((slot,i)=>[slot,{activePlayerIds:[base+i],reservePlayerIds:[]}]))}});
 const simulate=(hm,am,weather)=>simulateMatch(matchClub(100,hm),matchClub(200,am),squad(100),squad(200),725,'Gräs',weather);
 const weather={temp:15,wind:0,condition:'Klart'},equal=simulate(100,100,weather),better=simulate(100,99,weather),far=simulate(100,1,weather);
 assert.deepEqual(equal.events.filter(e=>e.period<5),better.events.filter(e=>e.period<5));assert.deepEqual(better.events,far.events);
 assert.ok(better.events.some(e=>e.id.startsWith('morale-final')));
 const rain=simulate(100,100,{temp:15,wind:3,condition:'Kraftigt regn'});assert.ok(!rain.events.some(e=>e.longShot));
 assert.ok(equal.events.some(e=>e.type==='GOAL_BASKET'));assert.ok(equal.events.filter(e=>e.type==='GOAL_BASKET').every(e=>e.shotRow===1&&e.shotCol!==1));
 console.log('Market sample: incomplete attackers',incomplete,'salary range',Math.min(...wages),Math.max(...wages));
 await initializeDatabase();
 await db.insert(clubs).values({id:'contract-test',userId:'manager',name:'Contract Test',shortName:'CT',ownerName:'Tester',race:'elf',hometown:'Alymoon',division:'Kejsarserien',coach:{id:1,name:'Coach',wage:1000},lineup:{slots:{}},trainingPoints:{snabbhet:9}});
 await put('ledger','later',{clubId:'contract-test',category:'Tränare',amount:-1000,date:'2026-07-20T04:00:00Z'});
 await put('ledger','first',{clubId:'contract-test',category:'Tränare',amount:-1000,date:'2026-07-06T04:00:00Z'});
 await put('ledger','other',{clubId:'contract-test',category:'Läkare',amount:-1000,date:'2026-06-01T04:00:00Z'});
 await initializeRules52();let [club]=await db.select().from(clubs);
 assert.equal(club.coach.hiredAt,'2026-07-06T04:00:00.000Z');assert.equal(club.coach.contractDateSource,'first-wage');
 const expiry=club.coach.expiresAt,cutoff=await record('training-potential-start');await initializeRules52();assert.deepEqual(await record('training-potential-start'),cutoff);
 await expireCoaches(new Date(Date.parse(expiry)-1));[club]=await db.select().from(clubs);assert.ok(club.coach);
 await expireCoaches(new Date(expiry));[club]=await db.select().from(clubs);assert.equal(club.coach,null);assert.equal(club.trainingPoints.snabbhet,6);
 await expireCoaches(new Date(expiry));
 await put('scout','scout-contract-test',{clubId:'contract-test',hired:true,locationId:'old',destination:'travel',returnsAt:'2030-01-01'});
 await put('artifact-item','portal-test',{artifactId:'portal',clubId:'contract-test',listed:false});
 const app=require('express')();app.use(require('express').json());require('../src/server/artifactMarket.ts').registerArtifactMarket(app);server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const destination=require('../src/constants/geography.ts').PLACES[0].id,url='http://127.0.0.1:'+server.address().port+'/api/artifact-equip/portal-test';
 const use=body=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await use({clubId:'someone-else',destination})).status,400);assert.equal((await use({clubId:'contract-test',destination:'missing'})).status,400);
 assert.equal((await use({clubId:'contract-test',destination})).status,200);assert.equal((await record('scout-contract-test')).locationId,destination);assert.equal((await record('scout-contract-test')).destination,null);assert.equal((await record('portal-test')).clubId,null);
 assert.equal((await use({clubId:'contract-test',destination})).status,400);
 console.log('PASS training weights/percentages/potential/highlights, weather, retroactive coach contracts and expiry');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(server)server.close();await closeDatabase()});





