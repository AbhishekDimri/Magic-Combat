'use strict';

// ── ENGINE IMPORTS ──────────────────────────────────────────────
import { EventBus, EVT_RULE_TRIGGERED, EVT_MISFIRE } from '../engine/event-bus.js';
import { TagRegistry, TAG_LIST, TAG_CATS, COMPAT_ENTRIES } from '../engine/tag-registry.js';
import { RuleEngine } from '../engine/rule-engine.js';
import { CoherenceEngine } from '../engine/coherence-engine.js';
import { EffectComposer } from '../engine/effect-composer.js';
import { ShieldResolver } from '../engine/shield-resolver.js';
import { CircleManager, CSM_IDLE, CSM_ACTIVE, CSM_SWITCHING, CSM_LOADING } from '../engine/circle-manager.js';
import { ResolutionPipeline } from '../engine/resolution-pipeline.js';
import { RULES_DATA } from '../engine/rules-data.js';
import { ARCHETYPES_DATA, BONUS_MODS } from '../engine/archetypes-data.js';
import { createGameState, resetForBattle, resetForRematch, ROMAN, STA_COL, CAT_PILL } from './game-state.js';

// ── ENGINE INITIALIZATION ──────────────────────────────────────
const eventBus = new EventBus();
const registry = new TagRegistry(TAG_LIST, COMPAT_ENTRIES);
const ruleEngine = new RuleEngine(registry);
ruleEngine.loadRules(RULES_DATA);
const coherenceEngine = new CoherenceEngine(registry);
const effectComposer = new EffectComposer(eventBus);
const shieldResolver = new ShieldResolver(eventBus);
const circleManager = new CircleManager({ eventBus, ruleEngine, archetypes: ARCHETYPES_DATA, bonusMods: BONUS_MODS });
const pipeline = new ResolutionPipeline({ ruleEngine, coherenceEngine, effectComposer, shieldResolver, circleManager, eventBus });

// ── GAME STATE ──────────────────────────────────────────────────
const G = createGameState();

// ── TOOLTIP ─────────────────────────────────────────────────────
const TT_DATA = {
  coherence:{t:'Coherence Score',b:`<b>Coherence</b> is the average compatibility score across all your selected tag pairs.\n\nEach pair has a score from <b>0.0</b> (opposing) to <b>1.0</b> (perfect affinity).\n<div class="tt-ex">electric + liquid = 0.85 → high coherence\nheat + cold = 0.10 → very low coherence</div>\n<b>Below 0.4:</b> your base damage shrinks proportionally. Aim for 0.7+.`},
  rules:{t:'Active Rules',b:`Rules fire when your tags score ≥ the rule's <b>threshold</b>.\n\nThe score = compatibility between the required tags — not a yes/no.\n<div class="tt-ex">STORM_SURGE needs electric + liquid + motion.\nCompatibility 0.85 ≥ threshold 0.70 → FIRES</div>\n<b>Conflict Groups:</b> COLD_FREEZE vs STEAM_BURST are exclusive — only highest score fires.`},
  tags:{t:'Tag System',b:`Tags are atomic. You don't pick "fire" — you select <b>heat</b>, <b>motion</b>, <b>force</b>.\n\nRules activate based on which combination you build.\n<div class="tt-ex">heat alone → nothing\nheat + motion → HEAT_AMPLIFY fires (0.90)\nheat + electric → PLASMA_BURST fires (0.72)</div>`},
  binding:{t:'Binding Laws',b:`Circle-specific rules with <b>priority 20</b> vs global priority 5–15.\n\nActivate only when you use their required tags — but outrank all global rules when they do.\n<div class="tt-ex">Storm Circle: electric+motion → chain +1 target\nOverrides ELEC_CHAIN at priority 12.</div>`},
  bypass:{t:'Shield Bypass',b:`Some rules set <b>bypassShield = true</b>. This skips all defensive multipliers — full damage hits regardless of what the opponent picked.\n<div class="tt-ex">VOID_PIERCE → bypass\nPHASE_STRIKE → bypass solid shields</div>\nCounter: LIGHT_REVEAL exposes void users.`},
  conflict:{t:'Conflict Groups',b:`Mutually exclusive rules — only the <b>highest scorer</b> fires per cast.\n<div class="tt-ex">WATER group: COLD_FREEZE (0.87) vs STEAM_BURST (0.45)\nWater can't freeze AND boil.\n→ COLD_FREEZE wins.</div>`},
};

