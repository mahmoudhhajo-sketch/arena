import {getCurrentInjurySymbol} from '../constants/attributes';
export function InjuryMark({value}:{value:number}){return value>0?<span className='injury-crosses' style={{color:'#b02020',fontWeight:800,letterSpacing:'1px'}} aria-label={'Aktuell skada: '+Math.ceil(value)+' kors'}>{getCurrentInjurySymbol(value)}</span>:<span>–</span>}
