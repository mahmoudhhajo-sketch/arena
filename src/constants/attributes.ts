import { PlayerAttributes, Race, TrainableAttribute } from '../types';



export const QUALITATIVE_ATTRIBUTE_LABELS: Record<number, string> = {

  0: 'Skrattretande',

  1: 'Skamlig',

  2: 'Bedrövlig',

  3: 'Värdelös',

  4: 'Medelmåttig',

  5: 'Medioker',

  6: 'Duglig',

  7: 'Skaplig',

  8: 'Duktig',

  9: 'Utmärkt',

  10: 'Lysande',

  11: 'Mästerlig', // RECONSTRUCTED label; exact original term not yet confirmed

  12: 'Suverän', // CONFIRMED by surviving screenshot: 'Suverän (dvs 12.0)' 

  13: 'Fenomenal',

  14: 'Perfekt',

  15: 'Magnifik',

  16: 'Sagolik',

};



export function getQualitativeLabel(value: number): string {

  const rounded = Math.min(16, Math.max(0, Math.round(value)));

  return QUALITATIVE_ATTRIBUTE_LABELS[rounded] || 'Sagolik';

}



export const TOTAL_INJURY_LABELS: Record<number, string> = {

  0: 'Skadefri',

  1: 'Lätt stött',

  2: 'Luttrad',

  3: 'Skadedrabbad',

  4: 'Härjad',

  5: 'Sönderslagen',

  6: 'Svårt härjad',

  7: 'Krympling',

  8: 'Invalid',

  9: 'Död',

};



export function getTotalInjuryLabel(totalInjury: number): string {

  const level = Math.min(9, Math.max(0, Math.floor(totalInjury)));

  return TOTAL_INJURY_LABELS[level] || 'Skadedrabbad';

}



export function getCurrentInjurySymbol(currentInjury: number): string {

  if (currentInjury <= 0) return 'Ej Skadad';

  return '✚'.repeat(Math.ceil(currentInjury));

}



export const ATTRIBUTE_NAMES_SV: Record<keyof PlayerAttributes, string> = {

  snabbhet: 'Snabbhet',

  kondition: 'Kondition',

  markering: 'Markering',

  passning: 'Passning',

  teknik: 'Teknik',

  speluppfattning: 'Speluppfattning',

  skott: 'Skott',

  malvakt: 'Målvakt',

  aggressivitet: 'Aggressivitet',

  tuffhet: 'Tuffhet',

};



export const TRAINABLE_ATTRIBUTES: TrainableAttribute[] = [

  'snabbhet',

  'kondition',

  'markering',

  'passning',

  'teknik',

  'speluppfattning',

  'skott',

  'malvakt',

  'tuffhet',

];



export const RACE_DISPLAY_NAMES: Record<Race, string> = {

  human: 'Människa',

  elf: 'Alv',

  dwarf: 'Dvärg',

  orc: 'Orch',

  goblin: 'Goblin',

  troll: 'Troll',

};



export const RACE_DESCRIPTIONS: Record<Race, string> = {

  human: 'Människor har jämn förmåga över hela spelet och är starka i defensiv markering. De trivs på alla underlag.',

  elf: 'Alver är snabbfotade och tekniska. De dominerar på gräsplaner men är ofta mer sköra i närkamper.',

  dwarf: 'Dvärgar är oerhört tuffa och svåra att skada. De föredrar stenunderlag men är generellt långsammare.',

  orc: 'Orcher är brutala och aggressiva, med tunga skott och stor stridslust. De trivs i lerig jord.',

  goblin: 'Goblins är kvicka, aggressiva och listiga, specialiserade på snabba löpningar och oväntade bollar.',

  troll: 'Troll är tuffa jättar som ofta utvecklas till väldiga markerare eller kraftfulla skyttar.',

};


// Display only complete visible levels: 3 (Värdelös) is three times 1 (Skamlig).
export function attributeBarPercent(value:number){return Math.max(0,Math.min(16,Math.round(Number.isFinite(value)?value:0)))/16*100;}
