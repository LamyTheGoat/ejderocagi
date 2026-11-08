'use strict';
// ENG06 P-C ilk dilim: week.end ve borç (D4). ENG-12: hafta bileti kaldırıldı (week.end sınırsız). SQLite + saf indirgeyici.
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { reduceCommand, validateCommand } = require('../server/economy_commands');
const { openEconomyStore } = require('../server/economy_store');
const { dropLegacyTickets, weekStatus } = require('../server/week_runtime');
const debt = require('../server/economy_debt');
const { normalizeOffer } = require('../js/trade_engine');
const { earnedFixture } = require('./helpers/earned_fixture');

const uuid = () => crypto.randomUUID();
const plain = v => JSON.parse(JSON.stringify(v));
const HOUR = 3600000, T0 = 1_800_000_000_000;
const env = now => ({ accountId: 'acct', seed: uuid(), now });
const start = () => reduceCommand(null, { type: 'game.start', args: {} }, env(T0)).game;
const cmd = type => ({ type, args: {} });
const step = (game, type, args = {}, now = T0) =>
  reduceCommand(game, validateCommand({ type, args, requestId: uuid(), expectedVersion: 0 }).command, env(now));
const fundsTotal = g => g.funds.bound + g.funds.unknown + g.funds.earned;
function invariants(g) {
  assert.equal(fundsTotal(g), g.gold, 'funds toplamı = gold');
  assert.ok(g.gold >= 0 && Object.values(g.funds).every(n => typeof n !== 'number' || n >= 0));
  if ((g.debt || 0) > 0) assert.equal(g.gold, 0, 'borç varken bakiye 0');
  assert.equal(g.over, false); assert.equal(g.ending, null);
}
const indebted = (amount = 3) => { const g = start(); g.gold = amount; g.funds = { schema: 1, bound: amount, unknown: 0, earned: 0 }; return g; };

test('ENG-12: ticket config module and env are gone; week.end is unlimited at the same server time', () => {
  assert.throws(() => require('../server/week_config'), /Cannot find module/);
  for (const args of [{ week: 5 }, { now: T0 }, { tickets: 9 }, { w: 2 }])
    assert.throws(() => validateCommand({ requestId: uuid(), expectedVersion: 1, type: 'week.end', args }), /invalid_arguments/);
  for (const extra of [{ now: T0 }, { tickets: 4 }]) assert.throws(() => validateCommand({ requestId: uuid(), expectedVersion: 1, ...cmd('week.end'), ...extra }), /unknown_command_field/);
  let g = start();
  for (let i = 0; i < 12; i++) { const r = step(g, 'week.end'); g = r.game; assert.equal('ticket' in r.result, false); }
  assert.equal(g.week, 13); assert.equal(g.weekTickets, undefined);
});

test('ENG-12: legacy weekTickets field (even exhausted or corrupt) never blocks and is silently removed', () => {
  for (const legacy of [{ schema: 1, count: 0, at: T0 + 100 * HOUR }, { schema: 9 }, null, 'bozuk']) {
    const g = start(); g.weekTickets = legacy;
    const view = weekStatus(g, T0);
    assert.equal('ticket' in view, false);
    const r = step(g, 'week.end');
    assert.equal(r.game.week, 2); assert.equal(Object.hasOwn(r.game, 'weekTickets'), false);
    const h = start(); h.weekTickets = legacy;
    assert.equal(Object.hasOwn(step(h, 'goals.claim').game, 'weekTickets'), false, 'başka komut da temizler');
  }
  assert.deepEqual(dropLegacyTickets({ week: 3, weekTickets: { count: 0 } }), { week: 3 });
});

test('P-C week: age, stage, upkeep from server funds, incubation and starter egg hatch', () => {
  let g = start();
  const egg = g.eggs[0].assetId;
  // Kuluçkasız: yumurta ilerlemez.
  let r = step(g, 'week.end');
  assert.equal(r.game.eggs[0].w, 0); assert.equal(r.game.dragons[0].age, 10);
  assert.equal(r.game.gold, 410); assert.equal(r.result.upkeep.charged, 10); assert.equal(r.result.upkeep.debit.bound, 10);
  invariants(r.game);
  const tile = g.grid.findIndex(t => t.open && !t.b);
  g = step(g, 'building.buy', { kind: 'kulucka', tile }).game; // 420-160+40 (bound hedef)
  assert.equal(g.eggs[0].inK, true);
  r = step(g, 'week.end'); g = r.game;
  assert.equal(g.eggs[0].w, 1); assert.deepEqual(plain(r.result.hatchReady), []);
  assert.throws(() => step(g, 'egg.hatch', { assetId: egg }), /egg_not_ready/);
  r = step(g, 'week.end'); g = r.game;
  assert.equal(g.eggs[0].w, 2); assert.deepEqual(plain(r.result.hatchReady), [egg]);
  assert.equal(g.week, 3); invariants(g);
  const hatched = step(g, 'egg.hatch', { assetId: egg }, T0 + HOUR); g = hatched.game;
  assert.equal(g.dragons[1].name, 'Gece'); assert.equal(g.dragons[1].stage, 'yavru');
  for (let i = 0; i < 2; i++) g = step(g, 'week.end', {}, T0 + (2 + i) * HOUR).game;
  assert.equal(g.dragons[1].age, 2); assert.equal(g.dragons[1].stage, 'genc');
  invariants(g);
  // Rapor makbuza düz veri olarak yazılır.
  assert.doesNotThrow(() => JSON.stringify(r.result));
  assert.ok(r.result.report.every(x => typeof x.dragonAssetId === 'string' && Array.isArray(x.lines)));
  assert.ok(r.result.skipped.includes('rivalWeek'));
});

