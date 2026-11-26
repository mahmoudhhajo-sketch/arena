import type {Express} from 'express';
import {eq,sql} from 'drizzle-orm';
import {db} from '../db';
import {clubs} from '../db/schema';
import {record,records,put} from './records';
import {RECRUITMENT_ID,RECRUITMENT_MAIL_AT,RECRUITMENT_POPUP_AT,RECRUITMENT_SUBJECT,RECRUITMENT_MAIL,RECRUITMENT_HEADING,RECRUITMENT_POPUP} from '../constants/recruitmentCampaign';

const batchId=RECRUITMENT_ID+'-mail-batch';
export function recruitmentRecipients(accounts:any[],teams:any[]){
 const owners=new Set(teams.filter(c=>!c.isBot).map(c=>c.userId)),seen=new Set<string>();
 return accounts.filter(a=>owners.has(a.userId)&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(a.email||'').trim())).filter(a=>{
  const email=a.email.trim().toLowerCase();if(seen.has(email))return false;seen.add(email);return true;
 });
}
export function recruitmentMailContent(){
 const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 const text=RECRUITMENT_MAIL.map(p=>p.text.replace(/\*\*/g,'')).join('\n\n');
 const html='<!doctype html><html lang="sv"><body style="font-family:Georgia,serif;color:#273125;line-height:1.65"><main style="max-width:640px;margin:auto;padding:24px">'+RECRUITMENT_MAIL.map(p=>{
  let content=escape(p.text).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  if(p.link)content=content.replace('https://arenanspelet.com','<a href="https://arenanspelet.com">https://arenanspelet.com</a>');
  return '<p>'+(p.bold?'<strong>'+content+'</strong>':content)+'</p>';
 }).join('')+'</main></body></html>';
 return {text,html};
}
/** Freeze the 54 current manager recipients once. No message is deliverable before Saturday. */
export async function prepareRecruitmentCampaign(now=new Date()){
 if(await record(batchId))return;
 await db.transaction(async(tx:any)=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(719296)`);
  if(await record(batchId,tx))return;
  const teams=await tx.select().from(clubs),recipients=recruitmentRecipients(await records('account',tx),teams);
  // A changed audience needs review, never silently mail a different group.
  if(recipients.length!==54)throw Error('Recruitment campaign expected 54 manager addresses; found '+recipients.length);
  const body=recruitmentMailContent(),ids:string[]=[];
  for(const a of recipients){
   const id=RECRUITMENT_ID+'-mail-'+a.userId;ids.push(id);
   if(!await record(id,tx))await put('mail-outbox',id,{to:a.email.trim(),subject:RECRUITMENT_SUBJECT,...body,attempts:0,createdAt:now.toISOString(),sentAt:null,notBefore:RECRUITMENT_MAIL_AT,campaignId:RECRUITMENT_ID},tx);
  }
  await put('mail-campaign',batchId,{id:batchId,count:ids.length,messageIds:ids,scheduledAt:RECRUITMENT_MAIL_AT,createdAt:now.toISOString()},tx);
 });
}
export async function recruitmentNotice(user:any,now=Date.now(),tx:any=db){
 if(!user||user.guest)return null;
 let preview=false;
 if(now<+new Date(RECRUITMENT_POPUP_AT)){
  if(!user.admin)return null;
  const [club]=await tx.select({id:clubs.id}).from(clubs).where(eq(clubs.userId,user.userId));
  if(club?.id!=='72844')return null;
  preview=true;
 }
 const id=RECRUITMENT_ID+(preview?'-preview':'');
 if(await record(id+'-read-'+user.userId,tx))return null;
 return {id,preview,title:RECRUITMENT_HEADING,paragraphs:RECRUITMENT_POPUP};
}
export function registerRecruitmentCampaign(app:Express){
 app.get('/api/recruitment-notice',async(req:any,res)=>{try{
  res.setHeader('Cache-Control','no-store');res.json({notice:await recruitmentNotice(req.arenaUser),startsAt:RECRUITMENT_POPUP_AT});
 }catch{res.status(500).json({error:'Meddelandet kunde inte hämtas.'})}});
 app.post('/api/recruitment-notice/read',async(req:any,res)=>{try{
  if(!req.arenaUser||req.arenaUser.guest)return res.status(403).json({error:'Logga in med ditt managerkonto.'});
  const notice=await recruitmentNotice(req.arenaUser);
  if(!notice)return res.json({success:true});
  if(req.body.id!==notice.id||req.body.reachedEnd!==true)return res.status(400).json({error:'Läs till slutet innan du stänger meddelandet.'});
  await put('announcement-read',notice.id+'-read-'+req.arenaUser.userId,{userId:req.arenaUser.userId,campaignId:notice.id,date:new Date().toISOString()});
  res.json({success:true});
 }catch{res.status(500).json({error:'Kunde inte spara. Försök igen.'})}});
 app.get('/api/administration/recruitment-campaign',async(req:any,res)=>{try{
  if(!req.arenaUser?.admin)return res.status(403).json({error:'Administratörsbehörighet krävs.'});
  const batch=await record(batchId),mail=(await records('mail-outbox')).filter(m=>m.campaignId===RECRUITMENT_ID);
  res.setHeader('Cache-Control','no-store');res.json({scheduledAt:RECRUITMENT_MAIL_AT,popupAt:RECRUITMENT_POPUP_AT,recipients:batch?.count||0,sent:mail.filter(m=>m.sentAt).length,pending:mail.filter(m=>!m.sentAt).length,failed:mail.filter(m=>!m.sentAt&&m.attempts>=5).length});
 }catch{res.status(500).json({error:'Utskickets status kunde inte hämtas.'})}});
}
