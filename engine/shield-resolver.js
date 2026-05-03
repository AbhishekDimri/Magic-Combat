'use strict';
import { EVT_SHIELD_BROKEN } from './event-bus.js';

export class ShieldResolver {
  constructor(eventBus) { this._eventBus = eventBus; this._shields = {}; }

  addShieldRule(playerIndex, shieldRule) {
    if (!this._shields[playerIndex]) this._shields[playerIndex] = [];
    const list = this._shields[playerIndex];
    let i = 0;
    while (i < list.length && list[i].priority >= shieldRule.priority) i++;
    list.splice(i, 0, shieldRule);
  }

  evaluate(playerIndex, attackContext) {
    if (attackContext.bypass) return { dmg: attackContext.dmg, defApplied: false };
    const list = this._shields[playerIndex];
    if (!list || list.length === 0) return { dmg: attackContext.dmg, defApplied: false };
    for (let i = 0; i < list.length; i++) {
      const shield = list[i];
      if (shield.applies(attackContext)) {
        const modifiedDmg = shield.modify(attackContext.dmg);
        return { dmg: modifiedDmg, defApplied: true, shieldId: shield.id };
      }
    }
    return { dmg: attackContext.dmg, defApplied: false };
  }

  removeShieldRule(playerIndex, shieldRuleId) {
    const list = this._shields[playerIndex];
    if (!list) return;
    const idx = list.findIndex(s => s.id === shieldRuleId);
    if (idx !== -1) {
      list.splice(idx, 1);
      this._eventBus.emit(EVT_SHIELD_BROKEN, { playerIndex, shieldRuleId });
    }
  }

  clearPlayer(playerIndex) { this._shields[playerIndex] = []; }
}
