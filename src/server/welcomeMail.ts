import {record,records,put} from './records';
import {db} from '../db';
import {sql} from 'drizzle-orm';

export async function queueWelcome(account:any,tx:any){
 await put('mail-outbox','welcome-'+account.userId,{to:account.email,name:account.name,attempts:0,createdAt:new Date().toISOString(),sentAt:null},tx);
}
// Gmail API works over HTTPS on Railway's trial. Credentials belong only in server variables.
async function sendGmail(to:string,name:string,id:string){
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GMAIL_CLIENT_ID!,client_secret:process.env.GMAIL_CLIENT_SECRET!,refresh_token:process.env.GMAIL_REFRESH_TOKEN!,grant_type:'refresh_token'}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Google authorization failed');
 const token=await response.json() as any;
 const text='Välkommen till Arena, '+name+'!\n\nDitt managerkonto är skapat. Logga in och anmäl ditt lag:\n'+process.env.PUBLIC_ORIGIN+'\n\nNya lag tar över datorlag från Kejsarserien och därefter Division 1 Östra. Om världen väntar på startsignalen kan du förbereda din uppställning. Matchdagarna fastställs när spelet öppnar.\n\nBörja gärna med nybörjarguiden. Vi ses i Mambenna!\nSpelledningen';
 const raw=['From: Arena <mahmoudhhajo@gmail.com>','To: '+to,'Subject: =?UTF-8?B?'+Buffer.from('Välkommen till Arena!').toString('base64')+'?=','Message-ID: <'+id+'@arena.local>','MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',Buffer.from(text).toString('base64')].join('\r\n');
 const sent=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},body:JSON.stringify({raw:Buffer.from(raw).toString('base64url')}),signal:AbortSignal.timeout(10000)});
 if(!sent.ok)throw Error('Gmail delivery failed');
}
export async function deliverWelcomeMail(){
 if(!process.env.GMAIL_CLIENT_ID||!process.env.GMAIL_CLIENT_SECRET||!process.env.GMAIL_REFRESH_TOKEN)return;
 const pending=(await records('mail-outbox')).filter(m=>!m.sentAt&&m.attempts<5&&(!m.retryAt||+new Date(m.retryAt)<=Date.now())).slice(0,3);
 for(const item of pending)await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719204)`);
  const m=await record(item.id,tx);if(m.sentAt||m.attempts>=5||m.retryAt&&+new Date(m.retryAt)>Date.now())return;
  try{await sendGmail(m.to,m.name,m.id);await put('mail-outbox',m.id,{...m,sentAt:new Date().toISOString()},tx);}
  catch{await put('mail-outbox',m.id,{...m,attempts:m.attempts+1,retryAt:new Date(Date.now()+3600000).toISOString()},tx);console.error('Welcome mail delivery failed; queued for retry.');}
 });
}
