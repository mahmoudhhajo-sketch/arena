import {synchronizeGameClock} from './gameClock';
export async function api(path:string,body?:unknown){const r=await fetch('/api'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(path==='/auth/status'&&data.serverTime)synchronizeGameClock(data.serverTime);if(!r.ok)throw new Error(data.error||'Det gick inte att spara.');return data;}

