'use strict';
// ENG06 P-C ilk dilim: week.end, hafta bileti (D2) ve borç (D4). SQLite + saf indirgeyici.
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { reduceCommand, validateCommand } = require('../server/economy_commands');
const { openEconomyStore } = require('../server/economy_store');
const { syncTickets, takeTicket } = require('../server/week_runtime');
const { readTicketConfig, PLACEHOLDER_DEFAULTS, TICKETS } = require('../server/week_config');
const debt = require('../server/economy_debt');
const { normalizeOffer } = require('../js/trade_engine');
const { earnedFixture } = require('./helpers/earned_fixture');

const uuid = () => crypto.randomUUID();
const plain = v => JSON.parse(JSON.stringify(v));
const HOUR = 3600000, T0 = 1_800_000_000_000;
const CFG = Object.freeze({ refillMs: HOUR, cap: 2, initial: 2 });
const env = (now, tickets = CFG) => ({ accountId: 'acct', seed: uuid(), now, tickets });
const start = () => reduceCommand(null, { type: 'game.start', args: {} }, env(T0)).game;
const cmd = type => ({ type, args: {} });
const step = (game, type, args = {}, now = T0, tickets = CFG) =>
  reduceCommand(game, validateCommand({ type, args, requestId: uuid(), expectedVersion: 0 }).command, env(now, tickets));
const fundsTotal = g => g.funds.bound + g.funds.unknown + g.funds.earned;
function invariants(g) {
  assert.equal(fundsTotal(g), g.gold, 'funds toplamı = gold');
  assert.ok(g.gold >= 0 && Object.values(g.funds).every(n => typeof n !== 'number' || n >= 0));
  if ((g.debt || 0) > 0) assert.equal(g.gold, 0, 'borç varken bakiye 0');
  assert.equal(g.over, false); assert.equal(g.ending, null);
}
const indebted = (amount = 3) => { const g = start(); g.gold = amount; g.funds = { schema: 1, bound: amount, unknown: 0, earned: 0 }; return g; };

test('P-C config: placeholder defaults, env overrides and fail-closed validation', () => {
  assert.deepEqual({ ...PLACEHOLDER_DEFAULTS }, { refillMs: 3 * HOUR, cap: 8, initial: 6 });
  assert.deepEqual({ ...readTicketConfig({}) }, { refillMs: 3 * HOUR, cap: 8, initial: 6 });
  assert.deepEqual({ ...readTicketConfig({ EO_WEEK_TICKET_REFILL_MS: '60000', EO_WEEK_TICKET_CAP: '3', EO_WEEK_TICKET_INITIAL: '1' }) }, { refillMs: 60000, cap: 3, initial: 1 });
  for (const bad of [{ EO_WEEK_TICKET_CAP: '0' }, { EO_WEEK_TICKET_CAP: '-1' }, { EO_WEEK_TICKET_REFILL_MS: '1.5' }, { EO_WEEK_TICKET_REFILL_MS: '999' },
    { EO_WEEK_TICKET_INITIAL: '9' }, { EO_WEEK_TICKET_CAP: 'abc' }]) assert.throws(() => readTicketConfig(bad), /invalid_/);
  assert.ok(TICKETS.cap >= 1);
});

