import {useEffect,useState} from 'react';
import {WorldView} from './WorldViews';
import {SeriesView} from './SeriesView';
import {Statistics} from './StatisticsPage';
import {RulesView,BeginnerGuide} from './ManualViews';
import {EntityPage} from './EntityPage';
import {Entity} from './FeatureViews';
import {api} from '../lib/api';
import {MatchView} from './RetroMatchView';

export function GuestGame(){
 const [tab,setTab]=useState('Serier'),[entity,setEntity]=useState<Entity|null>(null),[match,setMatch]=useState<any>(null),[error,setError]=useState('');
 const openMatch=async(id:string,changeRoute=true)=>{try{const m=await api('/match/'+id);if(m.upcoming){setError('Den här matchen har ännu inte börjat.');return}setMatch(m);setEntity(null);setError('');if(changeRoute)history.pushState({},'', '#/match/'+encodeURIComponent(id));}catch(e:any){setError(e.message)}};
 const closeMatch=()=>{setMatch(null);history.pushState({},'','#/tab/serier')};
 useEffect(()=>{
  const open=(e:any)=>setEntity(e.detail);
  const restore=()=>{const route=location.hash.match(/^#\/match\/(.+)$/);if(route)void openMatch(decodeURIComponent(route[1]),false)};
  window.addEventListener('arena-entity',open);window.addEventListener('popstate',restore);restore();
  return()=>{window.removeEventListener('arena-entity',open);window.removeEventListener('popstate',restore)};
 },[]);
 return <main className="guest-shell"><header className="masthead"><h1 className="wordmark">ARENA</h1><p>Gäst i Mambenna · Läs och upptäck spelvärlden</p><button onClick={async()=>{await api('/auth/logout',{});localStorage.removeItem('arena_guest');location.reload()}}>Till inloggningen</button></header><nav className="tabs">{['Serier','Världen','Statistik','Nybörjarguide','Regler'].map(t=><button key={t} aria-selected={tab===t} onClick={()=>{setTab(t);setEntity(null);setMatch(null)}}>{t}</button>)}</nav><section className="game-page">{error&&<p>{error}</p>}{entity?<EntityPage entity={entity} viewerUserId="guest" onBack={()=>setEntity(null)} onRefresh={()=>{}}/>:match?<><button onClick={closeMatch}>← Tillbaka</button><MatchView match={match} onRefresh={()=>openMatch(match.id,false)}/></>:tab==='Världen'?<WorldView/>:tab==='Statistik'?<Statistics onOpen={setEntity}/>:tab==='Regler'?<RulesView/>:tab==='Nybörjarguide'?<BeginnerGuide/>:<SeriesView userClub={{id:'guest'} as any} onClub={id=>setEntity({kind:'club',id})} onMatch={id=>openMatch(id)}/>}</section></main>
}
