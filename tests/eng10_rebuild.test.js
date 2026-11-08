'use strict';
// ENG-10 · K5 iflas: hesap silinmez; borç eşiği (art arda 3 borçlu hafta) aşılınca "ocağı yeniden kur".
// Varlık kaybı yok, yeni altın yok, D4 borç kuralları (bakiye 0, mahsup, harcama/takas kapısı) değişmez.
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { reduceCommand, validateCommand, COMMAND_TYPES } = require('../server/economy_commands');
const { openEconomyStore } = require('../server/economy_store');
const { weekStatus } = require('../server/week_runtime');
const debt = require('../server/economy_debt');

const uuid = () => crypto.randomUUID();
const plain = v => JSON.parse(JSON.stringify(v));
const HOUR = 3600000, T0 = 1_800_000_000_000;
const CFG = Object.freeze({ refillMs: HOUR, cap: 8, initial: 8 });
const env = now => ({ accountId: 'acct', seed: uuid(), now, tickets: CFG });
const start = () => reduceCommand(null, { type: 'game.start', args: {} }, env(T0)).game;
const step = (game, type, args = {}, now = T0) => reduceCommand(game, validateCommand({ type, args, requestId: uuid(), expectedVersion: 0 }).command, env(now));
const indebted = () => { const g = start(); g.gold = 3; g.funds = { schema: 1, bound: 3, unknown: 0, earned: 0 }; return g; };
const assets = g => ['dragons', 'eggs', 'inv'].map(k => g[k].map(x => x.assetId + ':' + x.funding).sort());

test('ENG-10 K5: eşik öncesi yeniden kurma yok; eşikte borç silinir, varlık ve kaynak sınıfları aynen kalır', () => {
  assert.ok(COMMAND_TYPES.includes('ocak.rebuild'));
  assert.throws(() => step(start(), 'ocak.rebuild'), err => err.code === 'rebuild_unavailable' && err.status === 409, 'borçsuz');
  let g = indebted();
  for (let i = 1; i <= 2; i++) g = step(g, 'week.end', {}, T0 + i * HOUR).game;
  assert.equal(g.debtWeeks, 2);
  assert.throws(() => step(g, 'ocak.rebuild'), /rebuild_unavailable/, '2 hafta: eşik altı');
  assert.equal(weekStatus(g, T0, CFG).rebuild.available, false);
  g = step(g, 'week.end', {}, T0 + 3 * HOUR).game;
  assert.equal(g.debtWeeks, debt.REBUILD_DEBT_WEEKS); assert.ok(g.debt > 0);
  assert.deepEqual(weekStatus(g, T0, CFG).rebuild, { available: true, threshold: 3 });
  const before = plain(g);
  const r = step(g, 'ocak.rebuild');
  assert.deepEqual(r.result.rebuilt, true); assert.equal(r.result.writtenOff, before.debt); assert.equal(r.result.rebuilds, 1);
  const after = r.game;
  assert.equal(after.debt, 0); assert.equal(after.debtWeeks, 0); assert.equal(after.gold, 0, 'yeni altın üretilmez');
  assert.deepEqual(after.funds, before.funds); assert.deepEqual(after.foodSources, before.foodSources); assert.deepEqual(after.food, before.food);
  assert.deepEqual(assets(after), assets(before), 'hiçbir varlık silinmedi, kaynak sınıfı değişmedi');
  assert.deepEqual(after.grid, before.grid, 'binalar yerinde');
  assert.equal(after.over, false); assert.equal(after.ending, null); assert.equal(after.week, before.week);
  // Borç kapısı kalktı: harcama artık borç yüzünden değil, yalnız bakiye yüzünden reddedilir.
  assert.throws(() => step(after, 'shop.food', { key: 'balik' }), err => err.code !== 'debt_outstanding');
  assert.throws(() => step(after, 'ocak.rebuild'), /rebuild_unavailable/, 'tekrar kurulamaz');
  // D4 aynen: gider yine borç yazar; sonraki eşikte yeniden kurulabilir (sayaç birikir).
  const again = step(after, 'week.end', {}, T0 + 4 * HOUR).game;
  assert.ok(again.debt > 0); assert.equal(again.debtWeeks, 1); assert.equal(again.rebuilds, 1);
});

test('ENG-10 K5 SQLite: makbuz ve idempotency; hesap ve varlıklar silinmez', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-k5-')), file = path.join(dir, 'db.sqlite');
  const store = openEconomyStore(file), raw = new DatabaseSync(file);
  t.after(() => { raw.close(); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const id = store.createGuest().accountId;
  store.executeCommand(id, { requestId: uuid(), expectedVersion: 0, type: 'game.start', args: {} });
  const g = JSON.parse(raw.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(id).game_json);
  Object.assign(g, { gold: 0, funds: { schema: 1, bound: 0, unknown: 0, earned: 0 }, debt: 40, debtWeeks: 3 });
  raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), id);
  const eco = store.readEconomy(id);
  const body = { requestId: uuid(), expectedVersion: eco.version, type: 'ocak.rebuild', args: {} };
  const first = store.executeCommand(id, body);
  assert.equal(first.result.writtenOff, 40); assert.equal(first.economy.debt, 0);
  const again = store.executeCommand(id, body);
  assert.equal(again.replayed, true); assert.equal(again.result.writtenOff, 40);
  assert.equal(store.readEconomy(id).version, first.appliedVersion, 'tekrar ikinci kez yazmaz');
  assert.deepEqual(store.readEconomy(id).dragons.map(d => d.assetId), eco.dragons.map(d => d.assetId));
  assert.throws(() => store.executeCommand(id, { requestId: uuid(), expectedVersion: first.appliedVersion, type: 'ocak.rebuild', args: {} }), /rebuild_unavailable/);
  assert.throws(() => store.executeCommand(id, { requestId: uuid(), expectedVersion: first.appliedVersion, type: 'ocak.rebuild', args: { debt: 0 } }), /invalid_arguments/);
});