// ENG-10 (O-2): 20. hafta artık çıkmaz sokak değil; hafta sonu + nesil devri (js/season.js veri kısmı) tek komutta.
test('P-C season (ENG-10 O-2): week 20 ends the season and starts the next generation; no asset removed', () => {
  let g = start(); g.week = 19;
  const last = step(g, 'week.end').game;
  assert.equal(last.week, 20); assert.equal(last.over, false); assert.equal(last.ending, null);
  last.un = 41;
  const before = plain(last), oldStar = last.star;
  const r = step(last, 'week.end', {}, T0 + 10 * HOUR);
  g = r.game;
  assert.equal(g.seasonNo, 2); assert.equal(g.week, 1); assert.equal(g.over, false); assert.equal(g.ending, null);
  assert.equal(r.result.week.from, 20); assert.equal(r.result.week.to, 1);
  assert.equal(r.result.season.from, 1); assert.equal(r.result.season.to, 2); assert.equal(r.result.season.carryUn, 20);
  assert.equal(g.un, 20, 'ünün yarısı taşındı');
  assert.equal(g.seasons.length, 1); assert.equal(g.seasons[0].ending, 'sezon');
  // Varlık silinmez: aynı ejderha/yumurta/eşya kimlikleri; eski yıldız hocalığa çekilir.
  for (const k of ['dragons', 'eggs', 'inv']) assert.deepEqual(g[k].map(x => x.assetId).sort(), before[k].map(x => x.assetId).sort(), k);
  const retired = g.dragons.find(d => d.id === oldStar);
  assert.equal(retired.old, true); assert.equal(retired.retired, true); assert.equal(retired.legend, true);
  assert.equal(r.result.season.retired, retired.assetId);
  // Başka aday yok → yıldızsız sezon (season.js ile aynı: aday yoksa null).
  assert.equal(g.star, null); assert.equal(r.result.season.star, null);
  invariants(g);
  // Yeni sezonda hafta normal ilerler; çıkmaz sokak yok.
  const next = step(g, 'week.end', {}, T0 + 20 * HOUR).game;
  assert.equal(next.week, 2); assert.equal(next.seasonNo, 2); invariants(next);
  assert.equal(step(next, 'goals.claim').game.dragons.length, before.dragons.length);
});

test('P-C season (ENG-10 O-2): star children are preferred as the next star, like js/season.js', () => {
  const g = start(); g.week = 20; g.star = g.dragons[0].id;
  const st = g.dragons[0];
  const kid = { ...plain(st), id: 99, name: 'Yavru', assetId: 'acct:dragon:99', pids: [st.id], old: false, dead: false, funding: 'bound' };
  const other = { ...plain(st), id: 98, name: 'Başka', assetId: 'acct:dragon:98', pids: [], old: false, dead: false, funding: 'bound' };
  g.dragons.push(other, kid);
  const r = step(g, 'week.end', {}, T0 + HOUR);
  assert.equal(r.game.star, 99); assert.equal(r.result.season.star, 'acct:dragon:99');
  assert.equal(r.game.dragons.length, 3);
});

test('P-D4 debt: balance stops at 0, debt accrues, debtWeeks counts, bankruptcy never triggers', () => {
  let g = indebted(3);
  for (let i = 1; i <= 4; i++) {
    const r = step(g, 'week.end', {}, T0 + i * HOUR); g = r.game;
    invariants(g);
    assert.equal(g.gold, 0); assert.equal(g.debt, 7 + (i - 1) * 10); assert.equal(g.debtWeeks, i);
    assert.equal(g.neg, 0); // İstemcideki üç hafta iflas sayacı sunucuda işlemez.
    assert.equal(r.result.debt.after, g.debt); assert.equal(r.result.debt.weeks, i);
  }
  assert.equal(g.over, false); assert.equal(g.ending, null); assert.equal(g.dragons.length, 1);
});

