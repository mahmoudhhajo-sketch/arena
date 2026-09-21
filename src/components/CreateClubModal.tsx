import React, { useState } from 'react';
import { Race } from '../types';
import { RACE_DESCRIPTIONS, RACE_DISPLAY_NAMES } from '../constants/attributes';

interface CreateClubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateClub: (clubName: string, shortName: string, race: Race, ownerName: string) => void;
}

export const CreateClubModal: React.FC<CreateClubModalProps> = ({
  isOpen,
  onClose,
  onCreateClub,
}) => {
  const [clubName, setClubName] = useState('Berunias Järnfalkar');
  const [shortName, setShortName] = useState('Järnfalkar');
  const [ownerName, setOwnerName] = useState('Fogde');
  const [race, setRace] = useState<Race>('human');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clubName.trim()) {
      onCreateClub(clubName.trim(), shortName.trim() || clubName.trim(), race, ownerName.trim() || 'Manager');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#fcf8f0] border-4 border-[#5a4836] rounded-lg shadow-2xl max-w-lg w-full p-5 font-serif text-stone-900">
        <div className="border-b-2 border-[#82715d] pb-2 mb-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-extrabold text-[#7a1c1c] uppercase tracking-wide">
              Registrera Fäste &bull; Säsong 1 Day 0
            </h3>
            <span className="text-[11px] text-stone-600 font-sans block">
              Mambennas kejsarliga ligakommission för Yaraaz Vigil
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-black font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Rules Banner */}
          <div className="bg-[#ede3d1] p-2.5 rounded border border-[#d6c5af] text-[11px] leading-relaxed text-stone-800">
            <span className="font-bold text-[#7a1c1c] block mb-1">📜 Officiella Grundregler:</span>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Hemort tilldelas slumpmässigt bland din ras heliga bosättningar i Mambenna.</li>
              <li>20 nya orörda spelare av samma ras mönstras till din trupp.</li>
              <li>Startkassa: 200 000 guld. Startserie: Division 3:1.</li>
              <li>0 spelade matcher &bull; 0/0/0 i matchrad &bull; 0 i meritpoäng.</li>
            </ul>
          </div>

          <div>
            <label className="block font-bold text-stone-800 mb-1">Lagnamn:</label>
            <input
              type="text"
              required
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              className="w-full bg-white border border-[#9a8871] rounded px-2.5 py-1.5 text-xs font-bold text-stone-900"
              placeholder="T.ex. Berunias Järnfalkar"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-800 mb-1">Kortnamn:</label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                className="w-full bg-white border border-[#9a8871] rounded px-2 py-1 text-xs font-bold"
                placeholder="T.ex. Falkar"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-800 mb-1">Ditt Managernamn:</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-white border border-[#9a8871] rounded px-2 py-1 text-xs font-bold"
                placeholder="T.ex. Fogde"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-800 mb-1">Välj Klubbens Ras:</label>
            <select
              value={race}
              onChange={(e) => setRace(e.target.value as Race)}
              className="w-full bg-white border border-[#9a8871] rounded px-2 py-1.5 text-xs font-semibold"
            >
              {(['human','elf','dwarf','orc'] as Race[]).map((r) => (
                <option key={r} value={r}>
                  {RACE_DISPLAY_NAMES[r]}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-stone-600 italic bg-[#ede3d1] p-2 rounded border border-[#d6c5af]">
              {RACE_DESCRIPTIONS[race]}
            </div>
          </div>

          <div className="pt-3 border-t border-[#d8c8b1] flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded text-xs cursor-pointer"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-[#871919] hover:bg-[#6e1414] text-white font-bold rounded text-xs shadow cursor-pointer font-serif"
            >
              Grunda Fäste &amp; Mönstra Trupp
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
