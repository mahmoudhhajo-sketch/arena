import {Express} from 'express';
import {eq,desc,sql} from 'drizzle-orm';
import {db} from '../db';
import {clubs,players,gameRecords,shoutboxMessages} from '../db/schema';
import {record,records,put} from './records';
import {teamNews} from './newsStatistics';
import {ARTIFACTS} from '../constants/market';

function boundedText(value:any,min:number,max:number){const v=String(value??'').trim();if(v.length<min||v.length>max)throw Error(`Ange ${min}–${max} tecken.`);return v;}
async function lockedRecord(id:string,kind:string,tx:any){const [r]=await tx.select().from(gameRecords).where(eq(gameRecords.id,id)).for('update');if(!r||r.kind!==kind)throw Error('Posten saknas.');return {id:r.id,...r.payload};}
export function registerAdministration(app:Express){
 app.get('/api/manual-content',async(_req,res)=>{try{res.json(await records('content-page'))}catch{res.status(500).json({error:'Texterna kunde inte hämtas.'})}});
 app.use('/api/administration',(req:any,res,next)=>{if(!req.arenaUser?.admin)return res.status(403).json({error:'Administratörsbehörighet krävs.'});next();});
 app.get('/api/administration',async(_req,res)=>{try{
  const teams=await db.select().from(clubs),accounts=await records('account'),bans=await records('moderation-account'),roles=await records('admin-role');
  const ps=await db.select({id:players.id,name:players.name}).from(players);
  const auctions=[...(await records('auction')).map(a=>({...a,kind:'auction',name:ps.find(p=>p.id===a.playerId)?.name||'Spelare #'+a.playerId})),...(await records('artifact-auction')).map(a=>({...a,kind:'artifact-auction',name:ARTIFACTS.find(i=>i.id===a.artifactId)?.name||a.artifactId}))];
  res.json({clubs:teams.map(c=>({id:c.id,name:c.name,shortName:c.shortName,ownerName:c.ownerName,isBot:c.isBot,gold:c.gold,division:c.division})),accounts:accounts.map(a=>({userId:a.userId,name:a.name,managerName:a.managerName||a.name,clubName:teams.find(c=>c.userId===a.userId)?.name,admin:roles.some(r=>r.userId===a.userId&&r.enabled),banned:bans.find(b=>b.userId===a.userId)?.banned||false})),forum:(await records('forum')).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,500),chat:await db.select().from(shoutboxMessages).orderBy(desc(shoutboxMessages.createdAt)).limit(100),auctions:auctions.filter(a=>!a.closed).map(a=>({...a,sellerName:teams.find(c=>c.id===a.sellerId)?.name||'Kejsaren',bidderName:teams.find(c=>c.id===a.bidderId)?.name||'Inget bud'})),content:await records('content-page'),contentVersions:(await records('content-version')).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100),audit:(await records('admin-audit')).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100)});
 }catch{res.status(500).json({error:'Administrationen kunde inte hämtas.'})}});
 app.post('/api/administration/action',async(req:any,res)=>{try{
  const reason=boundedText(req.body.reason,5,500),requestId=String(req.body.requestId||'');
  if(!/^[a-zA-Z0-9-]{16,80}$/.test(requestId))throw Error('Ogiltigt åtgärds-ID.');
  const result=await db.transaction(async(tx:any)=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(719230)`);
   // Check again inside the transaction; roles are never supplied by the browser.
   if(!(await record('admin-role-'+req.arenaUser.userId,tx))?.enabled||(await record('moderation-account-'+req.arenaUser.userId,tx))?.banned)throw Error('Administratörsbehörighet saknas.');
   const auditId='admin-audit-'+requestId,existing=await record(auditId,tx);if(existing){if(existing.actor!==req.arenaUser.userId)throw Error('Åtgärds-ID används redan.');return {success:true,repeated:true};}
   const {action,target}=req.body;let before:any,after:any;
   if(action==='club-name'||action==='club-gold'){
    const [c]=await tx.select().from(clubs).where(eq(clubs.id,String(target))).for('update');if(!c)throw Error('Laget saknas.');
    if(action==='club-name'){
     const name=boundedText(req.body.name,3,50),shortName=boundedText(req.body.shortName,1,25);
     if((await tx.select().from(clubs)).some((other:any)=>other.id!==c.id&&other.name.toLocaleLowerCase('sv')===name.toLocaleLowerCase('sv')))throw Error('Lagnamnet används redan.');
     before={name:c.name,shortName:c.shortName};after={name,shortName};await tx.update(clubs).set(after).where(eq(clubs.id,c.id));
    }else{
     const amount=Number(req.body.amount);if(!Number.isSafeInteger(amount)||amount===0||Math.abs(amount)>10000000)throw Error('Ange en justering på högst 10 000 000 guld.');
     before={gold:c.gold};after={gold:c.gold+amount};await tx.update(clubs).set(after).where(eq(clubs.id,c.id));await put('ledger',auditId,{clubId:c.id,amount,category:'Spelledningen: '+reason,date:new Date().toISOString()},tx);
    }
    await teamNews(tx,c.id,requestId,'Spelledningen har gjort en justering',reason);
   }else if(action==='account-ban'||action==='account-unban'){
    const account=(await records('account',tx)).find(a=>a.userId===target);if(!account)throw Error('Kontot saknas.');
    if(target===req.arenaUser.userId||(await record('admin-role-'+target,tx))?.enabled)throw Error('Administratörskonton kan inte stängas av här.');
    before={banned:!!(await record('moderation-account-'+target,tx))?.banned};after={userId:target,banned:action==='account-ban',reason};await put('moderation-account','moderation-account-'+target,after,tx);
    if(after.banned)for(const session of (await records('session',tx)).filter(s=>s.userId===target))await put('session',session.id,{expires:0},tx);
   }else if(['forum-hide','forum-restore','forum-lock','forum-unlock'].includes(action)){
    const p=await lockedRecord(String(target),'forum',tx);before=p;after={...p};
    if(action==='forum-hide'){if(p.removed)throw Error('Inlägget är redan borttaget.');await put('moderation-backup','moderation-backup-'+p.id,{post:p},tx);after={...p,text:'Inlägget har tagits bort av spelledningen.',title:p.threadId?p.title:'Borttagen tråd',removed:true,locked:!p.threadId||p.locked};}
    if(action==='forum-restore'){const saved=await record('moderation-backup-'+p.id,tx);if(!p.removed||!saved)throw Error('Ingen borttagen version finns.');after={...saved.post,id:p.id,removed:false};}
    if(action==='forum-lock'||action==='forum-unlock'){if(p.threadId)throw Error('Välj trådens första inlägg.');if(p.removed)throw Error('Återställ tråden först.');after.locked=action==='forum-lock';}
    await put('forum',p.id,after,tx);
   }else if(action==='content-save'||action==='content-reset'){
    if(!/^(guide|rules)-\d+$/.test(String(target)))throw Error('Textavsnittet saknas.');
    const current=await record('content-'+target,tx);before=current||null;
    if(action==='content-save'){
     const title=boundedText(req.body.title,2,120),body=boundedText(req.body.body,1,30000);
     after={section:String(target).split('-')[0],index:Number(String(target).split('-')[1]),title,body,active:true,updatedAt:new Date().toISOString(),updatedBy:req.arenaUser.name};
    }else after={...(current||{}),active:false,updatedAt:new Date().toISOString(),updatedBy:req.arenaUser.name};
    await put('content-page','content-'+target,after,tx);
    await put('content-version','content-version-'+requestId,{target,action,title:after.title,body:after.body,active:after.active,date:after.updatedAt,actor:req.arenaUser.name,reason},tx);
   }else if(action==='chat-hide'){
    const [p]=await tx.select().from(shoutboxMessages).where(eq(shoutboxMessages.id,Number(target))).for('update');if(!p)throw Error('Meddelandet saknas.');before=p;after={content:'Meddelandet har tagits bort av spelledningen.'};await tx.update(shoutboxMessages).set(after).where(eq(shoutboxMessages.id,p.id));
   }else if(action==='auction-cancel'||action==='auction-edit'){
    const kind=req.body.kind;if(!['auction','artifact-auction'].includes(kind))throw Error('Välj auktionstyp.');
    // Player settlement takes this advisory lock; artifact bids and settlement lock the same row.
    if(kind==='auction')await tx.execute(sql`SELECT pg_advisory_xact_lock(719084)`);
    const a=await lockedRecord(String(target),kind,tx);if(a.closed||+new Date(a.endsAt)<=Date.now())throw Error('Auktionen är avslutad eller håller på att avslutas.');before=a;after={...a};
    if(action==='auction-cancel'){
     after.closed=true;after.cancelled=true;
     if(a.bidderId&&!a.unreserved){await tx.update(clubs).set({gold:sql`${clubs.gold}+${a.price}`}).where(eq(clubs.id,a.bidderId));await put('ledger','refund-'+requestId,{clubId:a.bidderId,amount:a.price,category:'Återbetalat reserverat bud',date:new Date().toISOString()},tx);}
     if(kind==='artifact-auction'){const item=await lockedRecord(a.itemId,'artifact-item',tx);await put('artifact-item',item.id,{...item,listed:false},tx);}
    }else{
     const price=Number(req.body.price),endsAt=+new Date(req.body.endsAt);
     if(!Number.isSafeInteger(price)||price<1||price>100000000)throw Error('Ogiltigt utgångspris.');
     if(a.bidderId&&price!==a.price)throw Error('Priset kan inte ändras när bud finns. Avbryt auktionen vid felaktig budgivning.');
     if(!Number.isFinite(endsAt)||endsAt<Date.now()+600000||endsAt>Date.now()+30*86400000)throw Error('Sluttiden ska ligga mellan tio minuter och 30 dagar framåt.');
     after.price=price;after.endsAt=new Date(endsAt).toISOString();
    }
    await put(kind,a.id,after,tx);
    for(const clubId of new Set([a.sellerId,a.bidderId].filter(Boolean)))await teamNews(tx,String(clubId),requestId,'Spelledningen har ändrat en auktion',reason,a.playerId?{kind:'player',id:a.playerId}:undefined);
   }else throw Error('Okänd administrationsåtgärd.');
   await put('admin-audit',auditId,{actor:req.arenaUser.userId,actorName:req.arenaUser.name,action,target,reason,before,after,date:new Date().toISOString()},tx);return {success:true};
  });res.json(result);
 }catch(e:any){res.status(400).json({error:e.message})}});
}
