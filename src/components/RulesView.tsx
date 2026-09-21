import React from 'react';

export const RulesView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto font-serif text-stone-800 leading-relaxed">
      <div className="border-b border-[#cfbeaa] pb-3 text-center">
        <h2 className="text-3xl font-extrabold text-[#871919]">
          Nybörjarguide &amp; Officiella Spelregler
        </h2>
        <span className="text-xs text-stone-600 block mt-1 font-sans">
          Mambennas Högsta Yaraaz-Råd &bull; Kodifierad upplaga
        </span>
      </div>

      {/* Intro */}
      <div className="bg-[#fbf9f4] border border-[#cfbeaa] p-4 rounded text-xs space-y-3 font-sans">
        <h3 className="font-bold text-sm text-[#2b2116] font-serif">1. Vad är Yaraaz Vigil?</h3>
        <p>
          Yaraaz Vigil är den mest ärofyllda och våldsamma boll- och taktikstriden i Kejsardömet Mambenna.
          Två fästen ställer upp tio krigare och trollkarlar var på en stensatt hexagonal plan för att erövra sidokorgar,
          genombryta fiendens linjer och drämma läderbollen i motståndarens målbur.
        </p>
      </div>

      {/* Spelplan & Positioner */}
      <div className="border border-[#8ea998] rounded overflow-hidden shadow-sm bg-[#fbfaf6]">
        <div className="bg-[#8ea998] text-[#1b3323] px-3 py-1 font-bold text-xs border-b border-[#779482]">
          2. Spelplanen och de 10 Spelarna
        </div>
        <div className="p-4 text-xs space-y-3 font-sans">
          <p>
            Planen är indelad i ett 3x3 rutmönster samt två målvaktszoner:
          </p>
          <ul className="list-disc list-inside space-y-1 text-stone-700 pl-2">
            <li><strong>Målvakt (1):</strong> Vaktar den egna målburen. Kräver hög målvaktsförmåga och speluppfattning.</li>
            <li><strong>Backlinje (3):</strong> Vänsterback, mittback och högerback. Kräver markering, tuffhet och passning.</li>
            <li><strong>Mittfält (3):</strong> Vänstermittfält, innermittfält och högermittfält.</li>
            <li><strong>Sidokorgar:</strong> Yttermittfältarna vaktar de två sidokorgarna som sitter på planens mittlinje!</li>
            <li><strong>Anfallskedja (3):</strong> Vänsterytter, centeranfall och högerytter. Skott, snabbhet och teknik är avgörande.</li>
          </ul>
        </div>
      </div>

      {/* Poängberäkning & Perioder */}
      <div className="border border-[#8ea998] rounded overflow-hidden shadow-sm bg-[#fbfaf6]">
        <div className="bg-[#8ea998] text-[#1b3323] px-3 py-1 font-bold text-xs border-b border-[#779482]">
          3. Matchstruktur och Poängräkning (Det heliga 5-Periodsystemet)
        </div>
        <div className="p-4 text-xs space-y-3 font-sans">
          <p>
            En match i Yaraaz Vigil spelas alltid i <strong>5 perioder</strong>.
          </p>
          <div className="bg-[#ede4d4] p-3 rounded border border-[#bfae98] space-y-2">
            <p><strong>Råpoäng under en period:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-stone-800">
              <li><strong>Sidokorgsmål:</strong> Ger 1 råpoäng och ger ditt lag herravälde över den korgen.</li>
              <li><strong>Normalt Mål:</strong> Ger 3 råpoäng om inga korgar hålls.</li>
              <li><strong>Mål med 1 korg erövrad:</strong> Ger 4 råpoäng!</li>
              <li><strong>Mål med båda korgarna erövrade:</strong> Ger 5 råpoäng!</li>
            </ul>
          </div>
          <p>
            Laget med flest råpoäng vid periodens slut vinner perioden och erhåller <strong>1 matchpoäng</strong>.
            Matchens slutresultat skrivs i periodpoäng (t.ex. 3 - 2, 4 - 1 eller 5 - 0).
          </p>
        </div>
      </div>

      {/* Egenskapsskalan */}
      <div className="border border-[#8ea998] rounded overflow-hidden shadow-sm bg-[#fbfaf6]">
        <div className="bg-[#8ea998] text-[#1b3323] px-3 py-1 font-bold text-xs border-b border-[#779482]">
          4. Den Kvalitativa Egenskapsskalan
        </div>
        <div className="p-4 text-xs font-sans">
          <p className="mb-2">
            Spelarnas attribut mäts inte i siffror utåt, utan i den klassiska kejserliga skalan:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <span className="p-1 bg-[#ede4d4] rounded">1: Hopplös</span>
            <span className="p-1 bg-[#ede4d4] rounded">2: Katastrofal</span>
            <span className="p-1 bg-[#ede4d4] rounded">3: Bedrövlig</span>
            <span className="p-1 bg-[#ede4d4] rounded">4: Usel</span>
            <span className="p-1 bg-[#ede4d4] rounded">5: Svag</span>
            <span className="p-1 bg-[#ede4d4] rounded">6: Medioker</span>
            <span className="p-1 bg-[#ede4d4] rounded">7: Skaplig</span>
            <span className="p-1 bg-[#ede4d4] rounded">8: Duglig</span>
            <span className="p-1 bg-[#ede4d4] rounded">9: Medelmåttig</span>
            <span className="p-1 bg-[#ede4d4] rounded">10: Hyfsad</span>
            <span className="p-1 bg-[#ede4d4] rounded">11: God</span>
            <span className="p-1 bg-[#ede4d4] rounded">12: Suverän</span>
            <span className="p-1 bg-[#ede4d4] rounded">13: Fenomenal</span>
            <span className="p-1 bg-[#ede4d4] rounded">14: Magisk</span>
            <span className="p-1 bg-[#ede4d4] rounded">15: Gudomlig</span>
            <span className="p-1 bg-[#ede4d4] rounded">16+: Utomjordisk</span>
          </div>
        </div>
      </div>
    </div>
  );
};
