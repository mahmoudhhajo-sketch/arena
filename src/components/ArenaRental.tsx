import {EditableText} from './PageTextEditor';
import {bookingFee} from '../constants/venues';
import {useEffect,useState} from 'react';
import {api} from '../lib/api';
export function ArenaRental({club,onRefresh}:{club:any;onRefresh:()=>void}){
 const saved=club.arena.rentalPrice??bookingFee({...club.arena,id:'club-'+club.id});
 const [price,setPrice]=useState(String(saved)),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>setPrice(String(saved)),[club.id,saved]);
 const valid=price.trim()!==''&&Number.isInteger(Number(price))&&Number(price)>=0&&Number(price)<=1000000;
 return <section className="arena-rental-panel"><h3><EditableText id="copy-18d4cc2f55712c2c"/></h3><p><EditableText id="copy-19ce28b73740aa7e"/></p><div className="arena-rental-current">Bokningspris: <strong>{saved.toLocaleString('sv-SE')} guld per match</strong></div><form onSubmit={async e=>{e.preventDefault();if(!valid||busy)return;try{setBusy(true);await api('/arena-rental/'+club.id,{price:Number(price)});onRefresh();window.dispatchEvent(new Event('arena-venues-updated'));setStatus('Priset är sparat och gäller nya bokningar.')}catch(e:any){setStatus(e.message)}finally{setBusy(false)}}}><label>Uthyrningspris, guld per match<input type="number" min={0} max={1000000} step={1} value={price} onChange={e=>setPrice(e.target.value)}/></label><button disabled={busy||!valid}>{busy?'Sparar…':'Spara uthyrningspris'}</button></form><small><EditableText id="copy-b738633b341b2930"/></small><p>Ära {club.arena.ara} · Skräck {club.arena.skrack} · Drift {club.arena.weeklyRent.toLocaleString('sv-SE')} guld/vecka</p><p className="magic-help"><EditableText id="copy-1893ad723c83b0e6"/></p>{status&&<p role="status">{status}</p>}</section>;
}
