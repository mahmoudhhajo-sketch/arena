import {db} from '../db';
import {record,put} from './records';
export async function reviseTrainingGuide77(){
 const key='training-guide-revision77';if(await record(key))return;
 await db.transaction(async(tx:any)=>{if(await record(key,tx))return;
 const before=await record('content-guide-10',tx);
 if(before?.updatedAt==="2026-10-14T04:24:08.755Z")await put('content-page','content-guide-10',{...before,active:false},tx);
 await put('maintenance',key,{date:new Date().toISOString(),before,retired:before?.updatedAt==="2026-10-14T04:24:08.755Z"},tx);
 });
}
