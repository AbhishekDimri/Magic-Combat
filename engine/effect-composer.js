'use strict';
import { EVT_PHASE_COMPLETE } from './event-bus.js';

export const PHASE_PRE_MOD  = 0;
export const PHASE_TRANSFORM = 1;
export const PHASE_POST_MOD  = 2;
export const PHASE_FINALIZE  = 3;

/**
 * EffectComposer — applies phased modifiers to a damage context.
 *
 * FIX 3 applied here: diminishing returns on MUL multipliers + hard damage cap.
 *
 * OLD behaviour:
 *   MUL mods applied sequentially, each multiplying the running total.
 *   Selecting all tags fired 6+ MUL rules simultaneously:
 *   30 × 1.6 × 2.2 × 2.5 × 1.9 × 1.4 × 2.0 = ~700 → after more rules = 24,000
 *
 * NEW behaviour:
 *   Step 1 — collect all MUL values, sort descending (strongest first).
 *   Step 2 — apply diminishing returns: each subsequent multiplier contributes
 *             less via an exponential weight: weight = MUL_FALLOFF ^ index
 *             effectiveBonus = (multiplier - 1) × weight
 *             Combined: totalMul = product of (1 + effectiveBonus) per multiplier
 *   Step 3 — clamp total multiplier to MAX_TOTAL_MULTIPLIER (hard cap).
 *
 * Diminishing return examples with MUL_FALLOFF = 0.55:
 *   1 rule  (×2.0):                    effective = ×2.00
 *   2 rules (×2.0, ×1.8):              effective = ×2.00 × 1.44 = ×2.88
 *   3 rules (×2.5, ×2.0, ×1.9):        effective = ×2.50 × 1.55 × 1.50 = ×5.8 → capped at ×4.5
 *   6 rules (all firing simultaneously):  would be ×~18 → capped at ×4.5
 *
 * Hard cap MAX_TOTAL_MULTIPLIER = 4.5:
 *   Max single-cast damage = baseDmg(coherence=1.0) × 4.5 = 30 × 4.5 = 135
 *   Focused combo (coh 0.85, base 23) × 4.5 = 103 max
 *   All-tags chaos (coh 0.11, base 1)  × 4.5 = 4 max  ← the fix
 *
 * DEF mods (damage reduction on defender side) are unaffected by this —
 * they still apply directly as multipliers because they reduce damage, not inflate it.
 */

const MUL_FALLOFF          = 0.55;  // weight decay per additional multiplier
const MAX_TOTAL_MULTIPLIER = 4.5;   // hard ceiling on combined damage boost

export class EffectComposer {
  constructor(eventBus) {
    this._eventBus = eventBus;
  }

  /**
   * Assign a modifier to its execution phase.
   * MUL, BYP, DEF run in PRE_MOD (before type changes).
   * STA, AOE run in POST_MOD (after type resolution).
   * Everything else falls through to TRANSFORM.
   */
  assignPhase(modifier) {
    const t = modifier.t;
    if (t === 'MUL' || t === 'BYP' || t === 'DEF') return PHASE_PRE_MOD;
    if (t === 'STA' || t === 'AOE')                 return PHASE_POST_MOD;
    return PHASE_TRANSFORM;
  }

