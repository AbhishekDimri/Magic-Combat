'use strict';

/**
 * Declarative rule definitions — 26 combat rules.
 *
 * FIX 4 applied here: ELEM_OVERLOAD and all apex/high-multiplier rules
 * moved into the 'APEX' conflict group. Only ONE apex rule fires per cast.
 *
 * Why this matters:
 *   Before: ELEM_OVERLOAD (×2.5) fired alongside STORM_SURGE (×2.0) and
 *           PLASMA_BURST (×2.2) simultaneously. With diminishing returns that
 *           would still be: 2.5 + 0.55×1.5 + 0.30×1.2 = ×5.2 → capped at ×4.5.
 *           Selecting all tags would always hit the cap.
 *   After:  APEX group means only the highest-scoring apex rule fires.
 *           ELEM_OVERLOAD scores 1.0 when 3+ elementals present, but its
 *           coherence penalty from all those tags means base damage is ~1.
 *           1 × 2.5 = 2 damage. Correctly terrible.
 *
 * APEX group members and their conditions:
 *   ELEM_OVERLOAD  — any 3+ elemental tags     (coherence dies when mixed)
 *   STORM_APEX     — electric+liquid+wind+motion (focused, high coherence)
 *   RITUAL_APEX    — time+space+light+soul       (focused, high coherence)
 *   VOID_COLLAPSE  — void+null+dark              (dimensional + dark synergy)
 *
 * Result: a player who focuses their circle gets the APEX bonus cleanly.
 *         A player who selects everything gets ELEM_OVERLOAD "winning" the
 *         APEX group (it scores 1.0 on category condition) but with a
 *         coherence-destroyed base damage of 1-3. Deliberate chaos = bad.
 *
 * Condition descriptor types:
 *   { type: 'compat', a, b }         → scores getCompat(a, b) if both tags present
 *   { type: 'presence', tag }        → returns 1 if tag present, 0 otherwise
 *   { type: 'category', cat, min }   → scores based on count of tags in category
 *   { type: 'and', left, right }     → min(left, right), short-circuits on 0
 */

