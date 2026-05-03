'use strict';
export const EVT_RULE_TRIGGERED = 'OnRuleTriggered';
export const EVT_MISFIRE = 'OnMisfire';
export const EVT_SHIELD_BROKEN = 'OnShieldBroken';
export const EVT_CIRCLE_SWITCH = 'OnCircleSwitch';
export const EVT_PHASE_COMPLETE = 'OnPhaseComplete';

export class EventBus {
  constructor() { this._listeners = {}; }
  subscribe(channel, fn) {
    if (!this._listeners[channel]) this._listeners[channel] = [];
    this._listeners[channel].push(fn);
  }
  unsubscribe(channel, fn) {
    const arr = this._listeners[channel];
    if (!arr) return;
    const idx = arr.indexOf(fn);
    if (idx !== -1) arr.splice(idx, 1);
  }
  emit(channel, event) {
    const arr = this._listeners[channel];
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) {
      try { arr[i](event); } catch (e) { console.error(`[EventBus] listener error on "${channel}":`, e); }
    }
  }
}
