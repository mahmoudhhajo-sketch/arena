import {db} from '../db';
import {clubs,players,worldState,gameRecords} from '../db/schema';
import {eq,sql} from 'drizzle-orm';
import {records,record,put} from './records';
import {DIVISION_NAMES,childDivisions,parentDivision} from '../constants/leagues';
import {fixtureDates,roundRobin} from '../engine/schedule';
import {randomUUID} from 'node:crypto';
import {teamNews} from './newsStatistics';

export function promotedDivisions(teams:any[]){
 const ranked=new Map(DIVISION_NAMES.map(d=>[d,teams.filter(t=>t.division===d).sort((a,b)=>(b.wins*3+b.draws)-(a.wins*3+a.draws)||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst)||a.id.localeCompare(b.id))]));
 const destinations=new Map(teams.map(t=>[t.id,t.division]));
 for(const d of DIVISION_NAMES){const table=ranked.get(d)!;if(table.length!==10)throw Error('Serien måste ha tio lag: '+d);const parent=parentDivision(d),children=childDivisions(d);if(parent)destinations.set(table[0].id,parent);children.forEach((child,i)=>destinations.set(table[7+i].id,child));}
 return {ranked,destinations};
}
export async function transitionSeason(now:Date){
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719085)`);
  const [world]=await tx.select().from(worldState),season=world.season;
  const games=await record('imperial-season-'+season,tx);
  if(!games||games.competitions.length!==5||!await record('season-award-'+season,tx)||await record('season-transition-'+season,tx))return;
  const fixtures=(await records('fixture',tx)).filter(f=>(f.season||1)===season);
  if(!fixtures.length||fixtures.some(f=>!f.played))return;
  const nextMonday=new Date(games.date);nextMonday.setUTCDate(nextMonday.getUTCDate()+7);nextMonday.setUTCHours(4,0,0,0);
  if(now<nextMonday)return;
  const teams=await tx.select().from(clubs),{ranked,destinations}=promotedDivisions(teams);
  await put('season-history','season-history-'+season,{season,date:now.toISOString(),tables:Object.fromEntries(ranked),playerStats:(await tx.select().from(players)).map((p:any)=>({id:p.id,clubId:p.clubId,matches:p.seasonMatches,goals:p.seasonGoals,basketGoals:p.seasonBasketGoals,assists:p.seasonAssists}))},tx);
  for(const c of teams){const division=destinations.get(c.id)!;await tx.update(clubs).set({division,position:1,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,recordString:'0/0/0',marathonPoints:c.marathonPoints+c.wins*3+c.draws}).where(eq(clubs.id,c.id));await teamNews(tx,c.id,'season-'+(season+1),'En ny säsong gryr','Säsong '+(season+1)+' börjar. Laget spelar i '+division+'.');}
  await tx.update(players).set({seasonMatches:0,seasonGoals:0,seasonBasketGoals:0,seasonAssists:0});
  const dates=fixtureDates(nextMonday),rows:any[]=[];
  for(const division of DIVISION_NAMES){const ids=teams.filter((c:any)=>destinations.get(c.id)===division).map((c:any)=>c.id);if(ids.length!==10)throw Error('Fel antal lag efter flytt: '+division);roundRobin(ids).forEach((pairs,r)=>pairs.forEach(([homeId,awayId])=>rows.push({id:'fixture-'+randomUUID(),kind:'fixture',payload:{season:season+1,division,round:r+1,homeId,awayId,date:dates[r],played:false}})));}
  for(let i=0;i<rows.length;i+=100)await tx.insert(gameRecords).values(rows.slice(i,i+100));
  await tx.update(worldState).set({season:season+1,round:0,day:0,updatedAt:now});
  await put('system','season-transition-'+season,{season,nextSeason:season+1,date:now.toISOString(),firstMatch:dates[0]},tx);
 });
}
