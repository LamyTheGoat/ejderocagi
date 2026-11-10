'use strict';
/* ---------- Türkçe ekler: özel isim + kesme işareti + ünlü uyumlu ek ---------- */
const NUM_WORD = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'], TENS_WORD = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
function ek(w, kase) {
  w = String(w);
  let say = w.replace(/<[^>]+>/g, '');
  if (/\d+$/.test(say)) { const n = +say.match(/\d+$/)[0] % 100; say = n % 10 ? NUM_WORD[n % 10] : n ? TENS_WORD[Math.floor(n / 10)] : 'sıfır'; }
  const low = say.toLocaleLowerCase('tr'), vs = low.match(/[aeıioöuü]/g) || ['e'], v = vs[vs.length - 1];
  const endV = /[aeıioöuü]$/.test(low), back = 'aıou'.includes(v);
  const i4 = { a: 'ı', ı: 'ı', o: 'u', u: 'u', e: 'i', i: 'i', ö: 'ü', ü: 'ü' }[v], a2 = back ? 'a' : 'e';
  // "Kül Vadisi", "Bahar Kupası" gibi iyelik ekli tamlamalar n kaynaştırması alır
  const poss = /\s/.test(say) && /(s[ıiuü]|[ıiuü])$/.test(low) && !/\d/.test(say);
  const hard = /[fstkçşhp]$/.test(low);
  let s;
  if (kase === 'gen') s = endV ? 'n' + i4 + 'n' : i4 + 'n';
  else if (kase === 'acc') s = poss ? 'n' + i4 : endV ? 'y' + i4 : i4;
  else if (kase === 'dat') s = poss ? 'n' + a2 : endV ? 'y' + a2 : a2;
  else if (kase === 'loc') s = poss ? 'nd' + a2 : (hard ? 't' : 'd') + a2;
  else if (kase === 'abl') s = poss ? 'nd' + a2 + 'n' : (hard ? 't' : 'd') + a2 + 'n';
  return w + "'" + s;
}

/* ============ EJDER OCAĞI — OYUN MANTIĞI (DOM'suz) ============ */

const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const chance = p => Math.random() * 100 < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sum = a => a.reduce((x, y) => x + y, 0);

const GW = 8, GH = 6;
const idx = (x, y) => y * GW + x;
let S = null;

/* ---------- Genetik ---------- */
function rEl() { return chance(6) ? 'golge' : pick(['ates', 'buz', 'firtina', 'toprak']); }
function gRand(q) { const r = Math.random() + q * 0.35; return r < 0.18 ? 1 : r < 0.48 ? 2 : r < 0.8 ? 3 : r < 1.08 ? 4 : 5; }
function expEl(a) { return EL_DOM.find(e => a.includes(e)); }
function expPat(a) { const c = a.includes('C'), b = a.includes('B'); return c && b ? 'CB' : c ? 'C' : b ? 'B' : 'd'; }
function expEye(a) { return a[0] === 'A' && a[1] === 'A' ? 'A' : 'N'; }
function expEyeC(a) { return EYEC[a[0]].dom >= EYEC[a[1]].dom ? a[0] : a[1]; }
function randEyeC(el) { return chance(68) ? EL_EYE[el] : chance(8) ? 'kizil' : pick(EYEC_KEYS.filter(k => k !== 'kizil')); }
function eyeAlleles(d) { if (!d.genes) return null; if (!d.genes.eyec) { const n = EL_EYE[d.el] || 'kehribar'; d.genes.eyec = [n, n]; } return d.genes.eyec; }
function eyeColor(d) { const a = eyeAlleles(d); return a ? expEyeC(a) : (d.eyecX || EL_EYE[d.el] || 'kehribar'); }
/* --- renk ve görünüş genleri --- */
function randPul() { return chance(76) ? 'n' : pick(['kizil', 'kizil', 'zumrut', 'gok', 'mor', 'gul', 'altin', 'kul']); }
function randSus() { return chance(76) ? 'n' : pick(['altin', 'altin', 'kizil', 'gok', 'zumrut', 'gul', 'mor', 'inci', 'kul']); }
function randPig() { return chance(4) ? 'a' : chance(5) ? 'm' : 'N'; }
function randBoy() { return chance(60) ? 'o' : chance(50) ? 'i' : 'k'; }
function randLook() { return { pul: [randPul(), randPul()], sus: [randSus(), randSus()], pig: [randPig(), randPig()], par: [chance(3) ? 'P' : 'p', 'p'], boy: [randBoy(), randBoy()] }; }
// Eski kayıtlardaki ve rakiplerdeki ejderhalar için genleri tembelce tamamlar
function GL(d, k) {
  const src = d.genes || (d.gx = d.gx || randLook());
  if (!src[k]) { const def = { pul: ['n', 'n'], sus: ['n', 'n'], pig: ['N', 'N'], par: ['p', 'p'], boy: ['o', 'o'] }[k]; src[k] = def; }
  return src[k];
}
function hueMid(a, b) { let d = ((b - a + 540) % 360) - 180; return (a + d / 2 + 360) % 360; }
function expColor(al, DOM, nat) {
  const [x, y] = al, info = k => k === 'n' ? { ...nat, k: 'n', native: true } : { ...RENK[k], k };
  if (x === y) return info(x);
  const dx = DOM[x], dy = DOM[y];
  if (dx !== dy) return info(dx > dy ? x : y);
  const A = RENK[x], B = RENK[y], [p, q] = [A, B].sort((m, n) => m.ad.localeCompare(n.ad, 'tr'));
  return { k: [x, y].sort().join('+'), ad: `${p.ad}-${q.ad.toLocaleLowerCase('tr')}`, h: hueMid(A.h, B.h), s: (A.s + B.s) / 2 * (A.s < .2 || B.s < .2 ? .7 : 1), mix: true };
}
function pulOf(d) { return expColor(GL(d, 'pul'), PUL_DOM, NATIVE[d.el].pul); }
function susOf(d) { return expColor(GL(d, 'sus'), SUS_DOM, NATIVE[d.el].sus); }
function pigOf(d) { const a = GL(d, 'pig'); return a[0] === a[1] && a[0] !== 'N' ? a[0] : (a.includes('a') && a.includes('m')) ? 'am' : 'N'; }
function parOf(d) { return GL(d, 'par').includes('P'); }
function boyOf(d) { return GL(d, 'boy').reduce((t, x) => t + (x === 'i' ? 1 : x === 'k' ? -1 : 0), 0); }
function lookText(d) {
  const p = pulOf(d), s2 = susOf(d), g = pigOf(d), b = boyOf(d);
  return [g !== 'N' ? PIG_AD[g] : null, `${p.ad.toLocaleLowerCase('tr')} pullu`, `${s2.ad.toLocaleLowerCase('tr')} ${SUS_AD[d.el].split(' ')[0] === 'kanat' ? 'zarlı' : 'süslü'}`, b ? BOY_AD[b].toLocaleLowerCase('tr') : null, parOf(d) ? 'parıltılı' : null].filter(Boolean).join(', ');
}
const colCss = (c, l = 50) => `hsl(${Math.round(c.h)} ${Math.round(c.s * 100)}% ${l}%)`;
function rareScore(d) { return (pigOf(d) === 'a' ? 3 : pigOf(d) === 'm' ? 2 : pigOf(d) === 'am' ? 1 : 0) + (parOf(d) ? 2 : 0) + (pulOf(d).mix ? 1 : 0) + (Math.abs(boyOf(d)) === 2 ? 1 : 0); }
function expHorn(a) { return a.includes('t') ? 't' : a.includes('k') ? 'k' : 'd'; }
const PAT_AD = { C: 'Çizgili', B: 'Benekli', CB: 'Çizgili-benekli', d: 'Düz pullu' };
const HORN_AD = { t: 'Taç boynuz', k: 'Kıvrık boynuz', d: 'Düz boynuz' };

function randomGenes(o = {}) {
  const q = o.q ?? 0.2;
  const el1 = o.el || rEl();
  const g = {
    pot: {},
    el: [el1, o.pure ? el1 : (chance(55) ? el1 : rEl())],
    pat: [pick(['C', 'B', 'd', 'd']), pick(['C', 'B', 'd', 'd'])],
    eye: [chance(20) ? 'A' : 'N', chance(20) ? 'A' : 'N'],
    horn: [pick(['d', 'k', 't']), pick(['d', 'k', 't'])],
    eyec: [randEyeC(el1), randEyeC(el1)],
    ...randLook(),
  };
  for (const k of STATS) g.pot[k] = [gRand(q), gRand(q)];
  return g;
}
function capOf(d, k) { return 30 + 14 * (d.genes.pot[k][0] + d.genes.pot[k][1]); }
function potLetter(sumG) { const a = sumG / 2; const base = Math.floor(a); return GRADE[base] + (a > base ? '+' : ''); }
function potSum(d) { return sum(STATS.map(k => d.genes.pot[k][0] + d.genes.pot[k][1])); }

