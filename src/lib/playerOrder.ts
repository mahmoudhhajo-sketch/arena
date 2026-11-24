type NumberedPlayer={shirtNumber?:number|null;name?:string;id?:number|string};
export function comparePlayerNumbers(a:NumberedPlayer,b:NumberedPlayer){
 const number=(p:NumberedPlayer)=>Number.isFinite(p.shirtNumber)&&Number(p.shirtNumber)>0?Number(p.shirtNumber):Infinity;
 const x=number(a),y=number(b);
 return (x===y?0:x<y?-1:1)||(a.name||'').localeCompare(b.name||'','sv')||String(a.id??'').localeCompare(String(b.id??''),'sv',{numeric:true});
}
export function playersByNumber<T extends NumberedPlayer>(players:readonly T[]):T[]{return [...players].sort(comparePlayerNumbers);}
