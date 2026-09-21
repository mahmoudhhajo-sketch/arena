// Coordinates are global: the away side attacks towards row 2.
export function chainBlocksPass(active:boolean,period:number,side:'home'|'away',fromRow:number,fromCol:number,toRow:number,toCol:number){
 return active && period>=1 && period<=5 && fromRow===1 && fromCol===1 && toRow===(side==='home'?0:2) && (toCol===0||toCol===2);
}