function inheritGenes(A, B) {
  const g = { pot: {}, el: [], pat: [], eye: [], horn: [] }, muts = [];
  for (const k of STATS) {
    let x = pick(A.genes.pot[k]), y = pick(B.genes.pot[k]);
    if (chance(8)) { const nx = clamp(x + (chance(62) ? 1 : -1), 1, 5); if (nx !== x) muts.push(`${ST_AD[k]} geni ${GRADE[x]}/${GRADE[nx]}`); x = nx; }
    g.pot[k] = Math.random() < 0.5 ? [x, y] : [y, x];
  }
  g.el = [pick(A.genes.el), pick(B.genes.el)];
  if (chance(4)) { const i = ri(0, 1), ne = rEl(); if (ne !== g.el[i]) muts.push(`element geni ${EL_AD[g.el[i]]}/${EL_AD[ne]}`); g.el[i] = ne; }
  g.pat = [pick(A.genes.pat), pick(B.genes.pat)];
  g.eye = [pick(A.genes.eye), pick(B.genes.eye)];
  g.horn = [pick(A.genes.horn), pick(B.genes.horn)];
  const ea = [pick(eyeAlleles(A)), pick(eyeAlleles(B))]; g.eyec = chance(50) ? ea : [ea[1], ea[0]];
  if (chance(3)) { const i = ri(0, 1), ne = pick(EYEC_KEYS); if (ne !== g.eyec[i]) muts.push(`göz rengi geni ${EYEC[g.eyec[i]].ad}/${EYEC[ne].ad}`); g.eyec[i] = ne; }
  for (const k of ['pul', 'sus', 'pig', 'par', 'boy']) { const pr = [pick(GL(A, k)), pick(GL(B, k))]; g[k] = chance(50) ? pr : [pr[1], pr[0]]; }
  const alAd = (k, x) => k === 'pul' || k === 'sus' ? (x === 'n' ? 'yerli' : RENK[x].ad) : x;
  if (chance(3)) { const i = ri(0, 1), ne = randPul() === 'n' ? pick(Object.keys(RENK).filter(r => r !== 'inci')) : randPul(); if (ne !== g.pul[i]) muts.push(`pul rengi geni ${alAd('pul', g.pul[i])}/${alAd('pul', ne)}`); g.pul[i] = ne; }
  if (chance(3)) { const i = ri(0, 1), ne = pick(Object.keys(RENK)); if (ne !== g.sus[i]) muts.push(`süs rengi geni ${alAd('sus', g.sus[i])}/${alAd('sus', ne)}`); g.sus[i] = ne; }
  if (chance(1.5)) { const i = ri(0, 1), ne = pick(['a', 'm']); if (ne !== g.pig[i]) muts.push(`pigment geni (${ne === 'a' ? 'ak' : 'kara'} taşıyıcı)`); g.pig[i] = ne; }
  if (chance(1)) { g.par[ri(0, 1)] = 'P'; muts.push('parıltı geni belirdi'); }
  return { genes: g, muts };
}
function inheritTraits(A, B, aff) {
  const out = [];
  for (const P of [A, B]) for (const t of P.traits) {
    if (out.includes(t)) continue;
    const p = t === 'vahsi' ? 20 : 40 + aff / 5;
    if (chance(p)) out.push(t);
  }
  let mut = null;
  if (chance(7)) { const nt = pick(TRAIT_KEYS.filter(t => t !== 'vahsi' && !out.includes(t))); out.push(nt); mut = nt; }
  return { traits: out.slice(0, 3), mut };
}
// Kesin olasılıklar (mutasyon hariç)
function offspringOdds(A, B, aff) {
  const el = {};
  for (const a of A.genes.el) for (const b of B.genes.el) { const e = expEl([a, b]); el[e] = (el[e] || 0) + 25; }
  const fa = x => x.genes.eye.filter(v => v === 'A').length / 2;
  const gold = fa(A) * fa(B) * 100;
  const pot = {};
  for (const k of STATS) {
    const combos = [];
    for (const a of A.genes.pot[k]) for (const b of B.genes.pot[k]) combos.push(a + b);
    pot[k] = { exp: sum(combos) / 4, best: Math.max(...combos), pBest: combos.filter(c => c === Math.max(...combos)).length * 25, worst: Math.min(...combos) };
  }
  const tr = {};
  for (const P of [A, B]) for (const t of P.traits) {
    const p = t === 'vahsi' ? 0.2 : (40 + aff / 5) / 100;
    tr[t] = 1 - (1 - (tr[t] || 0)) * (1 - p);
  }
  for (const t in tr) tr[t] = Math.round(tr[t] * 100);
  const eyec = {};
  for (const a of eyeAlleles(A)) for (const b of eyeAlleles(B)) for (const pr of [[a, b], [b, a]]) { const e = expEyeC(pr); eyec[e] = (eyec[e] || 0) + 12.5; }
  const dist = (k, f) => { const o = {}; for (const a of GL(A, k)) for (const b of GL(B, k)) { const r = f([a, b]); o[r] = (o[r] || 0) + 25; } return o; };
  const ref = { el: expEl(A.genes.el) }; // renk adı için yavrunun olası elementi yerine annenin elementi kullanılır; yerli renk elemente göre değişir
  const pul = dist('pul', al => { const c = expColor(al, PUL_DOM, NATIVE[ref.el].pul); return c.native ? 'n' : c.k; });
  const sus = dist('sus', al => { const c = expColor(al, SUS_DOM, NATIVE[ref.el].sus); return c.native ? 'n' : c.k; });
  const pig = dist('pig', al => al[0] === al[1] && al[0] !== 'N' ? al[0] : al.includes('a') && al.includes('m') ? 'am' : 'N');
  const par = dist('par', al => al.includes('P') ? 'P' : 'p');
  const boy = dist('boy', al => String(al.reduce((t, x) => t + (x === 'i' ? 1 : x === 'k' ? -1 : 0), 0)));
  return { el, gold, pot, tr, eyec, pul, sus, pig, par, boy };
}

/* ---------- Ejderha ---------- */
function usedNames() { return new Set([...S.dragons, ...S.dead].map(d => d.name)); }
function freshName(sex) {
  const u = usedNames(); const pool = (sex === 'F' ? NAMES_F : NAMES_M).filter(n => !u.has(n));
  return pool.length ? pick(pool) : pick(sex === 'F' ? NAMES_F : NAMES_M) + ' ' + ri(2, 9);
}
function randFav(el) { return chance(55) ? EL_FOOD[el] : pick(['balik', 'biber', 'kar', 'mantar', 'yumru', 'zambak']); }

function mkDragon(o) {
  const g = o.genes;
  const d = {
    id: S.nid++, name: o.name || freshName(o.sex), sex: o.sex || pick(['F', 'M']), genes: g,
    el: expEl(g.el), pat: expPat(g.pat), eye: expEye(g.eye), horn: expHorn(g.horn),
    traits: o.traits || [], stage: o.stage || 'yavru', age: o.age || 0, gen: o.gen || 1, parents: o.parents || null,
    st: {}, bond: o.bond ?? 25, mood: o.mood ?? 2, fat: o.fat ?? 0, inj: 0,
    pers: o.pers || { ces: ri(-12, 12), sic: ri(-12, 12), dis: ri(-12, 12) },
    fav: null, favKnown: false, w: 0, l: 0,
    equip: { bas: null, govde: null, pence: null, tilsim: null },
    task: null, talked: false, fed: false, style: 'yumusak', seenTalk: [], origin: o.origin || '', born: S.week, hue: ri(-9, 9),
  };
  d.fav = o.fav || randFav(d.el);
  if (o.st) d.st = { ...o.st };
  else {
    const sm = { yavru: 0.7, genc: 0.85, yetiskin: 1 }[d.stage];
    for (const k of STATS) d.st[k] = Math.round(Math.min(capOf(d, k), (10 + (g.pot[k][0] + g.pot[k][1]) * 3 + ri(0, 6) + (o.extra || 0)) * sm));
  }
  d.pids = o.pids || null; linReg(d);
  return d;
}
const alive = () => S.dragons;
const byId = id => S.dragons.find(d => d.id === +id);
const hasTrait = (d, t) => d.traits.includes(t);
function markOf(d, ax) { const v = d.pers[ax]; return v >= MARK_T ? AXES[ax].p : v <= -MARK_T ? AXES[ax].n : null; }
function hasMark(d, name) { return ['ces', 'sic', 'dis'].some(ax => markOf(d, ax) === name); }
function marks(d) { return ['ces', 'sic', 'dis'].map(ax => markOf(d, ax)).filter(Boolean); }
function nudge(d, ax, v) {
  if (d.stage === 'yavru') v *= 1.5;
  const before = markOf(d, ax);
  d.pers[ax] = clamp(Math.round(d.pers[ax] + v), -100, 100);
  const after = markOf(d, ax);
  if (after && after !== before) return `${d.name} artık <b>${after}</b>.`;
  if (before && !after) return `${d.name} ${before.toLowerCase()} izini yitirdi.`;
  return null;
}
function addBond(d, v) {
  if (v > 0) { if (hasMark(d, 'Sıcak')) v *= 1.5; if (hasTrait(d, 'vahsi')) v *= 0.7; }
  const was = d.bond;
  d.bond = clamp(Math.round(d.bond + v), 0, 100);
  if (typeof bondCheck === 'function') bondCheck(d, was);
  if (was < 60 && d.bond >= 60 && !d.dead) {
    const m = learnCard(d, EL_CARD[d.el], 'bağınız derinleşti');
    if (m && typeof toast === 'function') setTimeout(() => toast(m), 400);
  }
}
function normMood(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return clamp(Math.round(v), 0, 4);
  if (typeof v === 'string') {
    const s = v.toLowerCase();
    if (s === 'neseli' || s === 'neşeli' || s === 'harika') return 4;
    if (s === 'iyi') return 3;
    if (s === 'normal') return 2;
    if (s === 'kotu' || s === 'kötü') return 1;
    if (s === 'berbat') return 0;
    const n = Number(v);
    if (Number.isFinite(n)) return clamp(Math.round(n), 0, 4);
  }
  return 2;
}
function addMood(d, v, fromEvent) {
  if (!d) return;
  d.mood = normMood(d.mood);
  if (v < 0 && fromEvent && hasMark(d, 'Mesafeli')) return;
  d.mood = clamp(d.mood + (Number(v) || 0), 0, 4);
}
function value(d) {
  if (!d) return 100;
  let v = 30 + (potSum(d) || 12) * 8 + sum(STATS.map(k => Number.isFinite(+d.st?.[k]) ? +d.st[k] : 25)) * 0.7 + (d.traits || []).filter(t => t !== 'vahsi').length * 30;
  if (hasTrait(d, 'asil')) v *= 1.5;
  if (d.old) v *= 0.6;
  v *= Math.min(1.6, 1 + (rareScore(d) || 0) * 0.1);
  v *= ({ yavru: 0.6, genc: 0.85, yetiskin: 1 }[d.stage] || 1);
  if (d.el === 'golge') v *= 1.3;
  return Math.round(Number.isFinite(v) ? v : 100);
}
function stageFor(d) {
  if (d && d.eternalYouth) return 'yavru';
  const f = hasTrait(d, 'hizli') ? 0.5 : 1;
  return d.age < 2 * f ? 'yavru' : d.age < 4 * f ? 'genc' : 'yetiskin';
}
function hasKizilTacChamp() {
  if (typeof S === 'undefined' || !S) return false;
  if (S.flags && (S.flags.champ || S.flags.kizilTac)) return true;
  if (S.st && S.st.kupa > 0) return true;
  if (S.dragons && S.dragons.some(d => d.champ === 'tac' || (d.tourW && d.tourW.tac >= 3))) return true;
  if (S.dead && S.dead.some(d => d.champ === 'tac' || (d.tourW && d.tourW.tac >= 3))) return true;
  return false;
}
function getEternalBabyDragon() {
  if (typeof S === 'undefined' || !S || !S.dragons) return null;
  return S.dragons.find(d => d.stage === 'yavru' && d.eternalYouth) || null;
}
function canEnterZindanOrTopcu() {
  return !!getEternalBabyDragon(); // Kızıl Taç şampiyonluğu şartı kaldırıldı (kullanıcı kararı, 2026-11-10)
}

