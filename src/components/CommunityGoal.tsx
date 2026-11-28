import {useEffect,useState} from 'react';
import {api} from '../lib/api';
import './communityGoal.css';

export function CommunityGoal(){
 const [count,setCount]=useState<number|null>(null);
 useEffect(()=>{let alive=true,busy=false;const load=async()=>{if(busy||document.visibilityState==='hidden')return;busy=true;try{const r=await api('/auth/community-count');if(alive&&Number.isInteger(r.count)&&r.count>=0)setCount(r.count)}catch{/* Keep the last verified count during a temporary outage. */}finally{busy=false}};void load();const timer=window.setInterval(load,60000);window.addEventListener('focus',load);return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',load)}},[]);
 if(count===null)return null;
 const remaining=Math.max(0,100-count);
 return <aside className="community-goal" aria-label="Tillsammans mot hundra Arenaspelare"><div className="community-goal-top"><div><small>ARENANS GEMENSAMMA MÅL</small><h3>{remaining?'Tillsammans mot 100 spelare!':'100 spelare – tillsammans klarade vi det!'}</h3></div><div className="community-goal-count" aria-live="polite"><strong>{count}</strong><span> / 100</span></div></div><progress value={Math.min(100,count)} max={100} aria-label={`${count} registrerade spelare av målet 100`}/><p>{remaining?<>Vi är <b>{count} registrerade spelare</b>. Bara <b>{remaining} kvar</b> – tipsa en vän om Arenan!</>:<>Vi är nu <b>{count} registrerade spelare</b>. Tack för att du hjälper Arenan att växa!</>}</p><a href="https://arenanspelet.com">arenanspelet.com</a></aside>;
}
