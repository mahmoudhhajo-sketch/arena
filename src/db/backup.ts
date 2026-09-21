import {db} from './index';
import {sql} from 'drizzle-orm';
import {mkdir,rename,copyFile,access,unlink} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import path from 'node:path';
import {createGzip} from 'node:zlib';
import {pipeline} from 'node:stream/promises';
import {once} from 'node:events';
let running:Promise<void>|undefined;
// Consistent, bounded streaming: never serialize a whole season into one string.
export function backupDatabase(){
 if(process.env.LOCAL_DB_DIR===':memory:'||((process.env.DATABASE_URL||process.env.SQL_HOST)&&!process.env.ARENA_BACKUP_DIR))return Promise.resolve();
 if(running)return running;
 running=(async()=>{
  const createdAt=new Date().toISOString(),dir=path.resolve(process.env.ARENA_BACKUP_DIR||'./data/backups');
  await mkdir(dir,{recursive:true});const temp=path.join(dir,'latest.tmp'),latest=path.join(dir,'latest.json.gz');
  const gzip=createGzip(),completed=pipeline(gzip,createWriteStream(temp));
  let streamError:unknown;void completed.catch(e=>{streamError=e;});
  const write=async(text:string)=>{if(streamError)throw streamError;if(!gzip.write(text))await once(gzip,'drain');};
  try{
   await db.transaction(async(tx:any)=>{
    await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
    await write('{"format":"arena-logical-v1","createdAt":'+JSON.stringify(createdAt)+',"tables":{');
    let firstTable=true;
    for(const name of ['world_state','users','clubs','players','matches','shoutbox_messages','tipset_coupons','game_records']){
     await write((firstTable?'':',')+JSON.stringify(name)+':[');firstTable=false;let firstRow=true;
     for(let offset=0;;offset+=64){
      const result=await tx.execute(sql.raw(`SELECT * FROM ${name} ORDER BY id LIMIT 64 OFFSET ${offset}`)),rows=result.rows||result;
      for(const row of rows){await write((firstRow?'':',')+JSON.stringify(row));firstRow=false;}
      if(rows.length<64)break;
     }
     await write(']');
    }
    await write('}}');
   });
   gzip.end();await completed;
   await copyFile(latest,path.join(dir,'previous.json.gz')).catch((e:any)=>{if(e.code!=='ENOENT')throw e});await rename(temp,latest);
   const daily=path.join(dir,createdAt.slice(0,10)+'.json.gz');try{await access(daily)}catch{await copyFile(latest,daily)}
  }catch(e){gzip.destroy();await completed.catch(()=>{});await unlink(temp).catch(()=>{});throw e;}
 })().finally(()=>{running=undefined});return running;
}
