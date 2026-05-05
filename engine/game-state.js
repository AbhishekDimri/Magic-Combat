'use strict';

export const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];

export const STA_COL = {
  STUN:'#f87171', FREEZE:'#818cf8', SLOW:'#86efac', BURN:'#f97316',
  WEAKEN:'#fbbf24', LIFESTEAL:'#a855f7', SHIELD:'#4ade80', SPEED:'#34d399',
  EXPOSED:'#fde68a', PULLED:'#f87171', D_SUPP:'#a5b4fc'
};

export const CAT_PILL = {
  ELEMENTAL:'rgba(248,113,113,.25);color:#fca5a5',
  PHYSICAL:'rgba(74,222,128,.25);color:#86efac',
  DIMENSIONAL:'rgba(129,140,248,.25);color:#a5b4fc',
  METAPHYSICAL:'rgba(251,191,36,.25);color:#fde68a',
  STATE:'rgba(156,163,175,.25);color:#d1d5db'
};

export function createGameState() {
  return {
    hp: [100, 100],
    round: 1,
    sel: [new Set(), new Set()],
    coh: [1, 1],
    circles: [null, null],
    customLaw: [1, 1],
    bRules: [null, null],
    statuses: [[], []]
  };
}

export function resetForBattle(state) {
  state.hp = [100, 100];
  state.round = 1;
  state.sel = [new Set(), new Set()];
  state.coh = [1, 1];
  state.statuses = [[], []];
}

export function resetForRematch(state) {
  resetForBattle(state);
}
