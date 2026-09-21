import {InjuryMark} from './InjuryMark';
import React, { useState } from 'react';
import { MatchReport } from '../types';

interface MatchViewProps {
  match: MatchReport;
  matchesHistory: MatchReport[];
  onSelectMatch: (matchId: string) => void;
  onSimulateNewMatch: () => void;
}

export const MatchView: React.FC<MatchViewProps> = ({
  match,
  matchesHistory,
  onSelectMatch,
  onSimulateNewMatch,
}) => {
  const [activeTab, setActiveTab] = useState<'referat' | 'lagstatistik'>('referat');
  const [activeStatCategory, setActiveStatCategory] = useState<string>('alla');

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-serif">
      {/* Top Match History Switcher & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#cfbeaa] pb-3 gap-2">
        <div className="flex items-center space-x-2">
          <label className="text-xs font-bold text-stone-700">Välj match:</label>
          <select
            value={match.id}
            onChange={(e) => onSelectMatch(e.target.value)}
            className="text-xs bg-[#f4ece0] border border-[#a89882] rounded px-2 py-1 font-bold text-stone-800"
          >
            {matchesHistory.map((m) => (
              <option key={m.id} value={m.id}>
                {m.homeClub.name} {m.finalScore.home} - {m.finalScore.away} {m.awayClub.name} ({m.division})
              </option>
            ))}
          </select>
        </div>


      </div>

      {/* Main Match Header: Team Crests & Score (Screenshot 3) */}
      <div className="bg-[#fbf7ee] border-2 border-[#8ea998] p-4 rounded shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between pb-3 border-b border-[#ded2bf] gap-3">
          
          {/* Home Team */}
          <div className="flex items-center space-x-3">
            <div className="w-12 h-14 bg-red-900 border-2 border-amber-800 rounded-b-full flex items-center justify-center text-xl shadow">
              🔥
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-extrabold text-[#7a1c1c]">
                {match.homeClub.name}
              </h3>
              <span className="text-[11px] text-stone-500 font-sans">Hemmalag</span>
            </div>
          </div>

          {/* Final Score (Period points!) */}
          <div className="flex flex-col items-center">
            <div className="text-3xl md:text-4xl font-extrabold text-[#292015] tracking-widest bg-[#ede2d1] px-5 py-1 rounded border border-[#b8a791] shadow-inner">
              {match.finalScore.home} - {match.finalScore.away}
            </div>
            <span className="text-[10px] text-stone-600 uppercase font-sans font-bold tracking-wider mt-1">
              Resultat i perioder
            </span>
          </div>

          {/* Away Team */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <h3 className="text-xl md:text-2xl font-extrabold text-[#1f3f6e]">
                {match.awayClub.name}
              </h3>
              <span className="text-[11px] text-stone-500 font-sans">Bortalag</span>
            </div>
            <div className="w-12 h-14 bg-blue-900 border-2 border-amber-800 rounded-b-full flex items-center justify-center text-xl shadow">
              ⚔️
            </div>
          </div>

        </div>

        {/* Match Metadata: Date, Serie, Arena, Weather */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs text-stone-700 font-sans">
          <div>
            <strong>Datum:</strong> {match.date}
          </div>
          <div>
            <strong>Serie:</strong> {match.division}
          </div>
          <div>
            <strong>Arena:</strong> {match.arenaName}
          </div>
          <div className="flex items-center space-x-1">
            <strong>Väder:</strong> <span>{match.weather.temp} °C</span> <span>☁</span> <span>{match.weather.wind} m/s</span>
          </div>
        </div>

        {/* Attendance description (Screenshot 3) */}
        <div className="mt-2 text-xs italic text-stone-600 border-t border-[#ded2bf] pt-2">
          Denna kväll hade {match.attendance.toLocaleString('sv-SE')} personer betalt inträdet på {match.ticketPrice} guld för att få se {match.homeClub.name} spela på {match.arenaName}.
        </div>
      </div>

      {/* Tabs: Referat & Lagstatistik (Screenshot 4) */}
      <div className="flex space-x-2 border-b border-[#8ea998] pb-1">
        <button
          onClick={() => setActiveTab('referat')}
          className={`px-4 py-1.5 text-xs font-bold rounded-t transition-colors cursor-pointer ${
            activeTab === 'referat'
              ? 'bg-[#8ea998] text-[#1b3323] border border-b-0 border-[#779482]'
              : 'bg-[#e4dac8] text-stone-700 hover:bg-[#d8ccb8]'
          }`}
        >
          Referat & Spelanalys
        </button>
        <button
          onClick={() => setActiveTab('lagstatistik')}
          className={`px-4 py-1.5 text-xs font-bold rounded-t transition-colors cursor-pointer ${
            activeTab === 'lagstatistik'
              ? 'bg-[#8ea998] text-[#1b3323] border border-b-0 border-[#779482]'
              : 'bg-[#e4dac8] text-stone-700 hover:bg-[#d8ccb8]'
          }`}
        >
          Lagstatistik
        </button>
      </div>

      {activeTab === 'referat' ? (
        /* REFERAT VIEW (Screenshot 3) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: Periodvis Resultat & Narrative Play-by-Play */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Periodvis Resultat Table */}
            <div className="border border-[#8ea998] rounded overflow-hidden bg-[#fbfaf6] shadow-sm">
              <div className="bg-[#8ea998] text-[#1b3323] px-3 py-1 font-bold text-xs border-b border-[#779482] text-center">
                Periodvis Resultat
              </div>
              <table className="w-full text-xs text-center">
                <thead className="bg-[#ebdcca] text-stone-700 font-bold border-b border-[#d8c8b1]">
                  <tr>
                    <th className="px-3 py-1 text-left">Lag</th>
                    <th className="px-2 py-1">1</th>
                    <th className="px-2 py-1">2</th>
                    <th className="px-2 py-1">3</th>
                    <th className="px-2 py-1">4</th>
                    <th className="px-2 py-1">5</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#ebdcca]">
                    <td className="px-3 py-1.5 font-bold text-left text-green-900">{match.homeClub.name}</td>
                    {match.periodScores.map((p) => (
                      <td key={p.period} className="px-2 py-1.5 font-semibold">
                        {p.homeRawPoints}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 font-bold text-left text-red-900">{match.awayClub.name}</td>
                    {match.periodScores.map((p) => (
                      <td key={p.period} className="px-2 py-1.5 font-semibold">
                        {p.awayRawPoints}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Narrative Commentary by Period (Green for Home, Red for Away - Screenshot 3) */}
            <div className="bg-[#fbf9f4] border border-[#cfbeaa] p-4 rounded shadow-sm space-y-5">
              {[1, 2, 3, 4, 5].map((period) => {
                const periodEvents = match.events.filter((e) => e.period === period);
                const pResult = match.periodScores.find((p) => p.period === period);
                return (
                  <div key={period} className="border-b border-[#e5d9c8] pb-4 last:border-b-0">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-extrabold text-sm text-[#38281a] font-serif uppercase tracking-wider">
                        Period {period}
                      </h4>
                      {pResult && (
                        <span className="text-xs text-stone-500 font-sans">
                          Periodpoäng: <strong>{pResult.homeRawPoints} - {pResult.awayRawPoints}</strong>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs leading-relaxed font-sans">
                      {periodEvents.length > 0 ? (
                        periodEvents.map((evt) => (
                          <div
                            key={evt.id}
                            className={`p-1 rounded ${
                              evt.teamSide === 'home'
                                ? 'text-[#1c5427] font-semibold bg-green-50/40'
                                : evt.teamSide === 'away'
                                ? 'text-[#871919] font-semibold bg-red-50/40'
                                : 'text-stone-700 italic'
                            }`}
                          >
                            <span className="text-[10px] text-stone-400 font-bold mr-1">
                              {evt.minute}&apos;
                            </span>
                            {evt.text}
                          </div>
                        ))
                      ) : (
                        <div className="text-stone-500 italic text-[11px]">
                          Ett böljande ställningskrig utan avgörande genombrott under perioden.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Right Column: Tactics, Skador, Bollfördelning (Screenshot 3) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Taktik Table */}
            <div className="border border-[#8ea998] rounded overflow-hidden bg-[#fbfaf6] shadow-sm">
              <div className="bg-[#8ea998] text-[#1b3323] px-3 py-1 font-bold text-xs border-b border-[#779482] text-center">
                Taktik
              </div>
              <table className="w-full text-xs">
                <thead className="bg-[#ebdcca] text-stone-700 font-bold">
                  <tr>
                    <th className="px-2 py-1 text-left">Taktik</th>
                    <th className="px-2 py-1 text-center">{match.homeClub.name.substring(0, 7)}</th>
                    <th className="px-2 py-1 text-center">{match.awayClub.name.substring(0, 7)}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#ebdcca]">
                    <td className="px-2 py-1 font-bold">Uppspel</td>
                    <td className="px-2 py-1 text-center">{match.tactics.home.uppspel}</td>
                    <td className="px-2 py-1 text-center">{match.tactics.away.uppspel}</td>
                  </tr>
                  <tr className="border-b border-[#ebdcca] bg-[#f5efe4]">
                    <td className="px-2 py-1 font-bold">Spelväg</td>
                    <td className="px-2 py-1 text-center">{match.tactics.home.spelvag}</td>
                    <td className="px-2 py-1 text-center">{match.tactics.away.spelvag}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 font-bold">Skytte</td>
                    <td className="px-2 py-1 text-center">{match.tactics.home.skytte}</td>
                    <td className="px-2 py-1 text-center">{match.tactics.away.skytte}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Skador (Injuries) Table */}
            <div className="border border-[#8ea998] rounded overflow-hidden bg-[#fbfaf6] shadow-sm">
              <div className="bg-[#8ea998] text-[#1b3323] px-3 py-1 font-bold text-xs border-b border-[#779482] text-center">
                Skador under matchen
              </div>
              <div className="p-3 text-xs space-y-2 font-sans">
                <div>
                  <span className="font-bold text-green-900 block">{match.homeClub.name}:</span>
                  {match.injuries.home.length > 0 ? (
                    <ul className="list-disc list-inside text-red-700 pl-1">
                      {match.injuries.home.map((inj, i) => (
                        <li key={i}>
                          {inj.playerName} <InjuryMark value={inj.severity}/>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-stone-500 italic text-[11px]">Inga allvarliga skador.</span>
                  )}
                </div>

                <div className="pt-2 border-t border-[#ebdcca]">
                  <span className="font-bold text-red-900 block">{match.awayClub.name}:</span>
                  {match.injuries.away.length > 0 ? (
                    <ul className="list-disc list-inside text-red-700 pl-1">
                      {match.injuries.away.map((inj, i) => (
                        <li key={i}>
                          {inj.playerName} <InjuryMark value={inj.severity}/>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-stone-500 italic text-[11px]">Inga allvarliga skador.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bollfördelning (3x3 grid - Screenshot 3) */}
            <div className="border border-[#8ea998] rounded overflow-hidden bg-[#fbfaf6] shadow-sm">
              <div className="bg-[#8ea998] text-[#1b3323] px-3 py-1 font-bold text-xs border-b border-[#779482] text-center">
                Bollfördelning (%)
              </div>
              <div className="p-3 flex justify-center">
                <div className="grid grid-cols-3 gap-1 bg-[#cfbeaa] p-1.5 rounded border border-[#a89882]">
                  {match.ballDistribution.map((row, rIdx) =>
                    row.map((val, cIdx) => (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        className="w-12 h-10 bg-[#fbf0d9] border border-[#a89882] flex items-center justify-center font-bold text-xs text-stone-800"
                      >
                        {val}%
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="text-center text-[10px] text-stone-500 pb-2">
                Anfall &uarr; | Mittfält | Försvar &darr;
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* LAGSTATISTIK VIEW (Screenshot 4) */
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1 bg-[#ede4d4] p-1.5 rounded border border-[#b8a791] text-xs">
            {[
              'Löpningar',
              'Passningar',
              'Mottagningar',
              'Skott',
              'Korgskott',
              'Uppkast',
              'Räddningar',
              'KorgRäd.',
              'Slagsmål',
            ].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveStatCategory(cat)}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
                  activeStatCategory === cat
                    ? 'bg-[#3b5240] text-white'
                    : 'bg-[#f5eee2] text-stone-700 hover:bg-white border border-[#bfae98]'
                }`}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={() => setActiveStatCategory('alla')}
              className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                activeStatCategory === 'alla' ? 'bg-[#3b5240] text-white' : 'text-stone-700 hover:underline'
              }`}
            >
              Visa Alla
            </button>
          </div>

          {/* Detailed Statistics Table (Screenshot 4) */}
          <div className="border border-[#8ea998] rounded overflow-hidden bg-[#fbfaf6] shadow-sm">
            <div className="bg-[#8ea998] text-[#1b3323] px-3 py-1 font-bold text-xs border-b border-[#779482] text-center">
              Lagstatistik: {match.homeClub.name} (H) vs {match.awayClub.name} (B)
            </div>

            <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              
              {/* Category: Löpningar */}
              <div className="border border-[#cfbeaa] rounded p-2 bg-white">
                <h5 className="font-bold text-stone-800 border-b pb-1 mb-1 font-serif text-sm">Löpningar</h5>
                <div className="grid grid-cols-3 text-center py-0.5">
                  <span className="font-semibold text-left">Mått</span>
                  <span className="font-bold text-green-900">H</span>
                  <span className="font-bold text-red-900">B</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Antal</span>
                  <span>{match.homeStats.lopningar.antal}</span>
                  <span>{match.awayStats.lopningar.antal}</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Lyckade</span>
                  <span>{match.homeStats.lopningar.lyckade}</span>
                  <span>{match.awayStats.lopningar.lyckade}</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Lyckade (%)</span>
                  <span>{match.homeStats.lopningar.lyckadeProcent}%</span>
                  <span>{match.awayStats.lopningar.lyckadeProcent}%</span>
                </div>
              </div>

              {/* Category: Passningar */}
              <div className="border border-[#cfbeaa] rounded p-2 bg-white">
                <h5 className="font-bold text-stone-800 border-b pb-1 mb-1 font-serif text-sm">Passningar</h5>
                <div className="grid grid-cols-3 text-center py-0.5">
                  <span className="font-semibold text-left">Mått</span>
                  <span className="font-bold text-green-900">H</span>
                  <span className="font-bold text-red-900">B</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Antal</span>
                  <span>{match.homeStats.passningar.antal}</span>
                  <span>{match.awayStats.passningar.antal}</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Lyckade</span>
                  <span>{match.homeStats.passningar.lyckade}</span>
                  <span>{match.awayStats.passningar.lyckade}</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Lyckade (%)</span>
                  <span>{match.homeStats.passningar.lyckadeProcent}%</span>
                  <span>{match.awayStats.passningar.lyckadeProcent}%</span>
                </div>
              </div>

              {/* Category: Normala Skott & Räddningar */}
              <div className="border border-[#cfbeaa] rounded p-2 bg-white">
                <h5 className="font-bold text-stone-800 border-b pb-1 mb-1 font-serif text-sm">Skott på Mål</h5>
                <div className="grid grid-cols-3 text-center py-0.5">
                  <span className="font-semibold text-left">Mått</span>
                  <span className="font-bold text-green-900">H</span>
                  <span className="font-bold text-red-900">B</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Skott Antal</span>
                  <span>{match.homeStats.skott.antal}</span>
                  <span>{match.awayStats.skott.antal}</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Mål (Lyckade)</span>
                  <span className="font-bold">{match.homeStats.skott.lyckade}</span>
                  <span className="font-bold">{match.awayStats.skott.lyckade}</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Målvaktsräddningar</span>
                  <span>{match.homeStats.raddningar.lyckade}</span>
                  <span>{match.awayStats.raddningar.lyckade}</span>
                </div>
              </div>

              {/* Category: Korgskott & Korgräddningar */}
              <div className="border border-[#cfbeaa] rounded p-2 bg-white">
                <h5 className="font-bold text-stone-800 border-b pb-1 mb-1 font-serif text-sm">Korgskott (Sidokorgar)</h5>
                <div className="grid grid-cols-3 text-center py-0.5">
                  <span className="font-semibold text-left">Mått</span>
                  <span className="font-bold text-green-900">H</span>
                  <span className="font-bold text-red-900">B</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Korgskott Antal</span>
                  <span>{match.homeStats.korgskott.antal}</span>
                  <span>{match.awayStats.korgskott.antal}</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Korgmål</span>
                  <span className="font-bold text-amber-900">{match.homeStats.korgskott.lyckade}</span>
                  <span className="font-bold text-amber-900">{match.awayStats.korgskott.lyckade}</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Korgräddningar</span>
                  <span>{match.homeStats.korgraddningar.lyckade}</span>
                  <span>{match.awayStats.korgraddningar.lyckade}</span>
                </div>
              </div>

              {/* Category: Uppkast */}
              <div className="border border-[#cfbeaa] rounded p-2 bg-white">
                <h5 className="font-bold text-stone-800 border-b pb-1 mb-1 font-serif text-sm">Uppkast (Jump ball)</h5>
                <div className="grid grid-cols-3 text-center py-0.5">
                  <span className="font-semibold text-left">Mått</span>
                  <span className="font-bold text-green-900">H</span>
                  <span className="font-bold text-red-900">B</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Antal</span>
                  <span>{match.homeStats.uppkast.antal}</span>
                  <span>{match.awayStats.uppkast.antal}</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Vunna</span>
                  <span>{match.homeStats.uppkast.vunna}</span>
                  <span>{match.awayStats.uppkast.vunna}</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Vunna (%)</span>
                  <span>{match.homeStats.uppkast.vunnaProcent}%</span>
                  <span>{match.awayStats.uppkast.vunnaProcent}%</span>
                </div>
              </div>

              {/* Category: Slagsmål */}
              <div className="border border-[#cfbeaa] rounded p-2 bg-white">
                <h5 className="font-bold text-stone-800 border-b pb-1 mb-1 font-serif text-sm">Slagsmål & Närkamper</h5>
                <div className="grid grid-cols-3 text-center py-0.5">
                  <span className="font-semibold text-left">Mått</span>
                  <span className="font-bold text-green-900">H</span>
                  <span className="font-bold text-red-900">B</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Antal Fights</span>
                  <span>{match.homeStats.slagsmal.antal}</span>
                  <span>{match.awayStats.slagsmal.antal}</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Startade</span>
                  <span>{match.homeStats.slagsmal.startade}</span>
                  <span>{match.awayStats.slagsmal.startade}</span>
                </div>
                <div className="grid grid-cols-3 text-center py-0.5 border-t border-stone-100">
                  <span className="text-left text-stone-600">Vunna Fights</span>
                  <span className="font-bold text-red-900">{match.homeStats.slagsmal.vunna}</span>
                  <span className="font-bold text-red-900">{match.awayStats.slagsmal.vunna}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