/* ---------- Ocak / ızgara ---------- */
const hasB = k => S.grid.some(t => t.b === k);
const countB = k => S.grid.filter(t => t.b === k).length;
function capacity() { return countB('in') * 2; }
function freeSlots() { return capacity() - S.dragons.length; }
function neighbors(i) {
  const x = i % GW, y = Math.floor(i / GW), out = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue; const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < GW && ny < GH) out.push(idx(nx, ny));
  }
  return out;
}
function housing() {
  const ins = S.grid.map((t, i) => t.b === 'in' ? i : -1).filter(i => i >= 0);
  const map = {}; S.dragons.forEach((d, n) => { map[d.id] = ins[Math.floor(n / 2)]; });
  return map;
}
function comfortOf(d, house) {
  const h = (house || housing())[d.id]; if (h == null) return 0;
  let c = 0;
  for (const n of neighbors(h)) {
    const b = S.grid[n].b; if (!b) continue; const B = BUILD[b];
    if (B.decor) c += B.decor + (B.el && B.el === d.el ? 2 : 0);
    if (B.comfort) c += B.comfort;
  }
  return c;
}
function comfortWord(c) { return c >= 5 ? 'Saray gibi' : c >= 3 ? 'Rahat' : c >= 1 ? 'İdare eder' : 'Çıplak taş'; }
function clearCost() { return 40 + 14 * S.cleared; }
function canClear(i) {
  if (S.grid[i].open) return false;
  return neighbors(i).some(n => S.grid[n].open && (Math.abs((n % GW) - (i % GW)) + Math.abs(Math.floor(n / GW) - Math.floor(i / GW)) === 1));
}

/* ---------- Antrenman ---------- */
const SPEC = { gu: 'agirlik', ce: 'parkur', da: 'kaynak', ze: 'magara' };
const SECOND = { gu: 'da', ce: 'ze', da: 'gu', ze: 'ce' };
function trainCalc(d, k) {
  d.mood = normMood(d.mood);
  let m = MOOD_MULT[d.mood] ?? 1;
  if (hasB('talim')) m *= 1.25;
  if (hasB(SPEC[k])) m *= 1.4;
  const stObj = STYLES[d.style] || STYLES.yumusak;
  m *= stObj.mult;
  if (hasMark(d, 'Disiplinli')) m *= 1.15;
  if (d.stage === 'yavru') m *= 0.8;
  m *= seasonMult(d.el);
  const curK = Number.isFinite(+d.st[k]) ? +d.st[k] : 25;
  d.st[k] = curK;
  const cap = capOf(d, k), room = Math.max(0, cap - curK);
  const gain = Math.min(room, Math.round(12 * m));
  const sk = SECOND[k];
  const curSk = Number.isFinite(+d.st[sk]) ? +d.st[sk] : 25;
  d.st[sk] = curSk;
  const sec = Math.min(Math.max(0, capOf(d, sk) - curSk), Math.round(gain * 0.3));
  let fat = stObj.fat; if (hasTrait(d, 'sabirli')) fat *= 0.7; fat = Math.round(fat);
  const curFat = Number.isFinite(+d.fat) ? +d.fat : 0;
  d.fat = curFat;
  let fail = clamp((curFat - 35) * 1.4, 0, 90); if (hasMark(d, 'Temkinli')) fail *= 0.5;
  return { gain, sec, sk, fat, fail: Math.round(fail), capped: room === 0 };
}

/* ---------- Yakınlık ---------- */
const affKey = (a, b) => a < b ? `${a}|${b}` : `${b}|${a}`;
const getAff = (a, b) => S.aff[affKey(a, b)] || 0;
function addAff(a, b, v) { const k = affKey(a, b); S.aff[k] = clamp(Math.round((S.aff[k] || 0) + v), 0, 100); }
function compat(A, B) {
  let c = 0;
  if (A.pers.sic > 0 && B.pers.sic > 0) c += 4;
  if (Math.sign(A.pers.ces) !== Math.sign(B.pers.ces)) c += 3;
  if (A.el === B.el) c += 2;
  return c;
}
function breedChecks(A, B) {
  const aff = getAff(A.id, B.id);
  return [
    ['Yuva Bahçesi kurulu', hasB('yuva')],
    ['Biri dişi, biri erkek', A.sex !== B.sex],
    ['İkisi de yetişkin', A.stage === 'yetiskin' && B.stage === 'yetiskin'],
    ['Yakınlık en az 60', aff >= 60],
    ['İkisinin morali en az İyi', A.mood >= 3 && B.mood >= 3],
    ['İkisi de sağlıklı', !A.inj && !B.inj],
  ];
}
function breedChance(A, B) {
  const aff = getAff(A.id, B.id);
  let c = 55 + (aff - 60) * 1.1;
  if (A.mood === 4 && B.mood === 4) c += 10;
  return Math.round(clamp(c, 40, 95));
}

/* ---------- Pazar / Demirci / Arena üretimi ---------- */
function marketDragon(minQ) {
  const q = Math.min(0.6, (minQ || 0.08) + S.week * 0.022);
  const stage = chance(70) ? 'yetiskin' : 'genc';
  const g = randomGenes({ q });
  const traits = []; if (chance(35)) traits.push(pick(TRAIT_KEYS.filter(t => t !== 'vahsi')));
  const d = mkDragon({ genes: g, stage, age: stage === 'yetiskin' ? 4 : 2, traits, bond: ri(15, 30), extra: S.week * 1.8 + (typeof seasonBonus === 'function' ? seasonBonus() * .6 : 0), origin: 'Pazardan alındı' });
  S.nid--; d.id = 'm' + S.uid++; // pazarda geçici kimlik
  d.price = Math.round(value(d) * rnd(1.05, 1.25));
  return d;
}
function marketEgg() {
  const g = randomGenes({ q: Math.min(0.4, 0.05 + S.week * 0.015) });
  return { id: 'e' + S.uid++, genes: g, sex: pick(['F', 'M']), traits: chance(25) ? [pick(TRAIT_KEYS.filter(t => t !== 'vahsi'))] : [], w: 0, inK: false, gen: 1, parents: null, origin: 'Pazardan yumurta', price: ri(80, 110) + S.week * 3 };
}
function refreshMarket() {
  S.market = { dragons: [marketDragon(), marketDragon()], egg: marketEgg() };
  if (S.week >= 8) S.market.dragons.push(marketDragon(0.25));
}
function smithTier() { return 1 + (S.un >= 20 ? 1 : 0) + (S.un >= 50 ? 1 : 0); }
function refreshSmith() {
  if (!S.flags.smith) { S.smith = []; return; }
  const t = smithTier();
  const pool = Object.keys(ITEMS).filter(k => ITEMS[k].tier <= t);
  S.smith = shuffle(pool).slice(0, 5);
}
function genOpp(tier, L, gear) {
  const T = TIERS[tier] || { gear: 0 };
  if (L == null) L = (T.base + S.week * T.grow + (typeof seasonBonus === 'function' ? seasonBonus() : 0)) * rnd(0.8, 1.08);
  const a = pick(Object.keys(ARCH));
  const st = {}; for (const k of STATS) st[k] = Math.round(L * ARCH[a][k] * rnd(0.92, 1.08));
  const el = rEl();
  const g = gear ?? T.gear;
  const opp = {
    id: 'o' + S.uid++, name: pick(OPP_NAMES), trainer: tier === 'cukur' ? pick(CUKUR_TRAINERS) : pick(TRAINERS),
    el, pat: pick(['C', 'B', 'd', 'CB']), eye: chance(10) ? 'A' : 'N', eyecX: randEyeC(el), horn: pick(['d', 'k', 't']), stage: tier === 'yavru' ? pick(['yavru', 'genc']) : 'yetiskin',
    st, arch: ARCH[a].ad, gear: { atk: Math.round(g + S.week * 0.6), def: Math.round(g * 1.2 + S.week * 0.7), hp: Math.round(g * 1.5) }, mood: 2, hue: ri(-9, 9),
    traits: chance(25) ? [pick(['demir', 'kor', 'kartal'])] : [], gx: randLook(),
    cards: L > 70 && chance(Math.min(80, (L - 70) * 1.5)) ? [EL_CARD[el]] : L > 45 && chance(25) ? [pick(['son_nefes', 'celik_pence', 'kanat_kalkan'])] : [],
  };
  if (T.odul) opp.odul = ri(T.odul[0], T.odul[1]) + Math.round(S.week * (tier === 'cukur' ? 8 : tier === 'sehir' ? 5 : 2));
  return opp;
}
function refreshArena() {
  S.arena = {};
  for (const t of Object.keys(TIERS)) S.arena[t] = [genOpp(t), genOpp(t), genOpp(t)].sort((a, b) => oppPower(a) - oppPower(b));
}
function oppPower(o) { return sum(STATS.map(k => o.st[k])) + o.gear.atk * 2 + o.gear.def; }

