import {COACHES} from './market';

const parts:Record<string,[string[],string[]]>={
 elf:[['Cael','Thal','Fael','Aer','Lind','Syl','Elen','Nim'],['orien','endir','athil','ion','avel','irion','ethil','arion']],
 human:[['Ald','Ed','Val','Wil','Har','Ber','Ar','Rein'],['rik','mar','vald','mund','win','bert','ald','hard']],
 dwarf:[['Durg','Kaz','Thorg','Bald','Mor','Skald','Dorn','Borg'],['rim','ar','und','grim','ald','rik','orn','in']],
 orc:[['Graz','Morg','Ur','Thrag','Krug','Zor','Drog','Brag'],['nak','gash','ruk','mork','zag','dush','gor','mak']],
 goblin:[['Zik','Nib','Snig','Krik','Grib','Skiz','Tib','Vrik'],['nik','bit','zik','grik','nak','rik','bik','git']],
 troll:[['Mog','Grum','Brol','Drom','Rug','Grom','Thum','Brum'],['dur','mur','gorn','brog','mok','rum','dak','gur']],
};
const used=new Set(COACHES.map(c=>c.name));
const nextByRace:Record<string,number>={};
// One permanent expansion at the start of season two, not exponential growth each season.
export const SEASON_TWO_COACHES=COACHES.map(c=>{
 const [first,last]=parts[c.race];let name:string;
 do{const n=nextByRace[c.race]||0;nextByRace[c.race]=n+1;name=first[n%first.length]+last[Math.floor(n/first.length)%last.length];}while(used.has(name));
 used.add(name);
 return {...c,id:'season-2-'+c.id,name};
});
export function coachesForSeason(season:number){return season>=2?[...COACHES,...SEASON_TWO_COACHES]:COACHES;}
