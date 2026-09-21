import {Race,PlayerAttributes} from '../types';
export interface Spell {id:string;name:string;race:Race|'all';level:number;mana:number;hours:number;cooldown:number;matches?:number;description:string;bonus:Partial<PlayerAttributes>;form?:number;immune?:boolean;craft?:'dragon-blood';matchEffect?:'rain'|'clear'|'fog'|'wind'|'ward'|'baskets'|'chains'}
export const SPELLS:Spell[]=[
 {id:'shadow-substitution',name:'Skuggbyte',race:'elf',level:2,mana:38,hours:24,cooldown:0,description:'Välj spelaren som ska lämna planen. Inför sista perioden ersätts spelaren av reserv 1 i samma ruta. Bytet uteblir om spelaren redan lämnat planen eller reserven inte är spelbar och tillgänglig.',bonus:{}},
 {id:'chain-prison',name:'Kedjefängelse',race:'dwarf',level:2,mana:38,hours:24,cooldown:0,description:'Under hela matchen spärrar runkedjor passningsvägarna från innermitt till båda ytteranfallen, för båda lagen. Andra passningar och löpningar är fortfarande möjliga.',bonus:{},matchEffect:'chains'},
 {id:'antimagic',name:'Antimagi',race:'all',level:3,mana:125,hours:24,cooldown:0,description:'Bryter båda lagens besvärjelser under en match. Tillgänglig för alla raser. Artefakter påverkas inte.',bonus:{},matchEffect:'ward'},
 {id:'brew-dragon-blood',name:'Drakblodets rit',race:'orc',level:3,mana:135,hours:0,cooldown:0,description:'Brygger ett drakblod till klubbens förråd. Kan utföras en gång per säsong.',bonus:{},craft:'dragon-blood'},
 {id:'sealed-baskets',name:'Bergens försegling',race:'dwarf',level:3,mana:135,hours:24,cooldown:0,description:'Stänger sidokorgarna med runjärn under en match. Båda lagen måste söka andra vägar till poäng.',bonus:{},matchEffect:'baskets'},
 {id:'rage',name:'Blodsvrål',race:'orc',level:1,mana:24,hours:24,cooldown:0,description:'Väcker en spelares aggressivitet under en match. Fler strider betyder också större risker.',bonus:{aggressivitet:4}},
 {id:'raincall',name:'Regnkall',race:'elf',level:1,mana:16,hours:24,cooldown:48,description:'Kallar regn över en kommande hemmamatch. Det hala underlaget försvårar löpningar för båda lagen.',bonus:{},matchEffect:'rain'},
 {id:'mistveil',name:'Dimslöja',race:'elf',level:2,mana:38,hours:24,cooldown:72,description:'Täcker planen med dimma och gör långa skott svårare för båda lagen.',bonus:{},matchEffect:'fog'},
 {id:'sunbreak',name:'Solbräck',race:'human',level:1,mana:16,hours:24,cooldown:48,description:'Skingrar oväder inför en hemmamatch och ger klart väder.',bonus:{},matchEffect:'clear'},
 {id:'stillwind',name:'Vindstilla',race:'dwarf',level:1,mana:16,hours:24,cooldown:48,description:'Lägger vinden över den kommande hemmamatchen. Bollbanorna blir mer förutsägbara.',bonus:{},matchEffect:'wind'},
 {id:'stormcall',name:'Stormrop',race:'orc',level:2,mana:38,hours:24,cooldown:72,description:'Piskar upp hård vind. Båda lagens skott påverkas av kastvindarna.',bonus:{},matchEffect:'wind'},
 {id:'leafwind',name:'Lövvind',race:'elf',level:1,mana:12,hours:24,cooldown:24,description:'En lätt vind ger en spelare snabbare steg under nästa match.',bonus:{snabbhet:.7}},
 {id:'clear-sight',name:'Klarblick',race:'elf',level:1,mana:14,hours:24,cooldown:24,description:'Skärper en spelares spelförståelse och passningar.',bonus:{speluppfattning:.6,passning:.5}},
 {id:'barkskin',name:'Barkhud',race:'elf',level:2,mana:35,hours:24,cooldown:48,description:'Gör en spelare tåligare och säkrare i markeringen.',bonus:{tuffhet:1.2,markering:.7}},
 {id:'moon-song',name:'Månsång',race:'elf',level:2,mana:40,hours:24,cooldown:48,description:'Stärker en spelares form och teknik tillfälligt.',bonus:{teknik:.6},form:2},
 {id:'aura',matches:4,name:'Aura',race:'elf',level:3,mana:100,hours:24,cooldown:168,description:'Omger en spelare med god form, ett milt lyft i alla egenskaper och skydd mot matchskador. Verkar under fyra spelade matcher. Hög manakostnad.',bonus:{snabbhet:.5,kondition:.5,markering:.5,passning:.5,teknik:.5,speluppfattning:.5,skott:.5,malvakt:.5,aggressivitet:.5,tuffhet:.5},form:3,immune:true},
 {id:'courage',name:'Lejonmod',race:'human',level:1,mana:14,hours:24,cooldown:24,description:'Stärker en spelares mod och bollsinne.',bonus:{tuffhet:.5,teknik:.6}},
 {id:'banner',name:'Solbaner',race:'human',level:2,mana:35,hours:24,cooldown:48,description:'Höjer form och spelförståelse tillfälligt.',bonus:{speluppfattning:.8},form:2},
 {id:'oath',name:'Kejsared',race:'human',level:3,mana:80,hours:24,cooldown:120,description:'Ger en spelare säkrare skott, passningar och teknik.',bonus:{skott:1,passning:1,teknik:1}},
 {id:'stone',name:'Stenfot',race:'dwarf',level:1,mana:12,hours:24,cooldown:24,description:'Ger fastare fotfäste i försvarsspelet.',bonus:{markering:.7}},
 {id:'rune',name:'Järnruna',race:'dwarf',level:2,mana:35,hours:24,cooldown:48,description:'Stärker tålighet och målvaktskonst.',bonus:{tuffhet:1,malvakt:.7}},
 {id:'mountain',name:'Bergets hjärta',race:'dwarf',level:3,mana:85,hours:24,cooldown:120,description:'Ger en spelare bergets uthållighet och hårdhet.',bonus:{kondition:1.3,tuffhet:1.3,markering:.8}},
 {id:'warcry',name:'Stridsrop',race:'orc',level:1,mana:12,hours:24,cooldown:24,description:'Ger en spelare kraft i skott och närkamp.',bonus:{skott:.5,tuffhet:.5}},
 {id:'blood-moon',name:'Blodmåne',race:'orc',level:2,mana:35,hours:24,cooldown:48,description:'Väcker en spelares stridsvilja.',bonus:{tuffhet:1,aggressivitet:1}},
 {id:'red-storm',name:'Röd storm',race:'orc',level:3,mana:80,hours:24,cooldown:120,description:'Ger en spelare explosiv fart och skottkraft.',bonus:{snabbhet:1.3,skott:1.3}},
];
export function magicCapacity(budget:number){return budget<=0?0:Math.min(140,20+Math.floor(Math.sqrt(Math.max(0,budget))*1.2))}
export function magicLevel(budget:number){return budget<=0?0:budget>=10000?3:budget>=3000?2:1}
export function activeSpells(artifacts:string[]=[],now=Date.now()){return artifacts.filter(x=>x.startsWith('magic:')&&Number(x.split(':')[2])>0||x.startsWith('spell:')&&Number(x.split(':')[2])>now).map(x=>spellById(x.split(':')[1])).filter((s):s is Spell=>!!s)}

export function consumeMatchSpells(artifacts:string[]){return artifacts.flatMap(a=>{if(!a.startsWith('magic:'))return [a];const [tag,id,count]=a.split(':');return Number(count)>1?[tag+':'+id+':'+(Number(count)-1)]:[]})}

export function spellById(id:string){return SPELLS.find(s=>s.id===(/^antimagic-(human|elf|dwarf|orc|goblin|troll)$/.test(id)?'antimagic':id));}