/* ---------- Ekipman ---------- */
function itemOf(uid) { const inst = S.inv.find(i => i.uid === uid); return inst ? ITEMS[inst.id] : null; }
function equipStats(d) {
  const e = { atk: 0, def: 0, hp: 0, ce: 0, crit: 0, dodge: 0, nefes: 0, gold: 0, anka: 0 };
  for (const s in d.equip) { const it = d.equip[s] != null ? itemOf(d.equip[s]) : null; if (!it) continue; for (const k in e) e[k] += it[k] || 0; }
  return e;
}
function equippedBy(uid) { return S.dragons.find(d => Object.values(d.equip).includes(uid)); }

/* ---------- Dövüş motoru ---------- */
function fighterFromDragon(d) {
  const eq = equipStats(d);
  const f = {
    side: 'p', ref: d, name: d.name, el: d.el,
    gu: d.st.gu, ce: d.st.ce + eq.ce, da: d.st.da, ze: d.st.ze,
    atk: eq.atk, def: eq.def, crit: eq.crit + (d.eye === 'A' ? 6 : 0), dodge: eq.dodge + (hasTrait(d, 'kartal') ? 8 : 0),
    nefesB: eq.nefes + (hasTrait(d, 'kor') ? 20 : 0), maxHp: 50 + d.st.da * 2 + eq.hp, mood: d.mood,
    cesur: hasMark(d, 'Cesur'), temkinli: hasMark(d, 'Temkinli'), demir: hasTrait(d, 'demir'), vahsi: hasTrait(d, 'vahsi'),
    bond: d.bond, bondUsed: false, heart: !!d.heart, saves: 0, tired: d.fat >= 60, cards: [...(d.cards || [])], used: [],
  };
  lookFx(f, d);
  if (d.stage !== 'yetiskin') { const m = d.stage === 'yavru' ? 0.75 : 0.9; f.maxHp = Math.round(f.maxHp * m); }
  return f;
}
function lookFx(f, d) {
  const b = boyOf(d), g = pigOf(d);
  f.maxHp = Math.round(f.maxHp * (1 + 0.05 * b)); f.dodge += -2 * b;
  if (g === 'a') f.dodge += 4; if (g === 'm') f.crit += 4;
}
function fighterFromOpp(o) {
  const f = fighterFromOpp0(o); lookFx(f, o); return f;
}
function fighterFromOpp0(o) {
  let cards = [...(o.cards || [])];
  if (!cards.length && (o.boss || o.nem || o.tower || o.pit || o.trainer === 'Demirhan' || o.trainer === 'Kül Yutan' || /Karabela|Kül Yutan|Kalgarot|Şahmeran/i.test(o.name || ''))) {
    const elCard = EL_CARD[o.el || 'ates'] || 'alev_yagmuru';
    cards = [elCard, 'kukreyen_yurek', 'celik_pence'];
  }
  return {
    side: 'e', ref: o, name: o.name, el: o.el, gu: o.st.gu, ce: o.st.ce, da: o.st.da, ze: o.st.ze,
    atk: o.gear.atk, def: o.gear.def, crit: o.eye === 'A' ? 6 : 0, dodge: o.traits.includes('kartal') ? 8 : 0,
    nefesB: o.traits.includes('kor') ? 20 : 0, maxHp: 50 + o.st.da * 2 + o.gear.hp, mood: o.mood ?? 2,
    cesur: false, temkinli: false, demir: o.traits.includes('demir'), vahsi: false, bond: 0, bondUsed: true, cards,
  };
}
function newFight(pf, ef, meta) {
  pf.hp = pf.maxHp; ef.hp = ef.maxHp;
  for (const f of [pf, ef]) { f.sta = 60; f.weak = 0; f.fury = 0; f.guard = false; f.stun = 0; f.shield = 0; f.evade = 0; f.immune = false; f.roar = false; f.used = []; f.cards = f.cards || []; }
  return { p: pf, e: ef, round: 0, over: false, winner: null, meta: meta || {} };
}
const NEFES_COST = 40;
/* ---------- Yetenek kartları ----------
   Her ejderha en çok 3 kart bilir; her kart dövüş başına bir kez oynanır.
   Antrenmanda eşik geçişleri ve bağ 60 ile öğrenilir. */
const CARD_MAX = 3;
const CARDS = {
  alev_yagmuru: { k: 'nefes ×3, bedava', ad: 'Alev Yağmuru', el: 'ates', d: 'Nefesi üç katı güçle savurur; nefes harcamaz.' },
  buz_zirh: { k: '2 tur hasar −%60', ad: 'Buz Zırh', el: 'buz', d: 'İki tur boyunca aldığı hasar %60 azalır.' },
  yildirim: { k: 'önce vurur, 2 darbe', ad: 'Yıldırım Çevikliği', el: 'firtina', d: 'Önce davranır ve iki pençe birden indirir.' },
  sarsinti: { k: 'rakip 1 tur sersem', ad: 'Yer Sarsıntısı', el: 'toprak', d: 'Rakip bir tur sersemler, hamle yapamaz.' },
  golge_adim: { k: '2 saldırıdan sıyrılır', ad: 'Gölge Adımı', el: 'golge', d: 'Sonraki iki saldırıdan sıyrılır.' },
  son_nefes: { k: 'canın %30\'u', ad: 'Son Nefes', d: 'Canının %30\'unu geri kazanır.' },
  kukreyen_yurek: { k: 'hasar +%20, rakip sarsılır', ad: 'Kükreyen Yürek', d: 'Dövüşün sonuna dek hasarı %20 artar; rakip iki tur sarsılır.' },
  celik_pence: { k: 'kesin kritik pençe', ad: 'Çelik Pençe', d: 'Mutlaka kritik vuran bir pençe.' },
  kanat_kalkan: { k: 'bu tur dokunulmaz', ad: 'Kanat Kalkanı', d: 'Bu tur hiçbir hasar almaz, nefes +40.' },
};
const EL_CARD = { ates: 'alev_yagmuru', buz: 'buz_zirh', firtina: 'yildirim', toprak: 'sarsinti', golge: 'golge_adim' };
const TRAIN_CARDS = { gu: ['celik_pence', 'kukreyen_yurek'], da: ['son_nefes', 'kanat_kalkan'], ce: ['kanat_kalkan', 'celik_pence'], ze: [null, 'son_nefes'] };
function learnCard(d, k, why) {
  d.cards = d.cards || [];
  if (!k || !CARDS[k] || d.cards.includes(k) || d.cards.length >= CARD_MAX) return null;
  d.cards.push(k); S.st.cards = (S.st.cards || 0) + 1;
  return `<b>${esc(d.name)}</b> yeni bir yetenek öğrendi: <b class="good">${CARDS[k].ad}</b>${why ? ` (${why})` : ''}.`;
}
function trainCardRoll(d, k, before) {
  const after = d.st[k], th = [60, 90, 120].find(t => before < t && after >= t);
  if (!th || !chance(50)) return null;
  const pool = TRAIN_CARDS[k].map(c => c || EL_CARD[d.el]).filter(c => !(d.cards || []).includes(c));
  return pool.length ? learnCard(d, pick(pool), `${ST_AD[k].toLowerCase()} ${th}'ı aştı`) : null;
}
function doCard(F, a, t, k) {
  a.used = a.used || []; a.used.push(k);
  const ev = { who: a.side, act: 'card', card: k };
  if (k === 'alev_yagmuru') { a.sta += NEFES_COST; const e = attack(a, t, 'nefes', 3); return { ...e, act: 'card', card: k }; }
  if (k === 'buz_zirh') { a.shield = 2; return ev; }
  if (k === 'yildirim') { const e1 = attack(a, t, 'pence'); if (t.hp > 0) { const e2 = attack(a, t, 'pence'); ev.dmg = (e1.dmg || 0) + (e2.dmg || 0); ev.crit = e1.crit || e2.crit; ev.saved = e1.saved || e2.saved; ev.miss = e1.miss && e2.miss; ev.hits = [e1, e2].filter(e => !e.miss).length; } else Object.assign(ev, e1, { act: 'card', card: k }); return ev; }
  if (k === 'sarsinti') { t.stun = 1; return ev; }
  if (k === 'golge_adim') { a.evade = 2; return ev; }
  if (k === 'son_nefes') { const h = Math.round(a.maxHp * 0.3); a.hp = Math.min(a.maxHp, a.hp + h); ev.heal = h; return ev; }
  if (k === 'kukreyen_yurek') { a.roar = true; t.weak = 2; return ev; }
  if (k === 'celik_pence') { a.forceCrit = true; const e = attack(a, t, 'pence'); a.forceCrit = false; return { ...e, act: 'card', card: k }; }
  if (k === 'kanat_kalkan') { a.immune = true; a.sta = Math.min(100, a.sta + 40); return ev; }
  return ev;
}
/* ---------- Utility AI: Tepki Eğrileri ve Karar Motoru ---------- */
const U_CURVE = {
  clamp01: x => clamp(x, 0, 1),
  invLerp01: (x, a, b) => a === b ? (x >= b ? 1 : 0) : clamp((x - a) / (b - a), 0, 1),
  linear: (t, m = 1, b = 0) => clamp(m * t + b, 0, 1),
  quad: t => { const c = clamp(t, 0, 1); return c * c; },
  invQuad: t => { const c = 1 - clamp(t, 0, 1); return clamp(1 - c * c, 0, 1); },
  sigmoid: (t, k = 8, mid = 0.5) => clamp(1 / (1 + Math.exp(-k * (clamp(t, 0, 1) - mid))), 0, 1),
  smoothstep: t => { const c = clamp(t, 0, 1); return c * c * (3 - 2 * c); },
  compensate: (prod, count) => {
    const p = clamp(prod, 0, 1);
    if (count <= 1) return p;
    const mod = 1 - 1 / count;
    return clamp(p + (1 - p) * mod * p, 0, 1);
  },
};

