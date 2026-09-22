import {Meter} from './SquadOverview';
import {InjuryMark} from './InjuryMark';
import {SPELLS} from '../constants/spells';
import {ARTIFACTS} from '../constants/market';
import React, { useState } from 'react';
import {Crest} from './Crest';
import { Player, PlayerAttributes } from '../types';
import {
  ATTRIBUTE_NAMES_SV,
  getCurrentInjurySymbol,
  getQualitativeLabel,
  getTotalInjuryLabel,
  RACE_DISPLAY_NAMES,
} from '../constants/attributes';
import { calculatePlayerPositionRatings } from '../engine/positionRatings';

interface PlayerProfileViewProps {
  player: Player;
  clubName: string;
  onBack: () => void;
  onHireMercenary?: (player: Player) => void;
}

const ATTRIBUTE_KEYS = Object.keys(ATTRIBUTE_NAMES_SV) as Array<keyof PlayerAttributes>;

function AttributeMeter({value}:{value:number}){return <Meter value={value}/>;}

export const PlayerProfileView: React.FC<PlayerProfileViewProps> = ({
  player,
  clubName,
  onBack,
  onHireMercenary,
}) => {
  const [useForm, setUseForm] = useState(true);

  const ratings = useForm
    ? player.positionRatingsWithForm || calculatePlayerPositionRatings(player, true)
    : player.positionRatingsWithoutForm || calculatePlayerPositionRatings(player, false);

  const crestIcon = {
    elf: '🌳',
    orc: '🐗',
    dwarf: '⚒️',
    human: '👑',
    goblin: '🗡️',
    troll: '🪨',
  }[player.race];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-blue-900 font-bold hover:underline"
      >
        ← Tillbaka till spelartruppen
      </button>

      <div className="flex items-center gap-4 border-b border-[#cfbeaa] pb-4">
        <Crest race={player.race}/>
        <div className="min-w-0">
          <h2 className="text-3xl font-extrabold text-[#221c15] tracking-wide font-serif break-words">
            {player.isDeceased && <span className="text-red-800 mr-2">✝</span>}
            {player.shirtNumber}. {player.name}
          </h2>
          <div className="text-xs text-stone-600">
            {RACE_DISPLAY_NAMES[player.race]} · Hemort: <span className="font-semibold text-stone-800">{player.hometown}</span> · ID: #{player.id}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-4 border border-[#8ea998] overflow-hidden bg-[#fbfaf6]">
          <table className="w-full text-xs text-stone-800">
            <tbody>
              {[
                ['Ras', RACE_DISPLAY_NAMES[player.race]],
                ['Lag', player.isMercenary ? 'Inget lag (Fribrytare)' : clubName],
                ['Hemort', player.hometown],
                ['Position', player.nominalPosition],
                ['ID-nummer', player.id],
                ['Lön/vecka', `${player.wage.toLocaleString('sv-SE')} guld`],
                ['Matcher', `${player.matches} (${player.seasonMatches})`],
                ['Mål', `${player.goals} (${player.seasonGoals})`],
                ['Korgmål', `${player.basketGoals} (${player.seasonBasketGoals})`],
                ['Assist', `${player.assists} (${player.seasonAssists})`],
                ['Form', getQualitativeLabel(player.form)],
                ['Spelat', player.isDeceased ? 'Avliden' : player.currentInjury > 0 ? 'Ej spelklar' : 'Spelklar'],
                ['Total skada', getTotalInjuryLabel(player.totalInjury)],
                ['Aktuell skada', <InjuryMark value={player.currentInjury}/>],
              ].map(([label, value], idx) => (
                <tr key={String(label)} className={`border-b border-[#e8ded0] ${idx % 2 ? 'bg-[#f5efe4]' : ''}`}>
                  <td className="px-3 py-1.5 font-bold w-2/5">{label}</td>
                  <td className={`px-3 py-1.5 ${label === 'Aktuell skada' && player.currentInjury > 0 ? 'text-red-700 font-extrabold tracking-widest' : ''}`}>
                    {String(value)}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-3 py-2 font-bold">Artefakter</td>
                <td className="px-3 py-2">
                  {player.artifacts?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {player.artifacts.filter(a=>!a.includes(':')||Number(a.split(':')[2])>Date.now()).map((artifact) => (
                        <span key={ARTIFACTS.find(a=>a.id===(artifact.startsWith('effect:')?artifact.split(':')[1]:artifact))?.name||SPELLS.find(s=>s.id===artifact.split(':')[1])?.name||artifact} className="border border-[#a89982] bg-[#eee5d7] px-1.5 py-0.5 rounded text-[11px]">
                          {ARTIFACTS.find(a=>a.id===(artifact.startsWith('effect:')?artifact.split(':')[1]:artifact))?.name||SPELLS.find(s=>s.id===artifact.split(':')[1])?.name||artifact}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-stone-500">Inga</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {player.isMercenary && onHireMercenary && (
            <div className="p-3 bg-amber-50 border-t border-amber-200 text-center">
              <button
                type="button"
                onClick={() => onHireMercenary(player)}
                className="w-full bg-[#7a2222] hover:bg-[#611919] text-white py-1.5 text-xs font-bold rounded"
              >
                Hyr in för denna match ({player.wage.toLocaleString('sv-SE')} guld)
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 border border-[#8ea998] overflow-hidden bg-[#fbfaf6]">
          <div className="bg-[#8ea998] text-[#1b3323] px-3 py-1 font-bold text-xs grid grid-cols-[120px_1fr] gap-2">
            <span>Egenskap</span>
            <span>Värde</span>
          </div>
          <div className="divide-y divide-[#ebdcca]">
            {ATTRIBUTE_KEYS.map((attrKey, idx) => (
              <div key={attrKey} className={`grid grid-cols-[120px_1fr] gap-2 px-3 py-1.5 text-xs ${idx % 2 ? 'bg-[#f5efe4]' : ''}`}>
                <div className="font-bold text-stone-700">{ATTRIBUTE_NAMES_SV[attrKey]}</div>
                <AttributeMeter value={player.attributes[attrKey]} />
              </div>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-[#d8cab8] text-[10px] text-stone-500">
            Egenskaper över Sagolik döljs, precis som i originalet. Det exakta interna värdet visas aldrig.
          </div>
        </div>

        <div className="lg:col-span-3 border border-[#8ea998] bg-[#fbfaf6] flex flex-col items-center p-3">
          <div className="font-bold text-xs text-[#1f3825] mb-1">Position</div>
          <div className="text-[11px] text-stone-600 mb-3">{useForm ? 'med form' : 'utan form'}</div>
          <div className="bg-[#dfd7c7] border-2 border-[#82715d] p-2 mb-3">
            <div className="grid grid-cols-3 gap-2 text-center font-bold text-sm text-[#2b2014]">
              {ratings.matrix.flatMap((row, r) => row.map((value, c) => (
                <div key={`${r}-${c}`} className="w-9 h-9 flex items-center justify-center bg-[#faf7f0] border border-[#a8967f]">
                  {value}
                </div>
              )))}
            </div>
            <div className="mt-2 flex justify-center">
              <div className="w-9 h-9 flex items-center justify-center bg-[#faf7f0] border border-[#a8967f] font-bold text-sm text-green-950">
                {ratings.goalBox}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUseForm((v) => !v)}
            className="text-xs font-bold text-blue-900 hover:underline bg-[#ece3d4] px-2 py-1 border border-[#b5a38b]"
          >
            {useForm ? 'Visa utan form' : 'Visa med form'}
          </button>
        </div>
      </div>
    </div>
  );
};
