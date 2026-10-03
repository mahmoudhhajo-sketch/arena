import {Express} from 'express';
import {db} from '../db';
import {players,clubs,matches} from '../db/schema';
import {records} from './records';
import {ARTIFACTS} from '../constants/market';

type Entry={category:string;before?:string;label:string;after?:string;entity?:{kind:'player'|'club'|'match';id:string|number}};
const number=(value:number)=>value.toLocaleString('sv-SE');
const played=(game:any)=>+new Date(game.playedAt||game.matchReport?.date||0);
const isWalkover=(game:any)=>(game.matchReport?.events||[]).some((event:any)=>String(event.id||'').startsWith('walkover')||/\bWO\b|walkover/i.test(event.text||''));
let cache:{until:number;entries:Entry[]}|null=null;

export function registerLore(app:Express){app.get('/api/lore',async(_req,res)=>{try{
 if(cache&&cache.until>Date.now())return res.json(cache.entries[Math.floor(Math.random()*cache.entries.length)]);
 const [allPlayers,allTeams,games,playerSales,artifactSales]=await Promise.all([db.select().from(players),db.select().from(clubs),db.select().from(matches),records('auction'),records('artifact-auction')]);
 const humanTeams=allTeams.filter(team=>!team.isBot),humanIds=new Set(humanTeams.map(team=>team.id));
 const teamById=new Map(allTeams.map(team=>[team.id,team])),playerById=new Map(allPlayers.map(player=>[player.id,player]));
 const humanGames=games.filter(game=>humanIds.has(game.homeClubId)&&humanIds.has(game.awayClubId));
 const entries:Entry[]=[
  {category:'Ur krönikorna',label:'Berunias första arena var en handelsgård. När den tredje korgen förstörde tullhuset förbjöd kejsaren fler än två sidokorgar.'},
  {category:'Ur krönikorna',label:'Skogsbyarnas alver syr löv på lagets resmantlar. Ett silverlöv betyder en bortaseger som ingen väntade sig.'},
  {category:'Ur krönikorna',label:'En dvärgdomare sägs ha blåst slutsignalen med en tekittel när visselpipan frös fast i skägget.'},
  {category:'Ur krönikorna',label:'I Mambenna anses det ge otur att putsa vänsterskon före högerskon på matchdagen.'},
  {category:'Ur krönikorna',label:'Kejsarens hovkock vägrar servera kålsoppa före tvekampen. Det räcker med en sorts oro på läktaren.'},
  {category:'Speltips',label:'Två reserver i samma ruta: den vänstra får första chansen när en spelare skadas.'},
  {category:'Speltips',label:'En stark skytt behöver inte vara en bra målvakt. Jämför positionspoängen när du väljer uppställning.'}
 ];
 const linkPlayer=(row:any):Entry['entity']=>playerById.has(Number(row?.id))?{kind:'player',id:Number(row.id)}:undefined;
 const linkClub=(id:string):Entry['entity']=>humanIds.has(id)?{kind:'club',id}:undefined;
 const pushPlayerRecord=(category:string,before:string,row:any,after:string)=>{if(row?.value>0)entries.push({category,before,label:row.name,entity:linkPlayer(row),after});};
 const richest=[...allPlayers].filter(player=>!player.isMercenary&&!player.isDeceased&&!!player.clubId&&humanIds.has(player.clubId)).sort((a,b)=>b.wage-a.wage)[0];
 if(richest)entries.push({category:'Spelarrekord',before:'Högst angiven spelarlön bland managerlagen har ',label:richest.name,entity:{kind:'player',id:richest.id},after:': '+number(richest.wage)+' guld.'});

 const matchRecords:{[key:string]:any}={goals:null,baskets:null,interceptions:null,assists:null,saves:null,fights:null};
 const seasonGoals=new Map<string,any>();
 for(const game of humanGames){const report:any=game.matchReport||{};for(const person of report.individualStats||[]){const stats=person.stats||{},candidates={goals:Number(stats.skott?.lyckade||0),baskets:Number(stats.korgskott?.lyckade||0),interceptions:Number(stats.brytningar?.lyckade||0),assists:Number(person.assists||0),saves:Number(stats.raddningar?.lyckade||0)+Number(stats.korgraddningar?.lyckade||0),fights:Number(stats.slagsmal?.vunna||0)};for(const [key,value] of Object.entries(candidates))if(!matchRecords[key]||value>matchRecords[key].value)matchRecords[key]={id:person.id,name:person.name,value,matchId:game.id};const seasonKey=game.season+'-'+person.id,row=seasonGoals.get(seasonKey)||{id:person.id,name:person.name,season:game.season,value:0};row.value+=candidates.goals;seasonGoals.set(seasonKey,row);}}
 pushPlayerRecord('Matchrekord','Flest vanliga mål av en spelare i samma match har ',matchRecords.goals,': '+matchRecords.goals?.value+'.');
 pushPlayerRecord('Matchrekord','Flest korgmål av en spelare i samma match har ',matchRecords.baskets,': '+matchRecords.baskets?.value+'.');
 pushPlayerRecord('Matchrekord','Flest lyckade brytningar av en spelare i samma match har ',matchRecords.interceptions,': '+matchRecords.interceptions?.value+'.');
 pushPlayerRecord('Matchrekord','Flest assist av en spelare i samma match har ',matchRecords.assists,': '+matchRecords.assists?.value+'.');
 pushPlayerRecord('Matchrekord','Flest räddningar av en spelare i samma match har ',matchRecords.saves,': '+matchRecords.saves?.value+'.');
 pushPlayerRecord('Matchrekord','Flest vunna slagsmål av en spelare i samma match har ',matchRecords.fights,': '+matchRecords.fights?.value+'.');
 const seasonScorer=[...seasonGoals.values()].sort((a,b)=>b.value-a.value)[0];
 if(seasonScorer?.value)entries.push({category:'Säsongsrekord',before:'Flest vanliga mål under en säsong har ',label:seasonScorer.name,entity:linkPlayer(seasonScorer),after:' gjort: '+seasonScorer.value+' under säsong '+seasonScorer.season+'.'});

 const scoredMatch=(game:any)=>(game.matchReport?.events||[]).filter((event:any)=>event.type==='GOAL_NORMAL'||event.type==='GOAL_BASKET').length;
 const injuredMatch=(game:any)=>(game.matchReport?.injuries?.home?.length||0)+(game.matchReport?.injuries?.away?.length||0);
 const bestCombined:any=[...humanGames].sort((a,b)=>scoredMatch(b)-scoredMatch(a))[0];
 if(bestCombined&&scoredMatch(bestCombined)>0)entries.push({category:'Matchrekord',before:'Flest mål och korgmål noterades i ',label:bestCombined.matchReport.homeClub.name+' – '+bestCombined.matchReport.awayClub.name,entity:{kind:'match',id:bestCombined.id},after:': '+scoredMatch(bestCombined)+'.'});
 const roughest:any=[...humanGames].sort((a,b)=>injuredMatch(b)-injuredMatch(a))[0];
 if(roughest&&injuredMatch(roughest)>0)entries.push({category:'Matchrekord',before:'Flest skador noterades i ',label:roughest.matchReport.homeClub.name+' – '+roughest.matchReport.awayClub.name,entity:{kind:'match',id:roughest.id},after:': '+injuredMatch(roughest)+'.'});
 const crowded:any=[...humanGames].sort((a:any,b:any)=>Number(b.matchReport?.attendance||0)-Number(a.matchReport?.attendance||0))[0];
 if(crowded?.matchReport?.attendance)entries.push({category:'Publikrekord',before:'Störst publik bland managerlagen hade ',label:teamById.get(crowded.homeClubId)?.name||crowded.matchReport.homeClub.name,entity:linkClub(crowded.homeClubId),after:': '+number(crowded.matchReport.attendance)+' åskådare.'});

 const streaks={historicLoss:{id:'',value:0},currentLoss:{id:'',value:0},historicWin:{id:'',value:0},currentWin:{id:'',value:0},unbeaten:{id:'',value:0}};
 const woWins=new Map<string,number>();
 for(const team of humanTeams){const ownGames=games.filter(game=>game.homeClubId===team.id||game.awayClubId===team.id).sort((a,b)=>played(a)-played(b));let losses=0,wins=0,unbeaten=0,maxLoss=0,maxWin=0,maxUnbeaten=0;for(const game of ownGames){const home=game.homeClubId===team.id,own=home?game.homeScore:game.awayScore,other=home?game.awayScore:game.homeScore;losses=own<other?losses+1:0;wins=own>other?wins+1:0;unbeaten=own>=other?unbeaten+1:0;maxLoss=Math.max(maxLoss,losses);maxWin=Math.max(maxWin,wins);maxUnbeaten=Math.max(maxUnbeaten,unbeaten);if(own>other&&isWalkover(game))woWins.set(team.id,(woWins.get(team.id)||0)+1);}if(maxLoss>streaks.historicLoss.value)streaks.historicLoss={id:team.id,value:maxLoss};if(losses>streaks.currentLoss.value)streaks.currentLoss={id:team.id,value:losses};if(maxWin>streaks.historicWin.value)streaks.historicWin={id:team.id,value:maxWin};if(wins>streaks.currentWin.value)streaks.currentWin={id:team.id,value:wins};if(maxUnbeaten>streaks.unbeaten.value)streaks.unbeaten={id:team.id,value:maxUnbeaten};}
 const pushClubRecord=(before:string,row:{id:string;value:number},after:string,category='Lagrekord')=>{const team=teamById.get(row.id);if(team&&row.value>0)entries.push({category,before,label:team.name,entity:linkClub(team.id),after});};
 pushClubRecord('Längsta förlustsviten genom tiderna bland managerlagen har ',streaks.historicLoss,': '+streaks.historicLoss.value+' matcher.');
 pushClubRecord('Längsta pågående förlustsviten har ',streaks.currentLoss,': '+streaks.currentLoss.value+' matcher.');
 pushClubRecord('Längsta segersviten genom tiderna bland managerlagen har ',streaks.historicWin,': '+streaks.historicWin.value+' matcher.');
 pushClubRecord('Längsta pågående segersviten har ',streaks.currentWin,': '+streaks.currentWin.value+' matcher.');
 pushClubRecord('Längsta sviten utan förlust bland managerlagen har ',streaks.unbeaten,': '+streaks.unbeaten.value+' matcher.');
 const woChampion=[...woWins].sort((a,b)=>b[1]-a[1])[0];if(woChampion)pushClubRecord('Flest segrar på walkover har ',{id:woChampion[0],value:woChampion[1]},': '+woChampion[1]+' segrar.');

 const completedPlayers=playerSales.filter((sale:any)=>sale.closed&&!sale.cancelled&&sale.bidderId),completedArtifacts=artifactSales.filter((sale:any)=>sale.closed&&!sale.cancelled&&sale.bidderId);
 const totalSold=new Map<string,number>(),totalBought=new Map<string,number>();
 for(const sale of [...completedPlayers,...completedArtifacts]){if(sale.sellerId&&humanIds.has(sale.sellerId))totalSold.set(sale.sellerId,(totalSold.get(sale.sellerId)||0)+Number(sale.price||0));if(humanIds.has(sale.bidderId))totalBought.set(sale.bidderId,(totalBought.get(sale.bidderId)||0)+Number(sale.price||0));}
 const bestSeller=[...totalSold].sort((a,b)=>b[1]-a[1])[0],bestBuyer=[...totalBought].sort((a,b)=>b[1]-a[1])[0];
 if(bestSeller)pushClubRecord('Mest guld genom försäljningar har ',{id:bestSeller[0],value:bestSeller[1]},' fått in: '+number(bestSeller[1])+' guld.','Transferrekord');
 if(bestBuyer)pushClubRecord('Mest guld på spelare och artefakter har ',{id:bestBuyer[0],value:bestBuyer[1]},' lagt: '+number(bestBuyer[1])+' guld.','Transferrekord');
 const recordSale=completedPlayers.filter((sale:any)=>!sale.sellerId||humanIds.has(sale.sellerId)).sort((a:any,b:any)=>b.price-a.price)[0];
 if(recordSale){const player=playerById.get(recordSale.playerId);entries.push({category:'Transferrekord',before:'Rikets dyraste spelarförsäljning är ',label:player?.name||'en tidigare spelare',entity:player?{kind:'player',id:player.id}:undefined,after:': '+number(recordSale.price)+' guld.'});}
 const artifactSale=completedArtifacts.filter((sale:any)=>!sale.sellerId||humanIds.has(sale.sellerId)).sort((a:any,b:any)=>b.price-a.price)[0];
 if(artifactSale){const buyer=humanIds.has(artifactSale.bidderId)?teamById.get(artifactSale.bidderId):null;entries.push({category:'Artefaktrekord',before:'Dyraste artefakten som sålts är ',label:ARTIFACTS.find(item=>item.id===artifactSale.artifactId)?.name||'en okänd artefakt',after:' för '+number(artifactSale.price)+' guld'+(buyer?' till '+buyer.name:'')+'.'});}
 cache={until:Date.now()+5*60_000,entries};
 res.json(entries[Math.floor(Math.random()*entries.length)]);
}catch(error:any){res.status(500).json({error:error.message});}});}