const tt = document.getElementById('tt');
let ttT;

function showTT(el, key) {
  const d = TT_DATA[key];
  if (!d) return;
  clearTimeout(ttT);
  document.getElementById('tt-t').textContent = d.t;
  document.getElementById('tt-b').innerHTML = d.b.replace(/\n/g, '<br>');
  const r = el.getBoundingClientRect();
  let top = r.bottom + 6, left = r.left;
  if (left + 258 > innerWidth) left = innerWidth - 262;
  if (top + 200 > innerHeight) top = r.top - 208;
  tt.style.top = top + 'px';
  tt.style.left = left + 'px';
  tt.classList.add('show');
}

function hideTT() {
  ttT = setTimeout(() => tt.classList.remove('show'), 100);
}

function showTagTT(el, id) {
  const tag = registry.getTag(id);
  if (!tag) return;
  const comp = registry.tagList.map(([tid]) => ({ id: tid, s: registry.getCompat(id, tid) }))
    .filter(x => x.id !== id)
    .sort((a, b) => b.s - a.s);
  const hi = comp.slice(0, 4).map(x => `<b>${x.id}</b> (${x.s.toFixed(2)})`).join(', ');
  const lo = comp.slice(-3).map(x => `<b>${x.id}</b> (${x.s.toFixed(2)})`).join(', ');
  document.getElementById('tt-t').textContent = id.toUpperCase();
  document.getElementById('tt-b').innerHTML = `<b>Category:</b> ${tag.cat}<br><br><b>Affinities:</b><br>${hi}<br><br><b>Opposing:</b><br>${lo}<div class="tt-ex">✦ = this tag is in your circle's base set</div>`;
  const r = el.getBoundingClientRect();
  let top = r.bottom + 5, left = r.left;
  if (left + 258 > innerWidth) left = innerWidth - 262;
  if (top + 200 > innerHeight) top = r.top - 210;
  tt.style.top = top + 'px';
  tt.style.left = left + 'px';
  tt.classList.add('show');
}

// ── INFO MODAL ──────────────────────────────────────────────────
const INFO_DATA = {
  circles:{t:'What is a Magic Circle?',b:`<div class="ic-row"><span class="ic-icon">🔮</span><div>A <b>Magic Circle</b> is your player-designed framework. It grants <b>Binding Laws</b> — high-priority rules exclusive to your circle.</div></div><div class="ic-row"><span class="ic-icon">⚡</span><div>Circles don't restrict tag choices in battle. But your <b>Binding Laws</b> only fire if you use the matching tags. Align your tags with your circle to maximise power.</div></div><div class="ic-row"><span class="ic-icon">🛡</span><div><b>Coherence</b> rises when your tags are compatible. Low coherence reduces base damage. A focused circle beats a chaotic one.</div></div><div class="ic-row"><span class="ic-icon">✦</span><div>One law is <b>fixed</b> (always active). The second is your <b>choice</b> — pick the one that fits your playstyle.</div></div><div class="ic-ex">Example: Storm Circle with electric+motion active → binding law fires at priority 20, outranking global rule at priority 12, giving chain +1 target.</div>`},
  phases:{t:'Phase System',b:`Effects apply in strict order — deterministic regardless of rule registration.<br><br><div class="ic-row"><span class="ic-icon">1</span><div><b>PRE_MOD</b> — amplifiers (×1.6), bypass flags. Applied first.</div></div><div class="ic-row"><span class="ic-icon">2</span><div><b>TRANSFORM</b> — type changes: steam, plasma, freeze.</div></div><div class="ic-row"><span class="ic-icon">3</span><div><b>POST_MOD</b> — chain, AoE, status effects.</div></div><div class="ic-row"><span class="ic-icon">4</span><div><b>FINALIZE</b> — terminal multipliers (ritual ramp-up).</div></div><div class="ic-ex">Why it matters: Amplify→Chain differs from Chain→Amplify. Phases remove this ambiguity entirely.</div>`},
};

