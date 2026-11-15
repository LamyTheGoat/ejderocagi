'use strict';
// Arena (tek oyunculu PvE) altını sunucu otoritesinde · 2026-11-15
// AKIŞ (iki komut, /api/economy/command):
//   arena.open   { spec }          İstemci dövüş kurulumunu bildirir (kip, kademe, hafta, kendi savaşçısı, rakip ilanı).
//                                  Sunucu rakibi ve ödül kalemlerini KENDİ tablolarıyla doğrular (TIERS, TOURS, şampiyon
//                                  maçları), tohum üretir, dövüşü hesabın oyun durumuna (`S.arenaLive`) yazar.
//   arena.settle { fightId, acts } İstemci yalnız hamle listesini yollar. Sunucu dövüşü AYNI kural koduyla (js/core.js
//                                  newFight + fightRound, tohumlu RNG) baştan oynatır; kazananı ve altını kendisi
//                                  hesaplar, `earned` olarak yazar (debt.receive; kaynak politikası değişmedi).
// İstemci hiçbir yerde "kazandım" ya da tutar söyleyemez: şemada böyle alan yok; ödül kalemleri (ilan ödülü, bahis)
// sunucu tablosuna uymuyorsa komut reddedilir. Ödül TUTARLARI mevcut kodla aynıdır (js/week.js fightOutcome: ilan ödülü
// + ekipman altın bonusu; eo2/js/arena.js: bahis kâğıdı, turnuva turu ödülü). Yeni mekanik, tavan ya da kısıt yok.
// BİLİNEN SINIR (kullanıcı kararı "hile koruması şimdilik yok" ile uyumlu, raporda yazılı): oyuncunun KENDİ savaşçı
// değerleri ve hafta numarası yerel kayıttan gelir (yerel ejderha sunucu defterinde değil); yalnız aralık denetimi yapılır.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const debt = require('./economy_debt');

function fail(code, status = 409) { throw Object.assign(new Error(code), { code, status }); }
const clone = v => JSON.parse(JSON.stringify(v));
const load = name => new vm.Script(fs.readFileSync(path.join(__dirname, '../js', name + '.js'), 'utf8'), { filename: name + '.js' });
const rules = ['data', 'core', 'week'].map(load);
const expose = new vm.Script(`({
  load(value) { S = value; },
  TIERS, TOURS, ARCH, STATS, SEASON, CARDS, ITEMS, EL_AD, NEFES_COST,
  fighterFromOpp, newFight, fightRound,
})`, { filename: 'server_arena_expose.js' });

const TYPES = new Set(['arena.open', 'arena.settle']);
const ACTION = /^(pence|savun|teslim|nefes|kukre|card:[a-z_]{1,30})$/;
const SEED = /^[a-f0-9]{32}$/;
// js/arenastory.js CHAMP0: şampiyon maçlarının sabit ödülü ve kademesi (kural dosyası DOM'a bağlı olduğundan burada yinelenir).
const CHAMPS = Object.freeze({ belt: { tier: 'sehir', odul: 400 }, kanli: { tier: 'cukur', odul: 650 } });
// js/fightev.js "80 altın yatır" seçeneği: kazanılırsa 180 öder (eo2/js/arena.js finish: S.gold += FT.bet).
const BETS = Object.freeze([0, 180]);
// js/core.js genOpp: ilan ödülüne eklenen hafta payı.
const weekBonus = (tier, w) => Math.round(w * (tier === 'cukur' ? 8 : tier === 'sehir' ? 5 : 2));
const seasonBonus = n => (n - 1) * 8; // js/season.js

// Tohumlu RNG (sfc32). İstemcideki eşi: eo2/js/ag.js `rng`. İki taraf aynı sayıları üretmek zorundadır.
function rng(seed) {
  if (typeof seed !== 'string' || !SEED.test(seed)) fail('arena_seed_invalid');
  let a = parseInt(seed.slice(0, 8), 16) | 0, b = parseInt(seed.slice(8, 16), 16) | 0, c = parseInt(seed.slice(16, 24), 16) | 0, d = parseInt(seed.slice(24, 32), 16) | 0;
  const next = () => { a |= 0; b |= 0; c |= 0; d |= 0; const t = (a + b | 0) + d | 0; d = d + 1 | 0; a = b ^ b >>> 9; b = c + (c << 3) | 0; c = c << 21 | c >>> 11; c = c + t | 0; return (t >>> 0) / 4294967296; };
  for (let i = 0; i < 12; i++) next();
  return next;
}

