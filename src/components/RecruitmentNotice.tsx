import {useEffect,useRef,useState} from 'react';
import {api} from '../lib/api';
import './recruitmentNotice.css';

export function RecruitmentNotice(){
 const dialog=useRef<HTMLDialogElement>(null),body=useRef<HTMLDivElement>(null);
 const [notice,setNotice]=useState<any>(null),[read,setRead]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const current=useRef<any>(null);
 useEffect(()=>{
  let alive=true,loading=false;
  const check=async()=>{if(loading||current.current||document.visibilityState==='hidden')return;loading=true;try{const data=await api('/recruitment-notice');if(alive&&data.notice){current.current=data.notice;setRead(false);setNotice(data.notice)}}catch{/* Retry when the connection returns. */}finally{loading=false}};
  void check();const timer=window.setInterval(check,60000);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
  return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check)};
 },[]);
 useEffect(()=>{
  if(!notice){dialog.current?.close();return;}
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.showModal();body.current?.focus();
  return()=>{document.body.style.overflow=previous;dialog.current?.close()};
 },[notice]);
 const close=async()=>{if(!read||busy)return;setBusy(true);setError('');try{await api('/recruitment-notice/read',{id:notice.id,reachedEnd:true});current.current=null;setNotice(null)}catch(e:any){setError(e.message)}finally{setBusy(false)}};
 return <dialog ref={dialog} className="recruitment-notice" aria-labelledby="recruitment-title" onCancel={e=>e.preventDefault()}>
  {notice&&<><header><small>{notice.preview?'Förhandsvisning · endast för Zagge':'Ett brev från spelledningen'}</small><h2 id="recruitment-title">{notice.title}</h2></header>
   <div ref={body} className="recruitment-notice-body" tabIndex={0} role="region" aria-label="Meddelande från spelledningen, skrolla för att läsa hela" onScroll={e=>{const el=e.currentTarget;if(el.scrollTop>0&&el.scrollTop+el.clientHeight>=el.scrollHeight-6)setRead(true)}}>
    {notice.paragraphs.map((p:any,i:number)=><p key={i}>{p.bold?<strong>{p.text}</strong>:p.text}{p.link&&<a href="https://arenanspelet.com" target="_blank" rel="noopener noreferrer"><strong>https://arenanspelet.com</strong></a>}</p>)}
   </div>
   <footer><p aria-live="polite">{read?'Tack för att du tog dig tid att läsa!':'Skrolla ner till slutet av brevet för att fortsätta.'}</p>{error&&<p role="alert" className="error">{error}</p>}<button onClick={close} disabled={!read||busy}>{busy?'Sparar…':'Jag har läst – fortsätt till Arenan'}</button></footer>
  </>}
 </dialog>;
}