function openInfo(key) {
  const d = INFO_DATA[key];
  if (!d) return;
  document.getElementById('ic-title').textContent = d.t;
  document.getElementById('ic-body').innerHTML = d.b;
  document.getElementById('info-modal').classList.add('open');
}

function closeInfo() {
  document.getElementById('info-modal').classList.remove('open');
}

// ── SCREENS ──────────────────────────────────────────────────────
const SCREENS = ['screen-title', 'screen-builder', 'screen-battle', 'screen-gameover'];

function showScreen(id) {
  SCREENS.forEach(s => {
    const el = document.getElementById(s);
    el.classList.toggle('hidden', s !== id);
  });
}

function goBuilder() {
  buildBuilderUI();
  showScreen('screen-builder');
}

// ── BUILDER ──────────────────────────────────────────────────────
function buildBuilderUI() {
  const wrap = document.getElementById('bld-players');
  wrap.innerHTML = '';
  [0, 1].forEach(i => {
    const d = document.createElement('div');
    d.className = `bld-card p${i + 1}`;
    d.innerHTML = `<div class="bld-plabel">PLAYER ${i ? 'II' : 'I'}</div>
    <div class="sec-lbl">CHOOSE CIRCLE ARCHETYPE</div>
    <div class="arch-grid" id="ag${i}"></div>
    <div>
      <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px">
        <span class="sec-lbl" style="margin:0">BINDING LAWS</span>
        <button class="ib" onmouseenter="showTT(this,'binding')" onmouseleave="hideTT()">?</button>
      </div>
      <div id="bl${i}"><div style="font-size:7.5px;color:var(--muted2);letter-spacing:.5px">Select a circle first</div></div>
    </div>`;
    wrap.appendChild(d);
    buildArchGrid(i);
  });
}

function buildArchGrid(pi) {
  const g = document.getElementById(`ag${pi}`);
  g.innerHTML = '';
  ARCHETYPES_DATA.forEach(a => {
    const c = document.createElement('div');
    c.className = 'arch-card';
    c.id = `ac${pi}-${a.id}`;
    const tp = a.tags.map(t => `<span class="atag" style="background:${CAT_PILL[registry.getTag(t)?.cat]}">${t}</span>`).join('');
    c.innerHTML = `<div class="arch-name" style="color:${a.col}">${a.icon} ${a.name}</div><div class="arch-desc">${a.desc}</div><div class="arch-tags">${tp}</div>`;
    c.onclick = () => selectArch(pi, a.id);
    g.appendChild(c);
  });
}

function selectArch(pi, aid) {
  G.circles[pi] = ARCHETYPES_DATA.find(a => a.id === aid);
  G.customLaw[pi] = 1;
  ARCHETYPES_DATA.forEach(a => {
    const el = document.getElementById(`ac${pi}-${a.id}`);
    if (el) el.classList.toggle('sel', a.id === aid);
  });
  updateBL(pi);
}

function updateBL(pi) {
  const arch = G.circles[pi];
  if (!arch) return;
  const bl = document.getElementById(`bl${pi}`);
  const fl = arch.laws[0];
  let html = `<div class="bl-row" style="cursor:default;border-color:rgba(245,200,66,.25)">
    <span class="bl-fixed-mark">★</span><span class="bl-arrow">→</span>
    <span class="bl-tags">${fl.a} + ${fl.b}</span><span class="bl-desc">${fl.desc}</span>
  </div>`;
  const opts = arch.laws.slice(1);
  if (opts.length) {
    html += `<div style="font-size:7px;letter-spacing:1px;color:var(--muted2);margin:5px 0 3px;font-family:var(--font-head)">CHOOSE CUSTOM LAW</div>`;
    opts.forEach((law, idx) => {
      const ri = idx + 1, sel = G.customLaw[pi] === ri;
      html += `<div class="bl-row ${sel ? 'active' : ''}" onclick="setCustomLaw(${pi},${ri})">
        <span class="bl-check" style="color:${sel ? 'var(--gold)' : 'var(--muted2)'}">${sel ? '✓' : '○'}</span>
        <span class="bl-arrow">→</span>
        <span class="bl-tags">${law.a} + ${law.b}</span>
        <span class="bl-desc">${law.desc}</span>
      </div>`;
    });
  }
  bl.innerHTML = html;
}

