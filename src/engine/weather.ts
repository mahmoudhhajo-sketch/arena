import {PLACES} from '../constants/geography';
export function weatherFor(placeName:string,now=new Date()){
 const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm'}).format(now);const hash=(s:string)=>[...s].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);const seed=hash(day),p=PLACES.find(p=>p.name===placeName)||PLACES[0],region=hash(day+Math.floor(p.x/20)+':'+Math.floor(p.y/20));
 const coast=p.x<25||p.x>82||p.y>76,desert=p.race==='orc'&&p.x>65,mountain=p.y<28;
 const month=Number(day.slice(5,7)),season=8+10*Math.cos((month-7)*Math.PI/6),front=seed%11-5;
 const temp=Math.round(season+front+(desert?9:mountain?-5:0)+(region%5-2));
 const wet=seed%100<40||(coast&&region%100<65),wind=Math.max(0,2+seed%6+(coast?3:0)+(region%5-2));
 const precipitation=wet?(region%5===0?3:region%3===0?1:2):0,cloudiness=wet?90:seed%3===0?75:15;
 return {precipitation,cloudiness,date:day,place:p.name,temp,wind,condition:wet?(temp<1?'Snö':precipitation===3?'Kraftigt regn':'Regn'):region%7===0?'Dimma':seed%3===0?'Molnigt':'Klart',region:desert?'Ökenrand':coast?'Kust':mountain?'Högland':'Inland'};
}

export type MatchWeather={temp:number;wind:number;condition:string;cloudiness?:number;precipitation?:number};
export function weatherEffects(weather:MatchWeather,surface:string){
 const wet=/regn|snö|nederbörd/i.test(weather.condition);
 const precipitation=wet?(/kraftig/i.test(weather.condition)?3:Math.max(1,weather.precipitation??2)):0;
 const cloudiness=weather.cloudiness??(/klart|sol/i.test(weather.condition)?10:85);
 const sunny=!wet&&cloudiness<=30,mud=surface==='Jord'&&wet,dust=surface==='Jord'&&sunny&&weather.temp>20;
 return {precipitation,cloudiness,mud,dust,longShotsAllowed:precipitation<3&&!dust,
 passFactor:Math.max(.45,1-Math.max(0,weather.wind)*.018),
 runFactor:Math.max(.5,1-precipitation*(surface==='Jord'?.105:surface==='Sten'?.065:.05)),
 fatigueFactor:1+Math.max(0,weather.temp-20)*.025*(sunny?1.5:1)+(mud?.25:0),
 description:[weather.condition+', '+weather.temp+' °C, vind '+weather.wind+' m/s.',weather.wind>=7?'Vindbyarna sliter i kedjebollen; passningarna kräver större precision.':'',mud?'Jorden har blivit tung lera. Löparna sjunker ned och måste hushålla med krafterna.':wet?'Nederbörden gör fästet osäkert under spelarnas fötter.':'',dust?'Solen bakar jordplanen till damm. Inga långskott kan tas genom dammolnen.':precipitation>=3?'Nederbörden ligger som en ridå över planen och omöjliggör långskott.':'',weather.temp>20?'Värmen tär på orken'+(sunny?' under den stekande solen.':'.'):''].filter(Boolean).join(' ')};
}

export function skyDescription(weather:MatchWeather){const effects=weatherEffects(weather,'Gräs');return (effects.cloudiness<=30?'Klart':effects.cloudiness<80?'Växlande molnighet':'Mulet')+' · '+(['Ingen nederbörd','Lätt nederbörd','Nederbörd','Kraftig nederbörd'][effects.precipitation]||'Nederbörd');}

export function matchWeatherPlace(venue:{hometown?:string;id?:string}|null|undefined,homeTown:string){return venue?.id?.startsWith('standard-')||venue?.id?.startsWith('friendly-')?homeTown:venue?.hometown||homeTown;}
