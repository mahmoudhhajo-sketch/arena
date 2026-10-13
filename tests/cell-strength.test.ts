import assert from 'node:assert/strict';
import {cellStrength} from '../src/engine/matchEngine';
import {needsContactPrompt} from '../src/engine/contactPrompt';

assert.equal(cellStrength([]),0);
assert.equal(cellStrength([10]),10);
assert.equal(cellStrength([10,10]),18);
assert.equal(cellStrength([20,10]),26.5);
assert.equal(cellStrength([10,20]),26.5);
assert.ok(cellStrength([20,1])>20);
assert.ok(cellStrength([20,1])<cellStrength([20,10]));
assert.ok(cellStrength([20])>cellStrength([5,5]));
for(let second=1;second<=100;second++){
 const contribution=(cellStrength([100,second])-100)/second;
 assert.ok(contribution>=.5-1e-10&&contribution<=.8+1e-10);
 assert.ok(cellStrength([100,second])>cellStrength([100,second-1]));
}
assert.equal(needsContactPrompt({name:'Mongoloid Androids',isBot:false,division:'Division 1 Västra'},{name:'manager'}),false);
console.log('PASS: same-cell support stays between 50–80%, rewards balanced pairs, preserves quality advantage and renamed contact exemption.');
