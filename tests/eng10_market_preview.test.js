'use strict';
// ENG-10 (O-7) · Bedesten önizlemesi bayat kalmaz: satıcının durumu değişince ilan önizlemesi ve "şu an alınamaz"
// nedeni aynı transaction'da tazelenir, stateVersion artar; alıcı gördüğü sürümü bağlayabilir (listing_changed).
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { openEconomyStore } = require('../server/economy_store');
const { validateMarket, refreshListings, publicListing } = require('../server/market_service');
const { earnedFixture } = require('./helpers/earned_fixture');
const uuid = () => crypto.randomUUID();
const op = (name, fields) => ({ op: name, requestId: uuid(), ...fields });

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-eng10-')), file = path.join(dir, 'db.sqlite');
  const store = openEconomyStore(file), raw = new DatabaseSync(file);
  t.after(() => { raw.close(); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const load = id => JSON.parse(raw.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(id).game_json);
  const save = (id, g) => raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), id);
  const fresh = () => {
    const id = store.createGuest().accountId;
    store.executeCommand(id, { requestId: uuid(), expectedVersion: 0, type: 'game.start', args: {} });
    const g = load(id); g.eggs.forEach(e => { e.inK = false; }); earnedFixture(g); save(id, g);
    return id;
  };
  const eco = id => store.readEconomy(id);
  const run = (id, type, args = {}) => store.executeCommand(id, { requestId: uuid(), expectedVersion: eco(id).version, type, args });
  const listing = id => JSON.parse(raw.prepare('SELECT json FROM market_listings WHERE id=?').get(id).json);
  return { store, load, save, fresh, eco, run, listing, market: (a, i) => store.executeMarket(a, i) };
}

test('ENG-10 O-7: satıcı durumu değişince önizleme tazelenir, eski sürümle alım listing_changed, güncel sürümle geçer', t => {
  const f = fixture(t), seller = f.fresh(), buyer = f.fresh();
  const dragon = f.eco(seller).dragons[0];
  const listed = f.market(seller, op('list', { kind: 'dragon', assetId: dragon.assetId, quantity: 1, unitPrice: 50 })).listing;
  assert.equal(listed.stateVersion, 1); assert.equal(listed.unavailable, null);
  // Durum değişikliği (ör. haftada evre/ad değişimi) → bir sonraki satıcı komutunda ilan tazelenir.
  const g = f.load(seller); const d = g.dragons.find(x => x.assetId === dragon.assetId);
  d.name = 'Yeni Ad'; d.stage = d.stage === 'genc' ? 'yetiskin' : 'genc'; f.save(seller, g);
  const applied = f.run(seller, 'goals.claim');
  assert.equal(applied.listingsRefreshed, 1);
  const now = f.listing(listed.id);
  assert.equal(now.preview.name, 'Yeni Ad'); assert.equal(now.preview.stage, d.stage); assert.equal(now.stateVersion, 2);
  // Değişiklik yoksa yazma yok.
  assert.equal(f.run(seller, 'goals.claim').listingsRefreshed, 0); assert.equal(f.listing(listed.id).stateVersion, 2);
  // Alıcı eski önizlemeyle (sürüm 1) ödeme yapamaz; hiçbir şey yazılmaz.
  const buyerBefore = f.eco(buyer);
  assert.throws(() => f.market(buyer, op('buy', { listingId: listed.id, quantity: 1, unitPrice: 50, stateVersion: 1 })), /listing_changed/);
  assert.deepEqual(f.eco(buyer), buyerBefore);
  const sale = f.market(buyer, op('buy', { listingId: listed.id, quantity: 1, unitPrice: 50, stateVersion: 2 }));
  assert.equal(sale.sale.total, 50);
});

test('ENG-10 O-7: kuluçkaya alınan yumurta ilanı "şu an alınamaz" olarak işaretlenir; eski istemci şekli (stateVersion yok) çalışır', t => {
  const f = fixture(t), seller = f.fresh(), buyer = f.fresh();
  const egg = f.eco(seller).eggs[0];
  const g = f.load(seller); g.grid.find(x => x.open && !x.b).b = 'kulucka'; f.save(seller, g);
  const listed = f.market(seller, op('list', { kind: 'egg', assetId: egg.assetId, quantity: 1, unitPrice: 30 })).listing;
  f.run(seller, 'egg.incubate', { assetId: egg.assetId, enabled: true });
  const now = f.listing(listed.id);
  assert.equal(now.unavailable, 'asset_unavailable'); assert.equal(now.stateVersion, 2);
  assert.equal(publicListing(now, buyer).unavailable, 'asset_unavailable');
  assert.throws(() => f.market(buyer, op('buy', { listingId: listed.id, quantity: 1, unitPrice: 30 })), /asset_unavailable|egg_unavailable/);
  f.run(seller, 'egg.incubate', { assetId: egg.assetId, enabled: false });
  assert.equal(f.listing(listed.id).unavailable, undefined); assert.equal(f.listing(listed.id).stateVersion, 3);
  assert.equal(f.market(buyer, op('buy', { listingId: listed.id, quantity: 1, unitPrice: 30 })).sale.total, 30);
});

test('ENG-10 O-7: stateVersion doğrulaması ve saf tazeleme', () => {
  assert.throws(() => validateMarket({ op: 'buy', requestId: uuid(), listingId: 'mk_' + 'a'.repeat(32), quantity: 1, unitPrice: 1, stateVersion: 0 }), /invalid_state_version/);
  assert.throws(() => validateMarket({ op: 'list', requestId: uuid(), kind: 'food', foodKey: 'balik', quantity: 1, unitPrice: 1, stateVersion: 1 }), /unknown_market_field/);
  const a = validateMarket({ op: 'buy', requestId: '00000000-0000-4000-8000-000000000001', listingId: 'mk_' + 'a'.repeat(32), quantity: 1, unitPrice: 1, stateVersion: 2 });
  const b = validateMarket({ op: 'buy', requestId: '00000000-0000-4000-8000-000000000001', listingId: 'mk_' + 'a'.repeat(32), quantity: 1, unitPrice: 1 });
  assert.notEqual(a.hash, b.hash, 'sürüm makbuz hash\'ine girer (farklı gövde → request_id_reused)');
  const game = { inv: [], eggs: [], dragons: [{ assetId: 'x', name: 'A', stage: 'genc', equip: {} }] };
  const L = { status: 'open', kind: 'dragon', assetId: 'x', stateVersion: 4, preview: { name: 'A' } };
  const [n] = refreshListings([L, { ...L, kind: 'food' }, { ...L, status: 'sold' }, { ...L, assetId: 'gone' }], game, 9);
  assert.equal(n.stateVersion, 5); assert.equal(n.preview.stage, 'genc'); assert.equal(n.updatedAt, 9);
  assert.deepEqual(refreshListings([n], game, 10), []);
});
