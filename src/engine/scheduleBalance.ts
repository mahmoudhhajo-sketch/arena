export type ScheduledPair=[string,string];

type Game={roundIndex:number;pairIndex:number;a:string;b:string;key:string;occurrence:number};
type Literal={variable:string;invert:boolean};

function pairKey(a:string,b:string){return a<b?`${a}|${b}`:`${b}|${a}`;}
export function scheduledGameKey(roundIndex:number,a:string,b:string){return `${roundIndex}:${pairKey(a,b)}`;}

function homeLiteral(game:Game,clubId:string):Literal{
 const lower=game.a<game.b?game.a:game.b,isLower=clubId===lower;
 return {variable:game.key,invert:game.occurrence===0?!isLower:isLower};
}

function literalValue(literal:Literal,assignments:Map<string,boolean>){
 const value=assignments.get(literal.variable);return value===undefined?undefined:value!==literal.invert;
}

// Keeps both meetings between two clubs at opposite venues, gives every club
// nine home and nine away fixtures, and prevents three equal venues in a row.
export function balanceExistingSchedule(rounds:ScheduledPair[][],lockedHomes=new Map<string,string>()):ScheduledPair[][]{
 const seen=new Map<string,number>();
 const games=rounds.map((round,roundIndex)=>round.map(([a,b],pairIndex)=>{
  const key=pairKey(a,b),occurrence=seen.get(key)||0;seen.set(key,occurrence+1);
  return {roundIndex,pairIndex,a,b,key,occurrence};
 }));
 if([...seen.values()].some(count=>count!==2))throw new Error('Serien är inte ett komplett dubbelmöte.');
 const clubs=[...new Set(rounds.flat(2))],constraints:Array<[Literal,Literal,Literal]>=[];
 for(const clubId of clubs){
  const sequence=games.map(round=>round.find(game=>game.a===clubId||game.b===clubId));
  if(sequence.some(game=>!game))throw new Error('Ett lag saknar en omgång.');
  for(let index=0;index+2<sequence.length;index++)constraints.push([
   homeLiteral(sequence[index]!,clubId),homeLiteral(sequence[index+1]!,clubId),homeLiteral(sequence[index+2]!,clubId),
  ]);
 }
 const fixed=new Map<string,boolean>(),preferred=new Map<string,boolean>();
 for(const round of games)for(const game of round){
  const current=homeLiteral(game,game.a);preferred.set(game.key,!current.invert);
  const locked=lockedHomes.get(scheduledGameKey(game.roundIndex,game.a,game.b));if(!locked)continue;
  const literal=homeLiteral(game,locked),required=!literal.invert,prior=fixed.get(literal.variable);
  if(prior!==undefined&&prior!==required)throw new Error('Låsta matcher motsäger varandra.');fixed.set(literal.variable,required);
 }
 const solve=(assignments:Map<string,boolean>):Map<string,boolean>|null=>{
  let changed=true;
  while(changed){
   changed=false;
   for(const constraint of constraints){
    const values=constraint.map(literal=>literalValue(literal,assignments)),known=values.filter(value=>value!==undefined) as boolean[];
    if(known.length===3){if(known.every(value=>value===known[0]))return null;continue;}
    if(known.length===2&&known[0]===known[1]){
     const missing=constraint[values.findIndex(value=>value===undefined)],requiredLiteral=!known[0],requiredVariable=requiredLiteral!==missing.invert;
     const prior=assignments.get(missing.variable);if(prior!==undefined&&prior!==requiredVariable)return null;
     if(prior===undefined){assignments.set(missing.variable,requiredVariable);changed=true;}
    }
   }
  }
  const unresolved=[...seen.keys()].filter(key=>!assignments.has(key));if(!unresolved.length)return assignments;
  const variable=unresolved.sort((a,b)=>constraints.filter(c=>c.some(l=>l.variable===b)).length-constraints.filter(c=>c.some(l=>l.variable===a)).length)[0];
  for(const value of [preferred.get(variable)??false,!(preferred.get(variable)??false)]){
   const branch=new Map(assignments);branch.set(variable,value);const answer=solve(branch);if(answer)return answer;
  }
  return null;
 };
 const assignments=solve(new Map(fixed));if(!assignments)throw new Error('Hemma- och bortasviterna kan inte balanseras med de låsta matcherna.');
 return games.map(round=>round.map(game=>literalValue(homeLiteral(game,game.a),assignments)?[game.a,game.b]:[game.b,game.a]));
}
