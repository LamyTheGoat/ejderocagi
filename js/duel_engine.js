'use strict';

// Server-authoritative, simultaneous-action version of Ejder Ocağı's classic dragon combat.
// This module intentionally has no browser dependencies and uses the server RNG only.
const ELEMENT_ADVANTAGE = { ates: 'buz', buz: 'toprak', toprak: 'firtina', firtina: 'ates' };
const ELEMENTS = new Set(['ates', 'buz', 'firtina', 'toprak', 'golge']);
const MOOD_DAMAGE = [0.86, 0.93, 1, 1.06, 1.12];
const NEFES_COST = 40;
const CARDS = new Set([
  'alev_yagmuru', 'buz_zirh', 'yildirim', 'sarsinti', 'golge_adim',
  'son_nefes', 'kukreyen_yurek', 'celik_pence', 'kanat_kalkan',
]);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(Number(v)) ? Number(v) : lo));
const chance = pct => Math.random() * 100 < pct;
const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
const elMult = (a, d) => {
  if (a === 'golge' && d !== 'golge') return 1.2;
  if (d === 'golge' && a !== 'golge') return 1.15;
  if (ELEMENT_ADVANTAGE[a] === d) return 1.4;
  if (ELEMENT_ADVANTAGE[d] === a) return 0.72;
  return 1;
};

function normalizeFighter(raw, side) {
  const f = raw && typeof raw === 'object' ? raw : {};
  const stat = k => clamp(f[k], 1, 500);
  const cards = Array.isArray(f.cards) ? f.cards.filter(k => CARDS.has(k)).slice(0, 3) : [];
  return {
    side,
    name: String(f.name || (side === 'p' ? 'Ejderha' : 'Rakip')).slice(0, 40),
    el: ELEMENTS.has(f.el) ? f.el : 'ates',
    gu: stat('gu'), ce: stat('ce'), da: stat('da'), ze: stat('ze'),
    atk: clamp(f.atk, 0, 500), def: clamp(f.def, 0, 500),
    crit: clamp(f.crit, 0, 100), dodge: clamp(f.dodge, 0, 90),
    nefesB: clamp(f.nefesB, 0, 200), seasonMult: clamp(f.seasonMult == null ? 1 : f.seasonMult, 0.8, 1.2),
    maxHp: clamp(f.maxHp, 20, 5000), hp: clamp(f.maxHp, 20, 5000), sta: 60,
    mood: Math.round(clamp(f.mood, 0, 4)),
    cesur: !!f.cesur, temkinli: !!f.temkinli, demir: !!f.demir, vahsi: !!f.vahsi,
    bond: clamp(f.bond, 0, 100), bondUsed: !!f.bondUsed,
    heart: !!f.heart, saves: clamp(f.saves, 0, 2), tired: !!f.tired,
    cards, used: [], weak: 0, fury: 0, guard: false, stun: 0,
    shield: 0, evade: 0, immune: false, roar: false,
  };
}

function createFight(playerOne, playerTwo) {
  return {
    p: normalizeFighter(playerOne, 'p'),
    e: normalizeFighter(playerTwo, 'e'),
    round: 0, over: false, winner: null, meta: { kind: 'dragon_duel' },
  };
}

function snapshot(F) {
  return {
    p: { hp: Math.max(0, F.p.hp), sta: F.p.sta },
    e: { hp: Math.max(0, F.e.hp), sta: F.e.sta },
  };
}

