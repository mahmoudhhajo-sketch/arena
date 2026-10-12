import assert from 'node:assert/strict';
import {matchParticipation,accumulatedMatchInjury} from '../src/engine/matchParticipation';
import {weeklyPositionAttributes} from '../src/engine/calendar';
import {contactChoice,needsContactPrompt} from '../src/engine/contactPrompt';

const start=Date.UTC(2026,9,5),date=new Date(start+86400000).toISOString();
const before:any={snabbhet:5,kondition:5,markering:5,passning:5,teknik:5,speluppfattning:5,skott:5,malvakt:5,tuffhet:5,aggressivitet:5};
const allocation:any=Object.fromEntries(Object.keys(before).map(k=>[k,2]));
const report:any={startingLineups:{home:[{id:1,slot:'goal'},{id:2,slot:'1-1'}],away:[{id:3,slot:'1-0'}]},events:[{id:'walkover',type:'MATCH_END'}]};
let credit=matchParticipation(report,'home');
assert.equal(credit.started,false);
assert.deepEqual([...credit.slots.keys()],[1,2]);
assert.equal(accumulatedMatchInjury(2,false,true,16),2);
const trained=weeklyPositionAttributes(before,allocation,[{date,slots:[...credit.slots.get(1)!]}],start+7*86400000,start);
assert.ok(trained.malvakt>before.malvakt);assert.equal(trained.skott,before.skott);
assert.equal(weeklyPositionAttributes(before,allocation,[],start+7*86400000,start).malvakt,before.malvakt);
report.events=[{id:'sub',type:'SUBSTITUTION',teamSide:'home',playerId:4,slot:'1-1'},{id:'walkover-during',type:'MATCH_END'}];
credit=matchParticipation(report,'home');assert.equal(credit.started,true);assert.deepEqual([...credit.slots.keys()],[1,2,4]);
assert.equal(accumulatedMatchInjury(2,true,false,16),2.0075);assert.equal(accumulatedMatchInjury(2,true,true,16),2.0825);
assert.equal(accumulatedMatchInjury(8.99,true,true,16),9);
const club={name:'Testlaget',ownerName:'Test',division:'Division 1 Västra',isBot:false},account={name:'Test'};
assert.equal(needsContactPrompt(club,account),true);
assert.equal(needsContactPrompt({...club,division:'Division 2 Clamklyte'},account),true);
assert.equal(needsContactPrompt({...club,division:'Kejsarserien'},account),false);
assert.equal(needsContactPrompt({...club,isBot:true},account),false);
assert.equal(needsContactPrompt(club,{...account,phone:'+46701234567'}),false);
assert.equal(needsContactPrompt(club,{...account,whatsappContactChoice:{declined:true}}),false);
for(const name of ['Behemot Bashers','Chaos All Stars','Mongodroid Androids','HÄLSINGARNA','Jens Styxon','Odenallfader']){
 assert.equal(needsContactPrompt({...club,name},account),false);
 assert.equal(needsContactPrompt(club,{...account,name}),false);
}
assert.deepEqual(contactChoice({declined:true}),{declined:true,phone:null});
assert.equal(contactChoice({phone:'+46 (70) 123-45-67'}).phone,'+46 (70) 123-45-67');
for(const body of [{},{phone:'abc'},{phone:'123'},{declined:true,phone:'1234567'},{phone:'1234567890123456'}])assert.throws(()=>contactChoice(body));
console.log('PASS: start-WO training, positional eligibility, unused reserves, mid-match WO injury, contact divisions/exemptions/opt-out/validation.');
