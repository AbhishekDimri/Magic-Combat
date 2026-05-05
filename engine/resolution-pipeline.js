'use strict';
import { EVT_RULE_TRIGGERED, EVT_MISFIRE } from './event-bus.js';

/**
 * ResolutionPipeline — orchestrates the full 6-stage combat resolution.
 *
 * Stage 1: Coherence computation      (CoherenceEngine)
 * Stage 2: Rule evaluation + scoring  (RuleEngine)
 * Stage 3: EventBus instrumentation   (OnRuleTriggered per fired rule)
 * Stage 4: Phased modifier application (EffectComposer — with diminishing returns fix)
 * Stage 5: Switching penalty          (CircleManager)
 * Stage 6: Shield resolution          (ShieldResolver)
 *
 * Misfire threshold updated to use CoherenceEngine.isMisfire() (now < 0.25)
 * rather than the old hardcoded < 0.4 cliff.
 */
export class ResolutionPipeline {
  constructor({ ruleEngine, coherenceEngine, effectComposer, shieldResolver, circleManager, eventBus }) {
    this._ruleEngine      = ruleEngine;
    this._coherenceEngine = coherenceEngine;
    this._effectComposer  = effectComposer;
    this._shieldResolver  = shieldResolver;
    this._circleManager   = circleManager;
    this._eventBus        = eventBus;
  }

  resolve(playerIndex, tagSet, extraRules = []) {
    // Stage 1: Coherence — now includes tag count penalty
    const coherence = this._coherenceEngine.compute(tagSet);

    // Stage 2+3+4: Rule evaluation (BitSet pre-filter → score → conflict resolution)
    const firedRules = this._ruleEngine.evaluate(tagSet, extraRules);

    // Stage 3: Instrument every fired rule
    for (const sr of firedRules) {
      this._eventBus.emit(EVT_RULE_TRIGGERED, {
        ruleId: sr.r.id,
        score: sr.score,
        playerIndex,
        isBinding: sr.r.isBinding || false,
      });
    }

    // Stage 4: Phased composition with diminishing returns on MUL + hard cap
    const baseDmg = this._coherenceEngine.baseDamage(coherence);
    const ctx = this._effectComposer.apply(firedRules, { dmg: baseDmg, bypass: false, sts: [] });

    // Stage 5: Switching penalty (0.7× when SWITCHING state active)
    const penalty = this._circleManager.getSwitchingPenalty(playerIndex);
    ctx.dmg = Math.round(ctx.dmg * penalty);

    // Stage 6: Shield resolution — bypass flag respected
    const opponentIndex  = playerIndex === 0 ? 1 : 0;
    const shieldResult   = this._shieldResolver.evaluate(opponentIndex, {
      dmg: ctx.dmg,
      bypass: ctx.bypass,
      tags: tagSet,
    });
    ctx.dmg = shieldResult.dmg;

    // Misfire check — now uses CoherenceEngine.isMisfire() (threshold 0.25)
    const misfire = this._coherenceEngine.isMisfire(coherence);
    if (misfire) {
      this._eventBus.emit(EVT_MISFIRE, { playerIndex, coherence });
    }

    return {
      dmg:        Math.max(0, ctx.dmg),
      bypass:     ctx.bypass,
      sts:        ctx.sts,
      misfire,
      firedRules,
      coherence,
      aoe:        ctx.aoe || null,
      // Expose multiplier breakdown for UI display
      mulBreakdown: ctx._mulBreakdown || null,
    };
  }
}
