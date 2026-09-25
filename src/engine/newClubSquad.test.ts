import test from 'node:test';
import assert from 'node:assert/strict';
import { generateNewClubSquad } from './newClubSquad';
import { calculateWage, generateStarterSquad } from './playerGenerator';
import { validateLineup } from './lineup';

test('new club squads improve modestly and receive one specialist for every supported role', () => {
  const original = Math.random;
  const roles = ['Målvakt', 'Back', 'Innermittfält', 'Yttermittfält', 'Anfall', 'Anfall'];
  const indices = [0, 2, 8, 9, 14, 15];
  try {
    for (const race of ['human', 'elf', 'dwarf', 'orc'] as const) for (let role = 0; role < 6; role++) {
      // Constant RNG puts the role choice in each of its six intervals and makes the baseline comparable.
      Math.random = () => (role + .5) / 6;
      const baseline = generateStarterSquad(race, 'new', 'Berunia');
      const squad = generateNewClubSquad(race, 'new', 'Berunia');
      assert.equal(squad.length, 20);
      assert.equal(new Set(squad.map(p => p.shirtNumber)).size, 20);
      const star = squad[indices[role]];
      assert.equal(star.nominalPosition, roles[role]);
      assert.ok(star.wage >= 1899 && star.wage <= 2101);
      assert.ok(Object.values(star.attributes).filter(v => v >= 6).length >= 3);
      for (let i = 0; i < squad.length; i++) {
        const p = squad[i];
        assert.equal(p.wage, calculateWage(p.attributes));
        assert.equal(p.attributes.aggressivitet, baseline[i].attributes.aggressivitet);
        assert.ok(Number.isInteger(p.wage));
        assert.ok(Object.values(p.attributes).every(v => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-8));
        if (i !== indices[role]) assert.ok(p.attributes.skott > baseline[i].attributes.skott);
      }
      const lineup: any = { slots: {}, underlag: 'Gräs', intrade: 5, tactics: {uppspel:'Normal',spelvag:'Normal',skytte:'Normal'} };
      for (const [i, key] of ['goal','2-0','2-1','1-0','1-1'].entries()) lineup.slots[key] = {activePlayerIds:[squad[i*2].id,squad[i*2+1].id],reservePlayerIds:[]};
      assert.equal(validateLineup(lineup, squad), null, 'two goalkeepers are legal within ten active players');
    }
  } finally { Math.random = original; }
});
