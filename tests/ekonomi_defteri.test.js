'use strict';
// Ekonomi defteri (server/ekonomi_defteri.js) ve D7 Bedesten kesintisi (%5): saf kurallar + SQLite deposu.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { openEconomyStore } = require('../server/economy_store');
const { marketFee } = require('../server/market_service');
const defter = require('../server/ekonomi_defteri');
const { earnedFixture } = require('./helpers/earned_fixture');
const uuid = () => crypto.randomUUID();

test('defter: komut satırı altın farkından çıkar; gold.local nedeniyle ayrılır; fark yoksa satır yok', () => {
  assert.deepEqual(defter.komutKalemleri('arena.settle', {}, 100, 180), [{ kalem: 'arena.settle', giris: 80, cikis: 0, hacim: 0 }]);
  assert.deepEqual(defter.komutKalemleri('building.buy', {}, 300, 180), [{ kalem: 'building.buy', giris: 0, cikis: 120, hacim: 0 }]);
  assert.equal(defter.komutKalemleri('gold.local', { reason: 'dungeon' }, 0, 582)[0].kalem, 'gold.local.dungeon');
  assert.equal(defter.komutKalemleri('gold.local', { reason: 'A B<script>' }, 0, 5)[0].kalem, 'bilinmeyen');
  assert.deepEqual(defter.komutKalemleri('dragon.rename', {}, 50, 50), []);
  assert.deepEqual(defter.pazarKalemleri({ total: 200, fee: 10 }), [{ kalem: 'bedesten.ciro', giris: 0, cikis: 0, hacim: 200 }, { kalem: 'bedesten.kesinti', giris: 0, cikis: 10, hacim: 0 }]);
});

test('D7: kesinti %5, aşağı yuvarlanır; 20 altının altında 0', () => {
  assert.equal(marketFee(19), 0); assert.equal(marketFee(20), 1); assert.equal(marketFee(175), 8); assert.equal(marketFee(2_000_000_000), 100_000_000);
});

test('defter: özet gün ve kalem toplar, net ve çıkış/giriş oranı verir', () => {
  const o = defter.ozet([
    { gun: 20000, kalem: 'arena.settle', giris: 300, cikis: 0, n: 3, hacim: 0 },
    { gun: 20001, kalem: 'arena.settle', giris: 100, cikis: 0, n: 1, hacim: 0 },
    { gun: 20001, kalem: 'building.buy', giris: 0, cikis: 100, n: 1, hacim: 0 },
  ], 20001);
  assert.equal(o.giris, 400); assert.equal(o.cikis, 100); assert.equal(o.net, 300); assert.equal(o.oran, 25);
  assert.equal(o.kalemler[0].kalem, 'arena.settle'); assert.equal(o.kalemler[0].n, 4);
  assert.equal(o.gunler.length, 2); assert.equal(o.gunler[0].net, 0);
});

test('SQLite: komut ve Bedesten satışı aynı işlemde sayılır; yeniden deneme iki kez sayılmaz', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-defter-')), file = path.join(dir, 'db.sqlite');
  const store = openEconomyStore(file), raw = new DatabaseSync(file);
  t.after(() => { raw.close(); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const load = id => JSON.parse(raw.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(id).game_json);
  const save = (id, g) => raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), id);
  const fresh = () => { const id = store.createGuest().accountId; store.executeCommand(id, { requestId: uuid(), expectedVersion: 0, type: 'game.start', args: {} });
    const g = load(id); g.food.balik = 5; earnedFixture(g); save(id, g); return id; };
  const a = fresh(), b = fresh();
  const gun = () => store.readLedger(0, 1e9);
  // gold.local gideri: yerel harcama
  const cmd = { requestId: uuid(), expectedVersion: store.readEconomy(a).version, type: 'gold.local', args: { amount: -20, reason: 'other' } };
  store.executeCommand(a, cmd); store.executeCommand(a, cmd);   // ikincisi makbuzdan döner
  const yerel = gun().find(r => r.kalem === 'gold.local.other');
  assert.equal(yerel.cikis, 20); assert.equal(yerel.n, 1);
  // Bedesten: 3 balık × 40 = 120 → satıcıya 114, kesinti 6
  const listing = store.executeMarket(a, { op: 'list', requestId: uuid(), kind: 'food', foodKey: 'balik', quantity: 3, unitPrice: 40 }).listing;
  const goldA = store.readEconomy(a).gold, goldB = store.readEconomy(b).gold;
  const buy = { op: 'buy', requestId: uuid(), listingId: listing.id, quantity: 3, unitPrice: 40 };
  const sale = store.executeMarket(b, buy).sale; store.executeMarket(b, buy);
  assert.equal(sale.fee, 6); assert.equal(sale.net, 114);
  assert.equal(store.readEconomy(a).gold - goldA, 114); assert.equal(goldB - store.readEconomy(b).gold, 120);
  const ea = store.readEconomy(a); assert.equal(ea.funds.bound + ea.funds.unknown + ea.funds.earned, ea.gold);
  const k = gun().find(r => r.kalem === 'bedesten.kesinti'), c = gun().find(r => r.kalem === 'bedesten.ciro');
  assert.equal(k.cikis, 6); assert.equal(k.n, 1); assert.equal(c.hacim, 120);
  const o = defter.ozet(gun(), 0); assert.equal(o.cikis, 26);
});
