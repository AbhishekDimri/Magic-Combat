'use strict';
// ── ENGINE ──────────────────────────────────────────────────────
const TAG_CATS=['ELEMENTAL','PHYSICAL','DIMENSIONAL','METAPHYSICAL','STATE'];
const TAG_LIST=[['heat','ELEMENTAL'],['liquid','ELEMENTAL'],['cold','ELEMENTAL'],['electric','ELEMENTAL'],['earth','ELEMENTAL'],['wind','ELEMENTAL'],['light','ELEMENTAL'],['dark','ELEMENTAL'],['force','PHYSICAL'],['motion','PHYSICAL'],['solid','PHYSICAL'],['pierce','PHYSICAL'],['absorb','PHYSICAL'],['bind','PHYSICAL'],['void','DIMENSIONAL'],['phase','DIMENSIONAL'],['space','DIMENSIONAL'],['float','DIMENSIONAL'],['gravity','DIMENSIONAL'],['null','DIMENSIONAL'],['reveal','METAPHYSICAL'],['time','METAPHYSICAL'],['curse','METAPHYSICAL'],['soul','METAPHYSICAL'],['persistent','STATE'],['channeled','STATE'],['reactive','STATE']];
const TAGS={};TAG_LIST.forEach(([id,cat],i)=>{TAGS[id]={id,cat,bi:i}});
const N=TAG_LIST.length,CM=Array.from({length:N},(_,i)=>{const r=new Float32Array(N).fill(.5);r[i]=1;return r});
const sc=(a,b,v)=>{const ai=TAGS[a].bi,bi=TAGS[b].bi;CM[ai][bi]=CM[bi][ai]=v};
const gc=(a,b)=>CM[TAGS[a]?.bi??0][TAGS[b]?.bi??0];
sc('heat','motion',.90);sc('heat','wind',.88);sc('heat','electric',.72);sc('heat','liquid',.45);sc('heat','cold',.10);sc('heat','force',.75);sc('heat','light',.65);sc('liquid','electric',.85);sc('liquid','cold',.87);sc('liquid','earth',.72);sc('liquid','motion',.78);sc('liquid','solid',.30);sc('cold','solid',.82);sc('cold','earth',.65);sc('cold','bind',.80);sc('cold','motion',.55);sc('electric','motion',.85);sc('electric','light',.80);sc('electric','wind',.75);sc('electric','earth',.15);sc('earth','solid',.92);sc('earth','force',.80);sc('earth','gravity',.88);sc('earth','bind',.75);sc('wind','motion',.89);sc('wind','float',.80);sc('light','reveal',.94);sc('light','void',.08);sc('dark','curse',.83);sc('dark','void',.75);sc('dark','soul',.79);sc('force','motion',.75);sc('force','gravity',.86);sc('force','pierce',.70);sc('motion','float',.84);sc('motion','phase',.55);sc('solid','earth',.92);sc('solid','bind',.78);sc('solid','motion',.20);sc('pierce','void',.88);sc('pierce','force',.70);sc('pierce','phase',.75);sc('bind','solid',.78);sc('bind','earth',.75);sc('bind','cold',.80);sc('void','pierce',.88);sc('void','null',.80);sc('void','phase',.84);sc('void','dark',.75);sc('void','earth',.12);sc('phase','space',.91);sc('phase','motion',.55);sc('space','time',.76);sc('space','float',.85);sc('float','motion',.84);sc('float','wind',.80);sc('float','gravity',.10);sc('gravity','earth',.88);sc('gravity','force',.86);sc('soul','dark',.79);sc('soul','light',.72);sc('soul','time',.68);sc('soul','curse',.72);sc('reveal','light',.94);sc('reveal','dark',.15);sc('reveal','void',.12);sc('time','space',.76);sc('time','channeled',.80);
// ── BITSET PERFORMANCE OPTIMIZATION ─────────────────────────────
const CATEGORY_MASKS={};
TAG_CATS.forEach(cat=>{CATEGORY_MASKS[cat]=0});
TAG_LIST.forEach(([id,cat])=>{CATEGORY_MASKS[cat]|=(1<<TAGS[id].bi)});
function toBitSet(tagSet){let bits=0;for(const id of tagSet){const t=TAGS[id];if(t)bits|=(1<<t.bi)}return bits}
function fromBitSet(bits){const s=new Set();for(let i=0;i<N;i++){if(bits&(1<<i))s.add(TAG_LIST[i][0])}return s}
function bitHas(bits,tagId){const t=TAGS[tagId];return t?!!(bits&(1<<t.bi)):false}
function bitSubset(a,b){return(a&b)===a}
function bitCategoryCount(bits,category){let masked=bits&(CATEGORY_MASKS[category]||0);let count=0;while(masked){masked&=(masked-1);count++}return count}
// ── EVENTBUS ──────────────────────────────────────────────────────
const EVT_RULE_TRIGGERED='OnRuleTriggered';
const EVT_MISFIRE='OnMisfire';
const EVT_SHIELD_BROKEN='OnShieldBroken';
const EVT_CIRCLE_SWITCH='OnCircleSwitch';
const EVT_PHASE_COMPLETE='OnPhaseComplete';
class EventBus{
  constructor(){this._listeners={}}
  subscribe(channel,fn){if(!this._listeners[channel])this._listeners[channel]=[];this._listeners[channel].push(fn)}
  unsubscribe(channel,fn){const arr=this._listeners[channel];if(!arr)return;const idx=arr.indexOf(fn);if(idx!==-1)arr.splice(idx,1)}
  emit(channel,event){const arr=this._listeners[channel];if(!arr)return;for(let i=0;i<arr.length;i++){try{arr[i](event)}catch(e){console.error(`[EventBus] listener error on "${channel}":`,e)}}}
}
const eventBus=new EventBus();
const cC=(a,b)=>ts=>ts.has(a)&&ts.has(b)?gc(a,b):0;
const cP=t=>ts=>ts.has(t)?1:0;
const cCat=(cat,n=1)=>ts=>{const c=[...ts].filter(t=>TAGS[t]?.cat===cat).length;return c?Math.min(1,c/n):0};
const cAnd=(a,b)=>ts=>{const s=a(ts);return s?Math.min(s,b(ts)):0};
const RULES=[
  {id:'HEAT_AMPLIFY',thr:.70,pri:5,grp:null,col:'#f87171',cond:cC('heat','motion'),mods:[{t:'MUL',v:1.6}],desc:'Heat + motion → ×1.6 damage'},
  {id:'WIND_MOBILE',thr:.70,pri:5,grp:null,col:'#86efac',cond:cC('wind','motion'),mods:[{t:'STA',v:'SPEED',d:2}],desc:'Wind + motion → SPEED 2s'},
  {id:'SOLID_SHIELD',thr:.80,pri:8,grp:null,col:'#4ade80',cond:cC('solid','earth'),mods:[{t:'DEF',v:.55},{t:'STA',v:'SHIELD',d:3}],desc:'Solid + earth → ×0.55 dmg taken + SHIELD'},
  {id:'VOID_PIERCE',thr:.75,pri:10,grp:'VOID',col:'#a5b4fc',cond:cC('void','pierce'),mods:[{t:'BYP'},{t:'MUL',v:1.5}],desc:'Void + pierce → bypass shields, ×1.5'},
  {id:'DARK_CURSE',thr:.70,pri:5,grp:null,col:'#fde68a',cond:cC('dark','curse'),mods:[{t:'STA',v:'WEAKEN',d:4}],desc:'Dark + curse → WEAKEN 4s on target'},
  {id:'FLOAT_EVADE',thr:.65,pri:4,grp:null,col:'#a5b4fc',cond:cC('float','motion'),mods:[{t:'DEF',v:.7}],desc:'Float + motion → ×0.7 incoming damage'},
  {id:'STORM_SURGE',thr:.70,pri:12,grp:'STORM',col:'#818cf8',cond:cAnd(cC('electric','liquid'),cP('motion')),mods:[{t:'MUL',v:2.0},{t:'STA',v:'STUN',d:1.5}],desc:'Electric + liquid + motion → ×2.0 + STUN'},
  {id:'WILDFIRE',thr:.70,pri:10,grp:'HEAT_E',col:'#f97316',cond:cAnd(cC('heat','wind'),cP('motion')),mods:[{t:'MUL',v:1.8},{t:'STA',v:'BURN',d:5}],desc:'Heat + wind + motion → ×1.8 + BURN 5s'},
  {id:'PLASMA_BURST',thr:.80,pri:11,grp:'HEAT_E',col:'#fbbf24',cond:cC('heat','electric'),mods:[{t:'MUL',v:2.2},{t:'AOE',v:2}],desc:'Heat + electric → ×2.2 + AoE 2m'},
  {id:'MUD_WALL',thr:.65,pri:7,grp:null,col:'#86efac',cond:cC('liquid','earth'),mods:[{t:'DEF',v:.55},{t:'STA',v:'SLOW',d:3}],desc:'Liquid + earth → ×0.55 taken + SLOW'},
  {id:'COLD_FREEZE',thr:.65,pri:9,grp:'WATER',col:'#818cf8',cond:cC('cold','liquid'),mods:[{t:'STA',v:'FREEZE',d:2},{t:'STA',v:'SLOW',d:5}],desc:'Cold + liquid → FREEZE 2s + SLOW 5s'},
  {id:'STEAM_BURST',thr:.40,pri:6,grp:'WATER',col:'#f87171',cond:cC('heat','liquid'),mods:[{t:'MUL',v:1.3},{t:'AOE',v:3}],desc:'Heat + liquid → ×1.3 + AoE 3m (risky)'},
  {id:'ELEM_OVERLOAD',thr:.70,pri:15,grp:null,col:'#f87171',cond:cCat('ELEMENTAL',3),mods:[{t:'MUL',v:2.5}],desc:'3+ elemental tags → ×2.5 overload'},
  {id:'VOID_SEAL',thr:.72,pri:13,grp:'VOID',col:'#a5b4fc',cond:cAnd(cC('void','null'),cCat('METAPHYSICAL')),mods:[{t:'BYP'},{t:'STA',v:'D_SUPP',d:3}],desc:'Void + null + meta → bypass + suppress 3s'},
  {id:'GRAVITY_SLAM',thr:.75,pri:9,grp:null,col:'#fde68a',cond:cAnd(cC('gravity','earth'),cP('force')),mods:[{t:'MUL',v:1.9},{t:'AOE',v:4},{t:'STA',v:'SLOW',d:2}],desc:'Gravity + earth + force → ×1.9 AoE + SLOW'},
  {id:'SOUL_DRAIN',thr:.70,pri:8,grp:null,col:'#fde68a',cond:cC('soul','dark'),mods:[{t:'MUL',v:1.4},{t:'STA',v:'LIFESTEAL',d:0}],desc:'Soul + dark → ×1.4 + LIFESTEAL 30%'},
  {id:'ARCTIC_BIND',thr:.70,pri:8,grp:null,col:'#818cf8',cond:cAnd(cC('cold','bind'),cP('solid')),mods:[{t:'DEF',v:.5},{t:'STA',v:'FREEZE',d:3}],desc:'Cold + bind + solid → ×0.5 + FREEZE 3s'},
  {id:'PHASE_STRIKE',thr:.75,pri:9,grp:null,col:'#a5b4fc',cond:cC('phase','pierce'),mods:[{t:'BYP'},{t:'MUL',v:1.3}],desc:'Phase + pierce → bypass + ×1.3'},
  {id:'LIGHT_REVEAL',thr:.80,pri:11,grp:null,col:'#fde68a',cond:cC('light','reveal'),mods:[{t:'MUL',v:1.2},{t:'STA',v:'EXPOSED',d:3}],desc:'Light + reveal → ×1.2 + EXPOSED 3s'},
  {id:'GRAVITY_PULL',thr:.70,pri:7,grp:null,col:'#fde68a',cond:cC('gravity','force'),mods:[{t:'MUL',v:1.4},{t:'STA',v:'PULLED',d:1}],desc:'Gravity + force → ×1.4 + PULLED 1s'},
  {id:'RITUAL_APEX',thr:.70,pri:14,grp:'RITUAL',col:'#f5c842',cond:cAnd(cC('time','space'),cAnd(cP('light'),cP('soul'))),mods:[{t:'MUL',v:3.5}],desc:'Time + space + light + soul → ×3.5 ritual apex'},
  {id:'THERMAL_SHOCK',thr:.08,pri:11,grp:'HEAT_E',col:'#f87171',cond:cC('heat','cold'),mods:[{t:'MUL',v:2.0},{t:'STA',v:'BURN',d:2}],desc:'Heat + cold → ×2.0 thermal shock + BURN (risky, low compat)'},
  {id:'GRAVITY_PRISON',thr:.70,pri:10,grp:null,col:'#fde68a',cond:cAnd(cC('gravity','earth'),cP('bind')),mods:[{t:'DEF',v:.4},{t:'STA',v:'FREEZE',d:5}],desc:'Gravity + bind + earth → ×0.4 taken + FREEZE 5s prison'},
  {id:'STORM_APEX',thr:.70,pri:15,grp:'STORM',col:'#818cf8',cond:cAnd(cAnd(cC('electric','liquid'),cC('wind','motion')),cAnd(cP('wind'),cP('motion'))),mods:[{t:'MUL',v:3.0},{t:'STA',v:'STUN',d:2},{t:'AOE',v:6}],desc:'Electric + liquid + wind + motion → ×3.0 storm apex + STUN + AoE'},
  {id:'VOID_COLLAPSE',thr:.70,pri:13,grp:'VOID',col:'#a5b4fc',cond:cAnd(cC('void','null'),cP('dark')),mods:[{t:'BYP'},{t:'MUL',v:2.0},{t:'STA',v:'D_SUPP',d:4}],desc:'Void + null + dark → bypass + ×2.0 + suppress 4s'},
  {id:'SOUL_REND',thr:.65,pri:10,grp:null,col:'#fde68a',cond:cAnd(cC('soul','curse'),cP('pierce')),mods:[{t:'MUL',v:1.6},{t:'STA',v:'LIFESTEAL',d:0},{t:'STA',v:'WEAKEN',d:3}],desc:'Soul + curse + pierce → ×1.6 + LIFESTEAL + WEAKEN 3s'},
];
function evalRules(ts,extra=[]){
  const all=[...RULES,...extra];
  const scored=all.map(r=>({r,score:r.cond(ts)})).filter(s=>s.score>=s.r.thr).sort((a,b)=>b.score-a.score||b.r.pri-a.r.pri);
  const grps={},ng=[];
  scored.forEach(s=>s.r.grp?(grps[s.r.grp]=grps[s.r.grp]||[],grps[s.r.grp].push(s)):ng.push(s));
  const w=[...ng];Object.values(grps).forEach(g=>w.push(g[0]));
  return w.sort((a,b)=>b.score-a.score);
}
function coherence(ts){
  const arr=[...ts];if(arr.length<=1)return 1;
  let s=0,p=0;for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++){s+=gc(arr[i],arr[j]);p++}
  return Math.round((s/p)*100)/100;
}
function computeDmg(af,df,coh,base=30,switchPenalty=1.0){
  let dmg=Math.round(base*(coh>=.4?1:coh/.4)),bypass=false;const sts=[];
  for(const{r}of af){for(const m of r.mods){if(m.t==='MUL')dmg=Math.round(dmg*m.v);if(m.t==='BYP')bypass=true;if(m.t==='STA')sts.push({n:m.v,d:m.d,src:'atk'})}}
  if(!bypass)for(const{r}of df){for(const m of r.mods){if(m.t==='DEF')dmg=Math.round(dmg*m.v);if(m.t==='STA')sts.push({n:m.v,d:m.d,src:'def'})}}
  dmg=Math.round(dmg*switchPenalty);
  return{dmg:Math.max(0,dmg),bypass,sts,misfire:coh<.4};
}
// ── PHASED MODIFIER SYSTEM ──────────────────────────────────────
const PHASE_PRE_MOD=0,PHASE_TRANSFORM=1,PHASE_POST_MOD=2,PHASE_FINALIZE=3;
function assignPhase(modifier){
  const t=modifier.t;
  if(t==='MUL'||t==='BYP'||t==='DEF')return PHASE_PRE_MOD;
  if(t==='STA'||t==='AOE')return PHASE_POST_MOD;
  return PHASE_TRANSFORM;
}
function applyPhasedModifiers(firedRules,context){
  const ctx=Object.assign({dmg:0,bypass:false,sts:[]},context);
  // Collect all modifiers tagged with source rule priority
  const tagged=[];
  for(const{r}of firedRules){
    for(const m of r.mods){
      tagged.push({mod:m,pri:r.pri,phase:assignPhase(m)});
    }
  }
  // Group by phase
  const phases=[[],[],[],[]];
  for(const entry of tagged)phases[entry.phase].push(entry);
  // Sort within each phase by descending rule priority
  for(const group of phases)group.sort((a,b)=>b.pri-a.pri);
  // Apply in phase order
  for(let p=0;p<4;p++){
    for(const{mod}of phases[p]){
      if(mod.t==='MUL')ctx.dmg=Math.round(ctx.dmg*mod.v);
      else if(mod.t==='BYP')ctx.bypass=true;
      else if(mod.t==='DEF'){if(!ctx.bypass)ctx.dmg=Math.round(ctx.dmg*mod.v);}
      else if(mod.t==='STA')ctx.sts.push({n:mod.v,d:mod.d});
      else if(mod.t==='AOE'){ctx.aoe=mod.v;}
    }
    eventBus.emit(EVT_PHASE_COMPLETE,{phase:p,context:ctx});
  }
  return ctx;
}
// ── SHIELD RULE ENGINE ──────────────────────────────────────────
class ShieldRuleEngine{
  constructor(){this._shields={}}
  addShieldRule(playerIndex,shieldRule){
    if(!this._shields[playerIndex])this._shields[playerIndex]=[];
    const list=this._shields[playerIndex];
    // Insert sorted by descending priority
    let i=0;
    while(i<list.length&&list[i].priority>=shieldRule.priority)i++;
    list.splice(i,0,shieldRule);
  }
  evaluate(playerIndex,attackContext){
    // BYP flag check — skip all shield evaluation
    if(attackContext.bypass)return{dmg:attackContext.dmg,defApplied:false};
    const list=this._shields[playerIndex];
    if(!list||list.length===0)return{dmg:attackContext.dmg,defApplied:false};
    // Iterate in priority order (already sorted descending), apply first match
    for(let i=0;i<list.length;i++){
      const shield=list[i];
      if(shield.applies(attackContext)){
        const modifiedDmg=shield.modify(attackContext.dmg);
        return{dmg:modifiedDmg,defApplied:true,shieldId:shield.id};
      }
    }
    // No predicate matched
    return{dmg:attackContext.dmg,defApplied:false};
  }
  removeShieldRule(playerIndex,shieldRuleId){
    const list=this._shields[playerIndex];
    if(!list)return;
    const idx=list.findIndex(s=>s.id===shieldRuleId);
    if(idx!==-1){
      list.splice(idx,1);
      eventBus.emit(EVT_SHIELD_BROKEN,{playerIndex,shieldRuleId});
    }
  }
  clearPlayer(playerIndex){
    this._shields[playerIndex]=[];
  }
}
const shieldEngine=new ShieldRuleEngine();
// ── CIRCLE STATE MACHINE ──────────────────────────────────────────
const CSM_IDLE='IDLE',CSM_ACTIVE='ACTIVE',CSM_SWITCHING='SWITCHING',CSM_LOADING='LOADING';
const CSM_TRANSITIONS={[CSM_IDLE]:[CSM_LOADING],[CSM_LOADING]:[CSM_ACTIVE],[CSM_ACTIVE]:[CSM_SWITCHING],[CSM_SWITCHING]:[CSM_LOADING]};
class CircleStateMachine{
  constructor(playerIndex){this.state=CSM_IDLE;this.playerIndex=playerIndex}
  transition(newState){
    const valid=CSM_TRANSITIONS[this.state];
    if(!valid||!valid.includes(newState))return false;
    const prevState=this.state;
    this.state=newState;
    eventBus.emit(EVT_CIRCLE_SWITCH,{playerIndex:this.playerIndex,prevState,newState});
    return true;
  }
  getSwitchingPenalty(){return this.state===CSM_SWITCHING?0.7:1.0}
  getState(){return this.state}
  reset(){this.state=CSM_IDLE}
}
// ── ARCHETYPES ──────────────────────────────────────────────────
const ARCHS=[
  {id:'storm',name:'Storm Circle',icon:'⛈',tags:['electric','liquid','motion','wind'],col:'#818cf8',desc:'Chain damage, high mobility. Electric amplified by motion.',
   laws:[{a:'electric',b:'motion',bonus:'CHAIN_B',desc:'Electric chains jump an extra target'},{a:'wind',b:'motion',bonus:'SPEED_A',desc:'Wind+motion SPEED duration doubled'}]},
  {id:'void',name:'Void Circle',icon:'🕳',tags:['void','pierce','null','phase'],col:'#a5b4fc',desc:'Shield bypass specialist. Penetrates all defenses.',
   laws:[{a:'void',b:'pierce',bonus:'PIERCE_A',desc:'Void+pierce bypass flag + ×1.7 damage'},{a:'phase',b:'null',bonus:'PHASE_S',desc:'Phase+null grants 40% damage reduction'}]},
  {id:'inferno',name:'Inferno Circle',icon:'🔥',tags:['heat','electric','wind','force'],col:'#f97316',desc:'Maximum damage output. Heat combos hit harder.',
   laws:[{a:'heat',b:'electric',bonus:'PLASMA_A',desc:'Plasma Burst damage ×2.5 instead of ×2.2'},{a:'heat',b:'wind',bonus:'WILD_E',desc:'Wildfire DoT extends to 8s'}]},
  {id:'earth',name:'Earthen Circle',icon:'🪨',tags:['earth','solid','bind','gravity'],col:'#86efac',desc:'Maximum defense and control. Lowest damage output.',
   laws:[{a:'solid',b:'earth',bonus:'FORT_S',desc:'Solid+Earth damage reduction ×0.4 (60% less)'},{a:'gravity',b:'bind',bonus:'GRAV_L',desc:'Gravity+bind locks enemy mobility 2s'}]},
  {id:'ritual',name:'Ritual Circle',icon:'✦',tags:['time','space','light','soul'],col:'#f5c842',desc:'Slow ramp, high ceiling. Laws reward sustained casting.',
   laws:[{a:'time',b:'space',bonus:'RAMP',desc:'Every cast this round adds ×0.3 to damage'},{a:'light',b:'soul',bonus:'REVEAL_A',desc:'Light+soul: EXPOSED lasts 5s instead of 3s'}]},
  {id:'shadow',name:'Shadow Circle',icon:'🌑',tags:['dark','curse','soul','void'],col:'#fde68a',desc:'Debuff and drain. Weakens the opponent over multiple rounds.',
   laws:[{a:'dark',b:'curse',bonus:'CURSE_A',desc:'WEAKEN lasts 8s instead of 4s'},{a:'soul',b:'dark',bonus:'DRAIN_A',desc:'Lifesteal heals 50% of damage dealt'}]},
];
const BONUS_MODS={CHAIN_B:[{t:'MUL',v:1.3}],SPEED_A:[{t:'STA',v:'SPEED',d:4}],PIERCE_A:[{t:'BYP'},{t:'MUL',v:1.7}],PHASE_S:[{t:'DEF',v:.6}],PLASMA_A:[{t:'MUL',v:2.5}],WILD_E:[{t:'MUL',v:1.8},{t:'STA',v:'BURN',d:8}],FORT_S:[{t:'DEF',v:.4}],GRAV_L:[{t:'STA',v:'FREEZE',d:2}],RAMP:[{t:'MUL',v:1.4}],REVEAL_A:[{t:'STA',v:'EXPOSED',d:5}],CURSE_A:[{t:'STA',v:'WEAKEN',d:8}],DRAIN_A:[{t:'MUL',v:1.4},{t:'STA',v:'LIFESTEAL',d:0}]};
function mkBindingRule(law,pi){return{id:`BND_P${pi+1}_${law.bonus}`,thr:.60,pri:20,grp:null,col:'#f5c842',isBinding:true,cond:cC(law.a,law.b),mods:BONUS_MODS[law.bonus]||[{t:'MUL',v:1.2}],desc:`[Binding] ${law.desc}`}}
// ── GAME STATE ──────────────────────────────────────────────────
const G={hp:[100,100],round:1,sel:[new Set(),new Set()],coh:[1,1],circles:[null,null],customLaw:[1,1],bRules:[null,null],statuses:[[],[]],csm:[new CircleStateMachine(0),new CircleStateMachine(1)]};
const ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X'];
const STA_COL={STUN:'#f87171',FREEZE:'#818cf8',SLOW:'#86efac',BURN:'#f97316',WEAKEN:'#fbbf24',LIFESTEAL:'#a855f7',SHIELD:'#4ade80',SPEED:'#34d399',EXPOSED:'#fde68a',PULLED:'#f87171',D_SUPP:'#a5b4fc'};
// ── TOOLTIP ─────────────────────────────────────────────────────
const TT_DATA={
  coherence:{t:'Coherence Score',b:`<b>Coherence</b> is the average compatibility score across all your selected tag pairs.\n\nEach pair has a score from <b>0.0</b> (opposing) to <b>1.0</b> (perfect affinity).\n<div class="tt-ex">electric + liquid = 0.85 → high coherence\nheat + cold = 0.10 → very low coherence</div>\n<b>Below 0.4:</b> your base damage shrinks proportionally. Aim for 0.7+.`},
  rules:{t:'Active Rules',b:`Rules fire when your tags score ≥ the rule's <b>threshold</b>.\n\nThe score = compatibility between the required tags — not a yes/no.\n<div class="tt-ex">STORM_SURGE needs electric + liquid + motion.\nCompatibility 0.85 ≥ threshold 0.70 → FIRES</div>\n<b>Conflict Groups:</b> COLD_FREEZE vs STEAM_BURST are exclusive — only highest score fires.`},
  tags:{t:'Tag System',b:`Tags are atomic. You don't pick "fire" — you select <b>heat</b>, <b>motion</b>, <b>force</b>.\n\nRules activate based on which combination you build.\n<div class="tt-ex">heat alone → nothing\nheat + motion → HEAT_AMPLIFY fires (0.90)\nheat + electric → PLASMA_BURST fires (0.72)</div>`},
  binding:{t:'Binding Laws',b:`Circle-specific rules with <b>priority 20</b> vs global priority 5–15.\n\nActivate only when you use their required tags — but outrank all global rules when they do.\n<div class="tt-ex">Storm Circle: electric+motion → chain +1 target\nOverrides ELEC_CHAIN at priority 12.</div>`},
  bypass:{t:'Shield Bypass',b:`Some rules set <b>bypassShield = true</b>. This skips all defensive multipliers — full damage hits regardless of what the opponent picked.\n<div class="tt-ex">VOID_PIERCE → bypass\nPHASE_STRIKE → bypass solid shields</div>\nCounter: LIGHT_REVEAL exposes void users.`},
  conflict:{t:'Conflict Groups',b:`Mutually exclusive rules — only the <b>highest scorer</b> fires per cast.\n<div class="tt-ex">WATER group: COLD_FREEZE (0.87) vs STEAM_BURST (0.45)\nWater can't freeze AND boil.\n→ COLD_FREEZE wins.</div>`},
};
const tt=document.getElementById('tt');let ttT;
function showTT(el,key){const d=TT_DATA[key];if(!d)return;clearTimeout(ttT);document.getElementById('tt-t').textContent=d.t;document.getElementById('tt-b').innerHTML=d.b.replace(/\n/g,'<br>');const r=el.getBoundingClientRect();let top=r.bottom+6,left=r.left;if(left+258>innerWidth)left=innerWidth-262;if(top+200>innerHeight)top=r.top-208;tt.style.top=top+'px';tt.style.left=left+'px';tt.classList.add('show')}
function hideTT(){ttT=setTimeout(()=>tt.classList.remove('show'),100)}
function showTagTT(el,id){const tag=TAGS[id];if(!tag)return;const comp=TAG_LIST.map(([tid])=>({id:tid,s:gc(id,tid)})).filter(x=>x.id!==id).sort((a,b)=>b.s-a.s);const hi=comp.slice(0,4).map(x=>`<b>${x.id}</b> (${x.s.toFixed(2)})`).join(', ');const lo=comp.slice(-3).map(x=>`<b>${x.id}</b> (${x.s.toFixed(2)})`).join(', ');document.getElementById('tt-t').textContent=id.toUpperCase();document.getElementById('tt-b').innerHTML=`<b>Category:</b> ${tag.cat}<br><br><b>Affinities:</b><br>${hi}<br><br><b>Opposing:</b><br>${lo}<div class="tt-ex">✦ = this tag is in your circle's base set</div>`;const r=el.getBoundingClientRect();let top=r.bottom+5,left=r.left;if(left+258>innerWidth)left=innerWidth-262;if(top+200>innerHeight)top=r.top-210;tt.style.top=top+'px';tt.style.left=left+'px';tt.classList.add('show')}
// ── INFO MODAL ──────────────────────────────────────────────────
const INFO_DATA={
  circles:{t:'What is a Magic Circle?',b:`<div class="ic-row"><span class="ic-icon">🔮</span><div>A <b>Magic Circle</b> is your player-designed framework. It grants <b>Binding Laws</b> — high-priority rules exclusive to your circle.</div></div><div class="ic-row"><span class="ic-icon">⚡</span><div>Circles don't restrict tag choices in battle. But your <b>Binding Laws</b> only fire if you use the matching tags. Align your tags with your circle to maximise power.</div></div><div class="ic-row"><span class="ic-icon">🛡</span><div><b>Coherence</b> rises when your tags are compatible. Low coherence reduces base damage. A focused circle beats a chaotic one.</div></div><div class="ic-row"><span class="ic-icon">✦</span><div>One law is <b>fixed</b> (always active). The second is your <b>choice</b> — pick the one that fits your playstyle.</div></div><div class="ic-ex">Example: Storm Circle with electric+motion active → binding law fires at priority 20, outranking global rule at priority 12, giving chain +1 target.</div>`},
  phases:{t:'Phase System',b:`Effects apply in strict order — deterministic regardless of rule registration.<br><br><div class="ic-row"><span class="ic-icon">1</span><div><b>PRE_MOD</b> — amplifiers (×1.6), bypass flags. Applied first.</div></div><div class="ic-row"><span class="ic-icon">2</span><div><b>TRANSFORM</b> — type changes: steam, plasma, freeze.</div></div><div class="ic-row"><span class="ic-icon">3</span><div><b>POST_MOD</b> — chain, AoE, status effects.</div></div><div class="ic-row"><span class="ic-icon">4</span><div><b>FINALIZE</b> — terminal multipliers (ritual ramp-up).</div></div><div class="ic-ex">Why it matters: Amplify→Chain differs from Chain→Amplify. Phases remove this ambiguity entirely.</div>`},
};
function openInfo(key){const d=INFO_DATA[key];if(!d)return;document.getElementById('ic-title').textContent=d.t;document.getElementById('ic-body').innerHTML=d.b;document.getElementById('info-modal').classList.add('open')}
function closeInfo(){document.getElementById('info-modal').classList.remove('open')}
// ── SCREENS ──────────────────────────────────────────────────────
const SCREENS=['screen-title','screen-builder','screen-battle','screen-gameover'];
function showScreen(id){SCREENS.forEach(s=>{const el=document.getElementById(s);el.classList.toggle('hidden',s!==id)})}
function goBuilder(){buildBuilderUI();showScreen('screen-builder')}
// ── BUILDER ──────────────────────────────────────────────────────
const CAT_PILL={ELEMENTAL:'rgba(248,113,113,.25);color:#fca5a5',PHYSICAL:'rgba(74,222,128,.25);color:#86efac',DIMENSIONAL:'rgba(129,140,248,.25);color:#a5b4fc',METAPHYSICAL:'rgba(251,191,36,.25);color:#fde68a',STATE:'rgba(156,163,175,.25);color:#d1d5db'};
function buildBuilderUI(){
  const wrap=document.getElementById('bld-players');wrap.innerHTML='';
  [0,1].forEach(i=>{
    const d=document.createElement('div');d.className=`bld-card p${i+1}`;
    d.innerHTML=`<div class="bld-plabel">PLAYER ${i?'II':'I'}</div>
    <div class="sec-lbl">CHOOSE CIRCLE ARCHETYPE</div>
    <div class="arch-grid" id="ag${i}"></div>
    <div>
      <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px">
        <span class="sec-lbl" style="margin:0">BINDING LAWS</span>
        <button class="ib" onmouseenter="showTT(this,'binding')" onmouseleave="hideTT()">?</button>
      </div>
      <div id="bl${i}"><div style="font-size:7.5px;color:var(--muted2);letter-spacing:.5px">Select a circle first</div></div>
    </div>`;
    wrap.appendChild(d);buildArchGrid(i);
  });
}
function buildArchGrid(pi){
  const g=document.getElementById(`ag${pi}`);g.innerHTML='';
  ARCHS.forEach(a=>{
    const c=document.createElement('div');c.className='arch-card';c.id=`ac${pi}-${a.id}`;
    const tp=a.tags.map(t=>`<span class="atag" style="background:${CAT_PILL[TAGS[t]?.cat]}">${t}</span>`).join('');
    c.innerHTML=`<div class="arch-name" style="color:${a.col}">${a.icon} ${a.name}</div><div class="arch-desc">${a.desc}</div><div class="arch-tags">${tp}</div>`;
    c.onclick=()=>selectArch(pi,a.id);g.appendChild(c);
  });
}
function selectArch(pi,aid){
  G.circles[pi]=ARCHS.find(a=>a.id===aid);G.customLaw[pi]=1;
  ARCHS.forEach(a=>{const el=document.getElementById(`ac${pi}-${a.id}`);if(el)el.classList.toggle('sel',a.id===aid)});
  updateBL(pi);
}
function updateBL(pi){
  const arch=G.circles[pi];if(!arch)return;
  const bl=document.getElementById(`bl${pi}`);
  const fl=arch.laws[0];
  let html=`<div class="bl-row" style="cursor:default;border-color:rgba(245,200,66,.25)">
    <span class="bl-fixed-mark">★</span><span class="bl-arrow">→</span>
    <span class="bl-tags">${fl.a} + ${fl.b}</span><span class="bl-desc">${fl.desc}</span>
  </div>`;
  const opts=arch.laws.slice(1);
  if(opts.length){
    html+=`<div style="font-size:7px;letter-spacing:1px;color:var(--muted2);margin:5px 0 3px;font-family:var(--font-head)">CHOOSE CUSTOM LAW</div>`;
    opts.forEach((law,idx)=>{
      const ri=idx+1,sel=G.customLaw[pi]===ri;
      html+=`<div class="bl-row ${sel?'active':''}" onclick="setCustomLaw(${pi},${ri})">
        <span class="bl-check" style="color:${sel?'var(--gold)':'var(--muted2)'}">${sel?'✓':'○'}</span>
        <span class="bl-arrow">→</span>
        <span class="bl-tags">${law.a} + ${law.b}</span>
        <span class="bl-desc">${law.desc}</span>
      </div>`;
    });
  }
  bl.innerHTML=html;
}
function setCustomLaw(pi,ri){G.customLaw[pi]=ri;updateBL(pi)}
function startBattle(){
  if(!G.circles[0]||!G.circles[1]){alert('Both players must select a circle!');return}
  [0,1].forEach(i=>{
    const a=G.circles[i];
    const laws=[a.laws[0]];
    const cli=G.customLaw[i];if(cli>0&&cli<a.laws.length)laws.push(a.laws[cli]);
    G.bRules[i]=laws.map(l=>mkBindingRule(l,i));
  });
  G.hp=[100,100];G.round=1;G.sel=[new Set(),new Set()];G.coh=[1,1];G.statuses=[[],[]];
  [0,1].forEach(i=>{G.csm[i].reset();G.csm[i].transition(CSM_LOADING);G.csm[i].transition(CSM_ACTIVE)});
  buildBattleUI();showScreen('screen-battle');updateHPBars();
  setLog('Battle begins! Both players select tags and fire.','var(--gold)');
}
function rematch(){G.hp=[100,100];G.round=1;G.sel=[new Set(),new Set()];G.coh=[1,1];G.statuses=[[],[]];[0,1].forEach(i=>{G.csm[i].reset();G.csm[i].transition(CSM_LOADING);G.csm[i].transition(CSM_ACTIVE)});buildBattleUI();showScreen('screen-battle');updateHPBars();setLog('Rematch! Same circles.','var(--gold)')}
// ── BATTLE UI ──────────────────────────────────────────────────
function buildBattleUI(){[0,1].forEach(buildPanel)}
function buildPanel(i){
  const pi=i+1,panel=document.getElementById(`pp${pi}`),arch=G.circles[i];
  const rev=i===1;
  const cg={};TAG_LIST.forEach(([id,cat])=>{cg[cat]=cg[cat]||[];cg[cat].push(id)});
  const ctags=new Set(arch?.tags||[]);
  let catsH='';
  TAG_CATS.forEach(cat=>{
    const tgs=cg[cat]||[];
    const pills=tgs.map(id=>`<button class="tb${ctags.has(id)?' circ-hint':''}" data-c="${cat}" id="tb${pi}_${id}" onclick="toggleTag(${i},'${id}')" onmouseenter="showTagTT(this,'${id}')" onmouseleave="hideTT()">${id}</button>`).join('');
    catsH+=`<div class="cat-blk"><div class="cat-lbl-row"><span class="cat-lbl">${cat}</span><button class="ib" onmouseenter="showTT(this,'tags')" onmouseleave="hideTT()">?</button></div><div class="tag-wrap">${pills}</div></div>`;
  });
  panel.innerHTML=`<div class="pp-inner">
    <div class="pp-top ${rev?'r':''}">
      <div class="pp-label">PLAYER ${pi}</div>
      <div style="display:flex;align-items:center;gap:5px">
        <div class="circle-badge"><div class="cdot"></div>${arch?.icon||'?'} ${arch?.name||'None'}</div>
        <button class="ib" style="font-size:6px;width:auto;border-radius:7px;padding:2px 6px;height:auto;letter-spacing:.3px" onclick="switchCircle(${i})">⟳ SWITCH</button>
      </div>
    </div>
    <div class="coh-row ${rev?'r':''}">
      <div class="coh-lbl">COH<button class="ib" style="margin-left:3px" onmouseenter="showTT(this,'coherence')" onmouseleave="hideTT()">?</button></div>
      <div class="coh-track"><div class="coh-fill" id="cf${pi}" style="width:100%;background:var(--green)"></div></div>
      <div class="coh-val" id="cv${pi}">1.00</div>
    </div>
    <div class="status-row ${rev?'r':''}" id="sr${pi}"></div>
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
function switchCircle(i){
  const csm=G.csm[i];
  if(csm.getState()!==CSM_ACTIVE){setLog(`Player ${i+1} cannot switch right now.`,'var(--red)');return}
  csm.transition(CSM_SWITCHING);
  // Show SWITCHING status chip
  const pi=i+1;
  const sr=document.getElementById(`sr${pi}`);
  if(sr){const chip=document.createElement('span');chip.className='s-chip';chip.style.cssText='border-color:#a5b4fc;color:#a5b4fc';chip.textContent='SWITCHING';sr.appendChild(chip)}
  setLog(`Player ${pi} is switching circles! (0.7× damage this round)`,'#a5b4fc');
}
function toggleTag(i,id){const s=G.sel[i];s.has(id)?s.delete(id):s.add(id);updatePanel(i)}
function updatePanel(i){
  const pi=i+1,sel=G.sel[i];
  TAG_LIST.forEach(([id])=>{const b=document.getElementById(`tb${pi}_${id}`);if(b)b.classList.toggle('sel',sel.has(id))});
  const sd=document.getElementById(`sd${pi}`);
  sd.innerHTML=sel.size===0?'<span class="sp-empty">— select tags —</span>':[...sel].map(id=>`<span class="sp-pill" style="background:${CAT_PILL[TAGS[id]?.cat]}">${id}</span>`).join('');
  const coh=coherence(sel);G.coh[i]=coh;
  const cf=document.getElementById(`cf${pi}`),cv=document.getElementById(`cv${pi}`);
  if(cf){cf.style.width=(coh*100)+'%';cf.style.background=coh>=.75?'var(--green)':coh>=.45?'var(--gold)':'var(--red)'}
  if(cv)cv.textContent=coh.toFixed(2);
  const fired=evalRules(sel,G.bRules[i]||[]);
  const rl=document.getElementById(`rl${pi}`);
  if(!rl)return;
  rl.innerHTML=fired.length===0?'<div class="no-rule">No rules activated</div>':fired.map(sr=>`<div class="rr"><div class="r-bar" style="background:${sr.r.col}"></div><div class="r-txt"><div class="r-id">${sr.r.id}</div><div class="r-dsc">${sr.r.desc}</div></div>${sr.r.isBinding?'<span class="r-bl">BINDING</span>':''}<div class="r-sc">${sr.score.toFixed(2)}</div></div>`).join('');
  // Status row
  const sr=document.getElementById(`sr${pi}`);
  if(sr){const ac=G.statuses[i].filter(s=>s.r>0);sr.innerHTML=ac.length===0?'':ac.map(s=>{const col=STA_COL[s.n]||'#9ca3af';return`<span class="s-chip" style="border-color:${col};color:${col}">${s.n}${s.r>1?' '+s.r+'r':''}</span>`}).join('')}
}
// ── RESOLUTION PIPELINE ──────────────────────────────────────────
function resolveCombat(playerIndex, tagSet, extraRules, opponentFiredRules, gameState) {
  const gs = gameState || G;

  // Stage 1: Input Collection — convert TagSet to BitSet, compute coherence
  const bits = toBitSet(tagSet);
  const coh = coherence(tagSet);

  // Stage 2: BitSet Matching — pre-filter candidate rules using BitSet
  // Since rules use condition functions (not bitmasks), we prepare data but still
  // rely on condition functions for scoring. The BitSet is available for future optimization.
  const allRules = [...RULES, ...(extraRules || [])];

  // Stage 3: Condition Scoring — compute compatibility scores, filter by threshold
  const scored = allRules.map(r => ({ r, score: r.cond(tagSet) }))
    .filter(s => s.score >= s.r.thr)
    .sort((a, b) => b.score - a.score || b.r.pri - a.r.pri);

  // Stage 4: Conflict Resolution — select highest-scoring rule per ConflictGroup
  const grps = {}, ng = [];
  scored.forEach(s => s.r.grp ? (grps[s.r.grp] = grps[s.r.grp] || [], grps[s.r.grp].push(s)) : ng.push(s));
  const firedRules = [...ng];
  Object.values(grps).forEach(g => firedRules.push(g[0]));
  firedRules.sort((a, b) => b.score - a.score);

  // Emit OnRuleTriggered for each fired rule
  for (const sr of firedRules) {
    eventBus.emit(EVT_RULE_TRIGGERED, { ruleId: sr.r.id, score: sr.score, playerIndex });
  }

  // Stage 5: Phased Modifier Application
  const baseDmg = Math.round(30 * (coh >= 0.4 ? 1 : coh / 0.4));
  const ctx = applyPhasedModifiers(firedRules, { dmg: baseDmg, bypass: false, sts: [] });

  // Apply CircleStateMachine switching penalty
  const switchPenalty = gs.csm[playerIndex].getSwitchingPenalty();
  ctx.dmg = Math.round(ctx.dmg * switchPenalty);

  // Stage 6: Shield Resolution — delegate to ShieldRuleEngine for defensive effects
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const shieldResult = shieldEngine.evaluate(opponentIndex, { dmg: ctx.dmg, bypass: ctx.bypass, tags: tagSet });
  ctx.dmg = shieldResult.dmg;

  // Misfire detection
  const misfire = coh < 0.4;
  if (misfire) {
    eventBus.emit(EVT_MISFIRE, { playerIndex, coherence: coh });
  }

  return { dmg: Math.max(0, ctx.dmg), bypass: ctx.bypass, sts: ctx.sts, misfire, firedRules, coherence: coh };
}
// ── CLASH ──────────────────────────────────────────────────────
function fireClash(){
  const s1=G.sel[0],s2=G.sel[1];
  if(s1.size===0&&s2.size===0){setLog('Select at least one tag!','var(--red)');return}
  // Use Resolution Pipeline for both players
  const r1=resolveCombat(0, s1, G.bRules[0]||[]);
  const r2=resolveCombat(1, s2, G.bRules[1]||[]);
  // Extract fired rules for UI display
  const f1=r1.firedRules, f2=r2.firedRules;
  // Update HP
  G.hp[1]=Math.max(0,G.hp[1]-r1.dmg);G.hp[0]=Math.max(0,G.hp[0]-r2.dmg);
  // Apply status effects (all sts from pipeline are attack-sourced)
  r1.sts.forEach(s=>G.statuses[1].push({n:s.n,r:2}));
  r2.sts.forEach(s=>G.statuses[0].push({n:s.n,r:2}));
  // Update coherence in game state for UI
  G.coh[0]=r1.coherence;G.coh[1]=r2.coherence;
  showClash(s1,s2,f1,f2,r1,r2);
}
function pillsH(sel){return[...sel].map(id=>`<span class="sp-pill" style="font-size:7px;padding:1px 5px;border-radius:7px;background:${CAT_PILL[TAGS[id]?.cat]}">${id}</span>`).join('')}
function rulesH(fired){return fired.length===0?'<span style="font-size:7.5px;color:var(--muted2)">none</span>':fired.map(sr=>`<span class="cr-chip" style="border-color:${sr.r.col};color:${sr.r.col}">${sr.r.id}${sr.r.isBinding?' ✦':''}</span>`).join('')}
function stChips(sts,src){return sts.filter(s=>!src||s.src===src||!s.src).map((s,i)=>{const col=STA_COL[s.n]||'#9ca3af';return`<span class="s-chip" style="border-color:${col};color:${col};animation-delay:${.22+i*.07}s">${s.n}${s.d>0?' '+s.d+'s':''}</span>`}).join('')}
function showClash(s1,s2,f1,f2,r1,r2){
  const ov=document.getElementById('clash'),inn=document.getElementById('clash-inner');
  const cc=r1.dmg>r2.dmg?'var(--p1)':r2.dmg>r1.dmg?'var(--p2)':'var(--gold)';
  inn.innerHTML=`
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
    ${r1.misfire||r2.misfire?'<div class="clash-misfire">⚠ MISFIRE — low coherence reduced base damage</div>':''}
    <div class="clash-dmg-row">
      <div class="clash-dmg-blk">
        <div class="clash-dmg" style="color:var(--red);animation-delay:.05s">-${r1.dmg}</div>
        <div class="clash-dlbl">P2 TAKES</div>
        <div class="clash-schips">${stChips(r1.sts,'atk')}</div>
        ${r1.bypass?'<div class="clash-bypass">🔮 SHIELD BYPASSED</div>':''}
        <div style="font-size:7.5px;color:var(--muted);margin-top:3px">coh ${G.coh[0].toFixed(2)}</div>
      </div>
      <div class="clash-arrow">⟷</div>
      <div class="clash-dmg-blk">
        <div class="clash-dmg" style="color:var(--red);animation-delay:.1s">-${r2.dmg}</div>
        <div class="clash-dlbl">P1 TAKES</div>
        <div class="clash-schips">${stChips(r2.sts,'atk')}</div>
        ${r2.bypass?'<div class="clash-bypass">🔮 SHIELD BYPASSED</div>':''}
        <div style="font-size:7.5px;color:var(--muted);margin-top:3px">coh ${G.coh[1].toFixed(2)}</div>
      </div>
    </div>
    <div style="font-size:7.5px;color:var(--muted);letter-spacing:1px">HP after: P1 <span style="color:var(--p1)">${G.hp[0]}</span> · P2 <span style="color:var(--p2)">${G.hp[1]}</span></div>
    <button class="clash-next" onclick="nextRound()">${G.hp[0]<=0||G.hp[1]<=0?'⚔ SEE RESULTS':'NEXT ROUND →'}</button>`;
  const fl=document.createElement('div');fl.className='clash-flash';fl.style.background=`radial-gradient(circle,${cc}99,transparent)`;inn.appendChild(fl);setTimeout(()=>fl.remove(),700);
  ov.classList.add('active');
}
function nextRound(){
  document.getElementById('clash').classList.remove('active');
  updateHPBars();
  if(G.hp[0]<=0||G.hp[1]<=0){showGameOver();return}
  // Transition any SWITCHING players back: SWITCHING→LOADING→ACTIVE
  [0,1].forEach(i=>{if(G.csm[i].getState()===CSM_SWITCHING){G.csm[i].transition(CSM_LOADING);G.csm[i].transition(CSM_ACTIVE)}});
  G.round++;document.getElementById('round-num').textContent=ROMAN[Math.min(G.round-1,ROMAN.length-1)];
  [0,1].forEach(i=>{G.statuses[i]=G.statuses[i].map(s=>({...s,r:s.r-1})).filter(s=>s.r>0)});
  G.sel=[new Set(),new Set()];buildBattleUI();
  setLog(`Round ${G.round}. Choose your combination.`,'var(--gold)');
}
function updateHPBars(){[0,1].forEach(i=>{const pi=i+1;const f=document.getElementById(`hpf${pi}`),v=document.getElementById(`hpv${pi}`);if(f)f.style.width=Math.max(0,G.hp[i])+'%';if(v)v.textContent=G.hp[i]})}
function showGameOver(){
  const w=G.hp[0]<=0&&G.hp[1]<=0?0:G.hp[0]<=0?2:1;
  const gt=document.getElementById('go-title'),gs=document.getElementById('go-sub');
  gt.textContent=w===0?'DRAW':'VICTORY';gt.style.color=w===1?'var(--p1)':w===2?'var(--p2)':'var(--gold)';
  gs.textContent=w===0?'BOTH PLAYERS FALL':`PLAYER ${w===1?'I':'II'} WINS`;gs.style.color=w===1?'var(--p1)':w===2?'var(--p2)':'var(--gold)';
  document.getElementById('go-stats').textContent=`${G.round} ROUNDS · ${G.circles[0]?.name} vs ${G.circles[1]?.name} · HP: ${G.hp[0]} | ${G.hp[1]}`;
  showScreen('screen-gameover');
}
function setLog(msg,col='var(--text)'){const el=document.getElementById('bt-log');if(!el)return;el.textContent=msg;el.style.color=col;el.style.animation='none';el.offsetHeight;el.style.animation='log-in .3s ease'}
showScreen('screen-title');