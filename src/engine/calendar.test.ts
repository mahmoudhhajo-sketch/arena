import test from 'node:test';
import assert from 'node:assert/strict';
import {positionalTrainingMatches} from './calendar';

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
