'use strict';

export class CoherenceEngine {
  constructor(registry) { this._registry = registry; }

  compute(tagSet) {
    const arr = [...tagSet];
    if (arr.length <= 1) return 1;
    let s = 0, p = 0;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        s += this._registry.getCompat(arr[i], arr[j]);
        p++;
      }
    }
    return Math.round((s / p) * 100) / 100;
  }

  baseDamage(coherence, baseDmg = 30) {
    return Math.round(baseDmg * (coherence >= 0.4 ? 1 : coherence / 0.4));
  }
}
