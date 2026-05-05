'use strict';

/**
 * CoherenceEngine — computes coherence score and base damage.
 *
 * FIX 1 applied here: two-part penalty system replacing the old cliff at 0.4.
 *
 *  Part A — Pairwise compatibility average (existing logic, unchanged)
 *    Average compat score across all tag pairs. High-affinity combos score near 1.0,
 *    chaotic mixes score near 0.5, opposing pairs drag it toward 0.
 *
 *  Part B — Tag count penalty (NEW)
 *    Optimal tag count is 2–5. Every tag beyond that reduces coherence multiplicatively.
 *    Formula: countPenalty = (OPTIMAL / tagCount) ^ COUNT_EXPONENT  when tagCount > OPTIMAL
 *    With COUNT_EXPONENT = 0.7:
 *      5 tags  → penalty 1.00 (no penalty)
 *      8 tags  → penalty 0.72
 *     14 tags  → penalty 0.50
 *     27 tags  → penalty 0.27
 *
 *  Combined coherence = pairAverage × countPenalty
 *
 *  FIX 2 applied here: continuous damage curve replacing the hard cliff.
 *    Old: baseDmg * (coherence >= 0.4 ? 1 : coherence / 0.4)   ← cliff, anything above 0.4 = full damage
 *    New: baseDmg * coherence^CURVE_EXPONENT                    ← smooth quadratic-ish curve
 *    With CURVE_EXPONENT = 1.5:
 *      coherence 1.00 → ×1.000 (full damage)
 *      coherence 0.85 → ×0.783 (focused circle)
 *      coherence 0.60 → ×0.465 (moderate chaos)
 *      coherence 0.40 → ×0.253 (high chaos)
 *      coherence 0.11 → ×0.036 (all 27 tags selected)
 *
 *  Expected base damage examples:
 *    4-tag Storm combo (coh ~0.85)  → 30 × 0.783 = ~23
 *    8 random tags   (coh ~0.38)    → 30 × 0.221 = ~7
 *    All 27 tags     (coh ~0.11)    → 30 × 0.036 = ~1
 */

const OPTIMAL_TAG_COUNT = 5;
const COUNT_EXPONENT    = 0.7;
const CURVE_EXPONENT    = 1.5;

export class CoherenceEngine {
  constructor(registry) {
    this._registry = registry;
  }

  /**
   * Compute coherence score for a tag set.
   * Returns a value in [0, 1] — higher = more focused and compatible.
   */
  compute(tagSet) {
    const arr = [...tagSet];
    if (arr.length === 0) return 1;
    if (arr.length === 1) return 1;

    // Part A: pairwise compatibility average
    let sum = 0, pairs = 0;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        sum += this._registry.getCompat(arr[i], arr[j]);
        pairs++;
      }
    }
    const pairAvg = sum / pairs;

    // Part B: tag count penalty — only activates beyond OPTIMAL_TAG_COUNT
    const countPenalty = arr.length <= OPTIMAL_TAG_COUNT
      ? 1.0
      : Math.pow(OPTIMAL_TAG_COUNT / arr.length, COUNT_EXPONENT);

    const raw = pairAvg * countPenalty;
    return Math.round(raw * 100) / 100;
  }

  /**
   * Convert coherence score to base damage using a smooth power curve.
   * This replaces the old hard cliff at 0.4.
   */
  baseDamage(coherence, baseDmg = 30) {
    const scale = Math.pow(Math.max(0, coherence), CURVE_EXPONENT);
    return Math.round(baseDmg * scale);
  }

  /**
   * Returns a human-readable label for a coherence score.
   * Used by the UI to give players meaningful feedback.
   */
  label(coherence) {
    if (coherence >= 0.85) return 'PURE';
    if (coherence >= 0.70) return 'FOCUSED';
    if (coherence >= 0.55) return 'MODERATE';
    if (coherence >= 0.40) return 'CHAOTIC';
    if (coherence >= 0.20) return 'FRACTURED';
    return 'COLLAPSED';
  }

  /**
   * Misfire threshold — below this coherence, the cast is considered a misfire.
   * Kept as a method so it can be tuned independently of baseDamage.
   */
  isMisfire(coherence) {
    return coherence < 0.25;
  }
}