function runtime(week, seasonNo, random) {
  const math = Object.create(Math);
  math.random = random || (() => { throw new Error('arena_random_forbidden'); });
  const context = vm.createContext({ Math: math, UI: {} }, { codeGeneration: { strings: false, wasm: false } });
  for (const script of rules) script.runInContext(context, { timeout: 1000 });
  const api = expose.runInContext(context, { timeout: 1000 });
  api.load({ week, seasonNo });
  return api;
}

const num = (v, lo, hi, code = 'arena_fighter_invalid') => { if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) fail(code, 400); return v; };
const int = (v, lo, hi, code) => { num(v, lo, hi, code); if (!Number.isInteger(v)) fail(code || 'arena_fighter_invalid', 400); return v; };
const str = (v, max, code = 'arena_spec_invalid') => { if (typeof v !== 'string' || !v || v.length > max) fail(code, 400); return v; };
const plain = v => v && typeof v === 'object' && !Array.isArray(v);

// Oyuncunun savaşçısı: dövüş başlamadan hemen önceki hâli (fighterFromDragon + maç öncesi destekler). Yalnız bilinen
// alanlar, sayısal aralıklarla alınır; bilinmeyen alan reddedilir.
const P_NUM = { gu: [0, 5000], ce: [0, 5000], da: [0, 5000], ze: [0, 5000], atk: [0, 5000], def: [0, 5000], crit: [-100, 500], dodge: [-100, 500],
  nefesB: [0, 1000], maxHp: [1, 100000], hp: [1, 100000], sta: [0, 100], bond: [0, 100], saves: [0, 2] };
const P_BOOL = ['cesur', 'temkinli', 'demir', 'vahsi', 'bondUsed', 'heart', 'tired'];
function cleanPlayer(raw, api) {
  if (!plain(raw)) fail('arena_fighter_invalid', 400);
  const allowed = new Set(['name', 'el', 'mood', 'cards', ...Object.keys(P_NUM), ...P_BOOL]);
  for (const k of Object.keys(raw)) if (!allowed.has(k)) fail('arena_fighter_invalid', 400);
  const f = { side: 'p', name: str(raw.name, 60, 'arena_fighter_invalid'), el: str(raw.el, 12, 'arena_fighter_invalid') };
  if (!Object.hasOwn(api.EL_AD, f.el)) fail('arena_fighter_invalid', 400);
  for (const [k, [lo, hi]] of Object.entries(P_NUM)) f[k] = num(raw[k], lo, hi);
  if (f.hp > f.maxHp) fail('arena_fighter_invalid', 400);
  for (const k of P_BOOL) f[k] = raw[k] === true;
  f.mood = typeof raw.mood === 'string' ? str(raw.mood, 20, 'arena_fighter_invalid') : num(raw.mood ?? 2, -10, 10);
  if (!Array.isArray(raw.cards) || raw.cards.length > 3 || raw.cards.some(k => typeof k !== 'string' || !Object.hasOwn(api.CARDS, k)) || new Set(raw.cards).size !== raw.cards.length) fail('arena_fighter_invalid', 400);
  f.cards = [...raw.cards];
  return f;
}

// Rakip ilanı: js/core.js genOpp biçimi. Dövüşü etkileyen alanlar ve yapay zekânın okuduğu ad/terbiyeci/arketip alınır.
function cleanOpp(raw, api) {
  if (!plain(raw) || !plain(raw.st) || !plain(raw.gear)) fail('arena_opp_invalid', 400);
  const o = { name: str(raw.name, 60, 'arena_opp_invalid'), trainer: str(raw.trainer, 60, 'arena_opp_invalid'), arch: str(raw.arch, 80, 'arena_opp_invalid'), el: str(raw.el, 12, 'arena_opp_invalid') };
  if (!Object.hasOwn(api.EL_AD, o.el)) fail('arena_opp_invalid', 400);
  o.st = {}; for (const k of api.STATS) o.st[k] = num(raw.st[k], 1, 5000, 'arena_opp_invalid');
  o.gear = {}; for (const k of ['atk', 'def', 'hp']) o.gear[k] = num(raw.gear[k], 0, 5000, 'arena_opp_invalid');
  o.eye = raw.eye === 'A' ? 'A' : 'N';
  o.mood = raw.mood == null ? 2 : num(raw.mood, -10, 10, 'arena_opp_invalid');
  if (!Array.isArray(raw.traits) || raw.traits.length > 6 || raw.traits.some(t => typeof t !== 'string' || t.length > 20)) fail('arena_opp_invalid', 400);
  o.traits = [...raw.traits];
  const cards = raw.cards == null ? [] : raw.cards;
  if (!Array.isArray(cards) || cards.length > 3 || cards.some(k => typeof k !== 'string' || !Object.hasOwn(api.CARDS, k))) fail('arena_opp_invalid', 400);
  o.cards = [...cards];
  // Görünüş genleri (boy ve pigment dövüş değerini etkiler: core.js lookFx). Küçük, düz bir nesne olmalı.
  if (raw.gx != null) { if (!plain(raw.gx) || JSON.stringify(raw.gx).length > 600) fail('arena_opp_invalid', 400); o.gx = clone(raw.gx); }
  if (raw.genes != null) { if (!plain(raw.genes) || JSON.stringify(raw.genes).length > 1500) fail('arena_opp_invalid', 400); o.genes = clone(raw.genes); }
  if (!o.gx && !o.genes) fail('arena_opp_invalid', 400); // eksikse kural kodu rastgele görünüş üretir; ilanlarda hep vardır
  if (raw.story != null) { if (!Object.hasOwn(CHAMPS, raw.story)) fail('arena_opp_invalid', 400); o.story = raw.story; }
  if (raw.odul != null) o.odul = int(raw.odul, 0, 100000, 'arena_reward_invalid');
  return o;
}