function setCustomLaw(pi, ri) {
  G.customLaw[pi] = ri;
  updateBL(pi);
}

function startBattle() {
  if (!G.circles[0] || !G.circles[1]) { alert('Both players must select a circle!'); return; }
  [0, 1].forEach(i => {
    const a = G.circles[i];
    G.bRules[i] = circleManager.generateBindingRules(i, a.id, G.customLaw[i]);
  });
  G.hp = [100, 100]; G.round = 1; G.sel = [new Set(), new Set()]; G.coh = [1, 1]; G.statuses = [[], []];
  [0, 1].forEach(i => {
    circleManager.getCSM(i).reset();
    circleManager.getCSM(i).transition(CSM_LOADING);
    circleManager.getCSM(i).transition(CSM_ACTIVE);
  });
  buildBattleUI();
  showScreen('screen-battle');
  updateHPBars();
  setLog('Battle begins! Both players select tags and fire.', 'var(--gold)');
}

function rematch() {
  G.hp = [100, 100]; G.round = 1; G.sel = [new Set(), new Set()]; G.coh = [1, 1]; G.statuses = [[], []];
  [0, 1].forEach(i => {
    circleManager.getCSM(i).reset();
    circleManager.getCSM(i).transition(CSM_LOADING);
    circleManager.getCSM(i).transition(CSM_ACTIVE);
  });
  buildBattleUI();
  showScreen('screen-battle');
  updateHPBars();
  setLog('Rematch! Same circles.', 'var(--gold)');
}

// ── BATTLE UI ──────────────────────────────────────────────────
function buildBattleUI() { [0, 1].forEach(buildPanel); }

function buildPanel(i) {
  const pi = i + 1, panel = document.getElementById(`pp${pi}`), arch = G.circles[i];
  const rev = i === 1;
  const cg = {};
  TAG_LIST.forEach(([id, cat]) => { cg[cat] = cg[cat] || []; cg[cat].push(id); });
  const ctags = new Set(arch?.tags || []);
  let catsH = '';
  TAG_CATS.forEach(cat => {
    const tgs = cg[cat] || [];
    const pills = tgs.map(id => `<button class="tb${ctags.has(id) ? ' circ-hint' : ''}" data-c="${cat}" id="tb${pi}_${id}" onclick="toggleTag(${i},'${id}')" onmouseenter="showTagTT(this,'${id}')" onmouseleave="hideTT()">${id}</button>`).join('');
    catsH += `<div class="cat-blk"><div class="cat-lbl-row"><span class="cat-lbl">${cat}</span><button class="ib" onmouseenter="showTT(this,'tags')" onmouseleave="hideTT()">?</button></div><div class="tag-wrap">${pills}</div></div>`;
  });
  panel.innerHTML = `<div class="pp-inner">
    <div class="pp-top ${rev ? 'r' : ''}">
      <div class="pp-label">PLAYER ${pi}</div>
      <div style="display:flex;align-items:center;gap:5px">
        <div class="circle-badge"><div class="cdot"></div>${arch?.icon || '?'} ${arch?.name || 'None'}</div>
        <button class="ib" style="font-size:6px;width:auto;border-radius:7px;padding:2px 6px;height:auto;letter-spacing:.3px" onclick="switchCircle(${i})">⟳ SWITCH</button>
      </div>
    </div>
    <div class="coh-row ${rev ? 'r' : ''}">
      <div class="coh-lbl">COH<button class="ib" style="margin-left:3px" onmouseenter="showTT(this,'coherence')" onmouseleave="hideTT()">?</button></div>
      <div class="coh-track"><div class="coh-fill" id="cf${pi}" style="width:100%;background:var(--green)"></div></div>
      <div class="coh-val" id="cv${pi}">1.00</div>
    </div>
    <div class="status-row ${rev ? 'r' : ''}" id="sr${pi}"></div>
    <div class="tags-scroll">${catsH}</div>
    <div class="spell-disp" id="sd${pi}"><span class="sp-empty">— select tags —</span></div>
    <div class="rules-hd">ACTIVE RULES
      <button class="ib" onmouseenter="showTT(this,'rules')" onmouseleave="hideTT()">?</button>
      <button class="ib" style="font-size:6px;width:auto;border-radius:7px;padding:1px 5px;height:auto;letter-spacing:.3px" onmouseenter="showTT(this,'conflict')" onmouseleave="hideTT()">CONFLICT?</button>
      <button class="ib" style="font-size:6px;width:auto;border-radius:7px;padding:1px 5px;height:auto" onmouseenter="showTT(this,'binding')" onmouseleave="hideTT()">BINDING?</button>
    </div>
    <div class="rule-list" id="rl${pi}"><div class="no-rule">Select tags to see rules</div></div>
  </div>`;
}

