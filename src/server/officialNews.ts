import {imperialDisciplineName} from '../constants/imperialDisciplines';
import {record,put} from './records';
export function imperialNews(season:number,day:number,competition:any,name:string,clubName:string,newLegend:boolean,date:string){
 const ordinal=['första','andra','tredje','fjärde','femte','sjätte'][day]||String(day+1);
 return {title:`Kejsarspelens ${ordinal} gren avgjord: ${imperialDisciplineName(competition.name)}`,sender:'Kejsarens tävlingsskrivare',season,date,body:[
 `Under Mambennas fanor har rikets tävlande gjort upp i ${imperialDisciplineName(competition.name).toLocaleLowerCase('sv')}. Läktarnas sorl har lagt sig och tävlingsskrivarna har förseglat resultatet.`,
 `Till slut stod ${name}${clubName?' från '+clubName:''} som segrare.`,
 newLegend?`Från denna dag skrivs vinnaren in bland rikets legender under namnet ${name}. Må namnet ljuda över Mambennas arenor!`:`Den redan legendariske ${name} har lagt ännu en seger till sin historia.`,
 'Hela resultatlistan finns under Kejsarspelen.'
 ],href:'#/tab/kejsarspelen'};
}
export async function publishOfficialNews(tx:any,id:string,news:any){
 if(await record(id,tx))return false;
 await put('official-news',id,news,tx);return true;
}
