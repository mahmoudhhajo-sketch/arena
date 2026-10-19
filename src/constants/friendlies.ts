export const FRIENDLY_VENUES = ['Gräs','Jord','Sten'].map((underlag,index)=>({
 id:'friendly-ground-'+index,name:['Lundens träningsplan','Jordvallens träningsplan','Stenringens träningsplan'][index],
 underlag:underlag as 'Gräs'|'Jord'|'Sten',capacity:0,ara:0,skrack:0,cost:0,weeklyRent:0,bookingFee:0,
 landscape:'Allmän mark',typeDescription:'Kostnadsfri vänskapsarena'
}));
export function swedishDay(date:Date|string){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));}
export function friendlyKickoff(day:string,now=new Date()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Välj ett giltigt datum.');
 const noon=new Date(day+'T12:00:00Z');
 if(!Number.isFinite(+noon)||noon.toISOString().slice(0,10)!==day)throw Error('Välj ett giltigt datum.');
 if([2,5].includes(noon.getUTCDay()))throw Error('Vänskapsmatcher kan inte spelas på tisdagar eller fredagar.');
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',hour:'2-digit',hourCycle:'h23'}).format(noon));
 const kickoff=new Date(+noon+(19-hour)*3600000);
 if(+kickoff<=+now)throw Error('Avkast måste ligga i framtiden.');
 return kickoff.toISOString();
}