export const RULES_DATA = [

  // ── SIMPLE RULES — single compat condition ─────────────────────────────────

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
    id: 'SOUL_DRAIN', thr: 0.70, pri: 8, grp: null, col: '#fde68a',
    desc: 'Soul + dark → ×1.4 + LIFESTEAL 30%',
    condition: { type: 'compat', a: 'soul', b: 'dark' },
    mods: [{ t: 'MUL', v: 1.4 }, { t: 'STA', v: 'LIFESTEAL', d: 0 }]
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
    id: 'PHASE_STRIKE', thr: 0.75, pri: 9, grp: null, col: '#a5b4fc',
    desc: 'Phase + pierce → bypass + ×1.3',
    condition: { type: 'compat', a: 'phase', b: 'pierce' },
    mods: [{ t: 'BYP' }, { t: 'MUL', v: 1.3 }]
  },

  // ── VOID GROUP — bypass specialists, mutually exclusive ───────────────────

  {
    id: 'VOID_PIERCE', thr: 0.75, pri: 10, grp: 'VOID', col: '#a5b4fc',
    desc: 'Void + pierce → bypass shields, ×1.5',
    condition: { type: 'compat', a: 'void', b: 'pierce' },
    mods: [{ t: 'BYP' }, { t: 'MUL', v: 1.5 }]
  },
  {
    id: 'VOID_SEAL', thr: 0.72, pri: 13, grp: 'VOID', col: '#a5b4fc',
    desc: 'Void + null + metaphysical → bypass + suppress 3s',
    condition: {
      type: 'and',
      left:  { type: 'compat', a: 'void', b: 'null' },
      right: { type: 'category', cat: 'METAPHYSICAL', min: 1 }
    },
    mods: [{ t: 'BYP' }, { t: 'STA', v: 'D_SUPP', d: 3 }]
  },
  {
    // VOID_COLLAPSE moved to VOID group (not APEX) — it's a void variant, not an apex
    id: 'VOID_COLLAPSE', thr: 0.70, pri: 11, grp: 'VOID', col: '#a5b4fc',
    desc: 'Void + null + dark → bypass + ×2.0 + suppress 4s',
    condition: {
      type: 'and',
      left:  { type: 'compat', a: 'void', b: 'null' },
      right: { type: 'presence', tag: 'dark' }
    },
    mods: [{ t: 'BYP' }, { t: 'MUL', v: 2.0 }, { t: 'STA', v: 'D_SUPP', d: 4 }]
  },

  // ── WATER GROUP — transform conflict, only one fires ─────────────────────

  {
    id: 'COLD_FREEZE', thr: 0.65, pri: 9, grp: 'WATER', col: '#818cf8',
    desc: 'Cold + liquid → FREEZE 2s + SLOW 5s',
    condition: { type: 'compat', a: 'cold', b: 'liquid' },
    mods: [{ t: 'STA', v: 'FREEZE', d: 2 }, { t: 'STA', v: 'SLOW', d: 5 }]
  },
  {
    id: 'STEAM_BURST', thr: 0.40, pri: 6, grp: 'WATER', col: '#f87171',
    desc: 'Heat + liquid → ×1.3 + AoE 3m (risky, low compat)',
    condition: { type: 'compat', a: 'heat', b: 'liquid' },
    mods: [{ t: 'MUL', v: 1.3 }, { t: 'AOE', v: 3 }]
  },

  // ── HEAT_E GROUP — heat combos, only one fires ────────────────────────────

  {
    id: 'WILDFIRE', thr: 0.70, pri: 10, grp: 'HEAT_E', col: '#f97316',
    desc: 'Heat + wind + motion → ×1.8 + BURN 5s',
    condition: {
      type: 'and',
      left:  { type: 'compat', a: 'heat', b: 'wind' },
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
    // THERMAL_SHOCK — very low threshold (0.08) because heat+cold compat is 0.10
    // Fires even on opposing tags, but is in HEAT_E so competes with Plasma/Wildfire
    id: 'THERMAL_SHOCK', thr: 0.08, pri: 8, grp: 'HEAT_E', col: '#f87171',
    desc: 'Heat + cold → ×2.0 thermal shock + BURN (risky, opposing tags)',
    condition: { type: 'compat', a: 'heat', b: 'cold' },
    mods: [{ t: 'MUL', v: 2.0 }, { t: 'STA', v: 'BURN', d: 2 }]
  },

  // ── STORM GROUP — storm variants, only one fires ──────────────────────────

  {
    id: 'STORM_SURGE', thr: 0.70, pri: 12, grp: 'STORM', col: '#818cf8',
    desc: 'Electric + liquid + motion → ×2.0 + STUN',
    condition: {
      type: 'and',
      left:  { type: 'compat', a: 'electric', b: 'liquid' },
      right: { type: 'presence', tag: 'motion' }
    },
    mods: [{ t: 'MUL', v: 2.0 }, { t: 'STA', v: 'STUN', d: 1.5 }]
  },
  {
    // STORM_APEX moved to APEX group — it's the escalated version
    // Removed from STORM group so it competes at the apex tier instead
    id: 'STORM_APEX', thr: 0.70, pri: 15, grp: 'APEX', col: '#818cf8',
    desc: 'Electric + liquid + wind + motion → ×3.0 storm apex + STUN + AoE',
    condition: {
      type: 'and',
      left: {
        type: 'and',
        left:  { type: 'compat', a: 'electric', b: 'liquid' },
        right: { type: 'compat', a: 'wind',     b: 'motion' }
      },
      right: {
        type: 'and',
        left:  { type: 'presence', tag: 'wind' },
        right: { type: 'presence', tag: 'motion' }
      }
    },
    mods: [{ t: 'MUL', v: 3.0 }, { t: 'STA', v: 'STUN', d: 2 }, { t: 'AOE', v: 6 }]
  },

  // ── DEFENSE/CONTROL — ungrouped ───────────────────────────────────────────

  {
    id: 'MUD_WALL', thr: 0.65, pri: 7, grp: null, col: '#86efac',
    desc: 'Liquid + earth → ×0.55 taken + SLOW',
    condition: { type: 'compat', a: 'liquid', b: 'earth' },
    mods: [{ t: 'DEF', v: 0.55 }, { t: 'STA', v: 'SLOW', d: 3 }]
  },
  {
    id: 'ARCTIC_BIND', thr: 0.70, pri: 8, grp: null, col: '#818cf8',
    desc: 'Cold + bind + solid → ×0.5 dmg taken + FREEZE 3s',
    condition: {
      type: 'and',
      left:  { type: 'compat', a: 'cold', b: 'bind' },
      right: { type: 'presence', tag: 'solid' }
    },
    mods: [{ t: 'DEF', v: 0.5 }, { t: 'STA', v: 'FREEZE', d: 3 }]
  },
  {
    id: 'GRAVITY_SLAM', thr: 0.75, pri: 9, grp: null, col: '#fde68a',
    desc: 'Gravity + earth + force → ×1.9 AoE + SLOW',
    condition: {
      type: 'and',
      left:  { type: 'compat', a: 'gravity', b: 'earth' },
      right: { type: 'presence', tag: 'force' }
    },
    mods: [{ t: 'MUL', v: 1.9 }, { t: 'AOE', v: 4 }, { t: 'STA', v: 'SLOW', d: 2 }]
  },
  {
    id: 'GRAVITY_PRISON', thr: 0.70, pri: 10, grp: null, col: '#fde68a',
    desc: 'Gravity + bind + earth → ×0.4 taken + FREEZE 5s prison',
    condition: {
      type: 'and',
      left:  { type: 'compat', a: 'gravity', b: 'earth' },
      right: { type: 'presence', tag: 'bind' }
    },
    mods: [{ t: 'DEF', v: 0.4 }, { t: 'STA', v: 'FREEZE', d: 5 }]
  },
  {
    id: 'SOUL_REND', thr: 0.65, pri: 10, grp: null, col: '#fde68a',
    desc: 'Soul + curse + pierce → ×1.6 + LIFESTEAL + WEAKEN 3s',
    condition: {
      type: 'and',
      left:  { type: 'compat', a: 'soul', b: 'curse' },
      right: { type: 'presence', tag: 'pierce' }
    },
    mods: [{ t: 'MUL', v: 1.6 }, { t: 'STA', v: 'LIFESTEAL', d: 0 }, { t: 'STA', v: 'WEAKEN', d: 3 }]
  },

  // ── APEX GROUP — only ONE fires per cast (highest score wins) ─────────────
  //
  // These are the highest-tier combinations in the game.
  // Grouping them means a focused player gets their circle's apex move cleanly.
  // A chaotic player who selects all tags will "win" the group with ELEM_OVERLOAD
  // (category condition scores 1.0 easily) but their coherence-destroyed base
  // damage of 1-3 means ×2.5 = 3-7 damage. Intentional chaos punishment.
  //
  // Ordering within the group (highest pri wins ties):
  //   STORM_APEX    pri=15 — requires 4 specific high-compat tags
  //   RITUAL_APEX   pri=14 — requires 4 specific high-compat tags
  //   ELEM_OVERLOAD pri=13 — requires any 3 elemental tags (easier, lower pri)
  //
  // In practice a focused Storm player will score STORM_APEX at 0.85+ and
  // ELEM_OVERLOAD might also score 0.70+ if they happen to have 3 elementals —
  // but STORM_APEX has pri=15 vs ELEM_OVERLOAD pri=13, so STORM_APEX wins.

  {
    id: 'ELEM_OVERLOAD', thr: 0.70, pri: 13, grp: 'APEX', col: '#f87171',
    desc: '3+ elemental tags → ×2.5 overload (coherence punishes unfocused builds)',
    condition: { type: 'category', cat: 'ELEMENTAL', min: 3 },
    mods: [{ t: 'MUL', v: 2.5 }]
  },
  {
    id: 'RITUAL_APEX', thr: 0.70, pri: 14, grp: 'APEX', col: '#f5c842',
    desc: 'Time + space + light + soul → ×3.5 ritual apex',
    condition: {
      type: 'and',
      left:  { type: 'compat', a: 'time', b: 'space' },
      right: {
        type: 'and',
        left:  { type: 'presence', tag: 'light' },
        right: { type: 'presence', tag: 'soul' }
      }
    },
    mods: [{ t: 'MUL', v: 3.5 }]
  },

];
