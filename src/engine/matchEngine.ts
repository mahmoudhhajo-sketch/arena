import {moraleFactor} from './economy';
import {attendanceDemand,arenaConfidence} from './economy';
import {describeEvent} from './commentary';
import {activeSpells,SPELLS,spellById} from '../constants/spells';
import {effectiveAttributes} from '../constants/market';
import {
  Club,
  DetailedCategoryStats,
  DetailedFightStats,
  FieldSlotAssignment,
  MatchEvent,
  MatchPeriodResult,
  MatchReport,
  PitchUnderlag,
  Player,
  TacticsConfig,
  TeamMatchStats,
} from '../types';

import {activeIds, reserveIds} from './lineup';
import {chainBlocksPass} from './tacticalMagic';

// Simple seeded PRNG for deterministic simulation
export class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min + 1));
  }
}

export interface ActivePlayerState {
  player: Player;
  slotKey: string;
  fieldRow: number; // -1 for goalBox, 0 = attack, 1 = midfield, 2 = defense
  fieldCol: number; // 0 = left, 1 = center, 2 = right
  currentInjury: number;
}

function emptyCategoryStats(): DetailedCategoryStats {
  return { antal: 0, lyckade: 0, lyckadeProcent: 0, viktat: 0 };
}

function emptyFightStats(): DetailedFightStats {
  return { antal: 0, startade: 0, vunna: 0, vunnaProcent: 0, viktat: 0 };
}

function emptyTeamStats(): TeamMatchStats {
  return {
    lopningar: emptyCategoryStats(),
    passningar: emptyCategoryStats(),
    mottagningar: emptyCategoryStats(),
    skott: emptyCategoryStats(),
    korgskott: emptyCategoryStats(),
    uppkast: { antal: 0, vunna: 0, vunnaProcent: 0, viktat: 0 },
    raddningar: emptyCategoryStats(),
    korgraddningar: emptyCategoryStats(),
    slagsmal: emptyFightStats(),
  };
}

function finalizeCategory(cat: DetailedCategoryStats) {
  cat.lyckadeProcent = cat.antal > 0 ? Math.round((cat.lyckade / cat.antal) * 1000) / 10 : 0;
}

