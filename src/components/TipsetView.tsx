import React, { useState } from 'react';
import { TipsetMatch } from '../types';

interface TipsetViewProps {
  roundMatches: TipsetMatch[];
  onSubmitTipset: (predictions: Record<number, '1' | 'X' | '2'>) => void;
}

export const TipsetView: React.FC<TipsetViewProps> = ({
  roundMatches,
  onSubmitTipset,
}) => {
  const [tips, setTips] = useState<Record<number, '1' | 'X' | '2'>>(() => {
    const initial: Record<number, '1' | 'X' | '2'> = {};
    roundMatches.forEach((m) => {
      initial[m.id] = m.userPrediction || '1';
    });
    return initial;
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (matchId: number | string, sign: '1' | 'X' | '2') => {
    setTips((prev) => ({
      ...prev,
      [matchId]: sign,
    }));
  };

  const handleRandomize = () => {
    const signs: Array<'1' | 'X' | '2'> = ['1', 'X', '2'];
    const randomTips: Record<number, '1' | 'X' | '2'> = {};
    roundMatches.forEach((m) => {
      randomTips[m.id] = signs[Math.floor(Math.random() * signs.length)];
    });
    setTips(randomTips);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitTipset(tips);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-serif">
      <div className="border-b border-[#cfbeaa] pb-3 text-center">
        <h2 className="text-3xl font-extrabold text-[#292015]">
          Tipset
        </h2>
        <span className="text-xs text-stone-600 block mt-1">
          Omgång 1 &bull; Mambennas Kejsarserier
        </span>
      </div>

      {/* Description text (Screenshot 6) */}
      <div className="bg-[#fbf9f4] border border-[#cfbeaa] p-4 rounded text-xs leading-relaxed text-stone-800 font-sans">
        <p>
          Tipset går ut på att tippa utgången av tio utvalda matcher i Yaraaz Vigil. Ett rätt tips ger en poäng. Det kostar inget att delta och du kan vinna fina priser, guld och kejsarens ära. Lycka till!
        </p>
      </div>

      {/* Submitted indicator notice (Screenshot 6) */}
      <div className="bg-amber-50 border border-amber-300 text-amber-900 px-3 py-2 rounded text-xs font-sans">
        {submitted ? (
          <strong className="text-green-800">✓ Din rad har uppdaterats och sparats hos Tipskommittén!</strong>
        ) : (
          <span>
            <strong>Status:</strong> Du kan lämna och ändra dina tips fram till och med tisdag 18:59:00.
          </span>
        )}
      </div>

      {/* 10 Fixtures Table (Screenshot 6) */}
      <form onSubmit={handleSubmit} className="border border-[#8ea998] rounded overflow-hidden shadow-sm bg-[#fbfaf6]">
        <div className="bg-[#8ea998] text-[#1b3323] px-3 py-1 font-bold text-xs border-b border-[#779482] grid grid-cols-12">
          <span className="col-span-1">Nr</span>
          <span className="col-span-6">Match</span>
          <span className="col-span-3 text-center">Tips 1 X 2</span>
          <span className="col-span-2 text-right">Valt Tecken</span>
        </div>

        <div className="divide-y divide-[#ebdcca] text-xs">
          {roundMatches.map((m, idx) => {
            const currentSign = tips[m.id] || '1';
            return (
              <div
                key={m.id}
                className={`px-3 py-2 grid grid-cols-12 items-center ${
                  idx % 2 === 1 ? 'bg-[#f5efe4]' : 'bg-[#fbfaf6]'
                }`}
              >
                <div className="col-span-1 font-bold text-stone-600">{idx + 1}.</div>
                <div className="col-span-6 font-bold text-stone-900">
                  {m.homeTeam} - {m.awayTeam}
                </div>
                <div className="col-span-3 flex justify-center space-x-2">
                  {(['1', 'X', '2'] as const).map((sign) => (
                    <button
                      type="button"
                      key={sign}
                      onClick={() => handleSelect(m.id, sign)}
                      className={`w-7 h-6 rounded text-xs font-bold font-mono transition-colors cursor-pointer border ${
                        currentSign === sign
                          ? 'bg-[#871919] text-white border-[#5e1010] shadow-sm'
                          : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                      }`}
                    >
                      {sign}
                    </button>
                  ))}
                </div>
                <div className="col-span-2 text-right font-extrabold text-sm text-stone-900 font-mono">
                  {currentSign}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons: Slumpa raden & Skicka in tips (Screenshot 6) */}
        <div className="bg-[#ebdcca] p-3 border-t border-[#8ea998] flex justify-between items-center">
          <button
            type="button"
            onClick={handleRandomize}
            className="bg-stone-100 hover:bg-white text-stone-800 border border-[#9c8b74] px-3 py-1.5 rounded text-xs font-bold shadow-sm cursor-pointer"
          >
            🎲 Slumpa raden
          </button>

          <button
            type="submit"
            className="bg-[#d45d24] hover:bg-[#b84c17] text-white px-6 py-1.5 rounded text-xs font-extrabold shadow cursor-pointer uppercase tracking-wider"
          >
            Skicka in tips
          </button>
        </div>
      </form>

      {/* Top tipsters list */}
      <div className="border border-[#8ea998] rounded overflow-hidden bg-[#fbfaf6] shadow-sm">
        <div className="bg-[#8ea998] text-[#1b3323] px-3 py-1 font-bold text-xs border-b border-[#779482]">
          Topplista Tipset - Omgång 1
        </div>
        <table className="w-full text-xs">
          <tbody className="divide-y divide-[#ebdcca]">
            <tr className="bg-[#f5efe4]">
              <td className="px-3 py-1.5 font-bold w-12">1.</td>
              <td className="px-3 py-1.5 font-bold text-green-900">Hooligan</td>
              <td className="px-3 py-1.5 text-right font-bold">9 rätt</td>
            </tr>
            <tr>
              <td className="px-3 py-1.5 font-bold">2.</td>
              <td className="px-3 py-1.5 font-bold text-stone-800">TobbeHjälten</td>
              <td className="px-3 py-1.5 text-right font-bold">8 rätt</td>
            </tr>
            <tr className="bg-[#f5efe4]">
              <td className="px-3 py-1.5 font-bold">3.</td>
              <td className="px-3 py-1.5 font-bold text-stone-800">Gargamell</td>
              <td className="px-3 py-1.5 text-right font-bold">8 rätt</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
