'use strict';

export class RuleEngine {
  constructor(registry) {
    this._registry = registry;
    this._rules = [];
  }

  compatCondition(a, b) {
    const reg = this._registry;
    return (tagSet) => tagSet.has(a) && tagSet.has(b) ? reg.getCompat(a, b) : 0;
  }

  presenceCondition(tag) {
    return (tagSet) => tagSet.has(tag) ? 1 : 0;
  }

  categoryCondition(category, minCount = 1) {
    const reg = this._registry;
    return (tagSet) => {
      const c = [...tagSet].filter(t => { const tag = reg.getTag(t); return tag && tag.cat === category; }).length;
      return c ? Math.min(1, c / minCount) : 0;
    };
  }

  andCondition(a, b) {
    return (tagSet) => { const s = a(tagSet); return s ? Math.min(s, b(tagSet)) : 0; };
  }

  _hydrateCondition(descriptor) {
    switch (descriptor.type) {
      case 'compat': return this.compatCondition(descriptor.a, descriptor.b);
      case 'presence': return this.presenceCondition(descriptor.tag);
      case 'category': return this.categoryCondition(descriptor.cat, descriptor.min || 1);
      case 'and': return this.andCondition(this._hydrateCondition(descriptor.left), this._hydrateCondition(descriptor.right));
      default: throw new Error(`Unknown condition type: ${descriptor.type}`);
    }
  }

  _validateConditionTags(descriptor, ruleId) {
    const reg = this._registry;
    if (descriptor.type === 'compat') {
      if (!reg.getTag(descriptor.a)) throw new Error(`Rule "${ruleId}": unknown tag "${descriptor.a}"`);
      if (!reg.getTag(descriptor.b)) throw new Error(`Rule "${ruleId}": unknown tag "${descriptor.b}"`);
    } else if (descriptor.type === 'presence') {
      if (!reg.getTag(descriptor.tag)) throw new Error(`Rule "${ruleId}": unknown tag "${descriptor.tag}"`);
    } else if (descriptor.type === 'and') {
      this._validateConditionTags(descriptor.left, ruleId);
      this._validateConditionTags(descriptor.right, ruleId);
    }
  }

  loadRules(rulesData) {
    this._rules = rulesData.map(rd => {
      this._validateConditionTags(rd.condition, rd.id);
      return {
        id: rd.id, thr: rd.thr, pri: rd.pri, grp: rd.grp, col: rd.col,
        desc: rd.desc, mods: rd.mods, isBinding: rd.isBinding || false,
        cond: this._hydrateCondition(rd.condition)
      };
    });
  }

  evaluate(tagSet, extraRules = []) {
    const all = [...this._rules, ...extraRules];
    const scored = all.map(r => ({ r, score: r.cond(tagSet) }))
      .filter(s => s.score >= s.r.thr)
      .sort((a, b) => b.score - a.score || b.r.pri - a.r.pri);
    const grps = {}, ng = [];
    scored.forEach(s => s.r.grp ? (grps[s.r.grp] = grps[s.r.grp] || [], grps[s.r.grp].push(s)) : ng.push(s));
    const w = [...ng];
    Object.values(grps).forEach(g => w.push(g[0]));
    return w.sort((a, b) => b.score - a.score);
  }
}