test('P-D4 debt: spending commands are rejected; sales pay debt first; debtWeeks resets', () => {
  let g = step(indebted(3), 'week.end').game;
  assert.equal(g.debt, 7);
  const tile = g.grid.findIndex(t => t.open && !t.b), closed = g.grid.findIndex(t => !t.open);
  g.chibi.ores.obsidiyen = 5;
  for (const [type, args] of [['shop.food', { key: 'balik' }], ['building.buy', { kind: 'kulucka', tile }], ['land.clear', { tile: closed }],
    ['chibi.craft', { itemId: 'hat_2' }], ['stone.synthesize', { key: 'kor_t1' }], ['ore.convert', { from: 'obsidiyen', to: 'mercan' }],
    ['shop.egg', { id: g.market.egg.id }], ['shop.dragon', { id: g.market.dragons[0].id }]])
    assert.throws(() => step(g, type, args), err => err.code === 'debt_outstanding', type);
  // Kazanç önce borcu öder; kalan kendi kaynağıyla (başlangıç ejderhası bound) girer.
  const sold = step(g, 'dragon.sell', { assetId: g.dragons[0].assetId });
  const credit = sold.result.credit;
  assert.equal(credit.paidDebt, 7); assert.ok(credit.credited > 0);
  assert.equal(sold.game.debt, 0); assert.equal(sold.game.gold, credit.credited + sold.result.goals.reduce((s, x) => s + x.gold, 0));
  assert.equal(sold.game.funds.earned, 0); invariants(sold.game);
  const after = step(sold.game, 'week.end').game;
  assert.equal(after.debtWeeks, 0); assert.equal(after.debt, 0);
  assert.ok(step(after, 'shop.food', { key: 'balik' }).game.food.balik > after.food.balik); // Borç kapanınca harcama açılır.
});

test('P-D4 offset never upgrades a source class (fail-closed)', () => {
  const g = earnedFixture(start()); g.gold = 0; g.funds = { schema: 1, bound: 0, unknown: 0, earned: 0 }; g.debt = 50;
  assert.deepEqual(debt.receive(g, 30, 'earned'), { paidDebt: 30, credited: 0 });
  assert.equal(g.debt, 20); assert.equal(g.gold, 0); assert.equal(g.funds.earned, 0);
  assert.deepEqual(debt.receive(g, 30, 'bound'), { paidDebt: 20, credited: 10 });
  assert.equal(g.debt, 0); assert.equal(g.funds.bound, 10); assert.equal(g.funds.earned, 0);
  assert.throws(() => debt.debtOf({ gold: 5, debt: 1 }), /debt_state_invalid/);
  assert.throws(() => debt.debtOf({ gold: 0, debt: -1 }), /debt_state_invalid/);
  assert.equal(debt.debtOf({ gold: 5 }), 0); // Eski kayıt: alan yok = borç yok.
  const c = { gold: 4, funds: { schema: 1, bound: 1, unknown: 1, earned: 2 } };
  assert.deepEqual(plain(debt.charge(c, 10)), { paid: 4, unpaid: 6, debit: { bound: 1, unknown: 1, earned: 2 } });
  assert.equal(c.debt, 6); assert.equal(c.gold, 0);
});

test('P-C week state is not funds, food, inventory or trade/market shapes', () => {
  const g = step(start(), 'week.end').game;
  assert.ok(!('weekTickets' in g) && !('weekTickets' in g.funds) && !('weekTickets' in g.foodSources) && !('weekTickets' in g.food));
  assert.throws(() => normalizeOffer({ weekTickets: 1 }), /unknown_offer_field/);
  assert.throws(() => normalizeOffer({ tickets: 1 }), /unknown_offer_field/);
  assert.throws(() => normalizeOffer({ debt: 1 }), /unknown_offer_field/);
});

function storeFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-pc-')), file = path.join(dir, 'pc.sqlite');
  let clock = T0;
  const store = openEconomyStore(file, { now: () => clock }), raw = new DatabaseSync(file);
  t.after(() => { raw.close(); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const load = id => JSON.parse(raw.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(id).game_json);
  const save = (id, g) => raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), id);
  const fresh = () => { const id = store.createGuest().accountId; store.executeCommand(id, { requestId: uuid(), expectedVersion: 0, type: 'game.start', args: {} }); return id; };
  const input = (id, type, args = {}) => ({ requestId: uuid(), expectedVersion: store.readEconomy(id).version, type, args });
  const run = (id, type, args) => store.executeCommand(id, input(id, type, args));
  return { store, load, save, fresh, input, run, tick: ms => { clock += ms; }, set: v => { clock = v; } };
}