function estAttackDmg(a, t, kind, mult = 1, forceCrit = false) {
  if (t.immune) return 0;
  let dmg;
  if (kind === 'nefes') {
    dmg = (10 + ((a.gu || 20) + (a.ze || 20)) * 0.32) * elMult(a.el, t.el) * (1 + (a.nefesB || 0) / 100);
    dmg *= 100 / (100 + (t.def || 0) * 0.6 + (t.da || 20) * 0.2);
  } else {
    dmg = (6 + (a.gu || 20) * 0.5 + (a.atk || 0));
    dmg *= 100 / (100 + (t.def || 0) * 1.2 + (t.da || 20) * 0.35);
  }
  dmg *= mult * (MOOD_DMG[a.mood ?? 2] || 1);
  if (a.cesur) dmg *= 1.12;
  if (a.vahsi) dmg *= 1.1;
  if (a.weak) dmg *= 0.8;
  if (a.tired) dmg *= 0.9;
  if (typeof seasonMult === 'function') dmg *= seasonMult(a.el);
  if (a.roar) dmg *= 1.2;
  if (forceCrit) dmg *= 1.6;
  if (t.guard) dmg *= 0.45;
  if (t.demir) dmg *= 0.85;
  if (t.temkinli) dmg *= 0.9;
  if (t.shield > 0) dmg *= 0.4;
  return Math.max(1, Math.round(dmg));
}

function aiPersonalityBias(me) {
  const arch = String(me.ref?.arch || '').toLocaleLowerCase('tr');
  const tr = String(me.ref?.trainer || me.ref?.name || '').toLocaleLowerCase('tr');
  const b = { pence: 0, nefes: 0, kukre: 0, savun: 0, offCard: 0, defCard: 0, spdCard: 0 };
  if (arch.includes('kaba') || arch.includes('canavar')) { b.pence += 0.08; b.offCard += 0.09; b.kukre += 0.05; b.savun -= 0.05; }
  else if (arch.includes('çevik') || arch.includes('cevik')) { b.spdCard += 0.1; b.pence += 0.06; b.defCard += 0.04; }
  else if (arch.includes('kale') || arch.includes('kemer')) { b.savun += 0.09; b.defCard += 0.1; b.nefes += 0.04; }
  else if (arch.includes('bilge')) { b.nefes += 0.09; b.kukre += 0.07; b.offCard += 0.06; }
  if (tr.includes('demirhan') || tr.includes('rüstem') || tr.includes('kasap') || tr.includes('kemikkıran')) {
    b.nefes += 0.08; b.pence += 0.06; b.offCard += 0.12; b.savun -= 0.08;
  } else if (tr.includes('leyla') || tr.includes('tilki') || tr.includes('sedef') || tr.includes('ikizler')) {
    b.spdCard += 0.12; b.defCard += 0.06; b.pence += 0.05;
  } else if (tr.includes('kuzey') || tr.includes('halil') || tr.includes('rıza') || tr.includes('taşyürek')) {
    b.nefes += 0.08; b.defCard += 0.11; b.savun += 0.07;
  }
  if (me.cesur || me.vahsi) { b.pence += 0.04; b.nefes += 0.04; b.savun -= 0.04; }
  if (me.temkinli || me.demir) { b.savun += 0.05; b.defCard += 0.05; }
  return b;
}

function scoreCombatActions(me, foe, noiseAmp = 0.06) {
  const myHp01 = U_CURVE.clamp01((me.hp ?? me.maxHp) / Math.max(1, me.maxHp));
  const foeHp01 = U_CURVE.clamp01((foe.hp ?? foe.maxHp) / Math.max(1, foe.maxHp));
  const sta = me.sta ?? 60;
  const sta01 = U_CURVE.clamp01(sta / 100);
  const adv = elMult(me.el, foe.el);
  const bias = aiPersonalityBias(me);
  const blockedSingle = !!(foe.cover || (foe.evade || 0) > 0 || foe.immune);

  // 1) Survival / Low-HP Considerations (logistic sigmoid + quadratic urgency when HP < 0.45)
  const lowHpSigmoid = 1 - U_CURVE.sigmoid(myHp01, 11, 0.43);
  const lowHpQuad = U_CURVE.quad(U_CURVE.invLerp01(myHp01, 0.5, 0.12));
  const staDeficitQuad = U_CURVE.quad(U_CURVE.invLerp01(sta, NEFES_COST, 0));

  // 2) Elemental & Buff Synergy Considerations
  const elSynergy = adv > 1.25 ? 0.24 : adv > 1 ? 0.14 : adv < 1 ? -0.18 : 0;
  const buffSynergy = (me.fury > 0 ? 0.12 : 0) + (me.roar ? 0.08 : 0) + (foe.weak > 0 ? 0.1 : 0);

  // Expected damage estimates
  const penceDmg = blockedSingle ? 0 : estAttackDmg(me, foe, 'pence', 1, false);
  const nefesDmg = blockedSingle ? 0 : estAttackDmg(me, foe, 'nefes', 1, false);
  const foeHp = Math.max(1, foe.hp ?? foe.maxHp);

  const scores = {};
  const jitter = () => noiseAmp > 0 ? rnd(-noiseAmp, noiseAmp) : 0;

  // Score: pence
  const penceFinisher = penceDmg * 0.9 >= foeHp ? 0.68 : U_CURVE.quad(U_CURVE.invLerp01(penceDmg / foeHp, 0.25, 1.0)) * 0.28;
  const penceBase = U_CURVE.linear(penceDmg / Math.max(1, foe.maxHp), 1.5, 0.34);
  scores.pence = U_CURVE.clamp01(penceBase + (adv < 1 ? 0.08 : 0) + (sta < NEFES_COST ? 0.06 : 0) + bias.pence) + penceFinisher + jitter();

  // Score: nefes
  if (sta >= NEFES_COST) {
    const nefesFinisher = nefesDmg * 0.9 >= foeHp ? 0.74 : U_CURVE.quad(U_CURVE.invLerp01(nefesDmg / foeHp, 0.25, 1.0)) * 0.32;
    const nefesBase = U_CURVE.linear(nefesDmg / Math.max(1, foe.maxHp), 1.65, 0.32);
    const staComfort = U_CURVE.linear(sta01, 0.12, 0);
    scores.nefes = U_CURVE.clamp01(nefesBase + elSynergy + buffSynergy + staComfort + bias.nefes) + nefesFinisher + jitter();
  } else {
    scores.nefes = -1;
  }

  // Score: kukre (penalize heavily if foe.weak > 0 or me.fury > 0 already)
  if (sta >= 15) {
    if (foe.weak > 0 || me.fury > 0) {
      scores.kukre = 0.03 + jitter() * 0.25;
    } else {
      const fightLen = U_CURVE.sigmoid(foeHp01, 7, 0.45);
      const zeAdv = U_CURVE.linear(U_CURVE.invLerp01((me.ze || 20) - (foe.ze || 20), -25, 25), 0.35, 0.24);
      const roarScore = U_CURVE.compensate(fightLen * zeAdv, 2) + (me.cesur ? 0.09 : 0) + bias.kukre;
      scores.kukre = U_CURVE.clamp01(roarScore * 0.72) + jitter();
    }
  } else {
    scores.kukre = -1;
  }

  // Score: savun (boost when HP < 0.45 and especially when sta < NEFES_COST)
  if (foe.stun > 0) {
    scores.savun = 0.05;
  } else {
    const survNeed = U_CURVE.clamp01(lowHpSigmoid * 0.55 + lowHpQuad * 0.35);
    const staRecoverNeed = sta < NEFES_COST ? (0.18 + 0.24 * staDeficitQuad) : (sta < 22 ? 0.22 : 0.02);
    const foeBurstThreat = (foe.fury > 0 || foe.roar) ? 0.12 : 0;
    scores.savun = U_CURVE.clamp01(0.12 + survNeed * 0.65 + staRecoverNeed + foeBurstThreat + bias.savun) + jitter();
  }

  // Score: Available Cards
  const availCards = (me.cards || []).filter(c => CARDS[c] && !(me.used || []).includes(c));
  for (const k of availCards) {
    let cs = 0.2;
    if (k === 'alev_yagmuru') {
      const dmg3 = blockedSingle ? 0 : estAttackDmg(me, foe, 'nefes', 3, false);
      const fin = dmg3 * 0.88 >= foeHp ? 0.82 : U_CURVE.quad(U_CURVE.invLerp01(dmg3 / foeHp, 0.25, 1.0)) * 0.38;
      const syn = (adv > 1 ? 0.22 : 0) + buffSynergy + (sta < NEFES_COST ? 0.15 : 0.05);
      cs = U_CURVE.clamp01(0.48 + syn + bias.offCard + bias.nefes) + fin;
    } else if (k === 'celik_pence') {
      const cdmg = blockedSingle ? 0 : estAttackDmg(me, foe, 'pence', 1, true);
      const fin = cdmg * 0.92 >= foeHp ? 0.8 : U_CURVE.quad(U_CURVE.invLerp01(cdmg / foeHp, 0.2, 1.0)) * 0.34;
      const antiDodge = (foe.dodge >= 8 || (foe.ce || 20) > (me.ce || 20) + 6) ? 0.16 : 0.06;
      cs = U_CURVE.clamp01(0.46 + antiDodge + buffSynergy * 0.6 + bias.offCard + bias.spdCard * 0.5) + fin;
    } else if (k === 'yildirim') {
      const hits = (foe.cover || (foe.evade || 0) === 1) ? 1 : (foe.evade || 0) >= 2 || foe.immune ? 0 : 2;
      const ydmg = hits * estAttackDmg(me, foe, 'pence', 1, false);
      const fin = ydmg * 0.9 >= foeHp ? 0.82 : U_CURVE.quad(U_CURVE.invLerp01(ydmg / foeHp, 0.2, 1.0)) * 0.35;
      const prioNeed = (myHp01 < 0.45 || (foe.ce || 20) >= (me.ce || 20)) ? 0.16 : 0.06;
      cs = U_CURVE.clamp01(0.47 + prioNeed + bias.spdCard + bias.offCard * 0.5) + fin;
    } else if (k === 'son_nefes') {
      if (myHp01 > 0.68) cs = 0.04;
      else {
        const missing01 = U_CURVE.clamp01(1 - myHp01);
        const healUrgency = U_CURVE.clamp01(lowHpSigmoid * 0.68 + U_CURVE.quad(missing01) * 0.42);
        cs = U_CURVE.clamp01(0.24 + healUrgency * 0.72 + bias.defCard);
      }
    } else if (k === 'kanat_kalkan') {
      const shieldUrgency = U_CURVE.clamp01(lowHpSigmoid * 0.58 + staDeficitQuad * 0.45 + ((foe.fury > 0 || foe.roar) ? 0.18 : 0));
      cs = foe.stun > 0 ? 0.08 : U_CURVE.clamp01(0.28 + shieldUrgency * 0.66 + bias.defCard + bias.spdCard * 0.4);
    } else if (k === 'buz_zirh') {
      if ((me.shield || 0) > 0 || foeHp01 < 0.2) cs = 0.06;
      else {
        const survCurve = U_CURVE.sigmoid(1 - myHp01, 7, 0.4);
        cs = U_CURVE.clamp01(0.34 + survCurve * 0.48 + lowHpSigmoid * 0.22 + bias.defCard);
      }
    } else if (k === 'golge_adim') {
      if ((me.evade || 0) > 0 || foe.stun > 0) cs = 0.06;
      else {
        const evadeCurve = U_CURVE.sigmoid(1 - myHp01, 7, 0.38);
        cs = U_CURVE.clamp01(0.35 + evadeCurve * 0.46 + lowHpSigmoid * 0.2 + bias.spdCard + bias.defCard * 0.5);
      }
    } else if (k === 'sarsinti') {
      if ((foe.stun || 0) > 0 || foeHp01 < 0.18) cs = 0.08;
      else cs = U_CURVE.clamp01(0.44 + U_CURVE.sigmoid(foeHp01, 6, 0.35) * 0.28 + (myHp01 < 0.45 ? 0.12 : 0) + bias.defCard * 0.5);
    } else if (k === 'kukreyen_yurek') {
      if (me.roar || foeHp01 < 0.35) cs = 0.1;
      else cs = U_CURVE.clamp01(0.46 + U_CURVE.sigmoid(foeHp01, 8, 0.5) * 0.32 + bias.offCard);
    }
    scores['card:' + k] = cs + jitter();
  }
  return scores;
}