function switchCircle(i) {
  const csm = circleManager.getCSM(i);
  if (csm.getState() !== CSM_ACTIVE) { setLog(`Player ${i + 1} cannot switch right now.`, 'var(--red)'); return; }
  csm.transition(CSM_SWITCHING);
  const pi = i + 1;
  const sr = document.getElementById(`sr${pi}`);
  if (sr) {
    const chip = document.createElement('span');
    chip.className = 's-chip';
    chip.style.cssText = 'border-color:#a5b4fc;color:#a5b4fc';
    chip.textContent = 'SWITCHING';
    sr.appendChild(chip);
  }
  setLog(`Player ${pi} is switching circles! (0.7× damage this round)`, '#a5b4fc');
}

function toggleTag(i, id) {
  const s = G.sel[i];
  s.has(id) ? s.delete(id) : s.add(id);
  updatePanel(i);
}

function updatePanel(i) {
  const pi = i + 1, sel = G.sel[i];
  TAG_LIST.forEach(([id]) => {
    const b = document.getElementById(`tb${pi}_${id}`);
    if (b) b.classList.toggle('sel', sel.has(id));
  });
  const sd = document.getElementById(`sd${pi}`);
  sd.innerHTML = sel.size === 0
    ? '<span class="sp-empty">— select tags —</span>'
    : [...sel].map(id => `<span class="sp-pill" style="background:${CAT_PILL[registry.getTag(id)?.cat]}">${id}</span>`).join('');
  const coh = coherenceEngine.compute(sel);
  G.coh[i] = coh;
  const cf = document.getElementById(`cf${pi}`), cv = document.getElementById(`cv${pi}`);
  if (cf) { cf.style.width = (coh * 100) + '%'; cf.style.background = coh >= .75 ? 'var(--green)' : coh >= .45 ? 'var(--gold)' : 'var(--red)'; }
  if (cv) cv.textContent = coh.toFixed(2);
  const fired = ruleEngine.evaluate(sel, G.bRules[i] || []);
  const rl = document.getElementById(`rl${pi}`);
  if (!rl) return;
  rl.innerHTML = fired.length === 0
    ? '<div class="no-rule">No rules activated</div>'
    : fired.map(sr => `<div class="rr"><div class="r-bar" style="background:${sr.r.col}"></div><div class="r-txt"><div class="r-id">${sr.r.id}</div><div class="r-dsc">${sr.r.desc}</div></div>${sr.r.isBinding ? '<span class="r-bl">BINDING</span>' : ''}<div class="r-sc">${sr.score.toFixed(2)}</div></div>`).join('');
  // Status row
  const sr = document.getElementById(`sr${pi}`);
  if (sr) {
    const ac = G.statuses[i].filter(s => s.r > 0);
    sr.innerHTML = ac.length === 0 ? '' : ac.map(s => {
      const col = STA_COL[s.n] || '#9ca3af';
      return `<span class="s-chip" style="border-color:${col};color:${col}">${s.n}${s.r > 1 ? ' ' + s.r + 'r' : ''}</span>`;
    }).join('');
  }
}

