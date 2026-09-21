import {LineupConfig,Player} from '../types';

export const SLOT_KEYS=['0-0','0-1','0-2','1-0','1-1','1-2','2-0','2-1','2-2','goal'];

export function activeIds(slot:any):number[]{return slot?.activePlayerIds??(slot?.starterPlayerId?[slot.starterPlayerId]:[])}

export function reserveIds(slot:any):number[]{return slot?.reservePlayerIds??(slot?.subPlayerId?[slot.subPlayerId]:[])}

export function validateLineup(lineup:LineupConfig,squad:Player[],requireTen=true):string|null{

 if(!lineup?.slots)return 'Uppställningen saknas.';

 const used=new Set<number>();let active=0;

 for(const [key,s] of Object.entries(lineup.slots)){if(!SLOT_KEYS.includes(key))return 'Okänd ruta.';

 const ids=activeIds(s),res=reserveIds(s);if(ids.length>2||res.length>2)return 'Högst två spelare och två reserver per ruta.';

 if(new Set(res).size!==res.length)return 'Samma reserv kan inte stå två gånger i samma ruta.';

 for(const id of [...ids,...res]){const p=squad.find(p=>p.id===id);if(!p)return 'Spelaren saknas.';if(p.isDeceased)return 'Avlidna spelare kan inte ställas upp.';}

 for(const id of ids){if(used.has(id))return 'En aktiv spelare kan bara spela i en ruta.';used.add(id)}active+=ids.length;

 }

 for(const s of Object.values(lineup.slots))if(reserveIds(s).some(id=>used.has(id)))return 'En aktiv spelare kan inte samtidigt vara reserv.';

 if(active>10||(requireTen&&active!==10))return 'Uppställningen ska innehålla exakt tio aktiva spelare.';

 if(!Number.isInteger(lineup.intrade)||lineup.intrade<0||lineup.intrade>100)return 'Ogiltigt inträde.';

 if(!['Gräs','Jord','Sten','Nimonimbus'].includes(lineup.underlag))return 'Ogiltigt underlag.';

 if(!['Normal','Passning','Löpning'].includes(lineup.tactics?.uppspel)||!['Normal','Kant','Mitten'].includes(lineup.tactics?.spelvag)||!['Normal','Korg','Mål'].includes(lineup.tactics?.skytte))return 'Ogiltig taktik.';

 return null;

}