test('P-C ticket: initial, lazy refill, cap, time advance and clock rollback', () => {
  const g = {};
  assert.throws(() => syncTickets(g, undefined, CFG), /server_time_unavailable/);
  assert.deepEqual(plain(syncTickets(g, T0, CFG)), { schema: 1, count: 2, at: T0 });
  assert.equal(takeTicket(g, T0, CFG).count, 1);
  assert.equal(takeTicket(g, T0, CFG).count, 0);
  assert.throws(() => takeTicket(g, T0 + HOUR - 1, CFG), /week_ticket_unavailable/);
  assert.equal(g.weekTickets.count, 0);
  assert.equal(syncTickets(g, T0 + HOUR, CFG).count, 1); // Tembel dolum: tam bir süre.
  assert.equal(g.weekTickets.at, T0 + HOUR);
  // Saat geri alma: dolum yok, çapa geri gitmez.
  assert.equal(syncTickets(g, T0 - 10 * HOUR, CFG).count, 1);
  assert.equal(g.weekTickets.at, T0 + HOUR);
  assert.equal(syncTickets(g, T0 + HOUR + HOUR / 2, CFG).count, 1); // Kısmi süre biriktirilir.
  assert.equal(syncTickets(g, T0 + 100 * HOUR, CFG).count, 2); // Tavan.
  assert.equal(g.weekTickets.at, T0 + 100 * HOUR);
  // Tavanda geçen zaman sonradan bilet üretmez.
  assert.equal(takeTicket(g, T0 + 200 * HOUR, CFG).count, 1);
  assert.equal(syncTickets(g, T0 + 200 * HOUR + HOUR - 1, CFG).count, 1);
  for (const bad of [null, { schema: 2, count: 1, at: 0 }, { schema: 1, count: -1, at: 0 }, { schema: 1, count: 1.5, at: 0 }])
    assert.throws(() => syncTickets({ weekTickets: bad }, T0, CFG), /week_ticket_state_invalid/);
  // Tavan düşürülürse fazla bilet tutulmaz.
  assert.equal(syncTickets({ weekTickets: { schema: 1, count: 9, at: T0 } }, T0, CFG).count, 2);
});

