'use strict';

/**
 * Archetype definitions and bonus modifier data.
 * Exactly matches the monolith's ARCHS array and BONUS_MODS map.
 */

export const ARCHETYPES_DATA = [
  {
    id: 'storm', name: 'Storm Circle', icon: '⛈',
    tags: ['electric', 'liquid', 'motion', 'wind'], col: '#818cf8',
    desc: 'Chain damage, high mobility. Electric amplified by motion.',
    laws: [
      { a: 'electric', b: 'motion', bonus: 'CHAIN_B', desc: 'Electric chains jump an extra target' },
      { a: 'wind', b: 'motion', bonus: 'SPEED_A', desc: 'Wind+motion SPEED duration doubled' }
    ]
  },
  {
    id: 'void', name: 'Void Circle', icon: '🕳',
    tags: ['void', 'pierce', 'null', 'phase'], col: '#a5b4fc',
    desc: 'Shield bypass specialist. Penetrates all defenses.',
    laws: [
      { a: 'void', b: 'pierce', bonus: 'PIERCE_A', desc: 'Void+pierce bypass flag + ×1.7 damage' },
      { a: 'phase', b: 'null', bonus: 'PHASE_S', desc: 'Phase+null grants 40% damage reduction' }
    ]
  },
  {
    id: 'inferno', name: 'Inferno Circle', icon: '🔥',
    tags: ['heat', 'electric', 'wind', 'force'], col: '#f97316',
    desc: 'Maximum damage output. Heat combos hit harder.',
    laws: [
      { a: 'heat', b: 'electric', bonus: 'PLASMA_A', desc: 'Plasma Burst damage ×2.5 instead of ×2.2' },
      { a: 'heat', b: 'wind', bonus: 'WILD_E', desc: 'Wildfire DoT extends to 8s' }
    ]
  },
  {
    id: 'earth', name: 'Earthen Circle', icon: '🪨',
    tags: ['earth', 'solid', 'bind', 'gravity'], col: '#86efac',
    desc: 'Maximum defense and control. Lowest damage output.',
    laws: [
      { a: 'solid', b: 'earth', bonus: 'FORT_S', desc: 'Solid+Earth damage reduction ×0.4 (60% less)' },
      { a: 'gravity', b: 'bind', bonus: 'GRAV_L', desc: 'Gravity+bind locks enemy mobility 2s' }
    ]
  },
  {
    id: 'ritual', name: 'Ritual Circle', icon: '✦',
    tags: ['time', 'space', 'light', 'soul'], col: '#f5c842',
    desc: 'Slow ramp, high ceiling. Laws reward sustained casting.',
    laws: [
      { a: 'time', b: 'space', bonus: 'RAMP', desc: 'Every cast this round adds ×0.3 to damage' },
      { a: 'light', b: 'soul', bonus: 'REVEAL_A', desc: 'Light+soul: EXPOSED lasts 5s instead of 3s' }
    ]
  },
  {
    id: 'shadow', name: 'Shadow Circle', icon: '🌑',
    tags: ['dark', 'curse', 'soul', 'void'], col: '#fde68a',
    desc: 'Debuff and drain. Weakens the opponent over multiple rounds.',
    laws: [
      { a: 'dark', b: 'curse', bonus: 'CURSE_A', desc: 'WEAKEN lasts 8s instead of 4s' },
      { a: 'soul', b: 'dark', bonus: 'DRAIN_A', desc: 'Lifesteal heals 50% of damage dealt' }
    ]
  }
];

export const BONUS_MODS = {
  CHAIN_B: [{ t: 'MUL', v: 1.3 }],
  SPEED_A: [{ t: 'STA', v: 'SPEED', d: 4 }],
  PIERCE_A: [{ t: 'BYP' }, { t: 'MUL', v: 1.7 }],
  PHASE_S: [{ t: 'DEF', v: 0.6 }],
  PLASMA_A: [{ t: 'MUL', v: 2.5 }],
  WILD_E: [{ t: 'MUL', v: 1.8 }, { t: 'STA', v: 'BURN', d: 8 }],
  FORT_S: [{ t: 'DEF', v: 0.4 }],
  GRAV_L: [{ t: 'STA', v: 'FREEZE', d: 2 }],
  RAMP: [{ t: 'MUL', v: 1.4 }],
  REVEAL_A: [{ t: 'STA', v: 'EXPOSED', d: 5 }],
  CURSE_A: [{ t: 'STA', v: 'WEAKEN', d: 8 }],
  DRAIN_A: [{ t: 'MUL', v: 1.4 }, { t: 'STA', v: 'LIFESTEAL', d: 0 }]
};
