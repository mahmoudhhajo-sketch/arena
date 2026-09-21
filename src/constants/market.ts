import {activeSpells} from './spells';

import {PlayerAttributes} from '../types';

export const ARTIFACTS=[

 {id:'speed-boots',name:'Snabbhetsstövlar',price:18000,attribute:'snabbhet',bonus:3,rarity:'Ovanlig',supply:10,description:'Förhäxade skor som ger bäraren snabbare steg'},

 {id:'mithril',name:'Mithrilrustning',price:24000,attribute:'tuffhet',bonus:3,rarity:'Sällsynt',supply:5,description:'Lätt rustning som gör bäraren tåligare'},

 {id:'keeper-gloves',name:'Målvaktshandskar',price:18000,attribute:'malvakt',bonus:3,rarity:'Vanlig',supply:18,description:'Säkrare grepp och bättre räckvidd i målet'},

 {id:'seven-mile-boots',name:'Sjumilastövlar',price:45000,attribute:'kondition',bonus:0,rarity:'Legendarisk',supply:2,description:'Förhindrar veckans konditionsförlust vid utebliven konditionsträning'},

 {id:'herbal-brew',name:'Örtbrygd',price:5000,attribute:'kondition',bonus:0,rarity:'Vanlig',supply:24,description:'Lindrar tillfälliga skador. Förbrukas vid användning'},

 {id:'black-brew',name:'Svartbrygd',price:9000,attribute:'kondition',bonus:0,rarity:'Ovanlig',supply:12,description:'Återger spelaren god form. Förbrukas vid användning'},

 {id:'dragon-blood',name:'Drakblod',price:60000,attribute:'tuffhet',bonus:0,rarity:'Legendarisk',supply:2,description:'Stärker alla egenskaper med en kraft som avtar under åtta dagar, men skadar kroppen permanent. Kan inte staplas. Förbrukas'},

 {id:'moon-staff',name:'Mångrenens stav',price:48000,attribute:'speluppfattning',bonus:0,rarity:'Sällsynt',supply:1,description:'Verkar under säsongen då den förvärvas. Öppnar andra rasers besvärjelser för laget när staven finns i klubbens förråd. Magin kräver fortfarande rätt nivå och mana'},

 {id:'luck-amulet',name:'Turamuletten',price:34000,attribute:'teknik',bonus:0,rarity:'Sällsynt',supply:5,description:'Kan vända ett osannolikt bollögonblick eller avvärja en skada. Amuletternas lycka kan ingripa högst två gånger för samma lag under en match'},

 {id:'falcon-ring',name:'Falkögats ring',price:20000,attribute:'speluppfattning',bonus:0,rarity:'Ovanlig',supply:8,description:'Skärper spelarens blick för medspelare och öppningar'},

 {id:'thorn-bracer',name:'Törnearmband',price:18000,attribute:'markering',bonus:1.5,rarity:'Ovanlig',supply:8,description:'Hjälper bäraren att följa motståndarnas rörelser'},

 {id:'silk-wraps',name:'Skymningslindor',price:14000,attribute:'passning',bonus:0,rarity:'Vanlig',supply:12,description:'Ger säkrare och mer precisa passningar'},

] as const;

export function effectiveAttributes(p:{attributes:PlayerAttributes;artifacts?:string[]}):PlayerAttributes{const attrs={...p.attributes};for(const a of ARTIFACTS)if(p.artifacts?.includes(a.id))attrs[a.attribute]+=a.bonus;for(const effect of p.artifacts||[]){const [tag,id,end]=effect.split(":");if(tag!=="effect"||Number(end)<=Date.now())continue;if(id==="dragon-blood")for(const k of Object.keys(attrs) as Array<keyof PlayerAttributes>)attrs[k]+=1.7*Math.min(1,Math.max(0,(Number(end)-Date.now())/(8*86400000)));}for(const spell of activeSpells(p.artifacts))for(const [key,bonus] of Object.entries(spell.bonus))attrs[key as keyof PlayerAttributes]+=Number(bonus);return attrs;}

const ORIGINAL_COACHES=[

 {id:'coach-elf',name:'Aiarion',race:'elf',wage:1200,trainingBonus:2,tacticsBonus:2},

 {id:'coach-human',name:'Roderik',race:'human',wage:2500,trainingBonus:4,tacticsBonus:3},

 {id:'coach-dwarf',name:'Grornugh',race:'dwarf',wage:5000,trainingBonus:7,tacticsBonus:6},

 {id:'coach-orc',name:'Zagruk',race:'orc',wage:2000,trainingBonus:3,tacticsBonus:4},

];

const coachNames=[['Aia','riel','elf'],['Glor','dil','elf'],['Tor','vald','human'],['Roder','rik','human'],['Grorn','ugh','dwarf'],['Brom','gar','dwarf'],['Zag','ruk','orc'],['Ghor','bag','orc'],['Nip','nik','goblin'],['Gru','mog','troll']];

const COACH_BASE=[...ORIGINAL_COACHES,...Array.from({length:80},(_,i)=>{const [first,last,race]=coachNames[i%coachNames.length];const trainingBonus=1+i%7,tacticsBonus=1+Math.floor(i/7)%6;return {id:'trainer-'+i,name:first+['a','e','o','i'][Math.floor(i/10)%4]+last+['','ar','en','ir','or','un','el','in'][Math.floor(i/10)],race,trainingBonus,tacticsBonus,wage:300+trainingBonus*trainingBonus*75+tacticsBonus*120};})];


export const COACHES=COACH_BASE.map(c=>({...c,wage:Math.round(700+80*c.trainingBonus**3+65*c.tacticsBonus**3)}));

export function dragonBloodAttributes(p:{attributes:PlayerAttributes;artifacts?:string[]},now=Date.now()):PlayerAttributes {const until=Math.max(0,...(p.artifacts||[]).filter(a=>a.startsWith("effect:dragon-blood:")).map(a=>Number(a.split(":")[2])||0));const boost=1.7*Math.min(1,Math.max(0,(until-now)/(8*86400000)));return Object.fromEntries(Object.entries(p.attributes).map(([k,v])=>[k,v+boost])) as unknown as PlayerAttributes;}
