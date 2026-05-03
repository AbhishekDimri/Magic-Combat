'use strict';
import { EVT_CIRCLE_SWITCH } from './event-bus.js';

export const CSM_IDLE = 'IDLE';
export const CSM_ACTIVE = 'ACTIVE';
export const CSM_SWITCHING = 'SWITCHING';
export const CSM_LOADING = 'LOADING';

const CSM_TRANSITIONS = {
  [CSM_IDLE]: [CSM_LOADING],
  [CSM_LOADING]: [CSM_ACTIVE],
  [CSM_ACTIVE]: [CSM_SWITCHING],
  [CSM_SWITCHING]: [CSM_LOADING]
};

export class CircleStateMachine {
  constructor(playerIndex, eventBus) {
    this.state = CSM_IDLE;
    this.playerIndex = playerIndex;
    this._eventBus = eventBus;
  }

  getState() { return this.state; }

  transition(newState) {
    const valid = CSM_TRANSITIONS[this.state];
    if (!valid || !valid.includes(newState)) return false;
    const prevState = this.state;
    this.state = newState;
    this._eventBus.emit(EVT_CIRCLE_SWITCH, { playerIndex: this.playerIndex, prevState, newState });
    return true;
  }

  getSwitchingPenalty() { return this.state === CSM_SWITCHING ? 0.7 : 1.0; }
  reset() { this.state = CSM_IDLE; }
}

export class CircleManager {
  constructor({ eventBus, ruleEngine, archetypes, bonusMods }) {
    this._eventBus = eventBus;
    this._ruleEngine = ruleEngine;
    this._archetypes = archetypes;
    this._bonusMods = bonusMods;
    this._csm = [new CircleStateMachine(0, eventBus), new CircleStateMachine(1, eventBus)];
  }

  get archetypes() { return this._archetypes; }

  getArchetype(id) { return this._archetypes.find(a => a.id === id); }

  generateBindingRules(playerIndex, archetypeId, customLawIndex) {
    const arch = this.getArchetype(archetypeId);
    if (!arch) return [];
    const laws = [arch.laws[0]];
    if (customLawIndex > 0 && customLawIndex < arch.laws.length) {
      laws.push(arch.laws[customLawIndex]);
    }
    return laws.map(law => ({
      id: `BND_P${playerIndex + 1}_${law.bonus}`,
      thr: 0.60, pri: 20, grp: null, col: '#f5c842', isBinding: true,
      desc: `[Binding] ${law.desc}`,
      mods: this._bonusMods[law.bonus] || [{ t: 'MUL', v: 1.2 }],
      cond: this._ruleEngine.compatCondition(law.a, law.b)
    }));
  }

  getCSM(playerIndex) { return this._csm[playerIndex]; }
  getSwitchingPenalty(playerIndex) { return this._csm[playerIndex].getSwitchingPenalty(); }
}