function attack(a, t, kind, mult = 1) {
  const ev = { who: a.side, act: kind };
  let hit, dmg;
  if (t.cover) {
    ev.covered = t.cover; t.cover = null; ev.blocked = true;
    if (kind === 'nefes') a.sta -= NEFES_COST;
    return ev;
  }
  if (t.evade > 0) {
    t.evade--; ev.miss = true; ev.evaded = true;
    if (kind === 'nefes') a.sta -= NEFES_COST;
    return ev;
  }
  if (kind === 'nefes') {
    a.sta -= NEFES_COST;
    hit = clamp(78 + (a.ze - t.ce) * 0.3 - t.dodge, 45, 95);
    dmg = (10 + (a.gu + a.ze) * 0.32) * elMult(a.el, t.el) * (1 + a.nefesB / 100);
    dmg *= 100 / (100 + t.def * 0.6 + t.da * 0.2);
    ev.elm = elMult(a.el, t.el);
  } else {
    hit = clamp(85 + (a.ce - t.ce) * 0.35 - t.dodge, 50, 97);
    dmg = (6 + a.gu * 0.5 + a.atk);
    dmg *= 100 / (100 + t.def * 1.2 + t.da * 0.35);
  }
  if (a.forceCrit) hit = 100;
  ev.hitP = Math.round(hit);
  if (!chance(hit)) {
    ev.miss = true; ev.why = [];
    if (t.dodge >= 8) ev.why.push(`${t.name} çok kaçamaklı`);
    if (t.ce > a.ce + 8) ev.why.push(`${t.name} daha çevik (${t.ce}–${a.ce})`);
    if (kind === 'nefes' && t.ce > a.ze) ev.why.push(`nefes zekâyla nişan alır (${a.ze})`);
    return ev;
  }
  const why = ev.why = [], pc = v => Math.round((1 - v) * 100);
  const moodDmg = MOOD_DAMAGE[Math.round(clamp(a.mood, 0, 4))] || 1;
  if (ev.elm && ev.elm < 1) why.push(`element üstünlüğü (${Math.round(ev.elm * 100)}%)`);
  if (moodDmg < 1) why.push('morali düşük');
  if (a.weak) why.push('sarsılmıştı (−%20)');
  if (a.tired) why.push('yorgundu (−%10)');
  const armor = kind === 'nefes' ? 100 / (100 + t.def * 0.6) : 100 / (100 + t.def * 1.2);
  if (armor < 0.85) why.push(`${t.name} zırhlı (−%${pc(armor)})`);
  dmg *= mult * moodDmg * (a.seasonMult || 1) * rnd(0.86, 1.14);
  if (a.cesur) dmg *= 1.12;
  if (a.vahsi) dmg *= 1.1;
  if (a.weak) dmg *= 0.8;
  if (a.tired) dmg *= 0.9;
  const cr = 5 + a.ze * 0.1 + a.crit + (a.fury ? 12 : 0);
  if (a.roar) dmg *= 1.2;
  if (a.forceCrit || chance(cr)) { dmg *= 1.6; ev.crit = true; }
  if (t.guard) { dmg *= 0.45; ev.guarded = true; why.push('savunmadaydı (−%55)'); }
  if (t.demir) { dmg *= 0.85; why.push('Demir Pul (−%15)'); }
  if (t.temkinli) { dmg *= 0.9; why.push('temkinli (−%10)'); }
  if (t.shield > 0) { dmg *= 0.4; ev.shielded = true; why.push('buz zırh (−%60)'); }
  if (t.immune) { ev.dmg = 0; ev.blocked = true; return ev; }
  dmg = Math.max(1, Math.round(dmg));
  t.hp -= dmg; ev.dmg = dmg;
  if (t.hp <= 0 && t.side === 'p' && (t.heart ? (t.saves || 0) < 2 : !t.bondUsed) && t.bond >= 60 && chance(t.heart ? 90 : t.bond >= 85 ? 75 : 50)) {
    t.hp = 1; t.bondUsed = true; t.saves = (t.saves || 0) + 1; ev.saved = true;
  }
  return ev;
}

function doCard(F, a, t, key) {
  a.used = a.used || []; a.used.push(key);
  const ev = { who: a.side, act: 'card', card: key };
  if (key === 'alev_yagmuru') { a.sta += NEFES_COST; const e = attack(a, t, 'nefes', 3); return { ...e, act: 'card', card: key }; }
  if (key === 'buz_zirh') { a.shield = 2; return ev; }
  if (key === 'yildirim') {
    const e1 = attack(a, t, 'pence');
    if (t.hp > 0) {
      const e2 = attack(a, t, 'pence');
      ev.dmg = (e1.dmg || 0) + (e2.dmg || 0); ev.crit = !!(e1.crit || e2.crit);
      ev.saved = !!(e1.saved || e2.saved); ev.miss = !!(e1.miss && e2.miss);
      ev.hits = [e1, e2].filter(e => !e.miss).length;
    } else Object.assign(ev, e1, { act: 'card', card: key });
    return ev;
  }
  if (key === 'sarsinti') { t.stun = 1; return ev; }
  if (key === 'golge_adim') { a.evade = 2; return ev; }
  if (key === 'son_nefes') { const h = Math.round(a.maxHp * 0.3); a.hp = Math.min(a.maxHp, a.hp + h); ev.heal = h; return ev; }
  if (key === 'kukreyen_yurek') { a.roar = true; t.weak = 2; return ev; }
  if (key === 'celik_pence') { a.forceCrit = true; const e = attack(a, t, 'pence'); a.forceCrit = false; return { ...e, act: 'card', card: key }; }
  if (key === 'kanat_kalkan') { a.immune = true; a.sta = Math.min(100, a.sta + 40); return ev; }
  return ev;
}

