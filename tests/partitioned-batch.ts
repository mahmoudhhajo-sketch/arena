import assert from 'node:assert/strict';
import {fixtureLockKey,runPartitionedBatch} from '../src/server/partitionedBatch';

const items = Array.from({length: 25}, (_, index) => ({
  division: `division-${index % 5}`,
  order: Math.floor(index / 5),
}));
const active = new Set<string>();
const completed = new Map<string, number[]>();
let simultaneous = 0;
let peak = 0;

await runPartitionedBatch(items, item => item.division, async item => {
  assert.equal(active.has(item.division), false, `${item.division} ran concurrently with itself`);
  active.add(item.division);
  simultaneous++;
  peak = Math.max(peak, simultaneous);
  await new Promise(resolve => setTimeout(resolve, 2));
  completed.set(item.division, [...(completed.get(item.division) || []), item.order]);
  active.delete(item.division);
  simultaneous--;
}, 3);

assert.equal(peak, 3);
for (const orders of completed.values()) assert.deepEqual(orders, [0, 1, 2, 3, 4]);
assert.notEqual(fixtureLockKey('fixture-spetsoron'), fixtureLockKey('fixture-qrendi'));
assert.equal(fixtureLockKey('fixture-spetsoron'), fixtureLockKey('fixture-spetsoron'));
console.log('PASS: divisions run in parallel while matches within each division remain ordered.');
