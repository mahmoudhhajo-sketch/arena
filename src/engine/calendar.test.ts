import test from 'node:test';
import assert from 'node:assert/strict';
import {positionalTrainingMatches,reverseWeeklyPositionAttributes,weeklyPositionAttributes} from './calendar';

const before=Date.parse('2026-09-20T00:00:00Z');
const after=Date.parse('2026-09-27T00:00:00Z');
const appearances=(slot:string)=>[{date:'2026-09-22T19:00:00Z',slots:[slot]}];

test('snabbhet tränas på kanten men inte på centrala positioner',()=>{
 assert.equal(positionalTrainingMatches(appearances('1-0'),'snabbhet',after,before),1);
 assert.equal(positionalTrainingMatches(appearances('1-1'),'snabbhet',after,before),0);
});

test('anfallare får halverad belastning för passning',()=>{
 assert.equal(positionalTrainingMatches(appearances('0-1'),'passning',after,before),0.5);
 assert.equal(positionalTrainingMatches(appearances('1-1'),'passning',after,before),1);
});

test('speluppfattning tränas främst centralt och mycket lite på kanten',()=>{
 assert.equal(positionalTrainingMatches(appearances('2-1'),'speluppfattning',after,before),1);
 assert.equal(positionalTrainingMatches(appearances('2-0'),'speluppfattning',after,before),0.2);
});

test('den nya träningsökningen är 15 procent lägre och kan korrigera en redan körd vecka',()=>{
 const attributes:any={snabbhet:7.123,kondition:6.234,markering:5.345,passning:4.456,teknik:6.567,speluppfattning:7.678,skott:5.789,malvakt:1.234,aggressivitet:8.321,tuffhet:6.432};
 const allocation:any={snabbhet:3,kondition:2,markering:1,passning:2,teknik:1,speluppfattning:1,skott:2,malvakt:0,tuffhet:1};
 const played=[{date:'2026-09-22T19:00:00Z',slots:['1-0']}];
 const old=weeklyPositionAttributes(attributes,allocation,played,after,before,1),recovered=reverseWeeklyPositionAttributes(old,allocation,played,after,before,1),reduced=weeklyPositionAttributes(recovered,allocation,played,after,before,.85);
 assert.deepEqual(recovered,attributes);
 assert.ok(reduced.snabbhet>attributes.snabbhet&&reduced.snabbhet<old.snabbhet);
});
