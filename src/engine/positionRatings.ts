import {activeSpells} from '../constants/spells';
import {effectiveAttributes} from '../constants/market';
import { Player, PlayerAttributes, PositionRatings } from '../types';

export interface PositionWeights {
  primary: Array<{ attr: keyof PlayerAttributes; weight: number }>;
  secondary: Array<{ attr: keyof PlayerAttributes; weight: number }>;
  conditioningWeight: number;
}

// Configurable position formulas based on Section 9 specification
export const POSITION_WEIGHTS_CONFIG: Record<string, PositionWeights> = {
  goalBox: {
    primary: [
      { attr: 'malvakt', weight: 0.75 },
      { attr: 'passning', weight: 0.25 },
    ],
    secondary: [
      { attr: 'speluppfattning', weight: 0.15 },
    ],
    conditioningWeight: 0.15,
  },
  wingAttack: { // row 0, col 0 & 2
    primary: [
      { attr: 'snabbhet', weight: 0.40 },
      { attr: 'skott', weight: 0.35 },
      { attr: 'teknik', weight: 0.25 },
    ],
    secondary: [
      { attr: 'passning', weight: 0.20 },
      { attr: 'speluppfattning', weight: 0.10 },
    ],
    conditioningWeight: 0.15,
  },
  centralAttack: { // row 0, col 1
    primary: [
      { attr: 'skott', weight: 0.45 },
      { attr: 'speluppfattning', weight: 0.30 },
      { attr: 'teknik', weight: 0.25 },
    ],
    secondary: [
      { attr: 'passning', weight: 0.15 },
      { attr: 'tuffhet', weight: 0.10 },
    ],
    conditioningWeight: 0.15,
  },
  wingMidfield: { // row 1, col 0 & 2 (defends side baskets!)
    primary: [
      { attr: 'snabbhet', weight: 0.30 },
      { attr: 'teknik', weight: 0.25 },
      { attr: 'skott', weight: 0.25 },
      { attr: 'passning', weight: 0.20 },
    ],
    secondary: [
      { attr: 'malvakt', weight: 0.20 }, // Wing midfielders defend the side baskets!
    ],
    conditioningWeight: 0.15,
  },
  centralMidfield: { // row 1, col 1
    primary: [
      { attr: 'speluppfattning', weight: 0.40 },
      { attr: 'teknik', weight: 0.30 },
      { attr: 'passning', weight: 0.30 },
    ],
    secondary: [
      { attr: 'markering', weight: 0.20 },
    ],
    conditioningWeight: 0.15,
  },
  wingBack: { // row 2, col 0 & 2
    primary: [
      { attr: 'markering', weight: 0.51 },
      { attr: 'tuffhet', weight: 0.25 },
      { attr: 'aggressivitet', weight: 0.04 },
      { attr: 'snabbhet', weight: 0.20 },
    ],
    secondary: [
      { attr: 'teknik', weight: 0.15 },
      { attr: 'passning', weight: 0.15 },
    ],
    conditioningWeight: 0.15,
  },
  centralBack: { // row 2, col 1
    primary: [
      { attr: 'markering', weight: 0.51 },
      { attr: 'tuffhet', weight: 0.30 },
      { attr: 'aggressivitet', weight: 0.04 },
      { attr: 'speluppfattning', weight: 0.15 },
    ],
    secondary: [
      { attr: 'teknik', weight: 0.15 },
      { attr: 'passning', weight: 0.15 },
    ],
    conditioningWeight: 0.15,
  },
};

function calculateSlotScore(
  attrs: PlayerAttributes,
  weights: PositionWeights,
  form: number,
  useForm: boolean
): number {
  let primarySum = 0;
  for (const item of weights.primary) {
    primarySum += (attrs[item.attr] || 0) * item.weight;
  }

  let secondarySum = 0;
  for (const item of weights.secondary) {
    secondarySum += (attrs[item.attr] || 0) * item.weight;
  }

  const cond = (attrs.kondition || 0) * weights.conditioningWeight;

  const raw = Math.max((primarySum + secondarySum * 0.5 + cond)*1.6, weights===POSITION_WEIGHTS_CONFIG.centralAttack ? attrs.skott*1.2 : 0);

  // Form modifier (form scale 0-16, baseline 8)
  const formFactor = useForm ? 0.75 + form / 64 : 1.0;
  const rating = Math.round(raw * formFactor);
  return Math.max(1, rating);
}

export function calculatePlayerPositionRatings(player: Player, useForm: boolean): PositionRatings {
  const attrs = useForm ? effectiveAttributes(player) : player.attributes;
  const form = Math.min(16,player.form+activeSpells(player.artifacts).reduce((a,s)=>a+(s.form||0),0));

  // Row 0: Attack (wing, center, wing)
  // Row 1: Midfield (wing, center, wing)
  // Row 2: Back/Defense (wing, center, wing)
  const r0c0 = calculateSlotScore(attrs, POSITION_WEIGHTS_CONFIG.wingAttack, form, useForm);
  const r0c1 = calculateSlotScore(attrs, POSITION_WEIGHTS_CONFIG.centralAttack, form, useForm);
  const r0c2 = calculateSlotScore(attrs, POSITION_WEIGHTS_CONFIG.wingAttack, form, useForm);

  const r1c0 = calculateSlotScore(attrs, POSITION_WEIGHTS_CONFIG.wingMidfield, form, useForm);
  const r1c1 = calculateSlotScore(attrs, POSITION_WEIGHTS_CONFIG.centralMidfield, form, useForm);
  const r1c2 = calculateSlotScore(attrs, POSITION_WEIGHTS_CONFIG.wingMidfield, form, useForm);

  const r2c0 = calculateSlotScore(attrs, POSITION_WEIGHTS_CONFIG.wingBack, form, useForm);
  const r2c1 = calculateSlotScore(attrs, POSITION_WEIGHTS_CONFIG.centralBack, form, useForm);
  const r2c2 = calculateSlotScore(attrs, POSITION_WEIGHTS_CONFIG.wingBack, form, useForm);

  const goalBox = calculateSlotScore(attrs, POSITION_WEIGHTS_CONFIG.goalBox, form, useForm);

  return {
    matrix: [
      [r0c0, r0c1, r0c2],
      [r1c0, r1c1, r1c2],
      [r2c0, r2c1, r2c2],
    ],
    goalBox,
  };
}
