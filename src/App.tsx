import {Administration} from './components/Administration';
import {useHistoryState} from './lib/useHistoryState';
import {ArenaRental} from './components/ArenaRental';
import {ArtifactMarket} from './components/ArtifactMarket';
import {EntityPage} from './components/EntityPage';
import {MailView} from './components/CommunityViews';
import {VenueDirectory} from './components/ProgressionViews';
import {LoginGate} from './components/LoginPage';
import {FriendlyResults} from './components/FriendlyResults';
import {MatchPlanningView} from './components/MatchPlanningView';
import {SpellView} from './components/SpellView';
import {AdvancedSearch,EntityPopup,Entity,TransferHub,TipsView,NewsView} from './components/FeatureViews';
import {useState,useEffect,useRef} from 'react';
import {useGameStore} from './state/gameStore';import {RetroFrame} from './components/RetroFrame';import {ClubView} from './components/ClubView';import {PlayersListView} from './components/PlayersListView';import {PlayerProfileView} from './components/PlayerSheet';import {LineupView} from './components/LineupView';import {TrainingView} from './components/TrainingView';import {DoctorView} from './components/DoctorView';import {ArenaView} from './components/ArenaView';import {RulesView,BeginnerGuide} from './components/ManualViews';import {CreateClubModal} from './components/CreateClubModal';import {SeriesView,Statistics,FixtureList} from './components/SeriesView';import {SquadOverview} from './components/SquadOverview';import {WorldView,SearchView,Forum,ContactView,ScoutView,MagicView,MarketView,Economics,useData} from './components/WorldViews';import {api} from './lib/api';import {MatchView} from './components/RetroMatchView';import {MatchReport} from './types';
function PublicClubPage({id,onBack,onOpen}:{id:string;onBack:()=>void;onOpen:(e:Entity)=>void}){const {data,error}=useData('/club-detail/'+id,null);return <><button onClick={onBack}>← Tillbaka</button>{error?<p>{error}</p>:data?<ClubView club={data} players={data.players} readOnly onPlayer={id=>onOpen({kind:'player',id})} onNavigateTab={()=>{}} onUpdatePresentation={()=>{}}/>:<p>Läser laget…</p>}</>}
function MyMatches({clubId,onMatch}:{clubId:string;onMatch:(id:string)=>void}){const [season,setSeason]=useHistoryState('my-matches-season','');const {data:seasons}=useData('/series/seasons');const {data}=useData('/fixtures?clubId='+clubId+'&season='+season);const [tab,setTab]=useHistoryState('my-matches-tab','Kommande');return <section><h2>Matcher</h2><label>Säsong <select value={season} onChange={e=>{setSeason(e.target.value);setTab("Spelade")}}><option value="">Aktuell säsong</option>{seasons.map((s:number)=><option key={s} value={s}>{s}</option>)}</select></label><div className="tabs">{['Kommande','Spelade','Vänskapsmatcher'].map(t=><button key={t} onClick={()=>setTab(t)} aria-selected={tab===t}>{t}</button>)}</div><p>Tisdagar och fredagar 19.00, svensk tid.</p>{tab==='Vänskapsmatcher'?<FriendlyResults clubId={clubId}/>:<FixtureList fixtures={data.filter((f:any)=>tab==='Kommande'?!f.played:f.played)} onMatch={onMatch}/>}</section>}
function Tips(){const [tab,setTab]=useState('Aktuellt tips');return <section><h2>Tipset</h2><div className="tabs">{['Aktuellt tips','Topplistan'].map(t=><button key={t} onClick={()=>setTab(t)}>{t}</button>)}</div><table className="retro-table"><thead><tr>{(tab==='Topplistan'?['Plats','Lag','Poäng']:['Hemmalag','Bortalag','1','X','2','Ditt tips']).map(s=><th key={s}>{s}</th>)}</tr></thead><tbody><tr><td colSpan={6} className="empty">{tab==='Topplistan'?'Topplistan är tom.':'Ingen tipsomgång har öppnats ännu.'}</td></tr></tbody></table></section>}
function Game(){
 const {state,setTab,selectPlayer,updatePresentation,saveTraining,updateDoctorCost,saveArena,addShoutboxMessage,createNewClub,refetch}=useGameStore();
 const [planning,setPlanning]=useState<string|null>(null);
 const [entity,saveEntity]=useState<Entity|null>(null);const navigationRef=useRef<any>(null);const snapshot=()=>navigationRef.current;const pushView=(view:any,url:string)=>{history.replaceState({...history.state,...snapshot(),scrollY:window.scrollY},'',location.href);history.pushState({...snapshot(),...view,ui:{}},'',url)};const setEntity=(e:Entity|null)=>{pushView({entity:e},e?'#/'+e.kind+'/'+encodeURIComponent(e.id):'#/tab/'+state.currentTab);saveEntity(e);};const goBack=()=>history.state?.arena?history.back():navigate('lag');
 const [forum,setForum]=useState(false),[overview,setOverview]=useState(false),[buildArena,setBuildArena]=useState(false),[match,setMatch]=useState<MatchReport|null>(null),[error,setError]=useState('');
 navigationRef.current={arena:true,tab:state.currentTab,entity,planning,match};
 const navigate=(t:string)=>{if(t==='forum'){setForum(true);return}pushView({entity:null,planning:null,match:null,tab:t},'#/tab/'+t);saveEntity(null);selectPlayer(null);setPlanning(null);setMatch(null);setTab(t);setError('')};
 const openMatch=async(id:string)=>{try{const m=await api('/match/'+id);pushView({entity:null,planning:m.upcoming?id:null,match:m.upcoming?null:m},'#/match/'+encodeURIComponent(id));saveEntity(null);if(m.upcoming){setPlanning(id);setMatch(null)}else{setPlanning(null);setMatch(m)}setError('')}catch(e:any){setError(e.message)}};
 useEffect(()=>{const matchHandle=(e:any)=>openMatch(e.detail);window.addEventListener('arena-match',matchHandle);const handle=(e:any)=>setEntity(e.detail);const pop=()=>{const matchRoute=location.hash.match(/^#\/match\/(.+)$/);if(matchRoute){api('/match/'+decodeURIComponent(matchRoute[1])).then(m=>{saveEntity(null);setPlanning(m.upcoming?m.id:null);setMatch(m.upcoming?null:m)}).catch(e=>setError(e.message));return;}if(history.state?.arena){const v=history.state;saveEntity(v.entity);setPlanning(v.planning);setMatch(v.match);setTab(v.tab);selectPlayer(null);setTimeout(()=>window.scrollTo(0,v.scrollY||0),120);return}const tab=location.hash.match(/^#\/tab\/(.+)$/);if(tab)setTab(decodeURIComponent(tab[1]));const m=location.hash.match(/^#\/(player|club|manager|place|venue|mail|division)\/(.+)$/);saveEntity(m?{kind:m[1] as any,id:decodeURIComponent(m[2])}:null)};pop();window.addEventListener('popstate',pop);window.addEventListener("arena-entity",handle);return()=>{window.removeEventListener('arena-entity',handle);window.removeEventListener('popstate',pop)}},[]);
 const selected=state.players.find(p=>p.id===state.selectedPlayerId);
 const content=()=>{
 if(entity)return <EntityPage entity={entity} clubId={state.club.id} viewerUserId={state.userId} onBack={goBack} onRefresh={refetch}/>;
 if(planning)return <MatchPlanningView id={planning} club={state.club} players={state.players} onBack={goBack}/>;
 if(selected)return <EntityPage entity={{kind:'player',id:selected.id}} clubId={state.club.id} viewerUserId={state.userId} onBack={()=>selectPlayer(null)} onRefresh={refetch}/>;
 if(match)return <><button className="text-link" onClick={goBack}>← Tillbaka</button><MatchView match={match} matchesHistory={[match]} onSelectMatch={()=>{}} onSimulateNewMatch={()=>{}}/></>;
 switch(state.currentTab){
 case 'administration':return <Administration/>;
 case 'lag':return <ClubView club={state.club} players={state.players} onNavigateTab={navigate} onUpdatePresentation={updatePresentation}/>;
 case 'spelare':return <><button onClick={()=>setOverview(true)}>Öppna spelaröversikt ↗</button><PlayersListView grouped players={state.players} onSelectPlayer={id=>setEntity({kind:'player',id})} onNavigateTab={navigate}/></>;
 case 'uppstallning':return <LineupView club={state.club} players={state.players} onSaveLineup={async(lineup)=>{await api('/clubs/'+state.club.id+'/lineup',{lineup});await refetch()}}/>;
 case 'serier':case 'division':return <SeriesView key={state.currentTab} userClub={state.club} onClub={id=>setEntity({kind:"club",id})} initialDivision={state.currentTab==='division'?state.club.division:undefined} onMatch={openMatch}/>;
 case 'matcher':return <MyMatches clubId={state.club.id} onMatch={openMatch}/>;
 case 'varlden':case 'varden':return <WorldView/>;
 case 'sok':return <AdvancedSearch viewerUserId={state.userId} onOpen={setEntity}/>;
 case 'statistik':return <Statistics onOpen={setEntity}/>;
 case 'transfer':return <TransferHub club={state.club} players={state.players} onRefresh={refetch} onOpen={setEntity}/>;
 case 'bud':return <MarketView onOpenPlayer={id=>setEntity({kind:'player',id})} key={state.currentTab} club={state.club} players={state.players} onRefresh={refetch} bids={state.currentTab==='bud'}/>;
 case 'ekonomi':return <Economics club={state.club} players={state.players} onRefresh={refetch}/>;
 case 'magi':return <SpellView club={state.club} onRefresh={refetch}/>;
 case 'talangjakt':return <ScoutView club={state.club} onRefresh={refetch}/>;
 case 'kontakta':return <ContactView club={state.club}/>;
 case 'lakare':return <DoctorView club={state.club} players={state.players} onUpdateDoctorCost={updateDoctorCost}/>;
 case 'traning':return <TrainingView club={state.club} onSaveTraining={saveTraining}/>;
 case 'arena':return buildArena?<><button className="text-link" onClick={()=>setBuildArena(false)}>← Din arena</button><ArenaView club={state.club} onSaveArena={saveArena}/></>:<section><h2>Arena</h2>{state.club.arena?<><h3>{state.club.arena.name}</h3><p>{state.club.arena.capacity.toLocaleString('sv-SE')} platser · {state.club.arena.underlag}</p><ArenaRental club={state.club} onRefresh={refetch}/></>:<p>Du äger ingen arena.</p>}<button onClick={()=>setBuildArena(true)}>{state.club.arena?'Bygg om arena':'Bygg arena'}</button><VenueDirectory/></section>;
 case 'tipset':return <TipsView clubId={state.club.id}/>;
 case 'artefakter':return <ArtifactMarket club={state.club} players={state.players} onRefresh={refetch} inventoryOnly/>;
 case 'guide':return <BeginnerGuide/>;case 'regler':return <RulesView/>;
 case 'post':return <MailView/>;
 default:return <NewsView clubId={state.club.id} onOpen={setEntity} onMatch={openMatch}/>;
 }};
 return <><RetroFrame onOpen={setEntity} onMatch={openMatch} club={state.club} currentTab={state.currentTab} onSelectTab={navigate} onOpenNewClub={()=>{}} shoutboxMessages={state.shoutboxMessages} onAddShout={addShoutboxMessage}>{error&&<p className="error">{error}</p>}{content()}</RetroFrame> {forum&&<Forum club={state.club} onClose={()=>setForum(false)}/>} {overview&&<SquadOverview players={state.players} onSelect={id=>setEntity({kind:'player',id})} onClose={()=>setOverview(false)}/>}<CreateClubModal isOpen={!state.isLoading&&!state.hasClub} onClose={()=>{}} onCreateClub={(name,short,race,owner)=>{createNewClub(name,short,race,owner)}}/></>;
}


export default function App(){return <LoginGate><Game/></LoginGate>}