function aiCard(me, foe) {
  const avail = (me.cards || []).filter(c => CARDS[c] && !(me.used || []).includes(c));
  if (!avail.length) return null;
  const scores = scoreCombatActions(me, foe, 0.04);
  const bestBase = Math.max(scores.pence ?? 0, scores.nefes ?? -1, scores.kukre ?? -1, scores.savun ?? 0);
  let bestCard = null, bestCardScore = 0.48;
  for (const k of avail) {
    const sc = scores['card:' + k] ?? 0;
    if (sc > bestCardScore && sc >= bestBase - 0.02) {
      bestCardScore = sc;
      bestCard = k;
    }
  }
  return bestCard;
}

function aiChoose(me, foe) {
  const scores = scoreCombatActions(me, foe, 0.06);
  let bestAct = 'pence', bestScore = -Infinity;
  for (const [act, sc] of Object.entries(scores)) {
    if (act.startsWith('card:') && sc < 0.48) continue;
    if (sc > bestScore) {
      bestScore = sc;
      bestAct = act;
    }
  }
  return bestAct;
}
function attack(a, t, kind, mult = 1) {
  const ev = { who: a.side, act: kind };
  let hit, dmg;
  if (t.cover) { ev.covered = t.cover; t.cover = null; ev.blocked = true; if (kind === 'nefes') a.sta -= NEFES_COST; return ev; } // antrenman eşi araya girdi
  if (t.evade > 0) { t.evade--; ev.miss = true; ev.evaded = true; if (kind === 'nefes') a.sta -= NEFES_COST; return ev; }
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
  const aMood = normMood(a.mood);
  const moodDmg = MOOD_DMG[aMood] ?? 1;
  if (ev.elm && ev.elm < 1) why.push(`${EL_AD[t.el]}, ${EL_AD[a.el].toLowerCase()} elementine dayanıklı (−%${pc(ev.elm)})`);
  if (moodDmg < 1) why.push(`morali ${(MOOD[aMood] || 'Normal').toLowerCase()} (−%${pc(moodDmg)})`);
  if (a.weak) why.push('sarsılmıştı (−%20)');
  if (a.tired) why.push('yorgundu (−%10)');
  const armor = kind === 'nefes' ? 100 / (100 + t.def * 0.6) : 100 / (100 + t.def * 1.2);
  if (armor < 0.85) why.push(`${t.name} zırhlı (−%${pc(armor)})`);
  dmg *= mult;
  dmg *= moodDmg * rnd(0.86, 1.14);
  if (a.cesur) dmg *= 1.12;
  if (a.vahsi) dmg *= 1.1;
  if (a.weak) dmg *= 0.8;
  if (a.tired) dmg *= 0.9;
  dmg *= seasonMult(a.el);
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
function doAct(F, a, t, act) {
  if (act === 'savun') return { who: a.side, act: 'savun' };
  if (act === 'kukre') {
    a.sta -= 15;
    const c = clamp(55 + (a.ze - t.ze) * 0.4 + (a.cesur ? 15 : 0), 20, 90);
    if (chance(c)) { t.weak = 2; a.fury = 2; return { who: a.side, act: 'kukre', ok: true, c: Math.round(c) }; }
    const why = []; if (t.ze > a.ze) why.push(`${t.name} daha soğukkanlı (zekâ ${t.ze}–${a.ze})`); if (t.weak) why.push('zaten sarsılmıştı');
    return { who: a.side, act: 'kukre', ok: false, c: Math.round(c), why };
  }
  if (act === 'nefes' && a.sta < NEFES_COST) { const e = attack(a, t, 'pence'); e.fb = true; return e; }
  return attack(a, t, act);
}
const fsnap = F => ({ p: { hp: Math.max(0, F.p.hp), sta: F.p.sta }, e: { hp: Math.max(0, F.e.hp), sta: F.e.sta } });
function fightRound(F, pAct) {
  const evs = [];
  if (pAct === 'teslim') { F.over = true; F.winner = 'e'; F.surrender = true; evs.push({ who: 'p', act: 'teslim' }); return evs; }
  const eAct = F.eNext || aiChoose(F.e, F.p); F.eNext = null; // gözcü desteği hamleyi önceden okuduysa o
  const acts = { p: pAct, e: eAct };
  F.round++;
  for (const s of ['p', 'e']) if (acts[s] === 'savun') { const f = F[s]; f.guard = true; f.sta = Math.min(100, f.sta + 25); const h = Math.round(f.maxHp * 0.04); f.hp = Math.min(f.maxHp, f.hp + h); }
  let order = F.p.ce === F.e.ce ? (chance(50) ? ['p', 'e'] : ['e', 'p']) : F.p.ce > F.e.ce ? ['p', 'e'] : ['e', 'p'];
  const cardOf = s => typeof acts[s] === 'string' && acts[s].startsWith('card:') ? acts[s].slice(5) : null;
  for (const s of ['p', 'e']) { const k = cardOf(s); if (k === 'yildirim' || k === 'kanat_kalkan') order = [s, s === 'p' ? 'e' : 'p']; }
  for (const s of ['p', 'e']) if (cardOf(s) === 'kanat_kalkan') F[s].immune = true;
  for (const s of order) {
    const a = F[s], t = F[s === 'p' ? 'e' : 'p'];
    if (a.hp <= 0 || t.hp <= 0) continue;
    if (a.stun > 0) { a.stun--; evs.push({ who: s, act: 'stun', after: fsnap(F) }); continue; }
    const k = cardOf(s);
    const ev = k && a.cards.includes(k) && !a.used.includes(k) ? doCard(F, a, t, k) : doAct(F, a, t, k ? 'pence' : acts[s]);
    if (acts[s] === 'savun') ev.heal = true;
    ev.after = fsnap(F);
    evs.push(ev);
    if (t.hp <= 0) { F.over = true; F.winner = s; break; }
  }
  for (const f of [F.p, F.e]) { f.guard = false; f.immune = false; f.sta = Math.min(100, f.sta + 10); if (f.weak) f.weak--; if (f.fury) f.fury--; if (f.shield) f.shield--; }
  if (!F.over && F.round >= 30) { F.over = true; F.winner = F.p.hp / F.p.maxHp >= F.e.hp / F.e.maxHp ? 'p' : 'e'; F.timeout = true; }
  return evs;
}
// Utility AI oyuncu yapay zekâsı: denge testleri ve "otomatik dövüş" için
function autoChoose(me, foe) {
  const scores = scoreCombatActions(me, foe, 0.02);
  let bestAct = 'pence', bestScore = -Infinity;
  for (const [act, sc] of Object.entries(scores)) {
    if (act.startsWith('card:') && sc < 0.5) continue;
    if (sc > bestScore) {
      bestScore = sc;
      bestAct = act;
    }
  }
  return bestAct;
}
function deathRisk(d, base) {
  if (!base) return 0;
  let r = base;
  if (hasB('sifa')) r -= 8;
  if (hasTrait(d, 'cabuk')) r -= 5;
  if (hasMark(d, 'Temkinli')) r -= 5;
  if (d.bond >= 70) r *= 0.5;
  return Math.max(2, Math.round(r));
}

/* ---------- Hedefler ---------- */
const GOALS = [
  { id: 'kulucka', t: 'Kuluçka Ocağı kur, dedenin yumurtasını içine yerleştir', c: () => S.eggs.some(e => e.inK) || S.st.hatch > 0, r: 40 },
  { id: 'train', t: 'Kor\'a bir antrenman ver ve haftayı bitir', c: () => S.st.train > 0, r: 30 },
  { id: 'win1', t: 'Köy Arenası\'nda ilk zaferini kazan', c: () => S.st.wins > 0, r: 50 },
  { id: 'talk', t: 'Bir ejderhanla konuş ve ona ikramda bulun', c: () => S.st.talk > 0 && S.st.feed > 0, r: 30 },
  { id: 'acq', t: 'Pazardan ya da seferden yeni bir ejderha edin', c: () => S.st.acq > 0, r: 60 },
  { id: 'fav', t: 'Bir ejderhanın en sevdiği yemeği keşfet', c: () => S.st.fav > 0, r: 40 },
  { id: 'mark', t: 'Bir ejderhanın karakterinde bir iz belirsin (Cesur, Sıcak...)', c: () => S.dragons.some(d => marks(d).length), r: 60 },
  { id: 'yuva', t: 'Yuva Bahçesi kur', c: () => hasB('yuva'), r: 40 },
  { id: 'aff', t: 'İki ejderha arasındaki yakınlığı 60\'a çıkar', c: () => Object.values(S.aff).some(v => v >= 60), r: 50 },
  { id: 'bred', t: 'Kendi çiftleştirdiğin ilk yumurtayı al', c: () => S.st.bred > 0, r: 80 },
  { id: 'un25', t: 'Bahar Kupası\'ndan önce 25 üne ulaş', c: () => S.un >= 25, r: 60 },
  { id: 'gen2', t: 'Kendi soyundan bir yavruyu yumurtadan çıkar', c: () => S.dragons.some(d => d.gen >= 2), r: 80 },
  { id: 'un45', t: 'Kızıl Taç davetiyesi için 45 ün topla', c: () => S.un >= 45, r: 100 },
];

/* ---------- Kayıt Sistemi (3 Yuva, Şema Sürümü, Yedekleme ve Dışa/İçe Aktarım) ---------- */
const SCHEMA_VERSION = 2;
const SAVE_KEY = 'ejder-ocagi-v1';
const SAVE_SLOT_KEY = 'ejder-ocagi-slot';
const SAVE_KEYS = { 1: 'ejder-ocagi-v1', 2: 'ejder-ocagi-v1-s2', 3: 'ejder-ocagi-v1-s3' };

function getSaveSlot() {
  try {
    const raw = Number(localStorage.getItem(SAVE_SLOT_KEY));
    return raw === 2 || raw === 3 ? raw : 1;
  } catch (e) {
    return 1;
  }
}

function saveKeyForSlot(slot) {
  const s = slot === 1 || slot === 2 || slot === 3 ? slot : getSaveSlot();
  return SAVE_KEYS[s] || SAVE_KEY;
}

function repairGenesRecord(g, defaultEl = 'ates') {
  const validEls = typeof ELS !== 'undefined' ? ELS : ['ates', 'buz', 'firtina', 'toprak', 'golge'];
  const validPats = ['d', 'C', 'B', 'K'];
  const validHorns = ['d', 'k', 'c', 't'];
  const baseEl = validEls.includes(defaultEl) ? defaultEl : 'ates';
  if (!g || typeof g !== 'object') g = randomGenes({ el: baseEl });
  if (!Array.isArray(g.el) || g.el.length < 2) g.el = [baseEl, baseEl];
  else g.el = [validEls.includes(g.el[0]) ? g.el[0] : baseEl, validEls.includes(g.el[1]) ? g.el[1] : baseEl];
  if (!Array.isArray(g.pat) || g.pat.length < 2) g.pat = ['C', 'd'];
  else g.pat = [validPats.includes(g.pat[0]) ? g.pat[0] : 'C', validPats.includes(g.pat[1]) ? g.pat[1] : 'd'];
  if (!Array.isArray(g.eye) || g.eye.length < 2) g.eye = ['N', 'N'];
  else g.eye = [g.eye[0] === 'A' ? 'A' : 'N', g.eye[1] === 'A' ? 'A' : 'N'];
  if (!Array.isArray(g.horn) || g.horn.length < 2) g.horn = ['d', 'd'];
  else g.horn = [validHorns.includes(g.horn[0]) ? g.horn[0] : 'd', validHorns.includes(g.horn[1]) ? g.horn[1] : 'd'];
  if (!g.pot || typeof g.pot !== 'object') g.pot = {};
  const statKeys = typeof STATS !== 'undefined' ? STATS : ['gu', 'ce', 'da', 'ze'];
  for (const k of statKeys) {
    const p = g.pot[k];
    if (!Array.isArray(p) || p.length < 2) g.pot[k] = [3, 3];
    else g.pot[k] = [clamp(Math.round(Number(p[0]) || 3), 1, 5), clamp(Math.round(Number(p[1]) || 3), 1, 5)];
  }
  return g;
}

function repairDragonRecord(d, fallbackId) {
  if (!d || typeof d !== 'object') return null;
  d.id = Number.isFinite(Number(d.id)) ? Math.round(Number(d.id)) : fallbackId;
  d.name = typeof d.name === 'string' && d.name.trim() ? d.name.trim() : 'Kor';
  d.sex = d.sex === 'F' || d.sex === 'M' ? d.sex : 'M';
  const validEls = typeof ELS !== 'undefined' ? ELS : ['ates', 'buz', 'firtina', 'toprak', 'golge'];
  const validPats = ['d', 'C', 'B', 'K'];
  const validHorns = ['d', 'k', 'c', 't'];
  d.genes = repairGenesRecord(d.genes, d.el);
  const statKeys = typeof STATS !== 'undefined' ? STATS : ['gu', 'ce', 'da', 'ze'];
  d.el = validEls.includes(d.el) ? d.el : expEl(d.genes.el);
  d.pat = validPats.includes(d.pat) ? d.pat : expPat(d.genes.pat);
  d.eye = d.eye === 'A' || d.eye === 'N' ? d.eye : expEye(d.genes.eye);
  d.horn = validHorns.includes(d.horn) ? d.horn : expHorn(d.genes.horn);
  d.stage = d.stage === 'yavru' || d.stage === 'genc' || d.stage === 'yetiskin' ? d.stage : 'yetiskin';
  d.age = Number.isFinite(Number(d.age)) ? Math.max(0, Math.round(Number(d.age))) : 0;
  d.gen = Number.isFinite(Number(d.gen)) ? Math.max(1, Math.round(Number(d.gen))) : 1;
  if (!d.st || typeof d.st !== 'object') d.st = {};
  const fallbackSt = d.stage === 'yetiskin' ? 52 : d.stage === 'genc' ? 38 : 25;
  for (const k of statKeys) {
    const v = Number(d.st[k]);
    d.st[k] = Number.isFinite(v) && v > 0 ? Math.round(v) : fallbackSt;
  }
  d.bond = Number.isFinite(Number(d.bond)) ? clamp(Math.round(Number(d.bond)), 0, 100) : 25;
  d.mood = normMood(d.mood);
  d.fat = Number.isFinite(Number(d.fat)) ? clamp(Math.round(Number(d.fat)), 0, 100) : 0;
  d.inj = Number.isFinite(Number(d.inj)) ? Math.max(0, Math.round(Number(d.inj))) : 0;
  d.w = Number.isFinite(Number(d.w)) ? Math.max(0, Math.round(Number(d.w))) : 0;
  d.l = Number.isFinite(Number(d.l)) ? Math.max(0, Math.round(Number(d.l))) : 0;
  if (!d.pers || typeof d.pers !== 'object') d.pers = { ces: 0, sic: 0, dis: 0 };
  for (const ax of ['ces', 'sic', 'dis']) {
    d.pers[ax] = Number.isFinite(Number(d.pers[ax])) ? clamp(Math.round(Number(d.pers[ax])), -100, 100) : 0;
  }
  d.traits = Array.isArray(d.traits) ? d.traits : [];
  d.cards = Array.isArray(d.cards) ? d.cards : [];
  d.seenTalk = Array.isArray(d.seenTalk) ? d.seenTalk : [];
  d.equip = Object.assign({ bas: null, govde: null, pence: null, tilsim: null }, d.equip && typeof d.equip === 'object' ? d.equip : {});
  d.style = d.style === 'sert' || d.style === 'yumusak' || d.style === 'oyun' ? d.style : 'yumusak';
  d.fav = d.fav || randFav(d.el);
  d.hue = Number.isFinite(Number(d.hue)) ? Math.round(Number(d.hue)) : 0;
  return d;
}

function repairEggRecord(e, fallbackId) {
  if (!e || typeof e !== 'object') return null;
  e.id = e.id != null ? e.id : ('e' + fallbackId);
  const elHint = Array.isArray(e.genes?.el) ? e.genes.el[0] : (e.el || 'ates');
  e.genes = repairGenesRecord(e.genes, elHint);
  e.sex = e.sex === 'F' || e.sex === 'M' ? e.sex : 'F';
  e.traits = Array.isArray(e.traits) ? e.traits : [];
  e.w = Number.isFinite(Number(e.w)) ? Math.max(0, Math.round(Number(e.w))) : 0;
  e.inK = !!e.inK;
  e.gen = Number.isFinite(Number(e.gen)) ? Math.max(1, Math.round(Number(e.gen))) : 1;
  e.origin = typeof e.origin === 'string' && e.origin ? e.origin : 'Yuvadan yumurta';
  return e;
}

function migrateSave(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  data.schemaVersion = SCHEMA_VERSION;
  data.week = Number.isFinite(Number(data.week)) ? Math.max(1, Math.round(Number(data.week))) : 1;
  data.seasonNo = Number.isFinite(Number(data.seasonNo)) ? Math.max(1, Math.round(Number(data.seasonNo))) : 1;
  data.gold = Number.isFinite(Number(data.gold)) ? Math.round(Number(data.gold)) : 420;
  data.un = Number.isFinite(Number(data.un)) ? Math.max(0, Math.round(Number(data.un))) : 0;
  data.neg = Number.isFinite(Number(data.neg)) ? Math.max(0, Math.round(Number(data.neg))) : 0;
  data.cleared = Number.isFinite(Number(data.cleared)) ? Math.max(0, Math.round(Number(data.cleared))) : 0;
  data.dragons = Array.isArray(data.dragons) ? data.dragons.map((d, i) => repairDragonRecord(d, i + 1)).filter(Boolean) : [];
  data.dead = Array.isArray(data.dead) ? data.dead.map((d, i) => repairDragonRecord(d, 1000 + i)).filter(Boolean) : [];
  data.eggs = Array.isArray(data.eggs) ? data.eggs.map((e, i) => repairEggRecord(e, i + 1)).filter(Boolean) : [];
  data.inv = Array.isArray(data.inv) ? data.inv.filter(it => it && typeof it === 'object') : [];
  if (data.orders && (!Array.isArray(data.orders.list) || typeof data.orders.last !== 'number')) {
    data.orders = null;
  }
  if (!Array.isArray(data.grid) || data.grid.length !== GW * GH) {
    data.grid = [];
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) data.grid.push({ b: null, open: x >= 2 && x <= 5 && y >= 1 && y <= 4 });
    data.grid[idx(3, 2)].b = 'in';
    data.grid[idx(2, 2)].b = 'fener';
  }
  const defaultFood = { balik: 0, biber: 0, kar: 0, mantar: 0, yumru: 0, zambak: 0, ziyafet: 0 };
  data.food = Object.assign(defaultFood, data.food && typeof data.food === 'object' ? data.food : {});
  for (const fk of Object.keys(data.food)) {
    data.food[fk] = Number.isFinite(Number(data.food[fk])) ? Math.max(0, Math.round(Number(data.food[fk]))) : 0;
  }
  const defaultSt = { wins: 0, losses: 0, train: 0, acq: 0, bred: 0, talk: 0, feed: 0, fav: 0, hatch: 0, fights: 0, seferler: 0, catches: 0, kupa: 0, deaths: 0 };
  data.st = Object.assign(defaultSt, data.st && typeof data.st === 'object' ? data.st : {});
  for (const sk of Object.keys(data.st)) {
    data.st[sk] = Number.isFinite(Number(data.st[sk])) ? Math.max(0, Math.round(Number(data.st[sk]))) : 0;
  }
  data.flags = data.flags && typeof data.flags === 'object' && !Array.isArray(data.flags) ? data.flags : {};
  data.aff = data.aff && typeof data.aff === 'object' && !Array.isArray(data.aff) ? data.aff : {};
  data.lineage = data.lineage && typeof data.lineage === 'object' && !Array.isArray(data.lineage) ? data.lineage : {};
  data.album = Array.isArray(data.album) ? data.album : [];
  data.chron = Array.isArray(data.chron) ? data.chron : [];
  data.seenEv = Array.isArray(data.seenEv) ? data.seenEv : [];
  data.goals = Array.isArray(data.goals) ? data.goals : [];
  data.smith = Array.isArray(data.smith) ? data.smith : [];
  const maxDId = [...data.dragons, ...data.dead].reduce((m, d) => Math.max(m, Number(d.id) || 0), 0);
  data.nid = Math.max(Number(data.nid) || 1, maxDId + 1);
  data.uid = Math.max(Number(data.uid) || 1, 1);
  data.updatedAt = Number.isFinite(Number(data.updatedAt)) ? Number(data.updatedAt) : Date.now();
  return data;
}

