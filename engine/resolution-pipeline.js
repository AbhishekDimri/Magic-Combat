'use strict';
import { EVT_RULE_TRIGGERED, EVT_MISFIRE } from './event-bus.js';

export class ResolutionPipeline {
  constructor({ ruleEngine, coherenceEngine, effectComposer, shieldResolver, circleManager, eventBus }) {
    this._ruleEngine = ruleEngine;
    this._coherenceEngine = coherenceEngine;
    this._effectComposer = effectComposer;
    this._shieldResolver = shieldResolver;
    this._circleManager = circleManager;
    this._eventBus = eventBus;
  }

  resolve(playerIndex, tagSet, extraRules = []) {
    // Stage 1: Coherence
    const coherence = this._coherenceEngine.compute(tagSet);

    // Stage 2+3+4: Rule evaluation (includes scoring + conflict resolution)
    const firedRules = this._ruleEngine.evaluate(tagSet, extraRules);

    // Emit OnRuleTriggered
    for (const sr of firedRules) {
      this._eventBus.emit(EVT_RULE_TRIGGERED, { ruleId: sr.r.id, score: sr.score, playerIndex });
    }

    // Stage 5: Phased modifier application
    const baseDmg = this._coherenceEngine.baseDamage(coherence);
    const ctx = this._effectComposer.apply(firedRules, { dmg: baseDmg, bypass: false, sts: [] });

    // Switching penalty
    const penalty = this._circleManager.getSwitchingPenalty(playerIndex);
    ctx.dmg = Math.round(ctx.dmg * penalty);

    // Stage 6: Shield resolution
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const shieldResult = this._shieldResolver.evaluate(opponentIndex, { dmg: ctx.dmg, bypass: ctx.bypass, tags: tagSet });
    ctx.dmg = shieldResult.dmg;

    // Misfire
    const misfire = coherence < 0.4;
    if (misfire) this._eventBus.emit(EVT_MISFIRE, { playerIndex, coherence });

    return { dmg: Math.max(0, ctx.dmg), bypass: ctx.bypass, sts: ctx.sts, misfire, firedRules, coherence, aoe: ctx.aoe };
  }
}
