import type {Express} from 'express';
import {eq,sql} from 'drizzle-orm';
import {db} from '../db';
import {clubs} from '../db/schema';
import {records,put} from './records';
import {gameMailbox,queueMail} from './welcomeMail';
import {contactChoice,needsContactPrompt} from '../engine/contactPrompt';

export function registerContactPreferences(app:Express){
 app.get('/api/contact-preference',async(req:any,res)=>{try{
  if(req.arenaUser.guest)return res.json({required:false});
  const [club]=await db.select().from(clubs).where(eq(clubs.userId,req.arenaUser.userId));
  const account=(await records('account')).find(a=>a.userId===req.arenaUser.userId);
  res.setHeader('Cache-Control','no-store');res.json({required:needsContactPrompt(club,account)});
 }catch{res.status(500).json({error:'Kontaktvalet kunde inte hämtas.'})}});
 app.post('/api/contact-preference',async(req:any,res)=>{try{
  if(req.arenaUser.guest)return res.status(403).json({error:'Logga in med ditt managerkonto.'});
  await db.transaction(async(tx:any)=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${req.arenaUser.userId}))`);
   const [club]=await tx.select().from(clubs).where(eq(clubs.userId,req.arenaUser.userId));
   const account=(await records('account',tx)).find(a=>a.userId===req.arenaUser.userId);
   // Repeated submissions and multiple tabs must not send duplicate mail.
   if(!needsContactPrompt(club,account))return;
   const choice=contactChoice(req.body),at=new Date().toISOString();
   await put('account',account.id,{...account,...(!choice.declined?{phone:choice.phone}:{}),whatsappContactChoice:{declined:choice.declined,date:at}},tx);
   if(!choice.declined)await queueMail('whatsapp-contact-'+account.userId,gameMailbox,'[Arenan] Telefonnummer för WhatsApp',
    `Lag: ${club.name}\nManager: ${account.managerName||account.name}\nTelefon: ${choice.phone}\n\nManagern har frivilligt lämnat numret för kontakt om Arenans WhatsApp-grupp.`,tx,account.email||undefined);
  });res.json({success:true});
 }catch(e:any){res.status(400).json({error:e.message||'Valet kunde inte sparas.'})}});
}