function saveGame(slot) {
  if (!S || typeof S !== 'object') return false;
  try {
    const key = saveKeyForSlot(slot);
    const bakKey = key + '-bak';
    S.schemaVersion = SCHEMA_VERSION;
    S.updatedAt = Date.now();
    const prev = localStorage.getItem(key);
    if (prev) {
      try { JSON.parse(prev); localStorage.setItem(bakKey, prev); } catch (e) { }
    }
    const raw = JSON.stringify(S);
    localStorage.setItem(key, raw);
    localStorage.setItem(bakKey, raw);
    if (typeof window !== 'undefined' && typeof window.__onSave === 'function') window.__onSave(S);
    return true;
  } catch (e) {
    return false;
  }
}

function loadGame(slot) {
  const key = saveKeyForSlot(slot);
  const bakKey = key + '-bak';
  for (const k of [key, bakKey]) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return migrateSave(parsed);
      }
    } catch (e) { }
  }
  return null;
}

function clearSave(slot) {
  try {
    const key = saveKeyForSlot(slot);
    localStorage.removeItem(key);
    localStorage.removeItem(key + '-bak');
  } catch (e) { }
}

function switchSaveSlot(slot) {
  const s = slot === 2 || slot === 3 ? slot : 1;
  try { localStorage.setItem(SAVE_SLOT_KEY, String(s)); } catch (e) { }
  const loaded = loadGame(s);
  S = loaded || null;
  return S;
}

