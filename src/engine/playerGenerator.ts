import { NominalPosition, Player, PlayerAttributes, Race } from '../types';

import { generatePlayerName } from './names';

import { calculatePlayerPositionRatings } from './positionRatings';



export function calculateWage(attrs: PlayerAttributes): number {
  const values=Object.entries(attrs).filter(([key])=>key!=='aggressivitet').map(([,v])=>Math.max(0,v)).sort((a,b)=>b-a);
  const quality=values[0]*.5+values[1]*.25+values[2]*.15+values.slice(3).reduce((a,b)=>a+b,0)/6*.1;
  return Math.round(60+10*Math.pow(quality,2.65));
}

function triangular(min: number, max: number): number {

  // More ordinary players than extremes.

  return min + ((Math.random() + Math.random()) / 2) * (max - min);

}



export function generateSinglePlayer(

  id: number,

  race: Race,

  clubId: string,

  hometown: string,

  shirtNumber: number,

  bonusBias: 'goalkeeper' | 'defender' | 'midfielder' | 'attacker' | 'general' = 'general',

  isMercenary = false

): Player {

  function randAttr(bonus = 0): number {

    // New players are usually modest: most visible attributes are 0–8, with occasional 9–10 after bias.

    const raw = triangular(0, 5.8) + bonus * 0.45;

    return Math.max(0, Math.min(7.4, Math.round(raw * 1000) / 1000));

  }



  const attrs: PlayerAttributes = {

    snabbhet: randAttr(race === 'elf' ? 1.6 : race === 'dwarf' ? -0.6 : race === 'goblin' ? 1.4 : 0),

    kondition: randAttr(0),

    markering: randAttr(race === 'human' ? 1.2 : 0),

    passning: randAttr(0),

    teknik: randAttr(0),

    speluppfattning: randAttr(0),

    skott: randAttr(race === 'orc' ? 1.4 : 0),

    malvakt: randAttr(0),

    aggressivitet: randAttr(race === 'orc' ? 1.8 : race === 'troll' ? 1.8 : 0),

    tuffhet: randAttr(race === 'dwarf' ? 1.8 : race === 'troll' ? 2.0 : 0),

  };



  // Position bias only nudges the initial squad toward a usable composition; every player can still play anywhere.

  if (bonusBias === 'goalkeeper') {

    attrs.malvakt = Math.min(11, attrs.malvakt + 2.8 + Math.random() * 1.8);

    attrs.passning = Math.min(11, attrs.passning + 0.8);

  } else if (bonusBias === 'defender') {

    attrs.markering = Math.min(11, attrs.markering + 1.8 + Math.random());

    attrs.tuffhet = Math.min(11, attrs.tuffhet + 1.0);

  } else if (bonusBias === 'midfielder') {

    attrs.speluppfattning = Math.min(11, attrs.speluppfattning + 1.5);

    attrs.teknik = Math.min(11, attrs.teknik + 1.2);

    attrs.passning = Math.min(11, attrs.passning + 1.5);

  } else if (bonusBias === 'attacker') {

    attrs.skott = Math.min(11, attrs.skott + 1.8 + Math.random());

    attrs.snabbhet = Math.min(11, attrs.snabbhet + 0.8);

  }



  const keys = Object.keys(attrs).filter(k=>k!=='aggressivitet') as Array<keyof PlayerAttributes>;

  for (const key of keys) attrs[key] = Math.min(7.4, Math.round(attrs[key] * 1000) / 1000);

  // RECONSTRUCTED: only 3% of new players have one visible level 8.

  if (Math.random() < 0.03) attrs[keys[Math.floor(Math.random()*keys.length)]] = 7.5 + Math.random()*0.49;





  // A single extraordinary talent can occur, with an exponentially thinner tail.
  const roll=Math.random();
  if(roll<.0001){const level=8-Math.log10(Math.max(roll,Number.MIN_VALUE)/.0001);attrs[keys[Math.floor(Math.random()*keys.length)]]=level;}
  for(const key of keys)attrs[key]=Math.round(attrs[key]*1000)/1000;
  attrs.aggressivitet=generateAggression(race);
  const tempPlayer: Player = {

    id,

    name: generatePlayerName(race),

    race,

    shirtNumber,

    hometown,

    nominalPosition: 'Övrig',

    wage: 0,

    clubId,

    isMercenary,

    matches: 0,

    seasonMatches: 0,

    goals: 0,

    seasonGoals: 0,

    basketGoals: 0,

    seasonBasketGoals: 0,

    assists: 0,

    seasonAssists: 0,

    form: 6 + Math.floor(Math.random() * 4), // 6–9 at creation

    totalInjury: 0,

    currentInjury: 0,

    isDeceased: false,

    artifacts: [],

    attributes: attrs,

  };



  const ratings = calculatePlayerPositionRatings(tempPlayer, false);

  let bestPos: NominalPosition = 'Back';



  if (attrs.malvakt >= 6 && ratings.goalBox >= Math.max(ratings.matrix[0][1], ratings.matrix[1][1], ratings.matrix[2][1])) {

    bestPos = 'Målvakt';

  } else {

    const atkMax = Math.max(...ratings.matrix[0]);

    const midMax = Math.max(...ratings.matrix[1]);

    const defMax = Math.max(...ratings.matrix[2]);



    if (atkMax >= midMax && atkMax >= defMax) {

      bestPos = 'Anfall';

    } else if (midMax >= defMax) {

      bestPos = Math.max(ratings.matrix[1][0], ratings.matrix[1][2]) > ratings.matrix[1][1] ? 'Yttermittfält' : 'Innermittfält';

    } else {

      bestPos = 'Back';

    }

  }



  tempPlayer.nominalPosition = isMercenary ? 'Fribrytare' : bonusBias === 'goalkeeper' ? 'Målvakt' : bestPos;

  tempPlayer.wage = calculateWage(attrs);

  return tempPlayer;

}



export function generateStarterSquad(race: Race, clubId: string, hometown: string): Player[] {

  const squad: Player[] = [];

  let nextId = 1000 + Math.floor(Math.random() * 9000);



  // 2-3 Goalkeepers

  squad.push(generateSinglePlayer(nextId++, race, clubId, hometown, 1, 'goalkeeper'));

  squad.push(generateSinglePlayer(nextId++, race, clubId, hometown, 18, 'goalkeeper'));



  // 6 Defenders

  const defNumbers = [2, 3, 4, 6, 14, 15];

  for (const num of defNumbers) {

    squad.push(generateSinglePlayer(nextId++, race, clubId, hometown, num, 'defender'));

  }



  // 6 Midfielders

  const midNumbers = [5, 7, 8, 9, 10, 16];

  for (const num of midNumbers) {

    squad.push(generateSinglePlayer(nextId++, race, clubId, hometown, num, 'midfielder'));

  }



  // 6 Attackers

  const atkNumbers = [11, 12, 13, 17, 19, 20];

  for (const num of atkNumbers) {

    squad.push(generateSinglePlayer(nextId++, race, clubId, hometown, num, 'attacker'));

  }



  return squad;

}


export function generateAggression(race:Race,random= Math.random){const u=Math.max(Number.EPSILON,random()),v=random();const normal=Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);const mean=({elf:2.2,human:5,dwarf:8,orc:12,goblin:6,troll:10})[race];return Math.round(Math.max(0,mean+normal*(race==='orc'?4.5:3))*1000)/1000;}
