export function fixtureDates(after=new Date(),count=18):string[]{
 const dates:string[]=[];const d=new Date(after);d.setUTCHours(12,0,0,0);
 while(dates.length<count){const day=d.getUTCDay();if(day===2||day===5){
 const localHour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',hour:'2-digit',hour12:false}).format(d));
 const kick=new Date(d);kick.setUTCHours(19-(localHour-12),0,0,0);if(kick>after)dates.push(kick.toISOString());}d.setUTCDate(d.getUTCDate()+1);}
 return dates;
}
export function roundRobin(ids:string[]){let rotation=[...ids];const rounds:Array<Array<[string,string]>>=[];for(let r=0;r<ids.length-1;r++){const pairs:Array<[string,string]>=[];for(let i=0;i<ids.length/2;i++){const a=rotation[i],b=rotation[ids.length-1-i];const flip=i===0?r%2===1:r%2===0;pairs.push(flip?[b,a]:[a,b]);}rounds.push(pairs);rotation=[rotation[0],rotation[rotation.length-1],...rotation.slice(1,-1)];}return [...rounds,...rounds.map(r=>r.map(([a,b])=>[b,a] as [string,string]))];}
