import {useState} from 'react';
import {api} from '../lib/api';
import {useData} from './WorldViews';
import {Popup} from './Popup';

export function FriendlyChallengeButton({targetId}:{targetId:string}){
 const [open,setOpen]=useState(false),[day,setDay]=useState(''),[venueId,setVenue]=useState('friendly-ground-0'),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const {data}=useData('/friendly-options/'+targetId,{canChallenge:false,venues:[]});
 if(!data.canChallenge)return null;
 return <><button className="friendly-challenge-button" onClick={()=>{setOpen(true);setStatus('')}}>⚔ Utmana på vänskapsmatch</button>{open&&<Popup title="Utmana på vänskapsmatch" onClose={()=>setOpen(false)}><form className="friendly-challenge-form" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await api('/friendly-challenges',{targetId,day,venueId});setStatus('Utmaningen är skickad. Motståndaren får den i post och lagnyheter.')}catch(e:any){setStatus(e.message)}finally{setBusy(false)}}}><p>Avkast kl. 19.00 svensk tid. Välj måndag, onsdag, torsdag, lördag eller söndag. Båda lagen kan spela högst en match per dag.</p><label>Matchdag<input type="date" required value={day} onChange={e=>setDay(e.target.value)}/></label><label>Kostnadsfri arena<select value={venueId} onChange={e=>setVenue(e.target.value)}>{data.venues.map((v:any)=><option key={v.id} value={v.id}>{v.name} · {v.underlag}</option>)}</select></label><p>Skadade spelare får spela. Ingen publik, inga intäkter, skador, träning, formförändringar eller tävlingsstatistik. Magi och fribrytare kostar och förbrukas som vanligt.</p><button disabled={busy}>{busy?'Skickar…':'Skicka utmaning'}</button><p role="status">{status}</p></form></Popup>}</>;
}
export function FriendlyChallengeCard({id}:{id:string}){
 const {data,error,load}=useData('/friendly-challenges/'+id,null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const respond=async(accept:boolean)=>{setBusy(true);try{await api('/friendly-challenges/'+id+'/respond',{accept});load();window.dispatchEvent(new Event('arena-news-read'))}catch(e:any){setStatus(e.message)}finally{setBusy(false)}};
 if(!data)return <p role="status">{error||'Hämtar utmaningen…'}</p>;
 return <aside className="friendly-challenge-card"><h4>{data.homeName} – {data.awayName}</h4><p>{new Date(data.date).toLocaleString('sv-SE')} · din lokala tid</p><p>{data.status==='accepted'?'Bokad vänskapsmatch':data.status==='declined'?'Utmaningen är avböjd':Date.now()>=+new Date(data.date)?'Utmaningen har gått ut':'Väntar på svar'}</p>{data.canRespond&&<div className="form-row"><button disabled={busy} onClick={()=>respond(true)}>Acceptera</button><button disabled={busy} onClick={()=>respond(false)}>Avböj</button></div>}{data.fixtureId&&<button onClick={()=>window.dispatchEvent(new CustomEvent('arena-match',{detail:data.fixtureId}))}>Öppna matchen</button>}<p role="status">{status||error}</p></aside>;
}
