import {mkdirSync,openSync,closeSync,writeFileSync,readFileSync,unlinkSync} from 'node:fs';
import {resolve,dirname} from 'node:path';

// PGlite's filesystem must have exactly one owner, including maintenance tools.
export function acquireDatabaseLock(directory:string){
 const lock=resolve(directory)+'.lock';mkdirSync(dirname(lock),{recursive:true});
 for(let attempt=0;attempt<3;attempt++){
  let fd:number;
  try{fd=openSync(lock,'wx')}catch(e:any){
   if(e.code!=='EEXIST')throw e;
   let owner:number;try{owner=Number(readFileSync(lock,'utf8'))}catch(e:any){if(e.code==='ENOENT')continue;throw e}
   if(!Number.isSafeInteger(owner)||owner<1)throw Error('Databaslåset är ofullständigt. Kontrollera att Arena inte redan körs.');
   try{process.kill(owner,0)}catch(e:any){if(e.code==='ESRCH'){try{unlinkSync(lock)}catch(e:any){if(e.code!=='ENOENT')throw e}continue}throw e}
   throw Error(`Arena använder redan databasen (process ${owner}). Öppna http://localhost:3000 i stället.`);
  }
  writeFileSync(fd,String(process.pid));closeSync(fd);
  const release=()=>{try{if(readFileSync(lock,'utf8')===String(process.pid))unlinkSync(lock)}catch(e:any){if(e.code!=='ENOENT')console.error(e)}};
  process.once('exit',release);return release;
 }
 throw Error('Kunde inte låsa databasen.');
}
