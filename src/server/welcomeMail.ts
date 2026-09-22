import nodemailer from 'nodemailer';
import {record,records,put} from './records';
import {db} from '../db';
import {sql} from 'drizzle-orm';
export const gameMailbox='mahmoudhhajo@gmail.com';
export function mailConfigured(){return !!process.env.GMAIL_APP_PASSWORD||!!(process.env.GMAIL_CLIENT_ID&&process.env.GMAIL_CLIENT_SECRET&&process.env.GMAIL_REFRESH_TOKEN);}
export async function queueMail(id:string,to:string,subject:string,text:string,tx:any=db,replyTo?:string){
 if(await record(id,tx))return;
 await put('mail-outbox',id,{to,subject,text,replyTo,attempts:0,createdAt:new Date().toISOString(),sentAt:null},tx);
}
export async function queueWelcome(account:any,tx:any){
 const text='Välkommen till Arenan, '+(account.managerName||account.name)+'!\n\nDitt konto och lag är skapade. Logga in och lär känna din trupp:\n'+process.env.PUBLIC_ORIGIN+'\n\nLär känna spelarna och gör din första uppställning. Marknaden, talangjakten, magin och läkaren finns redan till hands. Seriematcherna börjar först när spelledningen ger startsignalen.\n\nNybörjarguiden hjälper dig med de första stegen. Har du frågor kan du svara på det här brevet.\n\nVi ses i Mambenna!\nSpelledningen';
 await queueMail('welcome-'+account.userId,account.email,'Välkommen till Arenan!',text,tx);
 await queueMail('signup-notice-'+account.userId,gameMailbox,'[Arenan] Ny manager registrerad',account.name+' har registrerat ett konto.\nMejl: '+account.email,tx,account.email);
}
export async function sendQueuedMessage(m:any){
 const subject=m.subject||'Välkommen till Arenan!';
 const text=m.text||'Välkommen till Arenan, '+m.name+'!\nLogga in på '+process.env.PUBLIC_ORIGIN+' och anmäl ditt lag.\nSpelledningen';
 if(process.env.GMAIL_APP_PASSWORD){
  const transport=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:gameMailbox,pass:process.env.GMAIL_APP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
  try{await transport.sendMail({from:{name:'Arenan',address:gameMailbox},to:m.to,replyTo:m.replyTo||gameMailbox,subject,text,messageId:'<'+m.id+'@arena.local>'});}finally{transport.close();}
  return;
 }
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GMAIL_CLIENT_ID!,client_secret:process.env.GMAIL_CLIENT_SECRET!,refresh_token:process.env.GMAIL_REFRESH_TOKEN!,grant_type:'refresh_token'}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Google authorization failed');
 const token=await response.json() as any;
 const raw=['From: Arenan <'+gameMailbox+'>','To: '+m.to,'Reply-To: '+(m.replyTo||gameMailbox),'Subject: =?UTF-8?B?'+Buffer.from(subject).toString('base64')+'?=','Message-ID: <'+m.id+'@arena.local>','MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',Buffer.from(text).toString('base64').match(/.{1,76}/g)!.join('\r\n')].join('\r\n');
 const sent=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},body:JSON.stringify({raw:Buffer.from(raw).toString('base64url')}),signal:AbortSignal.timeout(10000)});
 if(!sent.ok)throw Error('Gmail delivery failed');
}
export async function deliverWelcomeMail(){
 if(!mailConfigured())return;
 const pending=(await records('mail-outbox')).filter(m=>!m.sentAt&&m.attempts<5&&(!m.retryAt||+new Date(m.retryAt)<=Date.now())).slice(0,3);
 for(const item of pending)await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719204)`);
  const m=await record(item.id,tx);if(m.sentAt||m.attempts>=5||m.retryAt&&+new Date(m.retryAt)>Date.now())return;
  try{await sendQueuedMessage(m);await put('mail-outbox',m.id,{...m,sentAt:new Date().toISOString()},tx);}
  catch{await put('mail-outbox',m.id,{...m,attempts:m.attempts+1,retryAt:new Date(Date.now()+3600000).toISOString()},tx);console.error('Email delivery failed; queued for retry.');}
 });
}
