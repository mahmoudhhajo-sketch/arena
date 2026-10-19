import {useEffect,useState} from 'react';
import {api} from '../lib/api';
import {ATTRIBUTE_NAMES_SV,getQualitativeLabel,RACE_DISPLAY_NAMES} from '../constants/attributes';
import {equippedAttributes} from '../constants/market';
import {EntityLink} from './EntityLink';
export function MatchPlayerHover({player,team}:{player:{id:number;number:number;name:string;position:string};team:string}){
 const [data,setData]=useState<any>(null),[error,setError]=useState(false);
 useEffect(()=>{let active=true;setData(null);setError(false);api('/player-detail/'+player.id).then(p=>{if(active)setData(p)}).catch(()=>{if(active)setError(true)});return()=>{active=false}},[player.id]);
 const attributes=data?.attributes?equippedAttributes(data):null;
 return <aside className="match-player-hover" role="tooltip"><b><EntityLink kind="player" id={player.id} number={player.number}>{player.name}</EntityLink></b><p>{team} · {player.position||data?.nominalPosition||'Inbytt spelare'}</p>{data&&<><p>{RACE_DISPLAY_NAMES[data.race as keyof typeof RACE_DISPLAY_NAMES]} · Form: {getQualitativeLabel(data.form)}</p><small>Den pågående säsongen</small><dl>{[['Matcher',data.seasonMatches],['Mål',data.seasonGoals],['Korgmål',data.seasonBasketGoals],['Assist',data.seasonAssists]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??0}</dd></div>)}</dl></>}{attributes?<><small>Nuvarande egenskaper med permanent utrustning</small><dl>{Object.entries(ATTRIBUTE_NAMES_SV).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{getQualitativeLabel((attributes as any)[key])}</dd></div>)}</dl></>:!data&&<p>{error?'Öppna profilen för mer information.':'Hämtar spelarinfo…'}</p>}</aside>;
}
