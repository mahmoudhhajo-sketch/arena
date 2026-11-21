import {db} from '../db';
import {clubs,players,worldState,gameRecords} from '../db/schema';
import {eq,sql} from 'drizzle-orm';
import {records,record,put} from './records';
import {DIVISION_NAMES,childDivisions,parentDivision} from '../constants/leagues';
import {fixtureDates,roundRobin} from '../engine/schedule';
import {randomUUID} from 'node:crypto';
import {teamNews} from './newsStatistics';
import {calculateWage} from '../engine/playerGenerator';
import {equippedAttributes} from '../constants/market';

export {promotedDivisions} from '../engine/leagueMovement';
import {promotedDivisions,imperialSeasonComplete} from '../engine/leagueMovement';
export async function transitionSeason(now:Date){
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719085)`);
  const [world]=await tx.select().from(worldState),season=world.season;
  const games=await record('imperial-season-'+season,tx);
  if(!imperialSeasonComplete(games)||!await record('season-award-'+season,tx)||await record('season-transition-'+season,tx))return;
  const fixtures=(await records('fixture',tx)).filter(f=>(f.season||1)===season);
  if(!fixtures.length||fixtures.some(f=>!f.played))return;
  const nextMonday=new Date(games.date);nextMonday.setUTCDate(nextMonday.getUTCDate()+7);nextMonday.setUTCHours(4,0,0,0);
  // Publish the new divisions only after the final imperial competition has completed.
  const teams=await tx.select().from(clubs),{ranked,destinations}=promotedDivisions(teams);
  await put('season-history','season-history-'+season,{season,date:now.toISOString(),tables:Object.fromEntries(ranked),playerStats:(await tx.select().from(players)).map((p:any)=>({id:p.id,clubId:p.clubId,matches:p.seasonMatches,goals:p.seasonGoals,basketGoals:p.seasonBasketGoals,assists:p.seasonAssists}))},tx);
  for(const c of teams){const division=destinations.get(c.id)!;await tx.update(clubs).set({division,position:1,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,recordString:'0/0/0',marathonPoints:c.marathonPoints+c.wins*3+c.draws}).where(eq(clubs.id,c.id));await teamNews(tx,c.id,'season-'+(season+1),'En ny säsong gryr','Säsong '+(season+1)+' börjar. Laget spelar i '+division+'.');}
  for(const p of await tx.select().from(players))await tx.update(players).set({seasonMatches:0,seasonGoals:0,seasonBasketGoals:0,seasonAssists:0,wage:Math.max(p.wage,calculateWage(equippedAttributes({attributes:p.attributes as any,artifacts:p.artifacts as string[]}),season+1))}).where(eq(players.id,p.id));
  const dates=fixtureDates(nextMonday),rows:any[]=[];
  for(const division of DIVISION_NAMES){const ids=teams.filter((c:any)=>destinations.get(c.id)===division).map((c:any)=>c.id);if(ids.length!==10)throw Error('Fel antal lag efter flytt: '+division);roundRobin(ids).forEach((pairs,r)=>pairs.forEach(([homeId,awayId])=>rows.push({id:'fixture-'+randomUUID(),kind:'fixture',payload:{season:season+1,division,round:r+1,homeId,awayId,date:dates[r],played:false}})));}
  for(let i=0;i<rows.length;i+=100)await tx.insert(gameRecords).values(rows.slice(i,i+100));
  await tx.update(worldState).set({season:season+1,round:0,day:0,updatedAt:now});
  await put('system','season-transition-'+season,{season,nextSeason:season+1,date:now.toISOString(),firstMatch:dates[0]},tx);
 });
}
