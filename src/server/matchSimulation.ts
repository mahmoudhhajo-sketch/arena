import {Worker} from 'node:worker_threads';
import {resolve} from 'node:path';
import {simulateMatch} from '../engine/matchEngine';
type Job={id:number;args:Parameters<typeof simulateMatch>;resolve:(report:ReturnType<typeof simulateMatch>)=>void;reject:(error:Error)=>void};
// Two CPU workers, independent of the HTTP event loop. Database finalization remains transactional.
const queue:Job[]=[];let sequence=0;
const slots:Array<{worker:Worker;job?:Job;timer?:ReturnType<typeof setTimeout>}>=[];
function createSlot(){
 const worker=new Worker(resolve(process.cwd(),'dist/matchWorker.cjs'));
 const slot:{worker:Worker;job?:Job;timer?:ReturnType<typeof setTimeout>}={worker};slots.push(slot);worker.unref();
 const fail=(error:Error)=>{clearTimeout(slot.timer);slot.job?.reject(error);slot.job=undefined;const i=slots.indexOf(slot);if(i<0)return;slots.splice(i,1);void worker.terminate();pump()};
 worker.on('error',fail);worker.on('exit',code=>{if(slots.includes(slot))fail(new Error('Match worker exited: '+code))});
 worker.on('message',({id,report,error})=>{const job=slot.job;if(!job||job.id!==id)return;clearTimeout(slot.timer);slot.job=undefined;worker.unref();if(error)job.reject(new Error(error));else job.resolve(report);pump()});
 return slot;
}
function pump(){
 while(queue.length){let slot=slots.find(s=>!s.job);if(!slot){if(slots.length>=2)return;slot=createSlot()}const job=queue.shift()!;slot.job=job;slot.worker.ref();slot.timer=setTimeout(()=>{const i=slots.indexOf(slot!);if(i<0)return;slots.splice(i,1);slot!.job=undefined;job.reject(new Error('Match simulation timed out'));void slot!.worker.terminate();pump()},60000);slot.worker.postMessage({id:job.id,args:job.args});}
}
export function simulateMatchAsync(...args:Parameters<typeof simulateMatch>):Promise<ReturnType<typeof simulateMatch>>{
 // Isolated in-memory integration tests use the same pure engine without spawning a deployment bundle.
 if(process.env.LOCAL_DB_DIR===':memory:')return Promise.resolve(simulateMatch(...args));
 return new Promise((resolve,reject)=>{queue.push({id:++sequence,args,resolve,reject});pump()});
}
