import {useEffect,useRef,useState} from 'react';
import {api} from '../lib/api';

export function ContactPreferencePrompt(){
 const dialog=useRef<HTMLDialogElement>(null),[required,setRequired]=useState(false),[phone,setPhone]=useState(''),[declined,setDeclined]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let alive=true;api('/contact-preference').then(r=>{if(alive)setRequired(r.required)}).catch(()=>{});return()=>{alive=false}},[]);
 useEffect(()=>{if(required&&!dialog.current?.open)dialog.current?.showModal();else if(!required)dialog.current?.close()},[required]);
 return <dialog ref={dialog} aria-labelledby="contact-choice-heading" onCancel={e=>e.preventDefault()} style={{width:'min(440px, calc(100vw - 32px))',maxHeight:'85dvh',overflowY:'auto',border:'2px solid #688165',borderRadius:12,padding:24,background:'#f4f1e6',color:'#252d23'}}>
  <form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{await api('/contact-preference',{declined,phone:declined?'':phone});setRequired(false)}catch(e:any){setError(e.message)}finally{setBusy(false)}}}>
   <h2 id="contact-choice-heading">Vill du snacka Arenan på WhatsApp?</h2>
   <p>Vi kompletterar våra kontaktuppgifter och är tacksamma om du vill lämna ditt telefonnummer. Vi har en WhatsApp-grupp där vi snackar Arenan och delar uppdateringar.</p>
   <p>Det är helt frivilligt. Om du lämnar numret skickas det via mejl till Zagge i spelledningen för kontakt om gruppen. Numret visas inte för andra spelare i spelet.</p>
   <label style={{display:'block'}}>Telefonnummer<input style={{display:'block',width:'100%',marginTop:6}} type="tel" autoComplete="tel" maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)} required={!declined} disabled={declined||busy} placeholder="Gärna med landskod, t.ex. +46"/></label>
   <label style={{display:'flex',gap:10,alignItems:'center',margin:'18px 0'}}><input type="checkbox" checked={declined} disabled={busy} onChange={e=>setDeclined(e.target.checked)}/>Jag vill inte lämna mitt telefonnummer.</label>
   {error&&<p role="alert" className="error">{error}</p>}
   <button disabled={busy}>{busy?'Sparar…':'OK'}</button>
  </form>
 </dialog>;
}