function doAct(a, t, act) {
  if (act === 'savun') return { who: a.side, act: 'savun' };
  if (act === 'kukre') {
    a.sta -= 15;
    const c = clamp(55 + (a.ze - t.ze) * 0.4 + (a.cesur ? 15 : 0), 20, 90);
    if (chance(c)) { t.weak = 2; a.fury = 2; return { who: a.side, act: 'kukre', ok: true, c: Math.round(c) }; }
    const why = []; if (t.ze > a.ze) why.push(`${t.name} daha soğukkanlı (zekâ ${t.ze}–${a.ze})`);
    if (t.weak) why.push('zaten sarsılmıştı');
    return { who: a.side, act: 'kukre', ok: false, c: Math.round(c), why };
  }
  if (act === 'nefes' && a.sta < NEFES_COST) { const e = attack(a, t, 'pence'); e.fb = true; return e; }
  return attack(a, t, act);
}

function isLegalAction(f, action) {
  if (action === 'pence' || action === 'savun' || action === 'teslim') return true;
  if (action === 'nefes') return f.sta >= NEFES_COST;
  if (action === 'kukre') return f.sta >= 15;
  if (typeof action === 'string' && action.startsWith('card:')) {
    const key = action.slice(5);
    return CARDS.has(key) && f.cards.includes(key) && !f.used.includes(key);
  }
  return false;
}

// Both players submit one action. The server resolves the round once, in a single canonical state.
function resolveRound(F, pAct, eAct) {
  if (!F || F.over) return [];
  const evs = [];
  if (pAct === 'teslim' || eAct === 'teslim') {
    F.round++;
    if (pAct === 'teslim' && eAct === 'teslim') {
      F.over = true; F.winner = null; F.draw = true;
      evs.push({ who: 'p', act: 'teslim' }, { who: 'e', act: 'teslim' });
    } else {
      F.over = true; F.winner = pAct === 'teslim' ? 'e' : 'p'; F.surrender = true;
      evs.push({ who: pAct === 'teslim' ? 'p' : 'e', act: 'teslim' });
    }
    return evs;
  }
  const acts = { p: pAct, e: eAct };
  F.round++;
  for (const side of ['p', 'e']) {
    if (acts[side] === 'savun') {
      const f = F[side]; f.guard = true; f.sta = Math.min(100, f.sta + 25);
      f.hp = Math.min(f.maxHp, f.hp + Math.round(f.maxHp * 0.04));
    }
  }
  let order = F.p.ce === F.e.ce ? (chance(50) ? ['p', 'e'] : ['e', 'p']) : F.p.ce > F.e.ce ? ['p', 'e'] : ['e', 'p'];
  const cardOf = side => typeof acts[side] === 'string' && acts[side].startsWith('card:') ? acts[side].slice(5) : null;
  for (const side of ['p', 'e']) {
    const key = cardOf(side);
    if (key === 'yildirim' || key === 'kanat_kalkan') order = [side, side === 'p' ? 'e' : 'p'];
  }
  for (const side of ['p', 'e']) if (cardOf(side) === 'kanat_kalkan') F[side].immune = true;
  for (const side of order) {
    const a = F[side], t = F[side === 'p' ? 'e' : 'p'];
    if (a.hp <= 0 || t.hp <= 0) continue;
    if (a.stun > 0) { a.stun--; evs.push({ who: side, act: 'stun', after: snapshot(F) }); continue; }
    const key = cardOf(side);
    const ev = key && a.cards.includes(key) && !a.used.includes(key) ? doCard(F, a, t, key) : doAct(a, t, key ? 'pence' : acts[side]);
    if (acts[side] === 'savun') ev.heal = true;
    ev.after = snapshot(F); evs.push(ev);
    if (t.hp <= 0) { F.over = true; F.winner = side; break; }
  }
  for (const f of [F.p, F.e]) {
    f.guard = false; f.immune = false; f.sta = Math.min(100, f.sta + 10);
    if (f.weak) f.weak--; if (f.fury) f.fury--; if (f.shield) f.shield--;
  }
  if (!F.over && F.round >= 30) {
    F.over = true;
    F.winner = F.p.hp / F.p.maxHp >= F.e.hp / F.e.maxHp ? 'p' : 'e';
    F.timeout = true;
  }
  return evs;
}

module.exports = { createFight, isLegalAction, resolveRound, snapshot };