test('P-C week.end: client cannot pass week/time/tickets; ticket-less request never runs endWeek', () => {
  for (const args of [{ week: 5 }, { now: T0 }, { tickets: 9 }, { w: 2 }])
    assert.throws(() => validateCommand({ requestId: uuid(), expectedVersion: 1, type: 'week.end', args }), /invalid_arguments/);
  for (const extra of [{ now: T0 }, { tickets: 4 }]) assert.throws(() => validateCommand({ requestId: uuid(), expectedVersion: 1, ...cmd('week.end'), ...extra }), /unknown_command_field/);
  let g = start();
  g = step(g, 'week.end').game; g = step(g, 'week.end').game;
  assert.equal(g.week, 3); assert.equal(g.weekTickets.count, 0);
  const before = plain(g);
  assert.throws(() => step(g, 'week.end', {}, T0 + HOUR - 1), /week_ticket_unavailable/);
  assert.deepEqual(plain(g), before);
  assert.equal(step(g, 'week.end', {}, T0 + HOUR).game.week, 4);
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
  r = step(g, 'week.end', {}, T0 + HOUR); g = r.game;
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

test('P-C season: week 20 is not advanced, returns explicit code, keeps account and tickets', () => {
  const g = start(); g.week = 20;
  const before = plain(g);
  assert.throws(() => step(g, 'week.end'), err => err.code === 'season_end_unsupported' && err.status === 409);
  assert.deepEqual(plain(g), before);
  g.week = 19;
  const last = step(g, 'week.end').game;
  assert.equal(last.week, 20); assert.equal(last.over, false); assert.equal(last.ending, null);
  assert.throws(() => step(last, 'week.end', {}, T0 + 10 * HOUR), /season_end_unsupported/);
  assert.equal(step(last, 'goals.claim').game.dragons.length, 1); // Hesap ve oyun yerinde.
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

test('P-C tickets are not funds, food, inventory or trade/market shapes', () => {
  const g = step(start(), 'week.end').game;
  assert.ok(g.weekTickets && !('weekTickets' in g.funds) && !('weekTickets' in g.foodSources) && !('weekTickets' in g.food));
  for (const rows of [g.inv, g.dragons, g.eggs]) assert.ok(rows.every(r => !JSON.stringify(r).includes('weekTickets')));
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
  assert.equal(first.result.ticket.count, TICKETS.initial - 1);
  const replay = f.store.executeCommand(a, req);
  assert.equal(replay.replayed, true); assert.deepEqual(plain(replay.result), plain(first.result));
  assert.equal(f.load(a).week, 2); assert.equal(f.load(a).weekTickets.count, TICKETS.initial - 1);
  // Aynı requestId, farklı expectedVersion: hash farklı (ENG06_05 bulgusu) → yeniden kullanım reddi, bilet harcanmaz.
  assert.throws(() => f.store.executeCommand(a, { ...req, expectedVersion: req.expectedVersion + 1 }), /request_id_reused/);
  // İki sekme aynı sürümle: biri geçer, diğeri version_conflict; tek bilet harcanır.
  const v = f.store.readEconomy(a).version;
  const x = { requestId: uuid(), expectedVersion: v, ...cmd('week.end') }, y = { requestId: uuid(), expectedVersion: v, ...cmd('week.end') };
  f.store.executeCommand(a, x);
  assert.throws(() => f.store.executeCommand(a, y), /version_conflict/);
  assert.equal(f.load(a).week, 3); assert.equal(f.load(a).weekTickets.count, TICKETS.initial - 2);
});

test('P-C SQLite: tickets run out, server clock rollback grants nothing, refill after time', t => {
  const f = storeFixture(t), a = f.fresh();
  for (let i = 0; i < TICKETS.initial; i++) f.run(a, 'week.end');
  assert.throws(() => f.run(a, 'week.end'), /week_ticket_unavailable/);
  const before = f.store.readEconomy(a);
  f.tick(-30 * 24 * HOUR);
  assert.throws(() => f.run(a, 'week.end'), /week_ticket_unavailable/);
  f.set(T0 + TICKETS.refillMs - 1);
  assert.throws(() => f.run(a, 'week.end'), /week_ticket_unavailable/);
  assert.deepEqual(f.store.readEconomy(a), before);
  f.set(T0 + TICKETS.refillMs);
  const r = f.run(a, 'week.end');
  assert.equal(r.economy.game.week, TICKETS.initial + 2); assert.equal(r.result.ticket.count, 0);
});

test('P-D4 SQLite: indebted account cannot offer or complete a trade; tickets untouched by trades', t => {
  const f = storeFixture(t), a = f.fresh(), b = f.fresh();
  for (const id of [a, b]) f.save(id, earnedFixture(f.load(id)));
  const g = f.load(a); g.gold = 0; g.funds = { schema: 1, bound: 0, unknown: 0, earned: 0 }; g.debt = 25; g.debtWeeks = 1; f.save(a, g);
  const tr = (u, type, extra) => f.store.executeTrade(u, { type, requestId: uuid(), ...extra }).trade;
  let trade = tr(a, 'invite', { targetId: b }); trade = tr(b, 'accept', { tradeId: trade.id });
  assert.throws(() => tr(a, 'offer', { tradeId: trade.id, revision: trade.revision, offer: { dragons: [g.dragons[0].assetId] } }), /debt_outstanding/);
  assert.throws(() => tr(b, 'offer', { tradeId: trade.id, revision: trade.revision, offer: { gold: 10 } }), /debt_outstanding/);
  tr(a, 'cancel', { tradeId: trade.id });
  assert.throws(() => f.run(a, 'shop.food', { key: 'balik' }), /debt_outstanding/);
  // Borçsuz iki hesap arasında takas biletlere dokunmaz.
  const c = f.fresh(); f.save(c, earnedFixture(f.load(c)));
  f.run(b, 'week.end'); f.run(c, 'week.end');
  const tb = f.load(b).weekTickets, tc = f.load(c).weekTickets;
  trade = tr(b, 'invite', { targetId: c }); trade = tr(c, 'accept', { tradeId: trade.id });
  trade = tr(b, 'offer', { tradeId: trade.id, revision: trade.revision, offer: { gold: 10 } });
  tr(b, 'confirm', { tradeId: trade.id, revision: trade.revision });
  assert.equal(tr(c, 'confirm', { tradeId: trade.id, revision: trade.revision }).status, 'completed');
  assert.deepEqual(f.load(b).weekTickets, tb); assert.deepEqual(f.load(c).weekTickets, tc);
});

test('P-C SQLite: legacy state without ticket/debt fields gets safe defaults', t => {
  const f = storeFixture(t), a = f.fresh();
  const g = f.load(a); assert.equal(g.weekTickets, undefined); assert.equal(g.debt, undefined);
  assert.equal(f.store.readEconomy(a).debt, 0);
  const r = f.run(a, 'week.end');
  assert.equal(r.economy.game.weekTickets.count, TICKETS.initial - 1); assert.equal(r.economy.debt, 0); assert.equal(r.economy.game.debtWeeks, 0);
});