test('P-C SQLite: idempotent receipt, stale/concurrent second request cannot double-spend', t => {
  const f = storeFixture(t), a = f.fresh();
  const req = f.input(a, 'week.end');
  const first = f.store.executeCommand(a, req);
  const replay = f.store.executeCommand(a, req);
  assert.equal(replay.replayed, true); assert.deepEqual(plain(replay.result), plain(first.result));
  assert.equal(f.load(a).week, 2, 'tekrar ikinci haftayı bitirmez');
  // Aynı requestId, farklı expectedVersion: hash farklı (ENG06_05 bulgusu) → yeniden kullanım reddi, hafta ilerlemez.
  assert.throws(() => f.store.executeCommand(a, { ...req, expectedVersion: req.expectedVersion + 1 }), /request_id_reused/);
  // İki sekme aynı sürümle: biri geçer, diğeri version_conflict; tek hafta ilerler.
  const v = f.store.readEconomy(a).version;
  const x = { requestId: uuid(), expectedVersion: v, ...cmd('week.end') }, y = { requestId: uuid(), expectedVersion: v, ...cmd('week.end') };
  f.store.executeCommand(a, x);
  assert.throws(() => f.store.executeCommand(a, y), /version_conflict/);
  assert.equal(f.load(a).week, 3);
});

test('ENG-12 SQLite: many weeks at the same server time, clock rollback does not matter; legacy exhausted tickets ignored', t => {
  const f = storeFixture(t), a = f.fresh();
  const g = f.load(a); g.weekTickets = { schema: 1, count: 0, at: T0 + 1000 * HOUR }; f.save(a, g);
  for (let i = 0; i < 10; i++) f.run(a, 'week.end');
  f.tick(-30 * 24 * HOUR);
  const r = f.run(a, 'week.end');
  assert.equal(r.economy.game.week, 12); assert.equal('ticket' in r.result, false);
  assert.equal(Object.hasOwn(f.load(a), 'weekTickets'), false);
});

test('P-D4 SQLite: indebted account cannot offer or complete a trade; trades do not touch the week', t => {
  const f = storeFixture(t), a = f.fresh(), b = f.fresh();
  for (const id of [a, b]) f.save(id, earnedFixture(f.load(id)));
  const g = f.load(a); g.gold = 0; g.funds = { schema: 1, bound: 0, unknown: 0, earned: 0 }; g.debt = 25; g.debtWeeks = 1; f.save(a, g);
  const tr = (u, type, extra) => f.store.executeTrade(u, { type, requestId: uuid(), ...extra }).trade;
  let trade = tr(a, 'invite', { targetId: b }); trade = tr(b, 'accept', { tradeId: trade.id });
  assert.throws(() => tr(a, 'offer', { tradeId: trade.id, revision: trade.revision, offer: { dragons: [g.dragons[0].assetId] } }), /debt_outstanding/);
  assert.throws(() => tr(b, 'offer', { tradeId: trade.id, revision: trade.revision, offer: { gold: 10 } }), /debt_outstanding/);
  tr(a, 'cancel', { tradeId: trade.id });
  assert.throws(() => f.run(a, 'shop.food', { key: 'balik' }), /debt_outstanding/);
  // Borçsuz iki hesap arasında takas haftaya dokunmaz.
  const c = f.fresh(); f.save(c, earnedFixture(f.load(c)));
  f.run(b, 'week.end'); f.run(c, 'week.end');
  const tb = f.load(b).week, tc = f.load(c).week;
  trade = tr(b, 'invite', { targetId: c }); trade = tr(c, 'accept', { tradeId: trade.id });
  trade = tr(b, 'offer', { tradeId: trade.id, revision: trade.revision, offer: { gold: 10 } });
  tr(b, 'confirm', { tradeId: trade.id, revision: trade.revision });
  assert.equal(tr(c, 'confirm', { tradeId: trade.id, revision: trade.revision }).status, 'completed');
  assert.equal(f.load(b).week, tb); assert.equal(f.load(c).week, tc);
});

test('P-C SQLite: legacy state without debt fields gets safe defaults', t => {
  const f = storeFixture(t), a = f.fresh();
  const g = f.load(a); assert.equal(g.weekTickets, undefined); assert.equal(g.debt, undefined);
  assert.equal(f.store.readEconomy(a).debt, 0);
  const r = f.run(a, 'week.end');
  assert.equal(r.economy.game.weekTickets, undefined); assert.equal(r.economy.debt, 0); assert.equal(r.economy.game.debtWeeks, 0);
});

test('ENG-12: 25 consecutive week.end at one server time cross the season (20th week roll) without any limit; assets kept', () => {
  let g = start();
  const ids = ['dragons', 'eggs', 'inv'].map(k => g[k].map(x => x.assetId).sort());
  for (let i = 0; i < 25; i++) g = step(g, 'week.end').game;
  assert.equal(g.seasonNo, 2); assert.equal(g.week, 6);
  assert.deepEqual(['dragons', 'eggs', 'inv'].map(k => g[k].map(x => x.assetId).sort()), ids);
  invariants(g);
});
