'use strict';
// Arena PvE altını sunucu otoritesinde (server/arena_service.js): arena.open + arena.settle.
// İstemci benzetimi tarayıcıdakiyle aynıdır: aynı kural dosyaları (data, core, week), sunucunun verdiği tohumla
// yalnız fightRound sırasında tohumlu RNG, sonunda yalnız hamle listesi gönderilir.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { reduceCommand, validateCommand } = require('../server/economy_commands');
const { openEconomyStore } = require('../server/economy_store');
const arena = require('../server/arena_service');

const NOW = Date.UTC(2026, 10, 15, 12);
const env = (seed = 'arena-seed') => ({ accountId: 'acct', seed, now: NOW });
const start = () => reduceCommand(null, { type: 'game.start', args: {} }, env()).game;
const cmd = (type, args = {}) => validateCommand({ type, args, requestId: crypto.randomUUID(), expectedVersion: 0 }).command;
const run = (state, type, args = {}, e = env()) => reduceCommand(state, cmd(type, args), e);

// Yerel oyun (istemci) benzetimi.
function client(seed = 7) {
  let x = seed >>> 0;
  const math = Object.create(Math);
  const base = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
  math.random = base;
  const ctx = vm.createContext({ Math: math, UI: {} });
  for (const f of ['data', 'core', 'week']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  const api = vm.runInContext(`({ newGame() { newGame(); return S; }, state: () => S, genOpp, fighterFromDragon, fighterFromOpp, newFight, fightRound, autoChoose, TIERS, TOURS })`, ctx);
  api.setRandom = fn => { math.random = fn || base; };
  return api;
}
const P_KEYS = ['name', 'el', 'mood', 'cards', 'gu', 'ce', 'da', 'ze', 'atk', 'def', 'crit', 'dodge', 'nefesB', 'maxHp', 'hp', 'sta', 'bond', 'saves', 'cesur', 'temkinli', 'demir', 'vahsi', 'bondUsed', 'heart', 'tired'];
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
// Kurulum: yerel dövüşçü ve yerel ilan. `boost` oyuncuyu güçlendirir (zafer senaryosu).
function setup(c, { tier = 'koy', boost = 0, mode = 'tier', extra = {} } = {}) {
  const S = c.newGame(), d = S.dragons[0];
  for (const k of ['gu', 'ce', 'da', 'ze']) d.st[k] += boost;
  const opp = mode === 'tour' ? c.genOpp(null, c.TOURS[10].rounds[0], c.TOURS[10].gear) : c.genOpp(tier);
  const F = c.newFight(c.fighterFromDragon(d), c.fighterFromOpp(opp));
  const spec = Object.assign({ mode, week: S.week, season: 1, goldB: 0, p: pick(F.p, P_KEYS), opp: JSON.parse(JSON.stringify(opp)) },
    mode === 'tour' ? { tour: 'kupa', round: 0 } : { tier, bet: 0 }, extra);
  return { S, d, opp, F, spec };
}
// Sunucunun verdiği tohumla dövüşü yerelde oynar; hamle listesini döner.
function play(c, F, opened, choose) {
  Object.assign(F.p, opened.p); Object.assign(F.e, opened.e);
  const r = arena.rng(opened.seed), acts = [];
  while (!F.over) { const x = choose ? choose(F) : c.autoChoose(F.p, F.e); acts.push(x); c.setRandom(r); try { c.fightRound(F, x); } finally { c.setRandom(null); } }
  return acts;
}

test('arena: şema; istemci tutar, kazanan ya da ödül alanı gönderemez', () => {
  assert.throws(() => cmd('arena.settle', { fightId: 'af_1', acts: 'pence', gold: 500 }), /invalid_arguments/);
  assert.throws(() => cmd('arena.settle', { fightId: 'af_1', acts: 'pence', won: 'true' }), /invalid_arguments/);
  assert.throws(() => cmd('arena.win', { gold: 500 }), /unsupported_command/);
  assert.throws(() => cmd('arena.open', { spec: 'x'.repeat(6001) }), /invalid_arguments/);
  const c = client(), { spec } = setup(c);
  for (const bad of [{ gold: 999 }, { won: true }, { reward: { odul: 999 } }]) assert.throws(() => run(start(), 'arena.open', { spec: JSON.stringify({ ...spec, ...bad }) }), /arena_spec_invalid/);
});

test('arena: zafer; sunucu dövüşü yeniden oynatır, ilan ödülünü earned yazar, sonuç yerelle aynıdır', () => {
  const c = client(11), { F, spec, opp } = setup(c, { boost: 40 });
  const g0 = start();
  const o = run(g0, 'arena.open', { spec: JSON.stringify(spec) });
  assert.equal(o.game.gold, g0.gold); // açmak altın yazmaz
  assert.match(o.result.arena.seed, /^[a-f0-9]{32}$/);
  const acts = play(c, F, o.result.arena);
  assert.equal(F.winner, 'p');
  const s = run(o.game, 'arena.settle', { fightId: o.result.arena.fightId, acts: acts.join(',') });
  const A = s.result.arena;
  assert.equal(A.won, true); assert.equal(A.rounds, F.round);
  assert.deepEqual(A.final.p.hp, Math.max(0, F.p.hp)); assert.deepEqual(A.final.e.hp, Math.max(0, F.e.hp)); // iki taraf aynı dövüşü gördü
  assert.equal(A.gold, opp.odul); // ilan ödülü; tutar değişmedi
  assert.equal(s.game.gold, g0.gold + opp.odul);
  assert.equal(s.game.funds.earned, (g0.funds.earned || 0) + opp.odul);
  assert.equal(s.game.arenaLive, undefined);
  // aynı dövüş ikinci kez ödenmez
  assert.throws(() => run(s.game, 'arena.settle', { fightId: A.fightId, acts: acts.join(',') }), /arena_fight_unknown/);
});

test('arena: yenilgi ve teslim ödül yazmaz; "kazandım" demenin yolu yok', () => {
  const c = client(5), { F, spec } = setup(c, { tier: 'koy' });
  const g0 = start(), o = run(g0, 'arena.open', { spec: JSON.stringify(spec) });
  const s = run(o.game, 'arena.settle', { fightId: o.result.arena.fightId, acts: 'teslim' });
  assert.equal(s.result.arena.won, false); assert.equal(s.result.arena.surrender, true); assert.equal(s.result.arena.gold, 0);
  assert.equal(s.game.gold, g0.gold);
  // bitmemiş dövüş: tek hamleyle zafer iddiası
  const o2 = run(g0, 'arena.open', { spec: JSON.stringify(spec) });
  assert.throws(() => run(o2.game, 'arena.settle', { fightId: o2.result.arena.fightId, acts: 'pence' }), /arena_not_finished/);
  // uydurma dövüş kimliği, açılmamış dövüş
  assert.throws(() => run(g0, 'arena.settle', { fightId: 'af_0000000000000000', acts: 'pence' }), /arena_fight_unknown/);
  // kural dışı hamleler
  assert.throws(() => run(o2.game, 'arena.settle', { fightId: o2.result.arena.fightId, acts: 'card:alev_yagmuru' }), /arena_illegal_action/);
  assert.throws(() => run(o2.game, 'arena.settle', { fightId: o2.result.arena.fightId, acts: 'kazan' }), /arena_log_invalid/);
  assert.throws(() => run(o2.game, 'arena.settle', { fightId: o2.result.arena.fightId, acts: Array(40).fill('savun').join(',') }), /arena_log_invalid/);
  void F;
});

test('arena: ödül kalemleri sunucu tablosuna uymalı (şişirilmiş ilan, uydurma bahis, zayıflatılmış rakip reddedilir)', () => {
  const c = client(3), { spec } = setup(c, { tier: 'koy' });
  const bad = patch => () => run(start(), 'arena.open', { spec: JSON.stringify({ ...spec, ...patch }) });
  assert.throws(bad({ opp: { ...spec.opp, odul: 5000 } }), /arena_reward_invalid/);
  assert.throws(bad({ bet: 5000 }), /arena_reward_invalid/);
  assert.throws(bad({ goldB: 5000 }), /arena_reward_invalid/);
  assert.throws(bad({ opp: { ...spec.opp, st: { gu: 1, ce: 1, da: 1, ze: 1 } } }), /arena_opp_invalid/);
  assert.throws(bad({ tier: 'saray' }), /arena_tier_invalid/);
  assert.throws(bad({ opp: { ...spec.opp, story: 'belt', odul: 400 } }), /arena_reward_invalid/); // şampiyon maçı köy kademesinde olmaz
  assert.throws(bad({ p: { ...spec.p, kazan: true } }), /arena_fighter_invalid/);
  assert.throws(bad({ mode: 'kule' }), /arena_mode_invalid/);
});

test('arena: bahis kâğıdı ve ekipman bonusu yalnız zaferde, sabit tutarla ödenir', () => {
  const c = client(21), { F, spec, opp } = setup(c, { boost: 40, extra: { bet: 180, goldB: 25 } });
  const g0 = start(), o = run(g0, 'arena.open', { spec: JSON.stringify(spec) });
  const acts = play(c, F, o.result.arena);
  const s = run(o.game, 'arena.settle', { fightId: o.result.arena.fightId, acts: acts.join(',') });
  assert.equal(s.result.arena.won, true);
  assert.deepEqual(s.result.arena.parts, { odul: opp.odul, goldB: 25, bet: 180 });
  assert.equal(s.game.gold, g0.gold + opp.odul + 25 + 180);
});

test('arena: turnuva turu ödülü sunucu tablosundan (TOURS) gelir', () => {
  const c = client(9), { F, spec } = setup(c, { boost: 80, mode: 'tour' });
  const g0 = start(), o = run(g0, 'arena.open', { spec: JSON.stringify(spec) });
  assert.equal(o.result.arena.reward.odul, 120);
  const acts = play(c, F, o.result.arena);
  const s = run(o.game, 'arena.settle', { fightId: o.result.arena.fightId, acts: acts.join(',') });
  assert.equal(s.result.arena.won, F.winner === 'p');
  assert.equal(s.game.gold, g0.gold + (F.winner === 'p' ? 120 : 0));
  assert.throws(() => run(g0, 'arena.open', { spec: JSON.stringify({ ...spec, tour: 'altin', round: 0 }) }), /arena_tour_invalid/);
  assert.throws(() => run(g0, 'arena.open', { spec: JSON.stringify({ ...spec, round: 7 }) }), /arena_tour_invalid/);
});

test('arena: yeni dövüş açmak yarım kalanı ödülsüz düşürür; depo üzerinden uçtan uca ve makbuzlu', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-arena-'));
  const store = openEconomyStore(path.join(dir, 'e.sqlite'));
  try {
    const guest = await store.createGuest(), acc = guest.accountId;
    const send = (type, args, v) => store.executeCommand(acc, { requestId: crypto.randomUUID(), expectedVersion: v, type, args });
    let r = await send('game.start', {}, 0); const gold0 = r.economy.gold;
    const c = client(31), a = setup(c, { boost: 40 });
    r = await send('arena.open', { spec: JSON.stringify(a.spec) }, r.economy.version);
    const first = r.result.arena.fightId;
    const b = setup(c, { boost: 40 });
    r = await send('arena.open', { spec: JSON.stringify(b.spec) }, r.economy.version);
    await assert.rejects(async () => send('arena.settle', { fightId: first, acts: 'teslim' }, r.economy.version), /arena_fight_unknown/);
    const acts = play(c, b.F, r.result.arena);
    const body = { requestId: crypto.randomUUID(), expectedVersion: r.economy.version, type: 'arena.settle', args: { fightId: r.result.arena.fightId, acts: acts.join(',') } };
    const s1 = await store.executeCommand(acc, body), s2 = await store.executeCommand(acc, body); // aynı istek yinelenirse tek ödeme
    assert.equal(s2.replayed, true);
    assert.equal(s1.economy.gold, gold0 + b.opp.odul); assert.equal(s2.economy.gold, s1.economy.gold);
    assert.equal((await store.readEconomy(acc)).gold, gold0 + b.opp.odul);
  } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
