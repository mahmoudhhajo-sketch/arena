import { Race } from '../types';

export interface Settlement {
  id: string;
  name: string;
  race: Race;
  potential: number; // 0 - 20
  description: string;
}

// Canonical static geography & settlements of Mambenna
export const MAMBENNA_SETTLEMENTS: Settlement[] = [
  { id: 'berunia', name: 'Berunia', race: 'human', potential: 16, description: 'Kejsardömets kosmopolitiska huvudstad vid kusten.' },
  { id: 'tvillingstaderna', name: 'Tvillingstäderna', race: 'human', potential: 14, description: 'Två speglade fästen förbundna med massiva broar.' },
  { id: 'bortomgarda', name: 'Bortomgårda', race: 'human', potential: 12, description: 'Ett avlägset jordbruksfäste med segt folk.' },
  { id: 'hillgrunby', name: 'Hillgrunby', race: 'human', potential: 11, description: 'Kuperat handelsområde med livlig idrottsanda.' },
  { id: 'skeppsvye', name: 'Skeppsvye', race: 'human', potential: 15, description: 'Mambennas största hamnstad mot södra havet.' },
  { id: 'vastlycke', name: 'Västlycke', race: 'human', potential: 10, description: 'Västra provinsens sömniga marknadsby.' },

  { id: 'alymoon', name: 'Alymoon', race: 'elf', potential: 18, description: 'Alvernas urgamla trädkrona och kulturella hjärta.' },
  { id: 'skogskymning', name: 'Skogskymning', race: 'elf', potential: 14, description: 'Skogsbryn där unga alvjägare tränar snabbhet.' },
  { id: 'vemjelsen', name: 'Vemjelsen', race: 'elf', potential: 12, description: 'Avlägsen källsjö med anrika Yaraaz-traditioner.' },

  { id: 'larutappe', name: 'Larutappe', race: 'dwarf', potential: 15, description: 'En djup dvärgakoloni känd för sina stenhuggare.' },
  { id: 'clamklyte', name: 'Clamklyte', race: 'dwarf', potential: 13, description: 'Klippig dvärgabosättning längs västra bergskedjan.' },
  { id: 'nordstorme', name: 'Nordstorme', race: 'dwarf', potential: 14, description: 'Gränsfäste mot det okända landet i norr.' },

  { id: 'shraknek', name: 'Shraknek', race: 'orc', potential: 17, description: 'Orchernas rykande fästning i bergsdalen.' },
  { id: 'stormrade', name: 'Stormråde', race: 'orc', potential: 16, description: 'Vindpinad platå där orchiska krigsklaner samlas.' },
  { id: 'stryxlya', name: 'Stryxlya', race: 'orc', potential: 15, description: 'Mörka skogar befolkade av härdade fribrytare.' },
  { id: 'miltrand', name: 'Miltrand', race: 'orc', potential: 17, description: 'Södra kustens orchkoloni med vilt rykte.' },
];

export function getRandomSettlementForRace(race: Race): Settlement {
  const valid = MAMBENNA_SETTLEMENTS.filter((s) => s.race === race);
  if (valid.length === 0) return MAMBENNA_SETTLEMENTS[0];
  const idx = Math.floor(Math.random() * valid.length);
  return valid[idx];
}

// Procedural bot club generation for system-filled divisions
const BOT_PREFIXES: Record<Race, string[]> = {
  human: ['Berunias', 'Kungliga', 'Västra', 'Östra', 'Södra', 'Kustens', 'Kronans', 'Stadsportens', 'Gyllene', 'Garnisonens'],
  elf: ['Månskens', 'Silverskogens', 'Daggens', 'Skuggvingarnas', 'Lövkrönets', 'Trädtoppens', 'Solstrålens', 'Stjärnfallens'],
  dwarf: ['Stenhuggarnas', 'Järnhjärtats', 'Gruvgillets', 'Mitrilsmedernas', 'Hällmarkens', 'Hammarslagets', 'Granitbrons'],
  orc: ['Blodskallarnas', 'Krigshordens', 'Svartbergens', 'Tandkrossarnas', 'Järnkäftarnas', 'Rovdjurens', 'Askgroddens'],
  goblin: ['Kvickskallarnas', 'Skuggkryparnas', 'Skrothögarnas'],
  troll: ['Stenklumpens', 'Mosstrollens', 'Dalgångens'],
};

const BOT_SUFFIXES: Record<Race, string[]> = {
  human: ['Väktare', 'Kämpar', 'IF', 'BK', 'Bollklubb', 'Skyttegille', 'Legion', 'Riddare'],
  elf: ['Bågskyttar', 'Löpare', 'Vigilister', 'Vävare', 'Jägare', 'Strövare', 'Falkar'],
  dwarf: ['Släggor', 'Stam', 'Brytare', 'Sköldar', 'Vakt', 'Kämpar', 'Bergsfolk'],
  orc: ['Bärsärkar', 'Krossare', 'Vargar', 'Slaktare', 'Huggare', 'Bestar', 'Storm'],
  goblin: ['Knyckare', 'Smygare', 'Bollfångare'],
  troll: ['Dunkare', 'Kolosser', 'Murar'],
};

export function generateProceduralBotClubName(race: Race, index: number): { name: string; shortName: string } {
  const pList = BOT_PREFIXES[race] || BOT_PREFIXES.human;
  const sList = BOT_SUFFIXES[race] || BOT_SUFFIXES.human;
  const prefix = pList[index % pList.length];
  const suffix = sList[(index + 3) % sList.length];
  return {
    name: `${prefix} ${suffix}`,
    shortName: prefix,
  };
}

// Lore snippets from ancient history (not live events)
export const LORE_SNIPPETS: string[] = [
  'Ett Didjuei Sing-torn gör att hemmalagets magiker är immun mot Antimagi.',
  'Enligt kejsarens dekret ska varje fäste i Yaraaz Vigil fostra krigare, trollkarlar och skyttar till riket.',
  'Mitrilförstärkta korgringar på arenorna har monterats ned i tider av nöd för att smidas om till svärd.',
  'Yaraaz-bollen är traditionellt tillverkad av härdat läder från ödemarkens oxar, med blytyngd mitt.',
  'De ursprungliga Mambenna-reglerna skrevs i runor på en stenhäll utanför Berunias citadel.',
  'Sjumilastövlar och magiska drycker får endast bäras av spelare som godkänts av ligans fogdar.',
];

export const RETRO_ADS = [
  {
    title: 'Surfers i Varberg',
    body: 'Allt för vindsurfing kitesurfing och surfing. www.surfers.se',
  },
  {
    title: 'Senaste Fotbollsnyheterna',
    body: 'De absolut senaste nyheterna inom svensk och internationell fotboll direkt till dig!',
  },
  {
    title: 'Mambenna Smidesgille',
    body: 'Mitrilrustningar, spikskor och förstärkta hjälmar för Yaraaz-spelare i alla serier.',
  },
];
