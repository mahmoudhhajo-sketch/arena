import React from 'react';
import { Club } from '../types';

interface EconomicsViewProps {
  club: Club;
}

export const EconomicsView: React.FC<EconomicsViewProps> = ({ club }) => {
  const matchIncome = 246288;
  const sponsorIncome = 75000;
  const interestIncome = Math.round(club.gold * 0.005);
  const totalIncome = matchIncome + sponsorIncome + interestIncome;

  const playerWages = 142500;
  const coachWage = club.coach ? 15000 : 0;
  const doctorCost = club.doctorInvestment || 2000;
  const arenaMaintenance = club.arena?.weeklyRent || 1500;
  const totalExpenses = playerWages + coachWage + doctorCost + arenaMaintenance;

  const netResult = totalIncome - totalExpenses;

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-serif">
      <div className="border-b border-[#cfbeaa] pb-3 text-center">
        <h2 className="text-3xl font-extrabold text-[#292015]">
          Ekonomi
        </h2>
        <span className="text-xs text-stone-600 block mt-1 font-sans">
          Säsong 1 &bull; Veckoavräkning sker natten mot måndag 04:00
        </span>
      </div>

      {/* Main Dual Table: Inkomster & Utgifter (Screenshot 10) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Inkomster Table */}
        <div className="border border-[#8ea998] rounded overflow-hidden shadow-sm bg-[#fbfaf6]">
          <div className="bg-[#8ea998] text-[#1b3323] px-3 py-1 font-bold text-xs border-b border-[#779482] text-center">
            Inkomster
          </div>
          <table className="w-full text-xs text-stone-800">
            <thead className="bg-[#ebdcca] text-stone-700 font-bold border-b border-[#d8c8b1]">
              <tr>
                <th className="px-3 py-1.5 text-left">Post</th>
                <th className="px-3 py-1.5 text-right">Denna vecka</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebdcca]">
              <tr>
                <td className="px-3 py-2 font-medium">Matchintäkter</td>
                <td className="px-3 py-2 text-right font-bold text-green-900">
                  {matchIncome.toLocaleString('sv-SE')} guld
                </td>
              </tr>
              <tr className="bg-[#f5efe4]">
                <td className="px-3 py-2 font-medium">Sponsorer (Kejsarens fond)</td>
                <td className="px-3 py-2 text-right font-bold text-green-900">
                  {sponsorIncome.toLocaleString('sv-SE')} guld
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Räntor på kassakista</td>
                <td className="px-3 py-2 text-right font-bold text-green-900">
                  {interestIncome.toLocaleString('sv-SE')} guld
                </td>
              </tr>
              <tr className="bg-[#f5efe4]">
                <td className="px-3 py-2 font-medium">Spelarförsäljningar</td>
                <td className="px-3 py-2 text-right text-stone-500">0 guld</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Övrigt</td>
                <td className="px-3 py-2 text-right text-stone-500">0 guld</td>
              </tr>
              <tr className="bg-[#e4dac8] font-bold border-t-2 border-[#8ea998]">
                <td className="px-3 py-2 text-stone-900">Totala inkomster</td>
                <td className="px-3 py-2 text-right text-green-950">
                  {totalIncome.toLocaleString('sv-SE')} guld
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Utgifter Table */}
        <div className="border border-[#8ea998] rounded overflow-hidden shadow-sm bg-[#fbfaf6]">
          <div className="bg-[#8ea998] text-[#1b3323] px-3 py-1 font-bold text-xs border-b border-[#779482] text-center">
            Utgifter
          </div>
          <table className="w-full text-xs text-stone-800">
            <thead className="bg-[#ebdcca] text-stone-700 font-bold border-b border-[#d8c8b1]">
              <tr>
                <th className="px-3 py-1.5 text-left">Post</th>
                <th className="px-3 py-1.5 text-right">Denna vecka</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebdcca]">
              <tr>
                <td className="px-3 py-2 font-medium">Spelarlöner (samtliga aktiva)</td>
                <td className="px-3 py-2 text-right font-bold text-red-900">
                  {playerWages.toLocaleString('sv-SE')} guld
                </td>
              </tr>
              <tr className="bg-[#f5efe4]">
                <td className="px-3 py-2 font-medium">Tränarlön</td>
                <td className="px-3 py-2 text-right font-bold text-red-900">
                  {coachWage.toLocaleString('sv-SE')} guld
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Läkarekostnad</td>
                <td className="px-3 py-2 text-right font-bold text-red-900">
                  {doctorCost.toLocaleString('sv-SE')} guld
                </td>
              </tr>
              <tr className="bg-[#f5efe4]">
                <td className="px-3 py-2 font-medium">Underhåll &amp; Arenahyra</td>
                <td className="px-3 py-2 text-right font-bold text-red-900">
                  {arenaMaintenance.toLocaleString('sv-SE')} guld
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Magi &amp; Artefakter</td>
                <td className="px-3 py-2 text-right text-stone-500">0 guld</td>
              </tr>
              <tr className="bg-[#e4dac8] font-bold border-t-2 border-[#8ea998]">
                <td className="px-3 py-2 text-stone-900">Totala utgifter</td>
                <td className="px-3 py-2 text-right text-red-950">
                  {totalExpenses.toLocaleString('sv-SE')} guld
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      {/* Financial Status Summary Box (Screenshot 10) */}
      <div className="bg-[#ebdcca] border-2 border-[#b09e86] p-4 rounded text-xs space-y-2">
        <div className="flex justify-between items-center text-sm">
          <strong>Kassakista:</strong>
          <span className="font-extrabold text-stone-950 text-base">
            {club.gold.toLocaleString('sv-SE')} guld
          </span>
        </div>
        <div className="flex justify-between items-center text-sm border-t border-[#d8c8b1] pt-2">
          <strong>Beräknat veckoöverskott:</strong>
          <span className={`font-extrabold text-base ${netResult >= 0 ? 'text-green-900' : 'text-red-900'}`}>
            {netResult >= 0 ? `+${netResult.toLocaleString('sv-SE')}` : netResult.toLocaleString('sv-SE')} guld
          </span>
        </div>
        <div className="flex justify-between items-center text-stone-600 font-sans text-[11px] pt-1">
          <span>Mambennas Riksbanks inlåningsränta: 0.5% per vecka</span>
          <span>Maxkredit: 500 000 guld</span>
        </div>
      </div>
    </div>
  );
};
