export const manaClusterGain=(mana:number)=>Math.min(300,Math.max(0,mana));
export function manaStoneIncome(items:any[],clubId:string,at:number){return items.filter(i=>i.clubId===clubId&&i.artifactId==='mana-stone'&&!i.listed&&!i.playerId&&(!i.acquiredAt||+new Date(i.acquiredAt)<=at)).length;}
export function quickrootPlayer(p:{currentInjury:number;form:number}){return {currentInjury:Math.max(0,Math.round((p.currentInjury-1)*1000)/1000),form:Math.min(16,p.form+1)};}
