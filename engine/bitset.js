'use strict';

export function buildCategoryMasks(tagList, tagIndex) {
  const masks = {};
  for (const [id, cat] of tagList) {
    if (!masks[cat]) masks[cat] = 0;
    masks[cat] |= (1 << tagIndex[id]);
  }
  return masks;
}

export function toBitSet(tagSet, tagIndex) {
  let bits = 0;
  for (const id of tagSet) {
    const bi = tagIndex[id];
    if (bi !== undefined) bits |= (1 << bi);
  }
  return bits;
}

export function fromBitSet(bits, tagList) {
  const s = new Set();
  for (let i = 0; i < tagList.length; i++) {
    if (bits & (1 << i)) s.add(tagList[i][0]);
  }
  return s;
}

export function bitHas(bits, tagId, tagIndex) {
  const bi = tagIndex[tagId];
  return bi !== undefined ? !!(bits & (1 << bi)) : false;
}

export function bitSubset(a, b) {
  return (a & b) === a;
}

export function bitCategoryCount(bits, category, categoryMasks) {
  let masked = bits & (categoryMasks[category] || 0);
  let count = 0;
  while (masked) { masked &= (masked - 1); count++; }
  return count;
}
