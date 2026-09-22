import { PlayerAttributes, Race, NominalPosition } from '../types';
import { calculateWage, generateStarterSquad } from './playerGenerator';

const profiles: { index: number; position: NominalPosition; strengths: (keyof PlayerAttributes)[] }[] = [
  { index: 0, position: 'Målvakt', strengths: ['malvakt', 'passning', 'speluppfattning'] },
  { index: 2, position: 'Back', strengths: ['markering', 'tuffhet', 'snabbhet'] },
  { index: 8, position: 'Innermittfält', strengths: ['speluppfattning', 'teknik', 'passning'] },
  { index: 9, position: 'Yttermittfält', strengths: ['snabbhet', 'teknik', 'passning', 'skott'] },
  { index: 15, position: 'Anfall', strengths: ['skott', 'speluppfattning', 'teknik'] },
  { index: 16, position: 'Anfall', strengths: ['snabbhet', 'skott', 'teknik'] },
];

// Registration only: existing squads, market players and world seeding retain their own balance.
export function generateNewClubSquad(race: Race, clubId: string, hometown: string) {
  const squad = generateStarterSquad(race, clubId, hometown);
  for (const player of squad) {
    for (const key of Object.keys(player.attributes) as (keyof PlayerAttributes)[]) {
      if (key !== 'aggressivitet') player.attributes[key] = Math.round((player.attributes[key] + .35) * 1000) / 1000;
    }
    player.wage = calculateWage(player.attributes);
  }

  const profile = profiles[Math.floor(Math.random() * profiles.length)];
  const standout = squad[profile.index];
  const attributes = { ...standout.attributes };
  for (const key of Object.keys(attributes) as (keyof PlayerAttributes)[]) {
    if (key !== 'aggressivitet') attributes[key] = 1.8 + Math.random() * 1.7;
  }
  attributes.kondition = 4 + Math.random();
  profile.strengths.forEach((key, i) => { attributes[key] = 8 - i * .55 + Math.random() * .45; });

  // Tune the specialist's skills to a modest wage budget, then use the ordinary wage formula.
  // No salary cap: later training, transfers and exceptional talents still use the full formula.
  const targetWage = 1900 + Math.random() * 200;
  let low = .5, high = 1.5;
  const scaled = (factor: number) => Object.fromEntries(Object.entries(attributes).map(([key, value]) =>
    [key, key === 'aggressivitet' ? value : Math.round(value * factor * 1000) / 1000])) as unknown as PlayerAttributes;
  for (let i = 0; i < 24; i++) {
    const middle = (low + high) / 2;
    if (calculateWage(scaled(middle)) < targetWage) low = middle; else high = middle;
  }
  standout.attributes = scaled((low + high) / 2);
  standout.wage = calculateWage(standout.attributes);
  standout.nominalPosition = profile.position;
  return squad;
}
