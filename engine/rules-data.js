'use strict';

/**
 * Declarative rule definitions for all 26 combat rules.
 * Condition descriptors are hydrated into executable functions by RuleEngine.loadRules().
 *
 * Condition descriptor types:
 *   { type: 'compat', a, b }       → scores getCompat(a, b) if both tags present
 *   { type: 'presence', tag }      → returns 1 if tag present, 0 otherwise
 *   { type: 'category', cat, min } → scores based on count of tags in category
 *   { type: 'and', left, right }   → min(left, right), short-circuits on 0
 */

export const RULES_DATA = [
  {
    id: 'HEAT_AMPLIFY', thr: 0.70, pri: 5, grp: null, col: '#f87171',
    desc: 'Heat + motion → ×1.6 damage',
    condition: { type: 'compat', a: 'heat', b: 'motion' },
    mods: [{ t: 'MUL', v: 1.6 }]
  },
  {
    id: 'WIND_MOBILE', thr: 0.70, pri: 5, grp: null, col: '#86efac',
    desc: 'Wind + motion → SPEED 2s',
    condition: { type: 'compat', a: 'wind', b: 'motion' },
    mods: [{ t: 'STA', v: 'SPEED', d: 2 }]
  },
  {
    id: 'SOLID_SHIELD', thr: 0.80, pri: 8, grp: null, col: '#4ade80',
    desc: 'Solid + earth → ×0.55 dmg taken + SHIELD',
    condition: { type: 'compat', a: 'solid', b: 'earth' },
    mods: [{ t: 'DEF', v: 0.55 }, { t: 'STA', v: 'SHIELD', d: 3 }]
  },
  {
    id: 'VOID_PIERCE', thr: 0.75, pri: 10, grp: 'VOID', col: '#a5b4fc',
    desc: 'Void + pierce → bypass shields, ×1.5',
    condition: { type: 'compat', a: 'void', b: 'pierce' },
    mods: [{ t: 'BYP' }, { t: 'MUL', v: 1.5 }]
  },
  {
    id: 'DARK_CURSE', thr: 0.70, pri: 5, grp: null, col: '#fde68a',
    desc: 'Dark + curse → WEAKEN 4s on target',
    condition: { type: 'compat', a: 'dark', b: 'curse' },
    mods: [{ t: 'STA', v: 'WEAKEN', d: 4 }]
  },
  {
    id: 'FLOAT_EVADE', thr: 0.65, pri: 4, grp: null, col: '#a5b4fc',
    desc: 'Float + motion → ×0.7 incoming damage',
    condition: { type: 'compat', a: 'float', b: 'motion' },
    mods: [{ t: 'DEF', v: 0.7 }]
  },
  {
    id: 'STORM_SURGE', thr: 0.70, pri: 12, grp: 'STORM', col: '#818cf8',
    desc: 'Electric + liquid + motion → ×2.0 + STUN',
    condition: {
      type: 'and',
      left: { type: 'compat', a: 'electric', b: 'liquid' },
      right: { type: 'presence', tag: 'motion' }
    },
    mods: [{ t: 'MUL', v: 2.0 }, { t: 'STA', v: 'STUN', d: 1.5 }]
  },
  {
    id: 'WILDFIRE', thr: 0.70, pri: 10, grp: 'HEAT_E', col: '#f97316',
    desc: 'Heat + wind + motion → ×1.8 + BURN 5s',
    condition: {
      type: 'and',
      left: { type: 'compat', a: 'heat', b: 'wind' },
      right: { type: 'presence', tag: 'motion' }
    },
    mods: [{ t: 'MUL', v: 1.8 }, { t: 'STA', v: 'BURN', d: 5 }]
  },
  {
    id: 'PLASMA_BURST', thr: 0.80, pri: 11, grp: 'HEAT_E', col: '#fbbf24',
    desc: 'Heat + electric → ×2.2 + AoE 2m',
    condition: { type: 'compat', a: 'heat', b: 'electric' },
    mods: [{ t: 'MUL', v: 2.2 }, { t: 'AOE', v: 2 }]
  },
  {
    id: 'MUD_WALL', thr: 0.65, pri: 7, grp: null, col: '#86efac',
    desc: 'Liquid + earth → ×0.55 taken + SLOW',
    condition: { type: 'compat', a: 'liquid', b: 'earth' },
    mods: [{ t: 'DEF', v: 0.55 }, { t: 'STA', v: 'SLOW', d: 3 }]
  },
  {
    id: 'COLD_FREEZE', thr: 0.65, pri: 9, grp: 'WATER', col: '#818cf8',
    desc: 'Cold + liquid → FREEZE 2s + SLOW 5s',
    condition: { type: 'compat', a: 'cold', b: 'liquid' },
    mods: [{ t: 'STA', v: 'FREEZE', d: 2 }, { t: 'STA', v: 'SLOW', d: 5 }]
  },
  {
    id: 'STEAM_BURST', thr: 0.40, pri: 6, grp: 'WATER', col: '#f87171',
    desc: 'Heat + liquid → ×1.3 + AoE 3m (risky)',
    condition: { type: 'compat', a: 'heat', b: 'liquid' },
    mods: [{ t: 'MUL', v: 1.3 }, { t: 'AOE', v: 3 }]
  },
  {
    id: 'ELEM_OVERLOAD', thr: 0.70, pri: 15, grp: null, col: '#f87171',
    desc: '3+ elemental tags → ×2.5 overload',
    condition: { type: 'category', cat: 'ELEMENTAL', min: 3 },
    mods: [{ t: 'MUL', v: 2.5 }]
  },
  {
    id: 'VOID_SEAL', thr: 0.72, pri: 13, grp: 'VOID', col: '#a5b4fc',
    desc: 'Void + null + meta → bypass + suppress 3s',
    condition: {
      type: 'and',
      left: { type: 'compat', a: 'void', b: 'null' },
      right: { type: 'category', cat: 'METAPHYSICAL', min: 1 }
    },
    mods: [{ t: 'BYP' }, { t: 'STA', v: 'D_SUPP', d: 3 }]
  },
  {
    id: 'GRAVITY_SLAM', thr: 0.75, pri: 9, grp: null, col: '#fde68a',
    desc: 'Gravity + earth + force → ×1.9 AoE + SLOW',
    condition: {
      type: 'and',
      left: { type: 'compat', a: 'gravity', b: 'earth' },
      right: { type: 'presence', tag: 'force' }
    },
    mods: [{ t: 'MUL', v: 1.9 }, { t: 'AOE', v: 4 }, { t: 'STA', v: 'SLOW', d: 2 }]
  },
  {
    id: 'SOUL_DRAIN', thr: 0.70, pri: 8, grp: null, col: '#fde68a',
    desc: 'Soul + dark → ×1.4 + LIFESTEAL 30%',
    condition: { type: 'compat', a: 'soul', b: 'dark' },
    mods: [{ t: 'MUL', v: 1.4 }, { t: 'STA', v: 'LIFESTEAL', d: 0 }]
  },
  {
    id: 'ARCTIC_BIND', thr: 0.70, pri: 8, grp: null, col: '#818cf8',
    desc: 'Cold + bind + solid → ×0.5 + FREEZE 3s',
    condition: {
      type: 'and',
      left: { type: 'compat', a: 'cold', b: 'bind' },
      right: { type: 'presence', tag: 'solid' }
    },
    mods: [{ t: 'DEF', v: 0.5 }, { t: 'STA', v: 'FREEZE', d: 3 }]
  },
  {
    id: 'PHASE_STRIKE', thr: 0.75, pri: 9, grp: null, col: '#a5b4fc',
    desc: 'Phase + pierce → bypass + ×1.3',
    condition: { type: 'compat', a: 'phase', b: 'pierce' },
    mods: [{ t: 'BYP' }, { t: 'MUL', v: 1.3 }]
  },
  {
    id: 'LIGHT_REVEAL', thr: 0.80, pri: 11, grp: null, col: '#fde68a',
    desc: 'Light + reveal → ×1.2 + EXPOSED 3s',
    condition: { type: 'compat', a: 'light', b: 'reveal' },
    mods: [{ t: 'MUL', v: 1.2 }, { t: 'STA', v: 'EXPOSED', d: 3 }]
  },
  {
    id: 'GRAVITY_PULL', thr: 0.70, pri: 7, grp: null, col: '#fde68a',
    desc: 'Gravity + force → ×1.4 + PULLED 1s',
    condition: { type: 'compat', a: 'gravity', b: 'force' },
    mods: [{ t: 'MUL', v: 1.4 }, { t: 'STA', v: 'PULLED', d: 1 }]
  },
  {
    id: 'RITUAL_APEX', thr: 0.70, pri: 14, grp: 'RITUAL', col: '#f5c842',
    desc: 'Time + space + light + soul → ×3.5 ritual apex',
    condition: {
      type: 'and',
      left: { type: 'compat', a: 'time', b: 'space' },
      right: {
        type: 'and',
        left: { type: 'presence', tag: 'light' },
        right: { type: 'presence', tag: 'soul' }
      }
    },
    mods: [{ t: 'MUL', v: 3.5 }]
  },
  {
    id: 'THERMAL_SHOCK', thr: 0.08, pri: 11, grp: 'HEAT_E', col: '#f87171',
    desc: 'Heat + cold → ×2.0 thermal shock + BURN (risky, low compat)',
    condition: { type: 'compat', a: 'heat', b: 'cold' },
    mods: [{ t: 'MUL', v: 2.0 }, { t: 'STA', v: 'BURN', d: 2 }]
  },
  {
    id: 'GRAVITY_PRISON', thr: 0.70, pri: 10, grp: null, col: '#fde68a',
    desc: 'Gravity + bind + earth → ×0.4 taken + FREEZE 5s prison',
    condition: {
      type: 'and',
      left: { type: 'compat', a: 'gravity', b: 'earth' },
      right: { type: 'presence', tag: 'bind' }
    },
    mods: [{ t: 'DEF', v: 0.4 }, { t: 'STA', v: 'FREEZE', d: 5 }]
  },
  {
    id: 'STORM_APEX', thr: 0.70, pri: 15, grp: 'STORM', col: '#818cf8',
    desc: 'Electric + liquid + wind + motion → ×3.0 storm apex + STUN + AoE',
    condition: {
      type: 'and',
      left: {
        type: 'and',
        left: { type: 'compat', a: 'electric', b: 'liquid' },
        right: { type: 'compat', a: 'wind', b: 'motion' }
      },
      right: {
        type: 'and',
        left: { type: 'presence', tag: 'wind' },
        right: { type: 'presence', tag: 'motion' }
      }
    },
    mods: [{ t: 'MUL', v: 3.0 }, { t: 'STA', v: 'STUN', d: 2 }, { t: 'AOE', v: 6 }]
  },
  {
    id: 'VOID_COLLAPSE', thr: 0.70, pri: 13, grp: 'VOID', col: '#a5b4fc',
    desc: 'Void + null + dark → bypass + ×2.0 + suppress 4s',
    condition: {
      type: 'and',
      left: { type: 'compat', a: 'void', b: 'null' },
      right: { type: 'presence', tag: 'dark' }
    },
    mods: [{ t: 'BYP' }, { t: 'MUL', v: 2.0 }, { t: 'STA', v: 'D_SUPP', d: 4 }]
  },
  {
    id: 'SOUL_REND', thr: 0.65, pri: 10, grp: null, col: '#fde68a',
    desc: 'Soul + curse + pierce → ×1.6 + LIFESTEAL + WEAKEN 3s',
    condition: {
      type: 'and',
      left: { type: 'compat', a: 'soul', b: 'curse' },
      right: { type: 'presence', tag: 'pierce' }
    },
    mods: [{ t: 'MUL', v: 1.6 }, { t: 'STA', v: 'LIFESTEAL', d: 0 }, { t: 'STA', v: 'WEAKEN', d: 3 }]
  }
];
