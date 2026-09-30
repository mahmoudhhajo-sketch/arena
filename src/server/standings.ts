import {eq} from 'drizzle-orm';
import {clubs} from '../db/schema';

export function rankedClubs<T extends {id:string;position:number;wins:number;draws:number;goalsFor:number;goalsAgainst:number}>(teams:T[]):T[]{
 return [...teams].sort((a,b)=>(b.wins*3+b.draws)-(a.wins*3+a.draws)||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst)||b.goalsFor-a.goalsFor||a.id.localeCompare(b.id));
}

export async function refreshDivisionPositions(tx:any,division:string){
 const ordered=rankedClubs(await tx.select().from(clubs).where(eq(clubs.division,division)));
 for(let index=0;index<ordered.length;index++)if(ordered[index].position!==index+1)await tx.update(clubs).set({position:index+1}).where(eq(clubs.id,ordered[index].id));
 return ordered.map((club,index)=>({...club,position:index+1}));
}
