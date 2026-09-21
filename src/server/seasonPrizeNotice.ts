import {record,put} from './records';
import {teamNews} from './newsStatistics';

export async function seasonPrizeNotice(tx:any,club:any,season:number,division:string,place:number,amount:number,date:string){
 const id=`season-prize-letter-${season}-${club.id}`;
 if(await record(id,tx))return;
 const title=place===1?'Gratulerar till seriesegern!':'Säsongens seriepremie';
 const body=`${club.name} slutade på plats ${place} i ${division}, säsong ${season}. ${amount.toLocaleString('sv-SE')} guld har betalats till lagkassan.${place===1?' Rikets härolder hyllar er triumf!':''}`;
 await teamNews(tx,club.id,id,title,body);
 if(club.userId&&!club.isBot)await put('mail',id,{from:'system',fromName:'Kejsarens seriekansli',to:club.userId,toName:club.ownerName,subject:title,body,date,read:false},tx);
 else await put('system',id,{season,clubId:club.id,date},tx);
}
