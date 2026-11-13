import {simulateScheduledMatch} from './fixtureScenario';
import {parentPort} from 'node:worker_threads';
import {simulateMatch} from '../engine/matchEngine';
parentPort!.on('message',({id,args})=>{try{parentPort!.postMessage({id,report:simulateScheduledMatch(...args as Parameters<typeof simulateMatch>)})}catch(error){parentPort!.postMessage({id,error:error instanceof Error?error.message:String(error)})}});