const statSum = (api, o) => api.STATS.reduce((t, k) => t + o.st[k], 0);
// genOpp'un üretebileceği en zayıf rakibin değer toplamı (seviye × en düşük arketip toplamı × 0.92, yuvarlama payı).
function floorSum(api, level) {
  const minArch = Math.min(...Object.values(api.ARCH).map(a => api.STATS.reduce((t, k) => t + a[k], 0)));
  return Math.floor(level * minArch * 0.92) - 4;
}

// spec: { mode:'tier'|'tour', tier, tour, round, week, season, goldB, bet, p, opp }
function open(S, a, { api: econ }) {
  let spec;
  try { spec = JSON.parse(a.spec); } catch (_) { fail('arena_spec_invalid', 400); }
  if (!plain(spec)) fail('arena_spec_invalid', 400);
  const allowed = ['mode', 'tier', 'tour', 'round', 'week', 'season', 'goldB', 'bet', 'p', 'opp'];
  for (const k of Object.keys(spec)) if (!allowed.includes(k)) fail('arena_spec_invalid', 400); // 'gold', 'won', 'reward' gibi alanlar yok
  const api = runtime(1, 1);
  const week = int(spec.week, 1, api.SEASON, 'arena_spec_invalid'), season = int(spec.season ?? 1, 1, 9999, 'arena_spec_invalid');
  const p = cleanPlayer(spec.p, api), opp = cleanOpp(spec.opp, api);
  // Ekipmanın altın bonusu (week.js fightOutcome: eq.gold). Üst sınır: her yuvada en yüksek bonuslu eşya.
  const bySlot = {}; for (const it of Object.values(api.ITEMS)) if (it.gold) bySlot[it.slot] = Math.max(bySlot[it.slot] || 0, it.gold);
  const goldB = int(spec.goldB ?? 0, 0, Object.values(bySlot).reduce((t, v) => t + v, 0), 'arena_reward_invalid');
  const reward = { odul: 0, goldB: 0, bet: 0 };
  const live = { mode: spec.mode, week, season };
  if (spec.mode === 'tier') {
    const tier = str(spec.tier, 12); if (!Object.hasOwn(api.TIERS, tier)) fail('arena_tier_invalid', 400);
    const T = api.TIERS[tier];
    live.tier = tier;
    const bet = spec.bet ?? 0; if (!BETS.includes(bet)) fail('arena_reward_invalid', 400);
    const base = T.base + seasonBonus(season);
    if (opp.story) {
      // Şampiyon maçı (arenastory.js champOpp): sabit ödül, kendi kademesinde.
      if (CHAMPS[opp.story].tier !== tier || opp.odul !== CHAMPS[opp.story].odul) fail('arena_reward_invalid', 400);
      if (statSum(api, opp) < floorSum(api, base + T.grow)) fail('arena_opp_invalid', 400);
    } else {
      // Olağan ilan (core.js genOpp): ödül = kademe aralığı + hafta payı; ilan bu haftada ya da bir önceki hafta sonunda asılmıştır.
      const lo = T.odul[0] + Math.min(weekBonus(tier, week - 1), weekBonus(tier, week)), hi = T.odul[1] + weekBonus(tier, week);
      if (!Number.isInteger(opp.odul) || opp.odul < lo || opp.odul > hi) fail('arena_reward_invalid', 400);
      if (statSum(api, opp) < floorSum(api, (base + (week - 1) * T.grow) * 0.8)) fail('arena_opp_invalid', 400);
    }
    Object.assign(reward, { odul: opp.odul, goldB, bet });
  } else if (spec.mode === 'tour') {
    const tour = Object.values(api.TOURS).find(t => t.id === spec.tour); if (!tour) fail('arena_tour_invalid', 400);
    const round = int(spec.round, 0, tour.odul.length - 1, 'arena_tour_invalid');
    live.tour = tour.id; live.round = round;
    // Turnuva rakibi genOpp(null, tur seviyesi): final rakibi hikâyeyle zayıflayabildiği için taban yarı seviyeden alınır.
    if (statSum(api, opp) < floorSum(api, tour.rounds[round] * 0.5)) fail('arena_opp_invalid', 400);
    reward.odul = tour.odul[round]; // week.js TOURS
    delete opp.odul;
  } else fail('arena_mode_invalid', 400);
  // Tohum: komutun sunucu rastgeleliğinden (economy_commands makeRuntime); istemci seçemez.
  const hex = () => Math.floor(econ.rand() * 4294967296).toString(16).padStart(8, '0');
  live.id = 'af_' + hex() + hex(); live.seed = hex() + hex() + hex() + hex();
  Object.assign(live, { p, opp, reward });
  S.arenaLive = live; // hesap başına tek açık dövüş; yenisi eskisinin üzerine yazar (yarım kalan dövüş ödülsüz düşer)
  return { arena: { fightId: live.id, seed: live.seed, mode: live.mode, reward: { ...reward }, p: clone(p), e: enemy(runtime(week, season), opp) } };
}
// Rakip savaşçı, kural dosyasının kendi dönüşümüyle (fighterFromOpp) kurulur; istemci aynı sayıları kullanır.
function enemy(api, opp) { const f = clone(api.newFight({ maxHp: 1 }, api.fighterFromOpp(clone(opp))).e); delete f.ref; return f; }

