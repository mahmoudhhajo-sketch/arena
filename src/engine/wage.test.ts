import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSeasonWage, calculateWage } from './playerGenerator';
import { PlayerAttributes } from '../types';

const ordinary = (value = 4): PlayerAttributes => ({
  snabbhet: value,
  kondition: value,
  markering: value,
  passning: value,
  teknik: value,
  speluppfattning: value,
  skott: value,
  malvakt: value,
  aggressivitet: value,
  tuffhet: value,
});

test('season wages follow the requested attribute priority and ignore aggression', () => {
  const base = ordinary();
  const gain = (key: keyof PlayerAttributes) => calculateSeasonWage({ ...base, [key]: 10 }) - calculateSeasonWage(base);
  assert.ok(gain('tuffhet') > gain('skott'));
  assert.equal(gain('skott'), gain('malvakt'));
  assert.ok(gain('skott') > gain('snabbhet'));
  assert.ok(gain('snabbhet') > gain('kondition'));
  assert.equal(gain('aggressivitet'), 0);
});

test('season wages accelerate for elite specialists without a cap', () => {
  const toughSpecialist = { ...ordinary(), tuffhet: 16 };
  const toughShooter = { ...toughSpecialist, skott: 16 };
  assert.ok(calculateSeasonWage(toughSpecialist) >= 14000 && calculateSeasonWage(toughSpecialist) <= 16000);
  assert.ok(calculateSeasonWage(toughShooter) >= 24000 && calculateSeasonWage(toughShooter) <= 26000);
  assert.ok(calculateSeasonWage({ ...toughShooter, tuffhet: 20 }) > calculateSeasonWage(toughShooter));
});

test('the accelerated model stays dormant until the next season', () => {
  const player = { ...ordinary(), tuffhet: 16, skott: 16 };
  assert.equal(calculateWage(player, 1), calculateWage(player));
  assert.equal(calculateWage(player, 2), calculateSeasonWage(player));
  assert.notEqual(calculateWage(player, 1), calculateWage(player, 2));
});