// ── CLASH ──────────────────────────────────────────────────────
function fireClash() {
  const s1 = G.sel[0], s2 = G.sel[1];
  if (s1.size === 0 && s2.size === 0) { setLog('Select at least one tag!', 'var(--red)'); return; }
  // Use Resolution Pipeline for both players
  const r1 = pipeline.resolve(0, s1, G.bRules[0] || []);
  const r2 = pipeline.resolve(1, s2, G.bRules[1] || []);
  const f1 = r1.firedRules, f2 = r2.firedRules;
  // Update HP
  G.hp[1] = Math.max(0, G.hp[1] - r1.dmg);
  G.hp[0] = Math.max(0, G.hp[0] - r2.dmg);
  // Apply status effects
  r1.sts.forEach(s => G.statuses[1].push({ n: s.n, r: 2 }));
  r2.sts.forEach(s => G.statuses[0].push({ n: s.n, r: 2 }));
  // Update coherence in game state for UI
  G.coh[0] = r1.coherence;
  G.coh[1] = r2.coherence;
  showClash(s1, s2, f1, f2, r1, r2);
}

function pillsH(sel) {
  return [...sel].map(id => `<span class="sp-pill" style="font-size:7px;padding:1px 5px;border-radius:7px;background:${CAT_PILL[registry.getTag(id)?.cat]}">${id}</span>`).join('');
}

function rulesH(fired) {
  return fired.length === 0
    ? '<span style="font-size:7.5px;color:var(--muted2)">none</span>'
    : fired.map(sr => `<span class="cr-chip" style="border-color:${sr.r.col};color:${sr.r.col}">${sr.r.id}${sr.r.isBinding ? ' ✦' : ''}</span>`).join('');
}

function stChips(sts, src) {
  return sts.filter(s => !src || s.src === src || !s.src).map((s, i) => {
    const col = STA_COL[s.n] || '#9ca3af';
    return `<span class="s-chip" style="border-color:${col};color:${col};animation-delay:${.22 + i * .07}s">${s.n}${s.d > 0 ? ' ' + s.d + 's' : ''}</span>`;
  }).join('');
}

function showClash(s1, s2, f1, f2, r1, r2) {
  const ov = document.getElementById('clash'), inn = document.getElementById('clash-inner');
  const cc = r1.dmg > r2.dmg ? 'var(--p1)' : r2.dmg > r1.dmg ? 'var(--p2)' : 'var(--gold)';
  inn.innerHTML = `
    <div class="clash-title" style="color:${cc}">⚡ CLASH ⚡</div>
    <div class="clash-spells">
      <div class="clash-box p1"><div class="cb-name">P1 · ${G.circles[0]?.icon} ${G.circles[0]?.name}</div><div class="clash-pills">${pillsH(s1)}</div></div>
      <div class="clash-gem">✦</div>
      <div class="clash-box p2"><div class="cb-name">P2 · ${G.circles[1]?.icon} ${G.circles[1]?.name}</div><div class="clash-pills">${pillsH(s2)}</div></div>
    </div>
    <div class="clash-rules-row">
      <div class="clash-rules-col"><div class="crhd">P1 RULES FIRED</div>${rulesH(f1)}</div>
      <div class="clash-rules-col"><div class="crhd">P2 RULES FIRED</div>${rulesH(f2)}</div>
    </div>
    ${r1.misfire || r2.misfire ? '<div class="clash-misfire">⚠ MISFIRE — low coherence reduced base damage</div>' : ''}
    <div class="clash-dmg-row">
      <div class="clash-dmg-blk">
        <div class="clash-dmg" style="color:var(--red);animation-delay:.05s">-${r1.dmg}</div>
        <div class="clash-dlbl">P2 TAKES</div>
        <div class="clash-schips">${stChips(r1.sts, 'atk')}</div>
        ${r1.bypass ? '<div class="clash-bypass">🔮 SHIELD BYPASSED</div>' : ''}
        <div style="font-size:7.5px;color:var(--muted);margin-top:3px">coh ${G.coh[0].toFixed(2)}</div>
      </div>
      <div class="clash-arrow">⟷</div>
      <div class="clash-dmg-blk">
        <div class="clash-dmg" style="color:var(--red);animation-delay:.1s">-${r2.dmg}</div>
        <div class="clash-dlbl">P1 TAKES</div>
        <div class="clash-schips">${stChips(r2.sts, 'atk')}</div>
        ${r2.bypass ? '<div class="clash-bypass">🔮 SHIELD BYPASSED</div>' : ''}
        <div style="font-size:7.5px;color:var(--muted);margin-top:3px">coh ${G.coh[1].toFixed(2)}</div>
      </div>
    </div>
    <div style="font-size:7.5px;color:var(--muted);letter-spacing:1px">HP after: P1 <span style="color:var(--p1)">${G.hp[0]}</span> · P2 <span style="color:var(--p2)">${G.hp[1]}</span></div>
    <button class="clash-next" onclick="nextRound()">${G.hp[0] <= 0 || G.hp[1] <= 0 ? '⚔ SEE RESULTS' : 'NEXT ROUND →'}</button>`;
  const fl = document.createElement('div');
  fl.className = 'clash-flash';
  fl.style.background = `radial-gradient(circle,${cc}99,transparent)`;
  inn.appendChild(fl);
  setTimeout(() => fl.remove(), 700);
  ov.classList.add('active');
}

