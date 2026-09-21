import {PLACES} from '../constants/geography';
export function weatherFor(placeName:string,now=new Date()){
 const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm'}).format(now);const hash=(s:string)=>[...s].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);const seed=hash(day),p=PLACES.find(p=>p.name===placeName)||PLACES[0],region=hash(day+Math.floor(p.x/20)+':'+Math.floor(p.y/20));
 const coast=p.x<25||p.x>82||p.y>76,desert=p.race==='orc'&&p.x>65,mountain=p.y<28;
 const month=Number(day.slice(5,7)),season=8+10*Math.cos((month-7)*Math.PI/6),front=seed%11-5;
 const temp=Math.round(season+front+(desert?9:mountain?-5:0)+(region%5-2));
 const wet=seed%100<40||(coast&&region%100<65),wind=Math.max(0,2+seed%6+(coast?3:0)+(region%5-2));
 return {date:day,place:p.name,temp,wind,condition:wet?(temp<1?'Snö':'Regn'):region%7===0?'Dimma':seed%3===0?'Molnigt':'Klart',region:desert?'Ökenrand':coast?'Kust':mountain?'Högland':'Inland'};
}
