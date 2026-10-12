import assert from 'node:assert/strict';
import {belongsToManager,firstWeekRefund} from '../src/engine/clubOwnership';
import {loginCandidates} from '../src/engine/loginIdentity';
import {cantaniringRetaliation,cantaniringCommentary} from '../src/engine/cantaniring';
import {simulateMatch} from '../src/engine/matchEngine';

const era={userId:'u',startedAt:'2026-10-10T12:00:00Z',isBot:false};
assert.equal(belongsToManager(era,'2026-10-09T19:00:00Z'),false);
assert.equal(belongsToManager(era,'2026-10-11T19:00:00Z'),true);
assert.equal(belongsToManager({...era,isBot:true},'2026-10-11'),false);
assert.equal(belongsToManager({userId:'u'},'2026-10-11'),false);
const debit={id:'week-example',clubId:'c',date:'2026-10-12T04:00:00.000Z',category:'Spelarlöner',amount:-12345};
assert.equal(firstWeekRefund(era.startedAt,[debit,{...debit,id:'purchase',category:'Spelarköp'},{...debit,clubId:'other'}],'c').length,1);
assert.equal(firstWeekRefund('2026-10-04',[debit],'c').length,0);
assert.equal(firstWeekRefund('2026-10-13',[debit],'c').length,0);
const account={name:'Login',managerName:'Zagge',email:'someone@example.invalid'};
for(const name of [' login ','ZAGGE','SOMEONE@example.invalid'])assert.deepEqual(loginCandidates([account],name),[account]);
assert.equal(loginCandidates([account],'someone').length,0);
assert.equal(cantaniringRetaliation(['cantaniring']),1);
assert.equal(cantaniringRetaliation([]),0);
assert.equal(new Set(Array.from({length:16},(_,i)=>cantaniringCommentary('Bärare','Vinnare',i))).size,16);

// A synthetic match exercises the real injury/substitution path. It never touches a world database.
const slots=['goal','0-0','0-1','0-2','1-0','1-1','1-2','2-0','2-1','2-2'];
function squad(base:number,ring:boolean){return Array.from({length:20},(_,i)=>({id:base+i,name:'Spelare '+(base+i),clubId:String(base),race:'orc',shirtNumber:i+1,form:10,currentInjury:0,totalInjury:0,isDeceased:false,artifacts:ring?['cantaniring']:[],attributes:{snabbhet:5,kondition:5,markering:5,passning:5,teknik:5,speluppfattning:5,skott:5,malvakt:5,tuffhet:5,aggressivitet:25}}))}
function club(base:number,reserves:boolean){return {id:String(base),name:'Lag '+base,race:'orc',division:'Kejsarserien',merit:1,lineup:{intrade:5,tactics:{uppspel:'Normal',spelvag:'Normal',skytte:'Normal'},slots:Object.fromEntries(slots.map((slot,i)=>[slot,{activePlayerIds:[base+i],reservePlayerIds:reserves?[base+i+10]:[]}]))}}}
let reactions=0,replacements=0,walkovers=0;
for(const reserve of [true,false])for(const seed of [71,81,91]){
 const h=squad(100,true),a=squad(200,true),report=simulateMatch(club(100,reserve) as any,club(200,reserve) as any,h as any,a as any,seed,'Jord',{temp:15,condition:'Klart',wind:1});
 const ringEvents=report.events.filter(e=>e.type==='ARTIFACT');reactions+=ringEvents.length;
 for(const event of ringEvents){
   const fight=report.events.find(e=>e.id.startsWith(event.id.replace('cantaniring-','fight-').replace(/-\d+$/,'')+'-'));
   assert.ok(fight);assert.equal(event.opponentPlayerId,fight.playerId);assert.equal(event.playerId,fight.opponentPlayerId);
   const wounded=event.teamSide==='home'?report.injuries.away:report.injuries.home;
   assert.ok(wounded.some(p=>p.playerId===event.opponentPlayerId&&p.severity===1));
   assert.ok(/ring/i.test(event.text));
 }
 replacements+=report.events.filter(e=>e.type==='SUBSTITUTION'&&e.id.includes('-cantaniring-')).length;
 walkovers+=Number(report.events.some(e=>e.id.startsWith('walkover-during')));
 assert.equal(new Set(report.events.map(e=>e.id)).size,report.events.length);
}
assert.ok(reactions>0);assert.ok(replacements>0);assert.ok(walkovers>0);
console.log('PASS ownership boundaries, scoped refunds, login aliases, ring narration and guaranteed wounds, substitutions and WO.');