export function cellStrength(values:number[]):number {
 const [best=0,second=0]=values.slice().sort((a,b)=>b-a);
 return best + second*(.25+.25*(best>0?second/best:0));
}
// Smooth, unbounded skill comparison: a huge mismatch is not flattened to 75/95%.
export function contestProbability(a:number,b:number){const x=Math.pow(Math.max(0,a)+.35,1.7),y=Math.pow(Math.max(0,b)+.35,1.7);return x/(x+y)}
export function simulateMatch(
  homeClub: Club,
  awayClub: Club,
  homePlayers: Player[],
  awayPlayers: Player[],
  seed = Date.now(),
  underlag: PitchUnderlag = 'Gräs',
  weatherInput?: { temp: number; condition: string; wind: number; basketsBlocked?:boolean;chainsBlocked?:boolean;spells?:string[] },
  crowdEffects:{portSurcharge:number;fanFactor:number}={portSurcharge:0,fanFactor:1}
): MatchReport {
  const rng = new SeededRNG(seed);

  const weather = weatherInput || {
    temp: 6 + rng.nextInt(-3, 14),
    condition: rng.next() > 0.6 ? 'Regn' : rng.next() > 0.3 ? 'Molnigt' : 'Klart',
    wind: rng.nextInt(1, 8),
  };

  const attendance=Math.round(calculateAttendance(homeClub,awayClub,(homeClub.lineup?.intrade??8)+crowdEffects.portSurcharge,homeClub.arena?.capacity||30000,rng.next())*crowdEffects.fanFactor);
  // Build active field squads (Starters & Reserves)
  function buildSquad(
    club: Club,
    allPlayers: Player[],
    side: 'home' | 'away'
  ): {
    active: ActivePlayerState[];
    reservesBySlot: Map<string, Player[]>;
    walkover: boolean;
  } {
    const active: ActivePlayerState[] = [];
    const reservesBySlot = new Map<string, Player[]>();
    const usedIds = new Set<number>();
    const allActiveIds=new Set(Object.values(club.lineup?.slots||{}).flatMap(activeIds));
    const morale=moraleFactor((club as any).morale??100);

    // The manager's formation is authoritative. Never auto-fill empty slots.
    // Each cell can contain two active players plus two ordered reserves.
    const slots = club.lineup?.slots || {};
    for (const [slotKey, assignment] of Object.entries(slots)) {
      if (!assignment) continue;

      for (const starterId of activeIds(assignment)) {
        const candidates=[starterId,...reserveIds(assignment)];
        const p=candidates.map(id=>allPlayers.find(pl=>pl.id===id&&!usedIds.has(id)&&pl.currentInjury===0&&!pl.isDeceased)).find(Boolean);
        if (p) {
          let fieldRow = 1;
          let fieldCol = 1;
          if (slotKey === 'goal') {
            fieldRow = side === 'home' ? 2 : 0;
            fieldCol = 1;
          } else {
            const [row, col] = slotKey.split('-').map(Number);
            fieldRow = Number.isFinite(row) ? (side==='away'?2-row:row) : 1;
            fieldCol = Number.isFinite(col) ? (side==='away'?2-col:col) : 1;
          }

          active.push({
            player: { ...p, form:Math.min(16,p.form+activeSpells(p.artifacts).reduce((a,s)=>a+(s.form||0),0)), attributes:Object.fromEntries(Object.entries(effectiveAttributes(p)).map(([k,v])=>[k,v*morale])) as any },
            slotKey,
            fieldRow,
            fieldCol,
            currentInjury: 0,
          });
          usedIds.add(p.id);
        }
      }

      for (const reserveId of reserveIds(assignment)) {
        const reserve = allPlayers.find(
          (pl) => pl.id === reserveId && pl.currentInjury === 0 && !pl.isDeceased
        );
        if (reserve && !allActiveIds.has(reserve.id) && !usedIds.has(reserve.id)) {
          reservesBySlot.set(slotKey, [...(reservesBySlot.get(slotKey)||[]),reserve]);

        }
      }
    }

    const walkover = active.length < 6;
    return { active, reservesBySlot, walkover };
  }

  const homeSquad = buildSquad(homeClub, homePlayers, 'home');
  const awaySquad = buildSquad(awayClub, awayPlayers, 'away');

  const initialLineups={home:homeSquad.active.map(a=>({id:a.player.id,number:a.player.shirtNumber,name:a.player.name,slot:a.slotKey,position:a.player.nominalPosition})),away:awaySquad.active.map(a=>({id:a.player.id,number:a.player.shirtNumber,name:a.player.name,slot:a.slotKey,position:a.player.nominalPosition}))};
  const individualStats:Record<number,any>={};
  for(const [side,squad] of [['home',homePlayers],['away',awayPlayers]] as const)for(const p of squad)individualStats[p.id]={id:p.id,name:p.name,race:p.race,number:p.shirtNumber,side,stats:emptyTeamStats()};
  const inc=(p:ActivePlayerState,k:string,field='antal')=>{individualStats[p.player.id].stats[k][field]++};
  const fatigue=new Map<number,number>();
  const effort=(p:ActivePlayerState,cost:number)=>fatigue.set(p.player.id,(fatigue.get(p.player.id)||0)+cost*(10/Math.max(1,(homeSquad.active.some(a=>a.player.id===p.player.id)?homeSquad:awaySquad).active.length))*(1+Math.max(0,weather.temp-23)*.035+(weather.condition==='Regn'?.06:0))/(1+p.player.attributes.kondition*.14));
  const skill=(p:ActivePlayerState,k:string)=>Math.max(0,Number((p.player.attributes as any)[k]))*(.75+p.player.form/64)*Math.max(.55,1-(fatigue.get(p.player.id)||0))*(k==='aggressivitet'||k==='tuffhet'?1:arenaConfidence(p.player.attributes.tuffhet,homeClub.arena?.ara||0,homeClub.arena?.skrack||0,attendance,homeSquad.active.includes(p)).multiplier);
  const local=(squad:ActivePlayerState[],row:number,col:number)=>squad.filter(p=>p.slotKey!=='goal'&&p.fieldRow===row&&p.fieldCol===col);
  const pickWeighted=(pool:ActivePlayerState[],weights:number[])=>{let roll=rng.next()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<pool.length;i++){roll-=weights[i];if(roll<=0)return pool[i]}return pool[pool.length-1]};
  const distance=(p:ActivePlayerState,row:number,col:number)=>Math.abs(p.fieldRow-row)+Math.abs(p.fieldCol-col);
  const choose=(squad:ActivePlayerState[],row:number,col:number)=>{const out=squad.filter(p=>p.slotKey!=='goal'),pool=out.length?out:squad;return pickWeighted(pool,pool.map(p=>(.3+skill(p,'speluppfattning')*(p.slotKey.endsWith('-1')?.4:.08)+skill(p,'teknik')*.3+skill(p,'snabbhet')*.3)/Math.pow(1+distance(p,row,col),3)))};
  const support=(squad:ActivePlayerState[],actor:ActivePlayerState,k:string)=>cellStrength(local(squad,actor.fieldRow,actor.fieldCol).filter(p=>p!==actor).map(p=>skill(p,k)))*.35;
  const pressure=(squad:ActivePlayerState[],row:number,col:number)=>{const values=squad.filter(p=>p.slotKey!=='goal').map(p=>(skill(p,'markering')+.3*skill(p,'snabbhet')+.15*skill(p,'speluppfattning'))/Math.pow(1+distance(p,row,col),2.7));return cellStrength(values)};
  const lane=(side:'home'|'away',row:number)=>{const tactic=(side==='home'?homeClub:awayClub).lineup?.tactics?.spelvag;const defenders=side==='home'?awaySquad.active:homeSquad.active;const weights=[0,1,2].map(col=>(tactic==='Kant'?(col===1?.4:2):tactic==='Mitten'?(col===1?3:.5):1)/(1+pressure(defenders,row,col)*.05));let roll=rng.next()*weights.reduce((a,b)=>a+b,0);for(let col=0;col<3;col++){roll-=weights[col];if(roll<=0)return col}return 2;};
  const chance=(a:number,b:number)=>rng.next()<contestProbability(a,b);
  const weighted=(p:ActivePlayerState,key:string,a:number,b:number,other?:ActivePlayerState,otherKey?:string)=>{const probability=contestProbability(a,b);let success=rng.next()<probability;if(success&&other&&luck(other,['skott','korgskott'].includes(key)?'skott':key==='slagsmal'?'duell':'brytning'))success=false;else if(!success&&luck(p,['skott','korgskott'].includes(key)?'avslut':key==='slagsmal'?'duell':'boll'))success=true;individualStats[p.player.id].stats[key].viktat+=(Number(success)-probability)*100;if(other&&otherKey)individualStats[other.player.id].stats[otherKey].viktat+=(Number(!success)-(1-probability))*100;return success;};
  const unavailable=new Set<number>();
  const homeStats = emptyTeamStats();
  const awayStats = emptyTeamStats();
  const events: MatchEvent[] = [];
  let luckPeriod=0,luckMinute=0;
  const luckUses=new Map<number,number>();
  const matchHeat=.45+1.5*Math.pow(rng.next(),2);
  const luck=(p:ActivePlayerState,reason:string)=>{
   const side=homeSquad.active.includes(p)?'home':'away';
   if(!p.player.artifacts.includes('luck-amulet')||(luckUses.get(p.player.id)||0)>=2||rng.next()>=.35)return false;
   luckUses.set(p.player.id,(luckUses.get(p.player.id)||0)+1);
   events.push({id:'luck-'+p.player.id+'-'+luckUses.get(p.player.id),period:luckPeriod,minute:luckMinute,type:'LUCK',teamSide:side,playerId:p.player.id,playerName:p.player.name,text:reason==='skada'?p.player.name+' snubblar undan i sista ögonblicket. Turamuletten glimmar och slaget som borde ha skadat spelaren träffar tom luft.':reason==='skott'?p.player.name+' ser bollen ändra riktning i en osannolik studs. Bollen som var på väg in styrs undan medan turamuletten glimmar.':reason==='duell'?p.player.name+' undkommer motståndarens grepp när en fot halkar. Turamuletten glimmar och närkampen tar en oväntad vändning.':reason==='brytning'?p.player.name+' får en lycklig studs till skänks. Turamuletten glimmar och motståndarens övertag försvinner.':reason==='boll'?p.player.name+' får bollen med sig genom en osannolik lucka. Turamuletten glimmar och det förlorade bollmomentet vänds.':p.player.name+' får en otrolig medstuds. Turamuletten glimmar när det hopplösa avslutet hittar rätt.',important:true} as any);
   return true;
  };
  let ballHolder:number|undefined,lastPossession:string|undefined;
  let lastPass:{id:number;receiver:number;side:string;minute:number;weighted:number}|null=null;
  const assist=(shooter:ActivePlayerState,side:string,minute:number)=>{
    if(!lastPass||lastPass.side!==side||lastPass.receiver!==shooter.player.id||minute-lastPass.minute>1.5||lastPass.id===shooter.player.id)return {};
    const p=individualStats[lastPass.id];p.assists=(p.assists||0)+1;p.assistWeighted=(p.assistWeighted||0)+lastPass.weighted;
    return {assistPlayerId:p.id,assistPlayerName:p.name};
  };
  const periodScores: MatchPeriodResult[] = [];
  const homeInjuries: Array<{ playerName: string; severity: number; playerId?: number }> = [];
  const awayInjuries: Array<{ playerName: string; severity: number; playerId?: number }> = [];

  for(const [side,ps] of [['home',homePlayers],['away',awayPlayers]] as const)for(const p of ps.filter(p=>!p.isDeceased))for(const spell of activeSpells(p.artifacts))events.push({id:'magic-'+side+'-'+p.id+'-'+spell.id,period:0,minute:0,type:'PREMATCH',teamSide:side,playerId:p.id,playerName:p.name,text:p.name+({'elf':' står stilla medan löven viskar kring spelarens händer. ','orc':' slår näven mot bröstet medan en mörkröd glöd vaknar under huden. ','dwarf':' tecknar en runa i marken; stenen svarar med ett dovt dån. ','human':' höjer blicken mot läktarnas baner när ett blekt sken samlas kring axlarna. ','goblin':' knyter en vindlande tråd kring handleden och ler åt något ingen annan kan se. ','troll':' böjer huvudet; ett uråldrigt muller tycks stiga ur jorden. '}[p.race]||' känner en främmande kraft vakna. ')+spell.name+' har väckts inför avkast.',important:true} as any);
  for(const [side,squad] of [['home',homeSquad],['away',awaySquad]] as const){const eligible=new Set([...squad.active.map(p=>p.player.id),...Array.from(squad.reservesBySlot.values()).flat().map(p=>p.id)]);for(const p of (side==='home'?homePlayers:awayPlayers).filter(p=>eligible.has(p.id)))if(p.artifacts.some(a=>a.startsWith('effect:dragon-blood:')&&Number(a.split(':')[2])>Date.now()))events.push({id:'dragon-'+p.id,period:0,minute:0,type:'PREMATCH',teamSide:side,playerId:p.id,playerName:p.name,text:p.name+' bär ännu drakblodets hetta i ådrorna. Brygdens kraft följer spelaren in i matchen.',important:true} as any);}
  for(const id of weatherInput?.spells||[])events.push({id:'magic-arena-'+id,period:0,minute:0,type:'PREMATCH',teamSide:'neutral',text:(spellById(id)?.name||id)+' sveper över arenan. Läktarnas sorl sjunker när den osynliga kraften drar genom portar och målringar inför avkast.',important:true} as any);
  if(crowdEffects.portSurcharge>0)events.push({id:'imperial-gates',period:0,minute:0,type:'PREMATCH',teamSide:'neutral',text:'Kejsarens män väntar vid arenans portar. Deras extra avgift får en del av supportrarna att vända hem innan avkast.',important:true} as any);
  // Check walkover condition (Section 12 & 53)
  if (homeSquad.walkover || awaySquad.walkover) {
    const homeWon = awaySquad.walkover;
    const finalScore = homeWon ? { home: 5, away: 0 } : { home: 0, away: 5 };
    events.push({
      id: 'walkover',
      period: 1,
      minute: 0,
      type: 'MATCH_END',
      teamSide: homeWon ? 'home' : 'away',
      text: homeWon
        ? `${awayClub.name} kunde inte ställa upp med minst 6 spelare och förlorar på walkover (5-0)!`
        : `${homeClub.name} kunde inte ställa upp med minst 6 spelare och förlorar på walkover (0-5)!`,
      scoreAfter: finalScore,
    });


    return {
      engineVersion:19,id: `match-${seed}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      division: homeClub.division || 'Kejsarserien',
      arenaName: homeClub.arena?.name || 'Mintrion',
      weather,
      attendance,portSurcharge:crowdEffects.portSurcharge,
      ticketPrice: homeClub.lineup?.intrade ?? 8,
      homeClub: { id: homeClub.id, name: homeClub.name, race: homeClub.race },
      awayClub: { id: awayClub.id, name: awayClub.name, race: awayClub.race },
      periodScores,
      finalScore,
      events,
      homeStats,
      awayStats,
      tactics: {
        home: homeClub.lineup?.tactics || { uppspel: 'Normal', spelvag: 'Normal', skytte: 'Normal' },
        away: awayClub.lineup?.tactics || { uppspel: 'Normal', spelvag: 'Normal', skytte: 'Normal' },
      },
      injuries: { home: [], away: [] },
      ballDistribution: [
        [10, 15, 10],
        [10, 20, 10],
        [10, 10, 5],
      ],
      startingLineups: {
        home: initialLineups.home,
        away: initialLineups.away,
      },
    };
  }

  // Ball distribution counters (3x3 grid)
  const cellTouches = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  let totalHomeMatchPoints = 0;
  let totalAwayMatchPoints = 0;

  // 5 PERIODS SIMULATION (Section 14 & 53)
  let forfeit:'home'|'away'|null=null;
  for (let period = 1; period <= 5; period++) {
    if(period===5){
      for(const [side,squad,club,players] of [['home',homeSquad,homeClub,homePlayers],['away',awaySquad,awayClub,awayPlayers]] as const){
        for(const outgoing of [...squad.active]){
          if(!activeSpells(outgoing.player.artifacts).some(s=>s.id==='shadow-substitution'))continue;
          const reserveId=reserveIds(club.lineup.slots[outgoing.slotKey])[0];
          const sub=players.find(p=>p.id===reserveId&&!p.isDeceased&&p.currentInjury===0&&!unavailable.has(p.id)&&!squad.active.some(a=>a.player.id===p.id));
          if(!sub){events.push({id:'shadow-missed-'+outgoing.player.id,period,minute:60,type:'PREMATCH',teamSide:side,playerId:outgoing.player.id,playerName:outgoing.player.name,text:outgoing.player.name+' väntar vid skuggornas rand, men den utsedda förstareserven är inte tillgänglig. Skuggbytet uteblir.',important:true} as any);continue;}
          const old=outgoing.player;unavailable.add(old.id);
          const morale=moraleFactor((club as any).morale??100);
          outgoing.player={...sub,form:Math.min(16,sub.form+activeSpells(sub.artifacts).reduce((a,s)=>a+(s.form||0),0)),attributes:Object.fromEntries(Object.entries(effectiveAttributes(sub)).map(([k,v])=>[k,v*morale])) as any};
          events.push({id:'shadow-sub-'+old.id,period,minute:60,type:'SUBSTITUTION',teamSide:side,playerId:sub.id,playerName:sub.name,opponentPlayerId:old.id,opponentPlayerName:old.name,slot:outgoing.slotKey,shirtNumber:sub.shirtNumber,text:'Inför sista perioden drar en slöja av lövskuggor över planen. '+old.name+' kliver ur skenet och '+sub.name+' tar spelarens plats genom Skuggbyte.',important:true} as any);
        }
      }
    }
    for(const [id,value] of fatigue)fatigue.set(id,value*.75);
    let homeRaw = 0;
    let awayRaw = 0;

    // Basket ownership resets each period (Section 13 & 53)
    let leftBasketOwner: 'home' | 'away' | null = null;
    let rightBasketOwner: 'home' | 'away' | null = null;

    events.push({
      id: `p${period}-start`,
      period,
      minute: (period - 1) * 15,
      type: 'PERIOD_START',
      teamSide: 'neutral',
      text: `Period ${period} blåses igång av domaren.`,
    });

    const resetPositions=()=>{for(const [side,squad] of [['home',homeSquad],['away',awaySquad]] as const)for(const a of squad.active){const [row,col]=a.slotKey==='goal'?[2,1]:a.slotKey.split('-').map(Number);a.fieldRow=side==='away'?2-row:row;a.fieldCol=side==='away'?2-col:col;}};
    // Helper: Execute Uppkast (jump ball)
    function doUppkast(min: number): 'home' | 'away' {
      resetPositions();ballHolder=undefined;lastPass=null;lastPossession=undefined;
      homeStats.uppkast.antal++;
      awayStats.uppkast.antal++;

      const central=(squad:ActivePlayerState[])=>{const mids=squad.filter(p=>p.slotKey==='1-1');const pool=mids.length?mids:squad.filter(p=>p.slotKey!=='goal');return (pool.length?pool:squad).sort((a,b)=>(skill(b,'teknik')*.65+skill(b,'speluppfattning')*.35)-(skill(a,'teknik')*.65+skill(a,'speluppfattning')*.35)).slice(0,mids.length?2:1)};
      const hMids=central(homeSquad.active),aMids=central(awaySquad.active),hCandidate=hMids[0],aCandidate=aMids[0];
      const jump=(m:ActivePlayerState[])=>cellStrength(m.map(p=>(skill(p,'teknik')*.65+skill(p,'speluppfattning')*.35)*(p.slotKey==='1-1'?1:.45)));
      const homeWins=weighted(hCandidate,'uppkast',jump(hMids),jump(aMids),aCandidate,'uppkast');
      inc(hCandidate,'uppkast');inc(aCandidate,'uppkast');inc(homeWins?hCandidate:aCandidate,'uppkast','vunna');
      const winner=homeWins?'home':'away';
      if (winner === 'home') {
        homeStats.uppkast.vunna++;
        events.push({
          id: `uppkast-${period}-${min}-${rng.nextInt(1, 9999)}`,
          period,
          minute: min,
          type: 'UPPKAST',
          teamSide: 'home',
          playerId: hCandidate.player.id,
          playerName: hCandidate.player.name,
          text: `${hCandidate.player.name} vinner uppkastet med en elegant teknisk manöver!`,
        });
      } else {
        awayStats.uppkast.vunna++;
        events.push({
          id: `uppkast-${period}-${min}-${rng.nextInt(1, 9999)}`,
          period,
          minute: min,
          type: 'UPPKAST',
          teamSide: 'away',
          playerId: aCandidate.player.id,
          playerName: aCandidate.player.name,
          text: `${aCandidate.player.name} kastar sig upp och sliter åt sig den kedjade bollen i uppkastet!`,
        });
      }
      return winner;
    }

    // Start with Uppkast
    let possession: 'home'|'away' = homeSquad.active.length&&awaySquad.active.length?doUppkast((period - 1) * 15):homeSquad.active.length?'home':'away';
    let ballRow = 1;
    let ballCol = lane(possession,1);

    // Simulate roughly 10-15 possession phases per period (~15 minutes)
    for (let phase = 1; phase <= 30; phase++) {
      const currentMinute = (period - 1) * 15 + Math.min(15, Math.floor((phase / 30) * 15));
      luckPeriod=period;luckMinute=currentMinute;
      if(homeSquad.active.length<6||awaySquad.active.length<6){forfeit=homeSquad.active.length<6?'away':'home';events.push({id:'walkover-during',period,minute:currentMinute,type:'MATCH_END',teamSide:'neutral',text:`Domaren avbryter matchen: ${forfeit==='home'?awayClub.name:homeClub.name} har färre än sex spelbara spelare. ${forfeit==='home'?homeClub.name:awayClub.name} vinner på WO med 5–0.`,important:true} as any);break;}
      if(phase>1&&rng.next()<.09){possession=possession==='home'?'away':'home';ballHolder=undefined;lastPass=null;ballRow=1;ballCol=rng.nextInt(0,2);if(phase%3===0)events.push({id:'restart-'+period+'-'+phase,period,minute:currentMinute,type:'RESTART',teamSide:'neutral',text:'Bollen slits ur trängseln och studsar tillbaka mot mittzonen. Motståndarna kastar sig fram och tar hand om den lösa kedjan.',important:true} as any);}
      if(phase===8||phase===22){const side=possession,squad=side==='home'?homeSquad:awaySquad;const p=squad.active[rng.nextInt(0,squad.active.length-1)];const mood=arenaConfidence(p.player.attributes.tuffhet,homeClub.arena?.ara||0,homeClub.arena?.skrack||0,attendance,side==='home');if(rng.next()<mood.fear){fatigue.set(p.player.id,(fatigue.get(p.player.id)||0)+.015);events.push({id:'fear-'+period+'-'+phase,period,minute:currentMinute,type:'ATMOSPHERE',teamSide:side,playerId:p.player.id,playerName:p.player.name,text:p.player.name+' kastar en orolig blick mot arenans mörka portar. Stegen blir tveksamma när läktarnas dån rullar över planen.',important:true} as any)}else if(rng.next()<mood.courage+mood.support){events.push({id:'courage-'+period+'-'+phase,period,minute:currentMinute,type:'ATMOSPHERE',teamSide:side,playerId:p.player.id,playerName:p.player.name,text:p.player.name+' rätar på ryggen under arenans segerbaner. Med nytt mod vågar spelaren söka en öppning i motståndarnas uppställning.',important:true} as any)}}
      cellTouches[ballRow][ballCol]++;

      const attackSquad = possession === 'home' ? homeSquad : awaySquad;
      const defendSquad = possession === 'home' ? awaySquad : homeSquad;
      const attackStats = possession === 'home' ? homeStats : awayStats;
      const defendStats = possession === 'home' ? awayStats : homeStats;
      const tactics = possession === 'home' ? homeClub.lineup?.tactics : awayClub.lineup?.tactics;

      // Either side can initiate violence, including a team without possession.
      const fightSide=rng.next()<.5?'home':'away',fightSquad=fightSide==='home'?homeSquad:awaySquad,opponentSquad=fightSide==='home'?awaySquad:homeSquad;
      const fightStats=fightSide==='home'?homeStats:awayStats,opponentStats=fightSide==='home'?awayStats:homeStats;
      const fighterCandidate = fightSquad.active[rng.nextInt(0,fightSquad.active.length-1)];
      if(fighterCandidate&&opponentSquad.active.length&&rng.next()<Math.min(.65,matchHeat*(.025+Math.max(0,fighterCandidate.player.attributes.aggressivitet)*.012))){
        const defender=choose(opponentSquad.active,fighterCandidate.fieldRow,fighterCandidate.fieldCol);
        inc(fighterCandidate,'slagsmal');inc(defender,'slagsmal');inc(fighterCandidate,'slagsmal','startade');
        fightStats.slagsmal.antal++;opponentStats.slagsmal.antal++;fightStats.slagsmal.startade++;
        effort(fighterCandidate,.025);effort(defender,.02);
        const ap=skill(fighterCandidate,'tuffhet')*.85+skill(fighterCandidate,'aggressivitet')*.15;
        const dp=skill(defender,'tuffhet')*.85+skill(defender,'aggressivitet')*.15;
        const attackingWins=weighted(fighterCandidate,'slagsmal',ap,dp,defender,'slagsmal');
        const winner=attackingWins?fighterCandidate:defender,loser=attackingWins?defender:fighterCandidate;
        const loserSquad=attackingWins?opponentSquad:fightSquad,winnerSide=attackingWins?fightSide:fightSide==='home'?'away':'home',loserSide=winnerSide==='home'?'away':'home';
        inc(winner,'slagsmal','vunna');(attackingWins?fightStats:opponentStats).slagsmal.vunna++;
        const injuryChance=injuryProbability(skill(winner,'tuffhet'),skill(loser,'tuffhet'));
        const injured=!activeSpells(loser.player.artifacts).some(s=>s.immune)&&rng.next()<injuryChance&&!luck(loser,'skada');
        events.push({id:'fight-'+period+'-'+phase,period,minute:currentMinute,type:'FIGHT_RESULT',teamSide:winnerSide,playerName:winner.player.name,playerId:winner.player.id,opponentPlayerName:loser.player.name,opponentPlayerId:loser.player.id,text:injured?`${winner.player.name} vann närkampen. ${loser.player.name} blev liggande och behövde hjälp av bårbärarna.`:`${winner.player.name} fick övertaget mot ${loser.player.name}, men båda kunde fortsätta.`,important:injured} as any);
        if(injured){
          const old=loser.player,slot=loser.slotKey,severity=rng.nextInt(1,3);unavailable.add(old.id);
          (loserSide==='home'?homeInjuries:awayInjuries).push({playerId:old.id,playerName:old.name,severity});
          const queue=loserSquad.reservesBySlot.get(slot)||[];let sub:Player|undefined;
          while(queue.length&&!sub){const candidate=queue.shift()!;if(!unavailable.has(candidate.id)&&!loserSquad.active.some(p=>p.player.id===candidate.id))sub=candidate}
          if(sub){const reserveMorale=moraleFactor(((loserSide==='home'?homeClub:awayClub) as any).morale??100);loser.player={...sub,form:Math.min(16,sub.form+activeSpells(sub.artifacts).reduce((a,s)=>a+(s.form||0),0)),attributes:Object.fromEntries(Object.entries(effectiveAttributes(sub)).map(([k,v])=>[k,v*reserveMorale])) as any};
            events.push({id:'sub-'+period+'-'+phase,period,minute:currentMinute,type:'SUBSTITUTION',teamSide:loserSide,playerId:sub.id,playerName:sub.name,opponentPlayerId:old.id,opponentPlayerName:old.name,text:`${sub.name} sprang in när ${old.name} lämnade planen.`,slot,shirtNumber:sub.shirtNumber} as any);
          }else{loserSquad.active.splice(loserSquad.active.indexOf(loser),1);events.push({id:'inj-'+period+'-'+phase,period,minute:currentMinute,type:'INJURY',teamSide:loserSide,playerId:old.id,playerName:old.name,text:`${old.name} lämnade planen skadad. Laget fortsätter med en spelare mindre.`,slot} as any)}
        }
      }
      if(homeSquad.active.length<6||awaySquad.active.length<6){forfeit=homeSquad.active.length<6?'away':'home';events.push({id:'walkover-during',period,minute:currentMinute,type:'MATCH_END',teamSide:'neutral',text:`Domaren avbryter matchen: ${forfeit==='home'?awayClub.name:homeClub.name} har färre än sex spelbara spelare. ${forfeit==='home'?homeClub.name:awayClub.name} vinner på WO med 5–0.`,important:true} as any);break;}

      // Action: Run, Pass, or Shoot based on field position and tactics
      if(lastPossession!==possession){ballHolder=undefined;lastPass=null;}lastPossession=possession;
      if(!attackSquad.active.some(p=>p.player.id===ballHolder)){
        const claimant=choose(attackSquad.active,ballRow,ballCol),reach=distance(claimant,ballRow,ballCol);
        if(reach>0&&rng.next()>contestProbability(skill(claimant,'snabbhet')/(1+reach),pressure(defendSquad.active,ballRow,ballCol))){possession=possession==='home'?'away':'home';ballHolder=undefined;continue}
        ballHolder=claimant.player.id;claimant.fieldRow=ballRow;claimant.fieldCol=ballCol;effort(claimant,.014*reach);
      }
      const inAttackingThird = (possession === 'home' && ballRow === 0) || (possession === 'away' && ballRow === 2);
      const isMidfield = ballRow === 1;

      // Shooting Decision (Goal or Basket)
      if (rng.next() < (inAttackingThird?.8:isMidfield?.38:.06)) {
        const ownedBaskets=Number(leftBasketOwner===possession)+Number(rightBasketOwner===possession);
        const basketBias=tactics?.skytte==='Korg'?.76:tactics?.skytte==='Mål'?.25:isMidfield?.6:.42;
        const wantsBasket = !(weather as any).basketsBlocked && rng.next() < basketBias*(ownedBaskets===2?.5:ownedBaskets===1?.75:1);

        if (wantsBasket) {
          // Basket shot (Korgskott)
          attackStats.korgskott.antal++;
          defendStats.korgraddningar.antal++;
          const shooter = attackSquad.active.find(p=>p.player.id===ballHolder)||choose(attackSquad.active,ballRow,ballCol);
          const sideBasketCol = leftBasketOwner===possession&&rightBasketOwner!==possession?2:rightBasketOwner===possession&&leftBasketOwner!==possession?0:ballCol===0?0:2;
          // Defender is wing midfielder on that side
          const defender = defendSquad.active.find((a) => a.fieldRow === 1 && a.fieldCol === sideBasketCol) || defendSquad.active[0];

          const shotSkill = skill(shooter,'skott') * .7 - weather.wind*.08 + skill(shooter,'snabbhet') * 0.3 + rng.next() * 5;
          const saveSkill = skill(defender,'malvakt') * 0.7 + skill(defender,'snabbhet') * 0.3 + rng.next() * 5;

          inc(shooter,'korgskott');inc(defender,'korgraddningar');effort(shooter,.012);
          if (weighted(shooter,'korgskott',Math.max(.1,shotSkill+support(attackSquad.active,shooter,'speluppfattning')-pressure(defendSquad.active,ballRow,ballCol)*.2),saveSkill*.55+.7+(activeSpells(defender.player.artifacts).some(s=>s.matchEffect==='baskets')?80:0),defender,'korgraddningar')) {
            inc(shooter,'korgskott','lyckade');
            attackStats.korgskott.lyckade++;
            if (possession === 'home') {
              homeRaw += 1;
              if (sideBasketCol === 0) leftBasketOwner = 'home';
              else rightBasketOwner = 'home';
            } else {
              awayRaw += 1;
              if (sideBasketCol === 0) leftBasketOwner = 'away';
              else rightBasketOwner = 'away';
            }

            shooter.player.basketGoals = (shooter.player.basketGoals || 0) + 1;

            events.push({
              id: `basket-${period}-${currentMinute}`,
              period,
              minute: currentMinute,
              type: 'GOAL_BASKET', ...assist(shooter,possession,currentMinute),
              teamSide: possession,
              playerId: shooter.player.id,
              playerName: shooter.player.name,
              text: `${shooter.player.name} kastar med grym precision den kedjade bollen rakt i sidokorgen! (1 poäng och korginnehav)`,
              scoreAfter: { home: homeRaw, away: awayRaw },
              basketsAfter: { leftOwner: leftBasketOwner, rightOwner: rightBasketOwner },
            });

            // Score always triggers Uppkast (Section 13 & 53)
            lastPass=null;ballHolder=undefined;possession = doUppkast(currentMinute);
            ballRow = 1;
            ballCol = lane(possession,1);
            continue;
          } else {
            inc(defender,'korgraddningar','lyckade');
            defendStats.korgraddningar.lyckade++;
            events.push({
              id: `basket-save-${period}-${currentMinute}`,
              period,
              minute: currentMinute,
              type: 'SAVE_BASKET',
              teamSide: possession === 'home' ? 'away' : 'home',
              playerName: defender.player.name, playerId: defender.player.id,
              text: `${defender.player.name} slänger sig heroiskt vid sidokorgen och blockerar korgskottet från ${shooter.player.name}!`,
            });
            possession = possession === 'home' ? 'away' : 'home';
            continue;
          }
        } else {
          // Normal Goal shot (Skott på mål)
          attackStats.skott.antal++;
          
          const shooter = attackSquad.active.find(p=>p.player.id===ballHolder)||choose(attackSquad.active,ballRow,ballCol);
          const keeperPresent=defendSquad.active.some(a=>a.slotKey==='goal');
          const goalkeeper = defendSquad.active.find((a) => a.slotKey === 'goal') || defendSquad.active[0];

          const shotRating = skill(shooter,'skott') * (weather.condition==='Dimma'?.6:.8) - weather.wind*.06 + skill(shooter,'speluppfattning') * (shooter.slotKey.endsWith('-1')?.25:.04);
          const saveRating = keeperPresent?skill(goalkeeper,'malvakt')*.8+skill(goalkeeper,'passning')*.2:0;

          inc(shooter,'skott');if(keeperPresent){inc(goalkeeper,'raddningar');defendStats.raddningar.antal++;}effort(shooter,.012);
          if (weighted(shooter,'skott',Math.max(.1,shotRating+support(attackSquad.active,shooter,'speluppfattning')-pressure(defendSquad.active,ballRow,ballCol)*.2),saveRating*1.05+(keeperPresent?(inAttackingThird?1:4.5):.2),keeperPresent?goalkeeper:undefined,'raddningar')) {
            inc(shooter,'skott','lyckade');
            attackStats.skott.lyckade++;

            // Normal goal scoring rules (Section 13 & 53):
            // 0 baskets owned: 3 pts
            // 1 basket owned: 4 pts
            // 2 baskets owned: 5 pts
            let basketsOwned = 0;
            if (possession === 'home') {
              if (leftBasketOwner === 'home') basketsOwned++;
              if (rightBasketOwner === 'home') basketsOwned++;
            } else {
              if (leftBasketOwner === 'away') basketsOwned++;
              if (rightBasketOwner === 'away') basketsOwned++;
            }

            const goalPoints = 3 + basketsOwned; // 3, 4, or 5 points!
            if (possession === 'home') homeRaw += goalPoints;
            else awayRaw += goalPoints;

            shooter.player.goals = (shooter.player.goals || 0) + 1;

            const bonusText =
              basketsOwned === 2
                ? `(5 poäng! Full korgbonus!)`
                : basketsOwned === 1
                ? `(4 poäng med 1 korgbonus!)`
                : `(3 poäng)`;

            events.push({
              id: `goal-${period}-${currentMinute}`,
              period,
              minute: currentMinute,
              type: 'GOAL_NORMAL', ...assist(shooter,possession,currentMinute),
              teamSide: possession,
              playerId: shooter.player.id,
              playerName: shooter.player.name,
              opponentPlayerName: goalkeeper.player.name,
              text: `Bollens kedjor ven högljutt genom luften när ${shooter.player.name} dunkade bollen i mål bakom ${goalkeeper.player.name}! ${goalPoints} poäng ${bonusText}`,
              scoreAfter: { home: homeRaw, away: awayRaw },
              basketsAfter: { leftOwner: leftBasketOwner, rightOwner: rightBasketOwner },
            });

            // Score triggers Uppkast (Section 13 & 53)
            lastPass=null;ballHolder=undefined;possession = doUppkast(currentMinute);
            ballRow = 1;
            ballCol = lane(possession,1);
            continue;
          } else {
            if(keeperPresent){inc(goalkeeper,'raddningar','lyckade');defendStats.raddningar.lyckade++;}
            events.push({
              id: `save-${period}-${currentMinute}`,
              period,
              minute: currentMinute,
              type: keeperPresent?'SAVE_NORMAL':'SHOT_NORMAL',
              teamSide: keeperPresent?(possession === 'home' ? 'away' : 'home'):possession,
              playerName: keeperPresent?goalkeeper.player.name:shooter.player.name, playerId: keeperPresent?goalkeeper.player.id:shooter.player.id,
              opponentPlayerName: keeperPresent?shooter.player.name:undefined,
              text: !keeperPresent?`${shooter.player.name} hade ett öppet mål framför sig, men avslutet for utanför. Ett förtvivlat rop hördes från bänken.`:`Målvakten ${goalkeeper.player.name} svarade för en sagolik räddning när ${shooter.player.name} drog på sitt kanonskott!`,
            });
            possession = possession === 'home' ? 'away' : 'home';
            continue;
          }
        }
      }

      // Ball progression: Run or Pass
      const actor=attackSquad.active.find(p=>p.player.id===ballHolder)||choose(attackSquad.active,ballRow,ballCol);
      const runBias=tactics?.uppspel==='Löpning'?.72:tactics?.uppspel==='Passning'?.28:.5;
      const prefersRun = rng.next()<Math.max(.15,Math.min(.85,runBias+(skill(actor,'snabbhet')-skill(actor,'passning'))*.015-pressure(defendSquad.active,ballRow,ballCol)*.008));
      if (prefersRun) {
        // Run action (Löpning)
        attackStats.lopningar.antal++;
        const runner = actor;
        const marker = choose(defendSquad.active,ballRow,ballCol);

        inc(runner,'lopningar');effort(runner,underlag==='Jord'?.042:underlag==='Sten'?.037:.035);
        const runSuccess=weighted(runner,'lopningar',skill(runner,'snabbhet')*(weather.condition==='Regn'?.82:1)+skill(runner,'teknik')*.5+support(attackSquad.active,runner,'teknik'),pressure(defendSquad.active,ballRow,ballCol));

        if (runSuccess) {
          inc(runner,'lopningar','lyckade');
          attackStats.lopningar.lyckade++;
          ballHolder=runner.player.id;
          // Advance ball
          const direction=possession==='home'?-1:1,move=rng.next();
          if(move<.76)ballRow=Math.max(0,Math.min(2,ballRow+direction));
          else if(move<.95)ballCol=Math.max(0,Math.min(2,ballCol+(rng.next()<.5?-1:1)));
          else ballRow=Math.max(0,Math.min(2,ballRow-direction));
          runner.fieldRow=ballRow;runner.fieldCol=ballCol;

          if (rng.next() > 0.25) {
            events.push({
              id: `run-${period}-${currentMinute}`,
              period,
              minute: currentMinute,
              type: 'RUN_SUCCESS',
              teamSide: possession,
              playerName: runner.player.name, playerId: runner.player.id,
              text: `${runner.player.name} tråcklade sig elegant förbi försvaret och avancerade framåt med bollen.`,
            });
          }
        } else {
          // Intercepted / tackled
          possession = possession === 'home' ? 'away' : 'home';
          if (rng.next() > 0.35) {
            events.push({
              id: `tackle-${period}-${currentMinute}`,
              period,
              minute: currentMinute,
              type: 'INTERCEPTION',
              teamSide: possession,
              playerName: marker.player.name, playerId: marker.player.id,
              text: `${marker.player.name} satte in en resolut tackling och bröt framstöten!`,
            });
          }
        }
      } else {
        // Pass action (Passning)
        attackStats.passningar.antal++;
        const passer = actor;
        const desiredCol=lane(possession,ballRow),allReceivers=attackSquad.active.filter(p=>p!==passer&&!chainBlocksPass(!!weatherInput?.chainsBlocked,period,possession,ballRow,ballCol,p.fieldRow,p.fieldCol));
        const near=allReceivers.filter(p=>distance(p,ballRow,ballCol)<=1),pool=near.length&&rng.next()<.88?near:allReceivers;
        const receiver=pool.length?pickWeighted(pool,pool.map(p=>(.5+skill(p,'teknik')+skill(p,'speluppfattning'))*(p.fieldCol===desiredCol?1.8:1)*(p.fieldRow===(ballRow+(possession==='home'?-1:1))?4.5:p.fieldRow===ballRow?1:.6)/Math.pow(1+distance(p,ballRow,ballCol),2))):passer;
        const passDistance=distance(receiver,ballRow,ballCol),diagonal=receiver.fieldRow!==ballRow&&receiver.fieldCol!==ballCol;
        const interceptor = choose(defendSquad.active,receiver.fieldRow,receiver.fieldCol);
        const passQuality = passer.player.attributes.passning + passer.player.attributes.speluppfattning * 0.4 + rng.next() * 5;
        const markQuality = interceptor.player.attributes.markering + interceptor.player.attributes.speluppfattning * 0.3 + rng.next() * 5;

        inc(passer,'passningar');effort(passer,.009);
        const passA=skill(passer,'passning')*Math.max(.5,1-weather.wind*.012-(weather.condition==='Regn'?.1:0))+skill(passer,'speluppfattning')*(passer.slotKey.endsWith('-1')?.4:.08)+support(attackSquad.active,passer,'passning');
        const passB=pressure(defendSquad.active,ballRow,ballCol)*.62*(diagonal?1.2:1)+Math.max(0,passDistance-1)*1.8,catchA=skill(receiver,'teknik')+skill(receiver,'speluppfattning')*(receiver.slotKey.endsWith('-1')?.5:.1)+3,catchB=pressure(defendSquad.active,receiver.fieldRow,receiver.fieldCol)*.38;
        const prob=(a:number,b:number)=>contestProbability(a,b);
        const delivered=rng.next()<prob(passA,passB);let received=false;
        if(delivered){inc(receiver,'mottagningar');attackStats.mottagningar.antal++;received=weighted(receiver,'mottagningar',catchA,catchB);}
        individualStats[passer.player.id].stats.passningar.viktat+=(Number(received)-prob(passA,passB)*prob(catchA,catchB))*100;
        if (received) {
          inc(passer,'passningar','lyckade');inc(receiver,'mottagningar','lyckade');
          ballHolder=receiver.player.id;lastPass={id:passer.player.id,receiver:receiver.player.id,side:possession,minute:currentMinute,weighted:100*(1-contestProbability(skill(passer,'passning'),pressure(defendSquad.active,ballRow,ballCol)))};
          ballRow=receiver.fieldRow;
          attackStats.passningar.lyckade++;
          attackStats.mottagningar.lyckade++;

          // Shift ball column based on tactics
          ballCol = receiver.fieldCol;

          if (true) {
            events.push({
              id: `pass-${period}-${currentMinute}`,
              period,
              minute: currentMinute,
              type: 'PASS_SUCCESS',
              teamSide: possession,
              playerName: passer.player.name, playerId: passer.player.id,
              opponentPlayerName: receiver.player.name, opponentPlayerId: receiver.player.id,
              text: `${passer.player.name} slog en läcker passning som ${receiver.player.name} säkert tog emot.`,
            });
          }
        } else {
          possession = possession === 'home' ? 'away' : 'home';
          if (rng.next() > 0.8) {
            events.push({
              id: `intercept-${period}-${currentMinute}`,
              period,
              minute: currentMinute,
              type: 'INTERCEPTION',
              teamSide: possession,
              playerName: interceptor.player.name,
              text: `${interceptor.player.name} läste spelet perfekt och fångade upp passningen i luften.`,
            });
          }
        }
      }
    }



    // Period point determination (Section 14 & 53)
    // Period winner receives ONE match point; tied period awards 0 points to both.
    let homePeriodPt = 0;
    let awayPeriodPt = 0;
    if (homeRaw > awayRaw) {
      homePeriodPt = 1;
      totalHomeMatchPoints += 1;
    } else if (awayRaw > homeRaw) {
      awayPeriodPt = 1;
      totalAwayMatchPoints += 1;
    }

    periodScores.push({
      period,
      homeRawPoints: homeRaw,
      awayRawPoints: awayRaw,
      homePeriodPoint: homePeriodPt,
      awayPeriodPoint: awayPeriodPt,
    });

    if(!forfeit)events.push({
      id: `p${period}-end`,
      period,
      minute: period * 15,
      type: 'PERIOD_END',
      teamSide: 'neutral',
      text: `Period ${period} avslutas. Poäng i perioden: ${homeRaw} - ${awayRaw}. (Matchställning: ${totalHomeMatchPoints} - ${totalAwayMatchPoints})`,
      scoreAfter: { home: totalHomeMatchPoints, away: totalAwayMatchPoints },
    });
    if(forfeit)break;
  }

  // Finalize stats percentages
  finalizeCategory(homeStats.lopningar);
  finalizeCategory(homeStats.passningar);
  finalizeCategory(homeStats.mottagningar);
  finalizeCategory(homeStats.skott);
  finalizeCategory(homeStats.korgskott);
  finalizeCategory(homeStats.raddningar);
  finalizeCategory(homeStats.korgraddningar);

  finalizeCategory(awayStats.lopningar);
  finalizeCategory(awayStats.passningar);
  finalizeCategory(awayStats.mottagningar);
  finalizeCategory(awayStats.skott);
  finalizeCategory(awayStats.korgskott);
  finalizeCategory(awayStats.raddningar);
  finalizeCategory(awayStats.korgraddningar);

  homeStats.uppkast.vunnaProcent = homeStats.uppkast.antal > 0 ? Math.round((homeStats.uppkast.vunna / homeStats.uppkast.antal) * 1000) / 10 : 0;
  awayStats.uppkast.vunnaProcent = awayStats.uppkast.antal > 0 ? Math.round((awayStats.uppkast.vunna / awayStats.uppkast.antal) * 1000) / 10 : 0;

  homeStats.slagsmal.vunnaProcent = homeStats.slagsmal.antal > 0 ? Math.round((homeStats.slagsmal.vunna / homeStats.slagsmal.antal) * 1000) / 10 : 0;
  awayStats.slagsmal.vunnaProcent = awayStats.slagsmal.antal > 0 ? Math.round((awayStats.slagsmal.vunna / awayStats.slagsmal.antal) * 1000) / 10 : 0;

  for(const side of ['home','away'] as const){const stats=side==='home'?homeStats:awayStats;for(const key of Object.keys(stats)){(stats as any)[key].viktat=Math.round(Object.values(individualStats).filter(p=>p.side===side).reduce((sum,p)=>sum+p.stats[key].viktat,0));} }
  for(const p of Object.values(individualStats))for(const stat of Object.values(p.stats) as any[])stat.viktat=Math.round(stat.viktat);
  // Calculate ball distribution percentages
  const totalTouches = cellTouches.flat().reduce((a, b) => a + b, 0) || 1;
  const ballDist: number[][] = cellTouches.map((row) =>
    row.map((val) => Math.round((val / totalTouches) * 100))
  );

  // Attendance calculation based on Section 34
  
  const ticketP = homeClub.lineup?.intrade ?? 8;


  return {
    engineVersion:19,id: `match-${seed}`,
    date: new Date().toISOString().replace('T', ' ').substring(0, 19),
    division: homeClub.division || 'Kejsarserien',
    arenaName: homeClub.arena?.name || 'Mintrion',
    weather,
    attendance,portSurcharge:crowdEffects.portSurcharge,
    ticketPrice: ticketP,
    homeClub: { id: homeClub.id, name: homeClub.name, race: homeClub.race },
    awayClub: { id: awayClub.id, name: awayClub.name, race: awayClub.race },
    periodScores,
    finalScore: forfeit?{home:forfeit==='home'?5:0,away:forfeit==='away'?5:0}:{ home: totalHomeMatchPoints, away: totalAwayMatchPoints },
    underlag, individualStats:Object.values(individualStats),
    events:events.map((e,i)=>({...e,playerId:e.playerId||(e.teamSide==='home'?homePlayers:awayPlayers).find(p=>p.name===e.playerName)?.id,opponentPlayerId:e.opponentPlayerId||(e.type==='PASS_SUCCESS'?(e.teamSide==='home'?homePlayers:awayPlayers):(e.teamSide==='home'?awayPlayers:homePlayers)).find(p=>p.name===e.opponentPlayerName)?.id,id:e.id+'-'+i,text:(e as any).important||['SUBSTITUTION','INJURY'].includes(e.type)?e.text:describeEvent(e,i)+((e as any).assistPlayerName?' Framspelningen kom från '+(e as any).assistPlayerName+'.':''),reported:reportEvent(e,i,seed)})),
    homeStats,
    awayStats,
    tactics: {
      home: homeClub.lineup?.tactics || { uppspel: 'Normal', spelvag: 'Normal', skytte: 'Normal' },
      away: awayClub.lineup?.tactics || { uppspel: 'Normal', spelvag: 'Normal', skytte: 'Normal' },
    },
    injuries: {
      home: homeInjuries,
      away: awayInjuries,
    },
    ballDistribution: ballDist,
    startingLineups: {
      home: initialLineups.home,
      away: initialLineups.away,
    },
  };
}

export function injuryProbability(attack:number,defense:number){const ratio=(Math.max(0,attack)+.5)/(Math.max(0,defense)+.5);return Math.min(.94,.7*Math.pow(ratio,4.7));}
function reportEvent(e:any,index:number,seed:number){if(['GOAL_NORMAL','INJURY','SUBSTITUTION','PERIOD_START','PERIOD_END','MATCH_END'].includes(e.type)||e.important)return true;const probability:Record<string,number>={SHOT_NORMAL:.08,GOAL_BASKET:.65,FIGHT_RESULT:.15,SAVE_NORMAL:.10,SAVE_BASKET:.06,UPPKAST:.02,PASS_SUCCESS:.04,RUN_SUCCESS:.07,INTERCEPTION:.06};return new SeededRNG(seed+index*7919).next()<(probability[e.type]??0)}

export function calculateAttendance(home:any,away:any,ticket:number,capacity:number,variation=.5){
    return Math.max(0,Math.min(capacity,attendanceDemand(home,away,ticket,variation)));
}
export function matchMerit(division:string,scored:number,conceded:number){const tier=division==='Kejsarserien'?0:Number(division.match(/Division (\d)/)?.[1]||3);return scored<conceded?0:.2/2**tier*(scored===conceded?.5:1)}
export function postMatchForm(form:number,won:boolean,injured:boolean,random:number){const drift=(9-form)*.08+(won?.12:0)-(injured?.22:0),roll=random+drift;return Math.max(0,Math.min(16,form+(roll>.72?1:roll<.22?-1:0)))}