function listSaveSlots() {
  return [1, 2, 3].map(slot => {
    const d = loadGame(slot);
    if (!d) {
      return { slot, exists: false, week: 0, seasonNo: 1, gold: 0, un: 0, dragonCount: 0, starName: null, starEl: null, updatedAt: null };
    }
    const st = (d.star != null && d.dragons.find(x => x.id === d.star)) || d.dragons[0] || null;
    return {
      slot,
      exists: true,
      week: d.week || 1,
      seasonNo: d.seasonNo || 1,
      gold: d.gold ?? 0,
      un: d.un ?? 0,
      dragonCount: d.dragons.length,
      starName: st ? st.name : null,
      starEl: st ? st.el : null,
      updatedAt: d.updatedAt || null,
    };
  });
}

function exportSaveString() {
  const target = S || loadGame();
  if (!target) return '';
  try {
    const json = JSON.stringify(target);
    if (typeof TextEncoder !== 'undefined') {
      const bytes = new TextEncoder().encode(json);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    }
    return btoa(unescape(encodeURIComponent(json)));
  } catch (e) {
    return '';
  }
}

function importSaveString(str) {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (!trimmed) return false;
  let json = trimmed;
  if (!trimmed.startsWith('{')) {
    try {
      const bin = atob(trimmed.replace(/\s+/g, ''));
      if (typeof TextDecoder !== 'undefined') {
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        json = new TextDecoder().decode(bytes);
      } else {
        json = decodeURIComponent(escape(bin));
      }
    } catch (e) {
      return false;
    }
  }
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    if (!Array.isArray(parsed.dragons) && parsed.week == null && !Array.isArray(parsed.grid)) return false;
    S = migrateSave(parsed);
    saveGame();
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------- Fotoğraf albümü ---------- */
function dSnap(d) { return { id: d.id, name: d.name, el: d.el, stage: d.stage, hue: d.hue, eye: d.eye, st: { ...d.st }, genes: { eyec: eyeAlleles(d) ? [...eyeAlleles(d)] : null, pul: [...GL(d, 'pul')], sus: [...GL(d, 'sus')], pig: [...GL(d, 'pig')], par: [...GL(d, 'par')], boy: [...GL(d, 'boy')] }, pat: d.pat, dead: !!d.dead }; }
function snapAlbum(kind, title, text, d, d2) {
  S.album = S.album || [];
  S.album.push({ w: S.week, kind, title, text, d: d ? dSnap(d) : null, d2: d2 ? dSnap(d2) : null });
  if (S.album.length > 48) S.album.splice(1, 1);
}

/* ---------- Soy kaydı ---------- */
function linReg(d) { S.lineage = S.lineage || {}; S.lineage[d.id] = { name: d.name, sex: d.sex, gen: d.gen, el: d.el, origin: d.origin, pids: d.pids || null, snap: dSnap(d) }; }
function linGet(id) { if (id == null) return null; const live = S.dragons.find(x => x.id === id) || S.dead.find(x => x.id === id); if (live) return { d: live, pids: live.pids, name: live.name, sex: live.sex, origin: live.origin }; const L = S.lineage && S.lineage[id]; return L ? { d: { ...L.snap, sold: !L.snap.dead }, pids: L.pids, name: L.name, sex: L.sex, origin: L.origin } : null; }
