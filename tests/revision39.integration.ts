import assert from 'node:assert/strict';
import {db,initializeDatabase,closeDatabase} from '../src/db';
import {clubs,players,matches,gameRecords,tipsetCoupons} from '../src/db/schema';
import {createHumanClub} from '../src/server/worldService';
import {registerClubIdAliases,assignManagerClubIds} from '../src/server/clubIds';
import {initializeRevision39} from '../src/server/revision39';
import {put,record} from '../src/server/records';
import {registerNews} from '../src/server/newsStatistics';
import {registerFeatures} from '../src/server/features';
import {nextMarketRole,tuneSpecializedMarketWage,releaseMarketPlayers} from '../src/server/progression';
import {records} from '../src/server/records';
import {SeededRNG} from '../src/engine/matchEngine';
import {calculateLegacyWage} from '../src/engine/playerGenerator';
async function main(){
 assert.equal(process.env.LOCAL_DB_DIR,':memory:');assert.ok(!process.env.DATABASE_URL&&!process.env.SQL_HOST);
 await initializeDatabase();
 try {
 const base={shortName:'T',race:'orc',hometown:'Shraknek',division:'Kejsarserien',ownerName:'Test',trainingPoints:{},lineup:{}};
 await db.insert(clubs).values([{...base,id:'bot-ks-1',name:'Manager',userId:'u',isBot:false},{...base,id:'bot-ks-10',name:'Bot',isBot:true}]);
 await db.insert(players).values({clubId:'bot-ks-1',name:'Orc',race:'orc',shirtNumber:1,hometown:'Shraknek',nominalPosition:'Back',wage:1000,isMercenary:true,attributes:{tuffhet:5}});
 await db.insert(matches).values({id:'match-test',division:'Kejsarserien',homeClubId:'bot-ks-1',awayClubId:'bot-ks-10',homeScore:1,awayScore:0,matchReport:{homeClubId:'bot-ks-1'}});
 await db.insert(tipsetCoupons).values({clubId:'bot-ks-1',predictions:{}});
 await put('fixture','fixture-test',{homeId:'bot-ks-1',awayId:'bot-ks-10'});
 await put('mana','mana-bot-ks-1',{clubId:'bot-ks-1',value:300});
 await initializeRevision39();
 const teams=await db.select().from(clubs),human=teams.find(c=>c.userId==='u')!;
 assert.match(human.id,/^\d{5}$/);assert.equal(teams.length,2);assert.ok(teams.some(c=>c.id==='bot-ks-10'));
 assert.equal((await db.select().from(players))[0].clubId,human.id);
 assert.equal((await db.select().from(players))[0].attributes.tuffhet,6);
 assert.equal((await record('fixture-test')).homeId,human.id);assert.equal((await record('fixture-test')).awayId,'bot-ks-10');
 assert.equal((await record('mana-'+human.id)).value,300);assert.equal((await record('club-id-alias-bot-ks-1')).clubId,human.id);
 assert.equal((await db.select().from(matches))[0].matchReport.homeClubId,human.id);
 assert.equal((await db.select().from(tipsetCoupons))[0].clubId,human.id);
 await initializeRevision39();assert.equal((await db.select().from(players))[0].attributes.tuffhet,6);
 await db.transaction(async tx=>assert.equal((await assignManagerClubIds(tx)).size,0));
 const old=new Date(Date.now()-8*86400000).toISOString(),fresh=new Date().toISOString();
 for(const [id,date,read] of [['old-read',old,true],['old-unread',old,false],['new-read',fresh,true]] as const){await put('team-news',id,{clubId:human.id,date,title:id});if(read)await put('news-read','read-'+id,{clubId:human.id,newsId:id});}
 const routes=new Map();registerNews({get:(p,f)=>routes.set(p,f),post:()=>{}} as any);let result:any;
 await routes.get('/api/team-news/:clubId')({params:{clubId:human.id},arenaUser:{userId:'u'}},{json:(x:any)=>result=x,status:()=>{throw Error('news failed')}});
 assert.ok(!result.some((n:any)=>n.id==='old-read'));assert.ok(result.some((n:any)=>n.id==='old-unread'));assert.ok(result.some((n:any)=>n.id==='new-read'));
 let middleware:any;registerClubIdAliases({use:(_p:any,f:any)=>middleware=f});
 const req:any={url:'/fixtures?clubId=bot-ks-1',query:{clubId:'bot-ks-1'},body:{clubId:'bot-ks-1'}};let nextError:any;
 await middleware(req,{},(err:any)=>{nextError=err});assert.equal(nextError,undefined);assert.equal(req.query.clubId,human.id);assert.equal(req.body.clubId,human.id);assert.ok(req.url.endsWith(human.id));
 const joined=await db.transaction(tx=>createHumanClub({userId:'u2',managerName:'Second',clubName:'New team',shortName:'NEW',race:'human'},tx));
 assert.match(joined.club.id,/^\d{5}$/);assert.notEqual(joined.club.id,human.id);assert.ok(joined.players.every(p=>p.clubId===joined.club.id));
 const [talent]=await db.insert(players).values({name:'Hidden talent',race:'elf',shirtNumber:1,hometown:'Alymoon',nominalPosition:'Back',wage:900,attributes:{tuffhet:4.123}}).returning();
 await put('scout','scout-'+human.id,{candidatePlayerId:talent.id});
 const featureRoutes=new Map();registerFeatures({get:(p,f)=>featureRoutes.set(p,f),post:()=>{}} as any);
 for(const [user,visible] of [['u',true],['u2',false]]){
  let detail:any;
  await featureRoutes.get('/api/player-detail/:id')({params:{id:String(talent.id)},query:{viewerUserId:'u'},arenaUser:{userId:user}},{json:(x:any)=>detail=x,status:()=>{throw Error('detail failed')}});
  assert.equal(!!detail.attributes,visible,'Only the scout owner can preview the talent');
 }
 const market:any[]=[],byId=new Map<number,any>(),roles:Record<string,number>={};
 for(let i=0;i<37;i++){const role=nextMarketRole(market,byId);roles[role]=(roles[role]||0)+1;byId.set(i,{});market.push({playerId:i,marketRole:role});}
 assert.deepEqual(roles,{defender:11,midfielder:11,attacker:11,goalkeeper:4});
 const rng=new SeededRNG(716),attrs={snabbhet:5,kondition:5,markering:5,passning:5,teknik:5,speluppfattning:5,skott:5,malvakt:5,tuffhet:5,aggressivitet:6};
 let specialists=0,nearTarget=0;
 for(let i=0;i<400;i++){
  const p=tuneSpecializedMarketWage(attrs,1973,'attacker',()=>rng.next());
  const top=[p.skott,p.snabbhet,p.teknik,p.speluppfattning].sort((a,b)=>b-a);
  if(top[0]>7&&top[1]<4.6)specialists++;
  if(Math.abs(calculateLegacyWage(p as any)-1973)<3)nearTarget++;
  assert.ok(Object.entries(p).every(([k,v])=>k==='aggressivitet'||Number(v)<=8));
 }
 assert.ok(specialists>50&&specialists<150);assert.ok(nearTarget>230);
 const deadline=new Date(Date.now()+86400000).toISOString();
 for(let i=0;i<8;i++){
  const [p]=await db.insert(players).values({name:'Market keeper '+i,race:['elf','orc','human','dwarf'][i%4],shirtNumber:1,hometown:'Berunia',nominalPosition:'Målvakt',wage:1900,attributes:attrs}).returning();
  await put('auction','keeper-test-'+i,{playerId:p.id,sellerId:null,bidderId:i<2?human.id:null,price:19000,endsAt:deadline,closed:false});
 }
 await releaseMarketPlayers(new Date());
 const active=(await records('auction')).filter(a=>!a.closed);
 assert.equal(active.length,37);
 for(let i=0;i<2;i++){const a=await record('keeper-test-'+i);assert.equal(a.closed,false);assert.equal(a.price,19000);assert.equal(a.endsAt,deadline);}
 const playerRows=await db.select().from(players);
 assert.equal(active.filter(a=>a.marketRole==='goalkeeper'||(!a.marketRole&&playerRows.find(p=>p.id===a.playerId)?.nominalPosition==='Målvakt')).length,4);
 console.log({specialists,nearTarget});
 console.log('PASS: migration, foreign keys, records, ID prefix collision, aliases, idempotency, orc mercenary boost, read-news expiry');
 } finally {await closeDatabase()}
}
main().catch(e=>{console.error(e);process.exitCode=1});