  /**
   * Apply all fired rules' modifiers to the context in phase order.
   *
   * @param {Array}  firedRules  — scored rules from RuleEngine.evaluate()
   * @param {Object} context     — initial context: { dmg, bypass, sts }
   * @returns {Object}           — mutated context with final values
   */
  apply(firedRules, context) {
    const ctx = Object.assign({ dmg: 0, bypass: false, sts: [], aoe: null }, context);

    // Collect all modifiers tagged with their phase and source rule priority
    const tagged = [];
    for (const { r } of firedRules) {
      for (const m of r.mods) {
        tagged.push({ mod: m, pri: r.pri, phase: this.assignPhase(m) });
      }
    }

    // Bucket into phases and sort each phase by priority (highest first)
    const phases = [[], [], [], []];
    for (const entry of tagged) phases[entry.phase].push(entry);
    for (const group of phases) group.sort((a, b) => b.pri - a.pri);

    // ── PHASE 0: PRE_MOD ──────────────────────────────────────────────────────
    // Separate MUL mods from BYP/DEF so we can apply diminishing returns to MUL only
    const mulMods = phases[PHASE_PRE_MOD].filter(e => e.mod.t === 'MUL');
    const otherPreMods = phases[PHASE_PRE_MOD].filter(e => e.mod.t !== 'MUL');

    // Apply BYP and DEF first (order-independent within phase)
    for (const { mod } of otherPreMods) {
      if (mod.t === 'BYP') {
        ctx.bypass = true;
      } else if (mod.t === 'DEF') {
        // DEF reduces incoming damage — only applies if not bypassed
        // Note: bypass flag is set by attacker context, DEF is defender context.
        // The ResolutionPipeline separates these, but guard here too.
        if (!ctx.bypass) {
          ctx.dmg = Math.round(ctx.dmg * mod.v);
        }
      }
    }

    // Apply MUL mods with diminishing returns
    if (mulMods.length > 0) {
      // Sort by multiplier value descending — strongest bonus applied first, full weight
      const values = mulMods
        .map(e => e.mod.v)
        .sort((a, b) => b - a);

      let totalMultiplier = 1.0;
      for (let i = 0; i < values.length; i++) {
        const bonus = values[i] - 1;              // e.g. ×2.0 → bonus = 1.0
        const weight = Math.pow(MUL_FALLOFF, i);  // 1st=1.0, 2nd=0.55, 3rd=0.30...
        totalMultiplier *= (1 + bonus * weight);
      }

      // Hard cap — no single cast can exceed MAX_TOTAL_MULTIPLIER regardless of combos
      totalMultiplier = Math.min(totalMultiplier, MAX_TOTAL_MULTIPLIER);
      ctx.dmg = Math.round(ctx.dmg * totalMultiplier);

      // Expose breakdown on context for EventBus consumers (debugging, UI)
      ctx._mulBreakdown = {
        values,
        totalMultiplier: Math.round(totalMultiplier * 100) / 100,
        capped: totalMultiplier >= MAX_TOTAL_MULTIPLIER,
      };
    }

    this._eventBus.emit(EVT_PHASE_COMPLETE, { phase: PHASE_PRE_MOD, context: ctx });

    // ── PHASE 1: TRANSFORM ────────────────────────────────────────────────────
    // Type-replacement mods (none in current rules, reserved for future use)
    for (const { mod } of phases[PHASE_TRANSFORM]) {
      // Future: mod.t === 'XFORM' would replace ctx.tagSet here
      void mod;
    }
    this._eventBus.emit(EVT_PHASE_COMPLETE, { phase: PHASE_TRANSFORM, context: ctx });

    // ── PHASE 2: POST_MOD ─────────────────────────────────────────────────────
    // Status effects and AoE — applied after damage is finalised
    for (const { mod } of phases[PHASE_POST_MOD]) {
      if (mod.t === 'STA') ctx.sts.push({ n: mod.v, d: mod.d });
      if (mod.t === 'AOE') ctx.aoe = Math.max(ctx.aoe || 0, mod.v); // largest AoE wins
    }
    this._eventBus.emit(EVT_PHASE_COMPLETE, { phase: PHASE_POST_MOD, context: ctx });

    // ── PHASE 3: FINALIZE ─────────────────────────────────────────────────────
    // Terminal multipliers (e.g. Ritual ramp-up) — also subject to hard cap
    const finalizeMuls = phases[PHASE_FINALIZE].filter(e => e.mod.t === 'MUL');
    if (finalizeMuls.length > 0) {
      let finMul = 1.0;
      for (const { mod } of finalizeMuls) finMul *= mod.v;
      finMul = Math.min(finMul, MAX_TOTAL_MULTIPLIER);
      ctx.dmg = Math.round(ctx.dmg * finMul);
    }
    this._eventBus.emit(EVT_PHASE_COMPLETE, { phase: PHASE_FINALIZE, context: ctx });

    return ctx;
  }

  /**
   * Exposed constants for UI display and testing.
   */
  static get MAX_MULTIPLIER() { return MAX_TOTAL_MULTIPLIER; }
  static get FALLOFF()        { return MUL_FALLOFF; }
}
