import {db} from '../db';
import {clubs} from '../db/schema';
import {eq,sql} from 'drizzle-orm';
import {put,record,records} from './records';
import {backfillClubEras,clubEras} from './clubOwnership';
import {firstWeekRefund} from '../engine/clubOwnership';

// A one-time waiver for this specific Monday, not a recurring subsidy.
export async function initializeRevision38() {
  await db.transaction(async(tx:any)=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(719138)`);
    await backfillClubEras(tx);
    if(await record('revision-v38-first-week-refund',tx))return;
    const eras=await clubEras(tx),entries=await records('ledger',tx),refunds:any[]=[];
    for(const c of await tx.select().from(clubs)) {
      if(c.isBot||!c.userId)continue;
      let total=0;
      for(const debit of firstWeekRefund(eras.get(c.id)?.startedAt,entries,c.id)) {
        const id='first-week-refund-'+debit.id;
        if(await record(id,tx))continue;
        const amount=-Number(debit.amount);
        await put('ledger',id,{clubId:c.id,category:'Återbetalning – första veckan',amount,date:new Date().toISOString(),sourceLedgerId:debit.id,originalCategory:debit.category},tx);
        total+=amount;
      }
      if(total){await tx.update(clubs).set({gold:sql`${clubs.gold}+${total}`}).where(eq(clubs.id,c.id));refunds.push({clubId:c.id,amount:total});}
    }
    await put('system','revision-v38-first-week-refund',{date:new Date().toISOString(),refunds},tx);
  });
}
