import {queueMail,gameMailbox} from './welcomeMail';
import {records} from './records';
import {db} from '../db';
import {clubs} from '../db/schema';
import {eq} from 'drizzle-orm';
export async function sendContact(id:string,subject:string,message:string,clubId:string){
 const [club]=await db.select().from(clubs).where(eq(clubs.id,clubId));
 const account=(await records('account')).find(a=>a.userId===club?.userId);
 await queueMail('contact-mail-'+id,gameMailbox,'[Arenan '+id+'] '+subject,'Lag: '+(club?.name||clubId)+'\nManager: '+(club?.ownerName||'')+'\n\n'+message,db,account?.email);
 return false; // Durable queue; never report delivery before the mail server accepts it.
}
