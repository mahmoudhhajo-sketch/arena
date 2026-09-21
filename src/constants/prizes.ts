export function seasonPrize(tier:number,place:number){return Math.round(1000000/2**Math.max(0,tier)*([1,.65,.45,.3,.24][place-1]||0))}
