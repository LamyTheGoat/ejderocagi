'use strict';
// Ocak Postası (server/posta_service.js): yalnız okur; satış haberi satıcıya, başkasına değil; ekonomiye dokunmaz.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { openEconomyStore } = require('../server/economy_store');
const { createPosta, postaKur, POSTA } = require('../server/posta_service');
const { earnedFixture } = require('./helpers/earned_fixture');
const uuid = () => crypto.randomUUID();
const GUN = 24 * 60 * 60 * 1000;

test('postaKur: satışlar ve dostluk istekleri yeniden eskiye; 14 günden eski ve bozuk satırlar atılır; en çok 30', () => {
  const now = 100 * GUN;
  const mine = [
    { title: 'Kor', kind: 'dragon', status: 'sold', sales: [{ id: 'ms_1', at: now - 1000, quantity: 1, total: 250, buyer: '@alici' }] },
    { title: 'balik', kind: 'food', foodKey: 'balik', status: 'open', sales: [{ id: 'ms_2', at: now - 5000, quantity: 3, total: 30, buyer: null }, { id: 'ms_eski', at: now - 15 * GUN, quantity: 1, total: 10 }, { at: now }, null] },
    { title: 'bos', kind: 'item', status: 'open', sales: 'bozuk' }, null,
  ];
  const sosyal = { gelen: { a: { h: '@dost', ad: 'Aylin', t: now - 2000 }, b: { h: '@eski', ad: 'Eski', t: now - 20 * GUN }, c: 'bozuk' } };
  const L = postaKur({ mine, sosyal, now });
  assert.deepEqual(L.map(s => s.id), ['satis:ms_1', 'dost:@dost:' + (now - 2000), 'satis:ms_2']);
  assert.equal(L[0].bitti, true); assert.equal(L[0].altin, 250); assert.equal(L[0].alici, '@alici');
  assert.equal(L[2].yem, 'balik'); assert.equal(L[2].adet, 3); assert.equal(L[2].bitti, false);
  assert.equal(L[1].ad, 'Aylin');
  const cok = [{ title: 'x', kind: 'food', foodKey: 'balik', sales: Array.from({ length: 50 }, (_, i) => ({ id: 'ms_' + i, at: now - i, quantity: 1, total: 1 })) }];
  assert.equal(postaKur({ mine: cok, sosyal: null, now }).length, POSTA.enCok);
  assert.deepEqual(postaKur({ mine: null, sosyal: undefined, now }), []);
});

test('posta: gerçek Bedesten satışı satıcının postasına düşer, alıcınınkine düşmez; okuma ekonomiyi değiştirmez', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-posta-')), file = path.join(dir, 'db.sqlite');
  let clock = Date.now();
  const store = openEconomyStore(file, { now: () => clock }), raw = new DatabaseSync(file);
  t.after(() => { raw.close(); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const load = id => JSON.parse(raw.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(id).game_json);
  const save = (id, g) => raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), id);
  const fresh = () => { const g0 = store.createGuest(), id = g0.accountId; store.executeCommand(id, { requestId: uuid(), expectedVersion: 0, type: 'game.start', args: {} });
    const g = load(id); g.eggs.forEach(e => { e.inK = false; }); earnedFixture(g); save(id, g); return { accountId: id, handle: g0.handle }; };
  const satici = fresh(), alici = fresh();
  const posta = createPosta({ store, now: () => clock });
  assert.deepEqual((await posta.durum(satici)).satirlar, [], 'ilan yokken posta boş');
  const listing = store.executeMarket(satici.accountId, { op: 'list', requestId: uuid(), kind: 'dragon', assetId: store.readEconomy(satici.accountId).dragons[0].assetId, quantity: 1, unitPrice: 120 }).listing;
  clock += 60000;
  store.executeMarket(alici.accountId, { op: 'buy', requestId: uuid(), listingId: listing.id, quantity: 1, unitPrice: 120 });
  const once = [store.readEconomy(satici.accountId), store.readEconomy(alici.accountId)];
  const p = await posta.durum(satici);
  assert.equal(p.satirlar.length, 1);
  assert.equal(p.satirlar[0].tur, 'satis'); assert.equal(p.satirlar[0].altin, 120); assert.equal(p.satirlar[0].bitti, true); assert.equal(p.satirlar[0].t, clock);
  assert.deepEqual((await posta.durum(alici)).satirlar, [], 'alıcı satıcının haberini görmez');
  assert.deepEqual([store.readEconomy(satici.accountId), store.readEconomy(alici.accountId)], once, 'posta okumak hiçbir şeyi değiştirmez');
  await assert.rejects(() => posta.durum(null), e => e.status === 401);
  clock += 15 * GUN;
  assert.deepEqual((await posta.durum(satici)).satirlar, [], '14 gün sonra satış haberi düşer');
});
