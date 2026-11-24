const names:Record<string,string>={Snabbhet:'Hinderbana',Passning:'Passet',Målvakt:'Vakten',Markering:'Brytet'};
/** Old saved results keep their scores and identities; only their display names change. */
export const imperialDisciplineName=(name:string)=>names[name]||name;
export const imperialDisciplineKey=(name:string)=>Object.keys(names).find(k=>names[k]===name)||name;
