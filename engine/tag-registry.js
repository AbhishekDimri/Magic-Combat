'use strict';
import { buildCategoryMasks, toBitSet, fromBitSet, bitCategoryCount } from './bitset.js';

export const TAG_CATS = ['ELEMENTAL', 'PHYSICAL', 'DIMENSIONAL', 'METAPHYSICAL', 'STATE'];

export const TAG_LIST = [
  ['heat','ELEMENTAL'],['liquid','ELEMENTAL'],['cold','ELEMENTAL'],['electric','ELEMENTAL'],
  ['earth','ELEMENTAL'],['wind','ELEMENTAL'],['light','ELEMENTAL'],['dark','ELEMENTAL'],
  ['force','PHYSICAL'],['motion','PHYSICAL'],['solid','PHYSICAL'],['pierce','PHYSICAL'],
  ['absorb','PHYSICAL'],['bind','PHYSICAL'],
  ['void','DIMENSIONAL'],['phase','DIMENSIONAL'],['space','DIMENSIONAL'],['float','DIMENSIONAL'],
  ['gravity','DIMENSIONAL'],['null','DIMENSIONAL'],
  ['reveal','METAPHYSICAL'],['time','METAPHYSICAL'],['curse','METAPHYSICAL'],['soul','METAPHYSICAL'],
  ['persistent','STATE'],['channeled','STATE'],['reactive','STATE']
];

export const COMPAT_ENTRIES = [
  {a:'heat',b:'motion',v:.90},{a:'heat',b:'wind',v:.88},{a:'heat',b:'electric',v:.72},
  {a:'heat',b:'liquid',v:.45},{a:'heat',b:'cold',v:.10},{a:'heat',b:'force',v:.75},
  {a:'heat',b:'light',v:.65},
  {a:'liquid',b:'electric',v:.85},{a:'liquid',b:'cold',v:.87},{a:'liquid',b:'earth',v:.72},
  {a:'liquid',b:'motion',v:.78},{a:'liquid',b:'solid',v:.30},
  {a:'cold',b:'solid',v:.82},{a:'cold',b:'earth',v:.65},{a:'cold',b:'bind',v:.80},{a:'cold',b:'motion',v:.55},
  {a:'electric',b:'motion',v:.85},{a:'electric',b:'light',v:.80},{a:'electric',b:'wind',v:.75},{a:'electric',b:'earth',v:.15},
  {a:'earth',b:'solid',v:.92},{a:'earth',b:'force',v:.80},{a:'earth',b:'gravity',v:.88},{a:'earth',b:'bind',v:.75},
  {a:'wind',b:'motion',v:.89},{a:'wind',b:'float',v:.80},
  {a:'light',b:'reveal',v:.94},{a:'light',b:'void',v:.08},
  {a:'dark',b:'curse',v:.83},{a:'dark',b:'void',v:.75},{a:'dark',b:'soul',v:.79},
  {a:'force',b:'motion',v:.75},{a:'force',b:'gravity',v:.86},{a:'force',b:'pierce',v:.70},
  {a:'motion',b:'float',v:.84},{a:'motion',b:'phase',v:.55},
  {a:'solid',b:'earth',v:.92},{a:'solid',b:'bind',v:.78},{a:'solid',b:'motion',v:.20},
  {a:'pierce',b:'void',v:.88},{a:'pierce',b:'force',v:.70},{a:'pierce',b:'phase',v:.75},
  {a:'bind',b:'solid',v:.78},{a:'bind',b:'earth',v:.75},{a:'bind',b:'cold',v:.80},
  {a:'void',b:'pierce',v:.88},{a:'void',b:'null',v:.80},{a:'void',b:'phase',v:.84},
  {a:'void',b:'dark',v:.75},{a:'void',b:'earth',v:.12},
  {a:'phase',b:'space',v:.91},{a:'phase',b:'motion',v:.55},
  {a:'space',b:'time',v:.76},{a:'space',b:'float',v:.85},
  {a:'float',b:'motion',v:.84},{a:'float',b:'wind',v:.80},{a:'float',b:'gravity',v:.10},
  {a:'gravity',b:'earth',v:.88},{a:'gravity',b:'force',v:.86},
  {a:'soul',b:'dark',v:.79},{a:'soul',b:'light',v:.72},{a:'soul',b:'time',v:.68},{a:'soul',b:'curse',v:.72},
  {a:'reveal',b:'light',v:.94},{a:'reveal',b:'dark',v:.15},{a:'reveal',b:'void',v:.12},
  {a:'time',b:'space',v:.76},{a:'time',b:'channeled',v:.80}
];

export class TagRegistry {
  constructor(tagList, compatEntries) {
    this._tagList = tagList;
    this._tags = {};
    this._catNames = [];
    const catSet = new Set();

    // Build tag index
    tagList.forEach(([id, cat], i) => {
      this._tags[id] = { id, cat, bi: i };
      catSet.add(cat);
    });
    this._catNames = [...catSet];

    // Build tag index map (id → bit index)
    this._tagIndex = {};
    for (const id in this._tags) this._tagIndex[id] = this._tags[id].bi;

    // Build compatibility matrix (Float32Array grid, default 0.5, self = 1.0)
    const n = tagList.length;
    this._cm = Array.from({ length: n }, (_, i) => {
      const r = new Float32Array(n).fill(0.5);
      r[i] = 1;
      return r;
    });

    // Apply compatibility entries (symmetric)
    for (const { a, b, v } of compatEntries) {
      const ai = this._tags[a]?.bi, bi = this._tags[b]?.bi;
      if (ai !== undefined && bi !== undefined) {
        this._cm[ai][bi] = v;
        this._cm[bi][ai] = v;
      }
    }

    // Build category masks
    this._categoryMasks = buildCategoryMasks(tagList, this._tagIndex);
  }

  get categories() { return this._catNames; }
  get tagList() { return this._tagList; }

  getTag(id) { return this._tags[id]; }

  getCompat(a, b) {
    const ai = this._tags[a]?.bi ?? 0;
    const bi = this._tags[b]?.bi ?? 0;
    return this._cm[ai][bi];
  }

  getTagsByCategory(category) {
    return this._tagList.filter(([, cat]) => cat === category).map(([id]) => id);
  }

  toBitSet(tagSet) { return toBitSet(tagSet, this._tagIndex); }
  fromBitSet(bits) { return fromBitSet(bits, this._tagList); }
  bitCategoryCount(bits, category) { return bitCategoryCount(bits, category, this._categoryMasks); }

  get tagIndex() { return this._tagIndex; }
  get categoryMasks() { return this._categoryMasks; }
}