// Hamle listesini aynı kural koduyla baştan oynatır. Döner: bitmiş dövüş özeti.
function replay(live, acts) {
  if (!Array.isArray(acts) || !acts.length || acts.length > 31 || acts.some(x => typeof x !== 'string' || !ACTION.test(x))) fail('arena_log_invalid', 400);
  const api = runtime(live.week, live.season, rng(live.seed));
  const F = api.newFight(clone(live.p), api.fighterFromOpp(clone(live.opp)));
  Object.assign(F.p, clone(live.p), { used: [] }); // newFight canı ve nefesi sıfırlar; maç öncesi destekli hâl geri konur
  for (const x of acts) {
    if (F.over) fail('arena_log_invalid', 400);
    if (x === 'kukre' && F.p.sta < 15) fail('arena_illegal_action', 400);
    if (x === 'nefes' && F.p.sta < api.NEFES_COST) fail('arena_illegal_action', 400);
    if (x.startsWith('card:') && (!F.p.cards.includes(x.slice(5)) || F.p.used.includes(x.slice(5)))) fail('arena_illegal_action', 400);
    api.fightRound(F, x);
  }
  if (!F.over) fail('arena_not_finished', 409);
  return { winner: F.winner, won: F.winner === 'p', surrender: !!F.surrender, timeout: !!F.timeout, rounds: F.round,
    final: { p: { hp: Math.max(0, F.p.hp), maxHp: F.p.maxHp, saves: F.p.saves || 0 }, e: { hp: Math.max(0, F.e.hp), maxHp: F.e.maxHp } } };
}

function settle(S, a) {
  const live = S.arenaLive;
  if (!live || live.id !== a.fightId) fail('arena_fight_unknown', 409);
  const out = replay(live, String(a.acts).split(','));
  const parts = out.won ? { ...live.reward } : { odul: 0, goldB: 0, bet: 0 };
  const gold = parts.odul + parts.goldB + parts.bet;
  delete S.arenaLive;
  const credit = gold > 0 ? debt.receive(S, gold, 'earned') : { paidDebt: 0, credited: 0 };
  return { arena: { fightId: live.id, mode: live.mode, tier: live.tier || null, tour: live.tour || null, round: live.round ?? null, ...out, gold, parts, source: 'earned', credit } };
}

function reduce(type, S, a, ctx) {
  if (type === 'arena.open') return open(S, a, ctx);
  if (type === 'arena.settle') return settle(S, a);
  return null;
}

module.exports = { TYPES, reduce, replay, rng, CHAMPS, BETS };
