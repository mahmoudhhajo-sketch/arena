import {DIVISION_NAMES,childDivisions} from '../constants/leagues';

/** One exchange per child division containing managers; computer-only branches stay put. */
export function promotedDivisions(teams:any[],random:()=>number=Math.random){
 const ranked=new Map(DIVISION_NAMES.map(d=>[d,teams.filter(t=>t.division===d).sort((a,b)=>(b.wins*3+b.draws)-(a.wins*3+a.draws)||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst)||a.id.localeCompare(b.id))]));
 const destinations=new Map(teams.map(t=>[t.id,t.division]));
 for(const [d,table] of ranked)if(table.length!==10)throw Error('Serien måste ha tio lag: '+d);
 const promoted=new Map<string,any>();
 for(const d of DIVISION_NAMES)for(const child of childDivisions(d)){
  const winner=ranked.get(child)!.find(t=>!t.isBot);
  if(winner)promoted.set(child,winner);
 }
 const movingUp=new Set([...promoted.values()].map(t=>t.id));
 for(const d of DIVISION_NAMES){
  const children=childDivisions(d).filter(child=>promoted.has(child));
  for(let i=children.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[children[i],children[j]]=[children[j],children[i]];}
  const relegated=ranked.get(d)!.filter(t=>!movingUp.has(t.id)).slice(-children.length);
  children.forEach((child,i)=>{destinations.set(promoted.get(child).id,d);destinations.set(relegated[i].id,child);});
 }
 return {ranked,destinations};
}
export function imperialSeasonComplete(games:any){
 return !!games&&!games.test&&['Snabbhet','Passning','Skytte','Målvakt','Markering','Tvekamp'].every(name=>games.competitions?.some((c:any)=>c.name===name));
}
