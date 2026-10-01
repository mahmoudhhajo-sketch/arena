import {inArray,sql} from 'drizzle-orm';
import {db} from '../db';
import {gameRecords} from '../db/schema';
import {record,records,put} from './records';

export async function initializeRevision28(){
 if(await record('revision-v28-dedupe-overbid-news'))return;
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719128)`);
  if(await record('revision-v28-dedupe-overbid-news',tx))return;
  const auctions=[...await records('auction',tx),...await records('artifact-auction',tx)];
  const notices=(await records('team-news',tx)).filter((news:any)=>news.title==='Du har blivit överbjuden');
  const groups=new Map<string,any[]>();
  for(const news of notices){
   const auction=auctions.find((item:any)=>news.replaceKey==='overbid-'+item.id||news.id.startsWith('news-'+item.id+'-'));
   if(!auction)continue;
   const key=news.clubId+':'+auction.id,list=groups.get(key)||[];list.push(news);groups.set(key,list);
  }
  const remove=[...groups.values()].flatMap(list=>list.sort((a:any,b:any)=>+new Date(b.date)-+new Date(a.date)).slice(1).map((news:any)=>news.id));
  if(remove.length)await tx.delete(gameRecords).where(inArray(gameRecords.id,remove));
  await put('system','revision-v28-dedupe-overbid-news',{date:new Date().toISOString(),removed:remove.length},tx);
 });
}
