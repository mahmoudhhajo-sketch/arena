import {imperialDisciplineName} from '../constants/imperialDisciplines';
import {useData,Message} from './WorldViews';
import './imperialHonours.css';
export function ImperialHonours({id}:{id:number}){
 const {data,error}=useData('/imperial-honours/'+id);
 const wins=[...data].sort((a:any,b:any)=>Number(b.season)-Number(a.season)||String(b.date||'').localeCompare(String(a.date||'')));
 const official=wins.filter((w:any)=>!w.test);
 return <section className="imperial-honours" aria-label="Segrar i Kejsarspelen">
  <header className="imperial-honours-heading"><div><span className="honours-eyebrow">Spelarens bragder</span><h3>Segrar i Kejsarspelen</h3></div>{official.length>0&&<span className="honours-total">{official.length} {official.length===1?'seger':'segrar'}</span>}</header>
  <Message error={error}/>
  {wins.length?<ul className="honours-list">{wins.map((w:any)=><li className="honours-card" key={w.id}>
   <span className="honours-seal" aria-hidden="true">✦</span><div><span className="honours-season">{w.test?'Provmerit':'Säsong '+w.season}</span><h4>{imperialDisciplineName(w.discipline)}</h4>{!w.test&&<span className="honours-victory">Segrare</span>}</div>
   {w.date&&<time dateTime={w.date}>{new Date(w.date).toLocaleDateString('sv-SE',{year:'numeric',month:'short',day:'numeric'})}</time>}
  </li>)}</ul>:!error&&<p className="honours-empty">Ännu ingen seger i Kejsarspelen. De stora bragderna återstår.</p>}
 </section>;
}
