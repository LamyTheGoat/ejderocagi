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
const env = now => ({ accountId: 'acct', seed: uuid(), now });
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
  assert.equal(weekStatus(g, T0).rebuild.available, false);
  g = step(g, 'week.end', {}, T0 + 3 * HOUR).game;
  assert.equal(g.debtWeeks, debt.REBUILD_DEBT_WEEKS); assert.ok(g.debt > 0);
  assert.deepEqual(weekStatus(g, T0).rebuild, { available: true, threshold: 3, cooldown: 8, waitWeeks: 0, waitMs: 0 });
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

test('ENG-10 Y-2: yeniden kurmadan sonra 8 hafta geçmeden tekrar yok (rebuild_cooldown); süre dolunca açılır; sezon devrinde sayaç kaybolmaz', () => {
  assert.equal(debt.REBUILD_COOLDOWN_WEEKS, 8);
  assert.equal(debt.readRebuildCooldown({ EO_REBUILD_COOLDOWN_WEEKS: '12' }), 12);
  for (const bad of ['-1', '1.5', 'abc', '1001']) assert.throws(() => debt.readRebuildCooldown({ EO_REBUILD_COOLDOWN_WEEKS: bad }), /invalid_EO_REBUILD_COOLDOWN_WEEKS/);
  let g = indebted(), t = T0;
  for (let i = 0; i < 3; i++) g = step(g, 'week.end', {}, (t += HOUR)).game;
  const weekAt = g.week;
  g = step(g, 'ocak.rebuild').game;
  assert.equal(g.lastRebuildWeek, weekAt);
  // Borç yeniden birikir (3 hafta) ama bekleme sürüyor.
  for (let i = 0; i < 3; i++) g = step(g, 'week.end', {}, (t += HOUR)).game;
  assert.ok(g.debtWeeks >= 3);
  assert.throws(() => step(g, 'ocak.rebuild'), err => err.code === 'rebuild_cooldown' && err.status === 409);
  const st = weekStatus(g, t).rebuild;
  assert.equal(st.available, false); assert.equal(st.waitWeeks, 5); assert.equal(st.cooldown, 8);
  for (let i = 0; i < 5; i++) g = step(g, 'week.end', {}, (t += HOUR)).game;
  // ENG-12 QA ORTA-1: 8 hafta doldu ama gerçek zamanda 24 saat geçmedi → hâlâ kapalı (iki şart birlikte).
  const early = weekStatus(g, t).rebuild;
  assert.equal(early.waitWeeks, 0); assert.ok(early.waitMs > 0); assert.equal(early.available, false);
  assert.throws(() => step(g, 'ocak.rebuild', {}, t), err => err.code === 'rebuild_cooldown');
  t = g.lastRebuildAt + debt.REBUILD_COOLDOWN_MS;
  assert.equal(weekStatus(g, t).rebuild.available, true);
  const before = plain(g);
  const r = step(g, 'ocak.rebuild', {}, t);
  assert.equal(r.result.rebuilds, 2); assert.deepEqual(assets(r.game), assets(before), 'varlık bedeli yok');
  // Sezon devri: hafta 1'e dönse de bekleme tekdüze hafta sayacıyla sürer.
  const h = plain(r.game); h.seasonNo = 2; h.week = 1; h.lastRebuildWeek = 18; h.debt = 5; h.gold = 0; h.funds = { schema: 1, bound: 0, unknown: 0, earned: 0 }; h.debtWeeks = 3;
  assert.equal(debt.rebuildStatus(h).waitWeeks, 5, '18 + 8 − 21');
});

test('ENG-12 QA ORTA-1: 24 saat yeterli değil, 8 hafta da gerekir; sunucu saati yoksa reddedilir; eski kayıtta yalnız hafta şartı', () => {
  assert.equal(debt.REBUILD_COOLDOWN_MS, 24 * HOUR);
  const g = { gold: 0, debt: 50, debtWeeks: 3, week: 5, lastRebuildWeek: 4, lastRebuildAt: T0 };
  let st = debt.rebuildStatus(g, 8, T0 + 48 * HOUR);
  assert.equal(st.waitMs, 0); assert.equal(st.waitWeeks, 7); assert.equal(st.available, false, 'saat geçti, hafta geçmedi');
  assert.throws(() => debt.rebuild(g, 8, T0 + 48 * HOUR), /rebuild_cooldown/);
  g.week = 12;
  st = debt.rebuildStatus(g, 8, T0 + 23 * HOUR);
  assert.equal(st.waitWeeks, 0); assert.equal(st.waitMs, HOUR); assert.equal(st.available, false, 'hafta geçti, saat geçmedi');
  assert.equal(debt.rebuildStatus(g, 8, null).waitMs, 24 * HOUR, 'saat bilinmiyorsa en muhafazakâr');
  assert.throws(() => debt.rebuild(g, 8, undefined), err => err.code === 'server_time_unavailable' && err.status === 503);
  assert.equal(debt.rebuild(g, 8, T0 + 24 * HOUR).rebuilt, true);
  assert.equal(g.lastRebuildAt, T0 + 24 * HOUR);
  const legacy = { gold: 0, debt: 50, debtWeeks: 3, week: 12, lastRebuildWeek: 4 };
  assert.equal(debt.rebuildStatus(legacy, 8, T0).available, true, 'eski kayıt: lastRebuildAt yok');
});
