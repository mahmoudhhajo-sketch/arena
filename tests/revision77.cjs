const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');require.extensions['.ts']=(m,p)=>m._compile(ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,p);
const {DIVISION_NAMES,childDivisions}=require('../src/constants/leagues.ts');
const {promotedDivisions,imperialSeasonComplete}=require('../src/engine/leagueMovement.ts');
const {clearFinishedFixtureSpells}=require('../src/constants/spells.ts');
const teams=DIVISION_NAMES.flatMap((division,d)=>Array.from({length:10},(_,i)=>({id:d+'-'+i,division,isBot:true,wins:10-i,draws:0,goalsFor:0,goalsAgainst:0})));
const human=(d,i)=>teams.find(t=>t.id===d+'-'+i).isBot=false;
for(const d of [1,2,3,4,5])human(d,2);
let r=promotedDivisions(teams,()=>0);
for(const d of DIVISION_NAMES)assert.equal([...r.destinations.values()].filter(v=>v===d).length,10);
assert.equal(r.destinations.get('1-2'),'Kejsarserien'); // best human, not bot champion
assert.equal(r.destinations.get('1-0'),'Division 1 Östra');
assert.equal(r.destinations.get('1-7'),'Division 1 Östra'); // only two relegations
assert.ok(childDivisions('Division 1 Östra').includes(r.destinations.get('1-8')));
assert.ok(childDivisions('Division 1 Östra').includes(r.destinations.get('1-9')));
assert.equal(r.destinations.get('3-9'),'Division 1 Västra');
assert.notEqual(r.destinations.get('0-7'),promotedDivisions(teams,()=>.999).destinations.get('0-7'));
assert.equal(imperialSeasonComplete({competitions:[{name:'Tvekamp'}]}),false);
const games={competitions:['Snabbhet','Passning','Skytte','Målvakt','Markering','Tvekamp'].map(name=>({name}))};assert.ok(imperialSeasonComplete(games));assert.equal(imperialSeasonComplete({...games,test:true}),false);
assert.deepEqual(clearFinishedFixtureSpells(['magic:rune:1:old','magic:aura:4:old','magic:rune:1:new','keeper-gloves'],new Set(['old'])),['magic:aura:4:series','magic:rune:1:new','keeper-gloves']);
// Promotion and relegation must never select the same manager team even if it finished last.
for(const t of teams)t.isBot=true;human(1,9);human(4,9);r=promotedDivisions(teams,()=>0);
for(const d of DIVISION_NAMES)assert.equal([...r.destinations.values()].filter(v=>v===d).length,10);
assert.equal(r.destinations.get('1-9'),'Kejsarserien');
console.log('Division exchanges, lottery, season gate and expired magic passed');