function nextRound() {
  document.getElementById('clash').classList.remove('active');
  updateHPBars();
  if (G.hp[0] <= 0 || G.hp[1] <= 0) { showGameOver(); return; }
  // Transition any SWITCHING players back: SWITCHING→LOADING→ACTIVE
  [0, 1].forEach(i => {
    if (circleManager.getCSM(i).getState() === CSM_SWITCHING) {
      circleManager.getCSM(i).transition(CSM_LOADING);
      circleManager.getCSM(i).transition(CSM_ACTIVE);
    }
  });
  G.round++;
  document.getElementById('round-num').textContent = ROMAN[Math.min(G.round - 1, ROMAN.length - 1)];
  [0, 1].forEach(i => { G.statuses[i] = G.statuses[i].map(s => ({ ...s, r: s.r - 1 })).filter(s => s.r > 0); });
  G.sel = [new Set(), new Set()];
  buildBattleUI();
  setLog(`Round ${G.round}. Choose your combination.`, 'var(--gold)');
}

function updateHPBars() {
  [0, 1].forEach(i => {
    const pi = i + 1;
    const f = document.getElementById(`hpf${pi}`), v = document.getElementById(`hpv${pi}`);
    if (f) f.style.width = Math.max(0, G.hp[i]) + '%';
    if (v) v.textContent = G.hp[i];
  });
}

// ── GAME OVER ──────────────────────────────────────────────────
function showGameOver() {
  const w = G.hp[0] <= 0 && G.hp[1] <= 0 ? 0 : G.hp[0] <= 0 ? 2 : 1;
  const gt = document.getElementById('go-title'), gs = document.getElementById('go-sub');
  gt.textContent = w === 0 ? 'DRAW' : 'VICTORY';
  gt.style.color = w === 1 ? 'var(--p1)' : w === 2 ? 'var(--p2)' : 'var(--gold)';
  gs.textContent = w === 0 ? 'BOTH PLAYERS FALL' : `PLAYER ${w === 1 ? 'I' : 'II'} WINS`;
  gs.style.color = w === 1 ? 'var(--p1)' : w === 2 ? 'var(--p2)' : 'var(--gold)';
  document.getElementById('go-stats').textContent = `${G.round} ROUNDS · ${G.circles[0]?.name} vs ${G.circles[1]?.name} · HP: ${G.hp[0]} | ${G.hp[1]}`;
  showScreen('screen-gameover');
}

function setLog(msg, col = 'var(--text)') {
  const el = document.getElementById('bt-log');
  if (!el) return;
  el.textContent = msg;
  el.style.color = col;
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'log-in .3s ease';
}

// ── EXPOSE TO WINDOW FOR ONCLICK HANDLERS ──────────────────────
window.goBuilder = goBuilder;
window.startBattle = startBattle;
window.rematch = rematch;
window.fireClash = fireClash;
window.openInfo = openInfo;
window.closeInfo = closeInfo;
window.showTT = showTT;
window.hideTT = hideTT;
window.showTagTT = showTagTT;
window.toggleTag = toggleTag;
window.switchCircle = switchCircle;
window.setCustomLaw = setCustomLaw;
window.nextRound = nextRound;

// ── INIT ────────────────────────────────────────────────────────
showScreen('screen-title');
