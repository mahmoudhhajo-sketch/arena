const parts:Record<string,[string[],string[]]>={
 Snabbhet:[['Vind','Storm','Grynings','Skymnings','Blixt'],['foten','fångaren','löparen','vandraren','språnget','steget','dansaren','vinge','skuggan','pilen']],
 Passning:[['Boll','Tråd','Silkes','Stjärn','Båg'],['vävaren','bindaren','mästaren','spinnaren','lotsen','sändaren','ritaren','trollaren','länken','formaren']],
 Skytte:[['Sol','Falk','Drak','Mån','Eld'],['ögat','pilen','siktet','träffen','skytten','spetsen','stötaren','lansen','slungan','klingan']],
 Målvakt:[['Järn','Berg','Granit','Sköld','Koppar'],['muren','väktaren','borgen','handen','porten','fästet','låset','vakten','pelaren','bastionen']],
 Tvekamp:[['Åsk','Stål','Varg','Jord','Ek'],['näven','brytaren','hammaren','tämjaren','greppet','kämpen','fällaren','kraften','duellanten','vrålet']]
};
export const LEGEND_NAMES=Object.fromEntries(Object.entries(parts).map(([k,[a,b]])=>[k,a.flatMap(x=>b.map(y=>x+y))]));
export function legendName(event:string,seed:number,used:string[]=[]){const all=LEGEND_NAMES[event]||LEGEND_NAMES.Tvekamp,available=all.filter(n=>!used.includes(n));const pool=available.length?available:all;return pool[Math.abs(seed)%pool.length]}
