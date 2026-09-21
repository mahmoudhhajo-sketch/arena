import {Crest} from './Crest';import {Race} from '../types';import {RACE_DISPLAY_NAMES} from '../constants/attributes';
export function RaceIcon({race}:{race?:Race}){return race?<span className="race-icon" title={RACE_DISPLAY_NAMES[race]}><Crest small race={race}/></span>:null}
