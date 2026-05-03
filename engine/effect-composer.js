'use strict';
import { EVT_PHASE_COMPLETE } from './event-bus.js';

export const PHASE_PRE_MOD = 0;
export const PHASE_TRANSFORM = 1;
export const PHASE_POST_MOD = 2;
export const PHASE_FINALIZE = 3;

export class EffectComposer {
  constructor(eventBus) { this._eventBus = eventBus; }

  assignPhase(modifier) {
    const t = modifier.t;
    if (t === 'MUL' || t === 'BYP' || t === 'DEF') return PHASE_PRE_MOD;
    if (t === 'STA' || t === 'AOE') return PHASE_POST_MOD;
    return PHASE_TRANSFORM;
  }

  apply(firedRules, context) {
    const ctx = Object.assign({ dmg: 0, bypass: false, sts: [] }, context);
    const tagged = [];
    for (const { r } of firedRules) {
      for (const m of r.mods) {
        tagged.push({ mod: m, pri: r.pri, phase: this.assignPhase(m) });
      }
    }
    const phases = [[], [], [], []];
    for (const entry of tagged) phases[entry.phase].push(entry);
    for (const group of phases) group.sort((a, b) => b.pri - a.pri);
    for (let p = 0; p < 4; p++) {
      for (const { mod } of phases[p]) {
        if (mod.t === 'MUL') ctx.dmg = Math.round(ctx.dmg * mod.v);
        else if (mod.t === 'BYP') ctx.bypass = true;
        else if (mod.t === 'DEF') { if (!ctx.bypass) ctx.dmg = Math.round(ctx.dmg * mod.v); }
        else if (mod.t === 'STA') ctx.sts.push({ n: mod.v, d: mod.d });
        else if (mod.t === 'AOE') ctx.aoe = mod.v;
      }
      this._eventBus.emit(EVT_PHASE_COMPLETE, { phase: p, context: ctx });
    }
    return ctx;
  }
}
