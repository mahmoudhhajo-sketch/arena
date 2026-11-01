export function MatchRatingBadge({value}:{value?:number|null}){
 return <span className={'match-rating '+(value==null?'unrated':value>=8?'excellent':value<4?'poor':'')} title="Matchbetyg 0–10 utifrån prestation och position. Streck betyder att underlag saknas.">{value==null?'–':value.toFixed(1)}</span>;
}
