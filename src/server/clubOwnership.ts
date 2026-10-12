import {db} from '../db';
import {clubs} from '../db/schema';
import {records,put,record} from './records';
import {ClubEra,belongsToManager} from '../engine/clubOwnership';
export {belongsToManager};

export async function clubEras(tx:any=db):Promise<Map<string,ClubEra>> {
  const [teams,eras]=await Promise.all([tx.select().from(clubs),records('club-ownership',tx)]);
  const index=new Map(eras.map(e=>[e.clubId,e]));
  return new Map(teams.map((c:any)=>{
    const era=index.get(c.id);
    return [c.id,{userId:c.userId,isBot:c.isBot,startedAt:era?.userId===c.userId?era.startedAt:undefined}];
  }));
}

/** Welcome mail is created in the same transaction as registration. No roster-age guesses. */
export async function backfillClubEras(tx:any=db) {
  const accounts=await records('account',tx);
  for(const c of await tx.select().from(clubs)) {
    if(c.isBot||!c.userId)continue;
    const existing=await record('club-ownership-'+c.id,tx);
    if(existing?.userId===c.userId)continue;
    const welcome=await record('welcome-'+c.userId,tx),notice=await record('signup-notice-'+c.userId,tx);
    const account=accounts.find(a=>a.userId===c.userId);
    const startedAt=welcome?.createdAt||notice?.createdAt||account?.createdAt;
    if(startedAt&&Number.isFinite(+new Date(startedAt)))await put('club-ownership','club-ownership-'+c.id,{clubId:c.id,userId:c.userId,startedAt,source:'registration'},tx);
  }
}
