'use strict';
// ENG-07 · Gerçek oyunculu Bedesten (SQLite + saf kurallar).
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { openEconomyStore } = require('../server/economy_store');
const { validateMarket, LIMITS, MARKET_FEE_BPS } = require('../server/market_service');
const { earnedFixture } = require('./helpers/earned_fixture');
const uuid = () => crypto.randomUUID();
const op = (name, fields) => ({ op: name, requestId: uuid(), ...fields });

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-eng07-')), file = path.join(dir, 'db.sqlite');
  let clock = Date.now();
  const store = openEconomyStore(file, { now: () => clock }), raw = new DatabaseSync(file);
  t.after(() => { raw.close(); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const load = id => JSON.parse(raw.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(id).game_json);
  const save = (id, g) => raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), id);
  const fresh = (earned = true) => {
    const id = store.createGuest().accountId;
    store.executeCommand(id, { requestId: uuid(), expectedVersion: 0, type: 'game.start', args: {} });
    const g = load(id);
    g.inv.push({ uid: g.uid++, id: 'zirh1', assetId: id + ':test:item' });
    g.eggs.forEach(e => { e.inK = false; }); g.food.balik = 5;
    if (earned) earnedFixture(g); else { g.foodSources.balik = { bound: 5, unknown: 0, earned: 0 }; g.inv.at(-1).funding = 'bound'; }
    save(id, g);
    return id;
  };
  const market = (actor, input) => store.executeMarket(actor, input);
  const eco = id => store.readEconomy(id);
  const run = (id, type, args = {}) => store.executeCommand(id, { requestId: uuid(), expectedVersion: eco(id).version, type, args });
  const trade = (actor, type, extra) => store.executeTrade(actor, { type, requestId: uuid(), ...extra });
  const rows = () => raw.prepare('SELECT id, json FROM market_listings').all().map(r => JSON.parse(r.json));
  const hold = id => JSON.parse(raw.prepare("SELECT json FROM market_holds WHERE id=?").get(id)?.json || 'null');
  return { store, raw, load, save, fresh, market, eco, run, trade, rows, hold, tick: ms => { clock += ms; } };
}
const listDragon = (f, seller, unitPrice = 100) => f.market(seller, op('list', { kind: 'dragon', assetId: f.eco(seller).dragons[0].assetId, quantity: 1, unitPrice })).listing;
const listFood = (f, seller, quantity, unitPrice) => f.market(seller, op('list', { kind: 'food', foodKey: 'balik', quantity, unitPrice })).listing;
const buy = (f, buyer, listing, quantity = 1, extra = {}) => f.market(buyer, op('buy', { listingId: listing.id, quantity, unitPrice: listing.unitPrice, ...extra }));

test('ENG07 list then cancel releases the reservation atomically; closed listings stay closed', t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh();
  const before = f.eco(a);
  const listing = listDragon(f, a, 250);
  assert.equal(listing.status, 'open'); assert.equal(listing.mine, true); assert.equal(listing.unitPrice, 250);
  assert.deepEqual(f.hold(a).dragons, [before.dragons[0].assetId]);
  assert.deepEqual(f.eco(a), before, 'listing reserves without changing the economy version');
  assert.throws(() => listDragon(f, a), /asset_already_listed/);
  assert.throws(() => f.market(b, op('cancel', { listingId: listing.id })), /listing_not_owned/);
  const cancelled = f.market(a, op('cancel', { listingId: listing.id })).listing;
  assert.equal(cancelled.status, 'cancelled');
  assert.deepEqual(f.hold(a), { schema: 1, listings: [], items: [], dragons: [], eggs: [], food: {} });
  assert.throws(() => f.market(a, op('cancel', { listingId: listing.id })), /listing_closed/);
  assert.throws(() => buy(f, b, listing), /listing_closed/);
  assert.throws(() => f.market(b, op('cancel', { listingId: 'mk_' + 'a'.repeat(32) })), /listing_not_found/);
  assert.deepEqual(f.eco(a), before); assert.equal(f.eco(b).gold, 420);
  // After cancel the asset is free for normal commands again.
  assert.equal(f.run(a, 'dragon.sell', { assetId: before.dragons[0].assetId }).economy.dragons.length, 0);
});

test('ENG07 partial and full food sale: earned gold and earned food move atomically, listing quantity shrinks', t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh(), c = f.fresh();
  const listing = listFood(f, a, 4, 10);
  assert.equal(f.hold(a).food.balik, 4);
  assert.throws(() => listFood(f, a, 2, 10), /food_reserved/);
  const first = buy(f, b, listing, 1);
  assert.equal(first.sale.total, 10); assert.equal(first.sale.fee, 0); assert.equal(first.listing.remaining, 3);
  assert.equal(first.listing.mine, false); assert.equal(first.listing.assetId, undefined);
  assert.throws(() => buy(f, c, listing, 4), /listing_quantity_unavailable/);
  const second = buy(f, c, listing, 3);
  assert.equal(second.listing.status, 'sold'); assert.equal(second.listing.remaining, 0);
  const A = f.eco(a), B = f.eco(b), C = f.eco(c);
  assert.equal(A.gold, 460); assert.deepEqual(A.funds, { schema: 1, bound: 0, unknown: 0, earned: 460 });
  assert.equal(B.gold, 410); assert.equal(B.funds.earned, 410); assert.equal(C.gold, 390);
  assert.equal(A.game.food.balik, 1); assert.deepEqual(A.game.foodSources.balik, { bound: 0, unknown: 0, earned: 1 });
  assert.equal(B.game.food.balik, 6); assert.deepEqual(B.game.foodSources.balik, { bound: 0, unknown: 0, earned: 6 });
  assert.equal(C.game.food.balik, 8);
  assert.deepEqual(f.hold(a).food, {}); assert.deepEqual(f.hold(a).listings, []);
  const mine = f.store.listMarket(a).mine[0];
  assert.equal(mine.sold, 4); assert.equal(mine.sales.length, 2); assert.ok(mine.sales.every(s => typeof s.buyer === 'string'));
  assert.throws(() => buy(f, b, listing, 1), /listing_closed/);
});

test('ENG07 offline seller: dragon, egg and item sell while the seller sends nothing; provenance stays earned', t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh();
  const seller = f.eco(a);
  const dragon = listDragon(f, a, 100);
  const egg = f.market(a, op('list', { kind: 'egg', assetId: seller.eggs[0].assetId, quantity: 1, unitPrice: 50 })).listing;
  const item = f.market(a, op('list', { kind: 'item', assetId: seller.items.at(-1).assetId, quantity: 1, unitPrice: 25 })).listing;
  assert.equal(f.store.listMarket(null).listings.length, 3);
  assert.ok(f.store.listMarket(null).listings.every(l => l.assetId === undefined && !('sellerId' in l)));
  // Seller presence is irrelevant: no session, socket or command from `a` from here on.
  for (const l of [dragon, egg, item]) assert.equal(buy(f, b, l).listing.status, 'sold');
  const A = f.eco(a), B = f.eco(b);
  assert.equal(A.gold, 595); assert.equal(B.gold, 245); assert.equal(A.funds.earned, 595); assert.equal(B.funds.earned, 245);
  assert.equal(A.version, seller.version + 3); assert.equal(A.dragons.length, 0); assert.equal(A.eggs.length, 0);
  for (const [kind, id] of [['dragons', seller.dragons[0].assetId], ['eggs', seller.eggs[0].assetId], ['items', seller.items.at(-1).assetId]]) {
    const row = B[kind].find(x => x.assetId === id);
    assert.ok(row, kind); assert.equal(row.data.funding, 'earned');
  }
  assert.equal(new Set(B.dragons.map(d => d.data.id)).size, 2, 'local dragon ids are remapped');
  assert.deepEqual(f.hold(a).listings, []);
});

test('ENG07 insufficient or non-transferable gold, own listing and price mismatch change nothing', t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh(), bound = f.fresh(false);
  const pricey = listFood(f, a, 1, 421), cheap = listFood(f, a, 1, 10);
  const snapshot = () => [f.eco(a), f.eco(b), f.eco(bound), f.rows(), f.hold(a)];
  const before = snapshot();
  assert.throws(() => buy(f, b, pricey), /insufficient_gold/);
  assert.throws(() => buy(f, bound, cheap), /gold_not_transferable/);
  assert.throws(() => buy(f, a, cheap), /own_listing/);
  assert.throws(() => buy(f, b, cheap, 1, { unitPrice: 9 }), /listing_price_mismatch/);
  assert.throws(() => buy(f, b, { id: cheap.id, unitPrice: 10 }, 2), /listing_quantity_unavailable/);
  assert.deepEqual(snapshot(), before);
});

test('ENG07 idempotency: same requestId replays one transfer; changed body is rejected; retry survives version changes', t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh();
  const listing = listFood(f, a, 3, 20);
  const input = op('buy', { listingId: listing.id, quantity: 1, unitPrice: 20 });
  const first = f.market(b, input);
  // Unrelated economy command bumps b's version (ENG06_05: hash must not depend on it).
  f.run(b, 'shop.food', { key: 'balik' });
  const again = f.market(b, { ...input });
  assert.equal(again.replayed, true); assert.deepEqual({ ...again, replayed: false }, first);
  assert.throws(() => f.market(b, { ...input, quantity: 2 }), /request_id_reused/);
  assert.equal(f.rows()[0].remaining, 2); assert.equal(f.eco(a).gold, 440);
  const listInput = op('list', { kind: 'food', foodKey: 'balik', quantity: 1, unitPrice: 5 });
  const l1 = f.market(a, listInput), l2 = f.market(a, { ...listInput });
  assert.equal(l2.replayed, true); assert.equal(l1.listing.id, l2.listing.id); assert.equal(f.rows().length, 2);
  // Key order is not part of the receipt hash.
  const reordered = Object.fromEntries(Object.entries(input).reverse());
  assert.equal(validateMarket(reordered).hash, validateMarket(input).hash);
});

test('ENG07 two buyers for the last unit: exactly one wins, the other changes nothing', t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh(), c = f.fresh();
  const listing = listDragon(f, a, 100);
  const results = [b, c].map(id => { try { return buy(f, id, listing); } catch (e) { return e; } });
  assert.equal(results.filter(r => r instanceof Error).length, 1);
  assert.match(results.find(r => r instanceof Error).code, /listing_closed/);
  assert.equal(f.eco(b).gold + f.eco(c).gold, 740); assert.equal(f.eco(a).gold, 520);
  assert.equal(f.eco(b).dragons.length + f.eco(c).dragons.length, 3);
});

test('ENG07 bound and unknown assets, food and gold can never be listed (economy_sources rule)', t => {
  const f = fixture(t), bound = f.fresh(false), a = f.fresh();
  const e = f.eco(bound);
  assert.throws(() => listDragon(f, bound), /asset_not_transferable/);
  assert.throws(() => f.market(bound, op('list', { kind: 'egg', assetId: e.eggs[0].assetId, quantity: 1, unitPrice: 5 })), /asset_not_transferable/);
  assert.throws(() => f.market(bound, op('list', { kind: 'item', assetId: e.items.at(-1).assetId, quantity: 1, unitPrice: 5 })), /asset_not_transferable/);
  assert.throws(() => listFood(f, bound, 1, 5), /food_not_transferable/);
  const g = f.load(a); g.dragons[0].funding = 'unknown'; f.save(a, g);
  assert.throws(() => listDragon(f, a), /asset_not_transferable/);
  assert.throws(() => listFood(f, a, 6, 5), /insufficient_food/);
  assert.throws(() => f.market(a, op('list', { kind: 'egg', assetId: f.eco(a).dragons[0].assetId, quantity: 1, unitPrice: 5 })), /asset_not_owned/);
  assert.throws(() => f.market(a, op('list', { kind: 'dragon', assetId: e.dragons[0].assetId, quantity: 1, unitPrice: 5 })), /asset_not_owned/);
  assert.equal(f.rows().length, 0);
});

test('ENG07 reservation: listed assets cannot be sold, traded or overdrawn; week.end aging is allowed; buy re-validates', t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh();
  const A = f.eco(a);
  const dragon = listDragon(f, a, 100);
  const item = f.market(a, op('list', { kind: 'item', assetId: A.items.at(-1).assetId, quantity: 1, unitPrice: 30 })).listing;
  const egg = f.market(a, op('list', { kind: 'egg', assetId: A.eggs[0].assetId, quantity: 1, unitPrice: 30 })).listing;
  listFood(f, a, 4, 3);
  assert.throws(() => f.run(a, 'dragon.sell', { assetId: A.dragons[0].assetId }), /market_reserved_asset/);
  assert.throws(() => f.run(a, 'item.sell', { assetId: A.items.at(-1).assetId }), /market_reserved_asset/);
  let tr = f.trade(a, 'invite', { targetId: b }).trade; tr = f.trade(b, 'accept', { tradeId: tr.id }).trade;
  assert.throws(() => f.trade(a, 'offer', { tradeId: tr.id, revision: tr.revision, offer: { dragons: [A.dragons[0].assetId] } }), /market_reserved_asset/);
  assert.throws(() => f.trade(a, 'offer', { tradeId: tr.id, revision: tr.revision, offer: { food: { balik: 2 } } }), /market_reserved_food/);
  assert.equal(f.trade(a, 'offer', { tradeId: tr.id, revision: tr.revision, offer: { food: { balik: 1 } } }).trade.offers[a].food.balik, 1);
  f.trade(a, 'cancel', { tradeId: tr.id });
  assert.deepEqual(f.eco(a).dragons, A.dragons);
  // Natural content change (age) keeps the reservation valid.
  const week = f.run(a, 'week.end');
  assert.equal(week.economy.dragons[0].assetId, A.dragons[0].assetId);
  assert.notDeepEqual(week.economy.dragons[0].data, A.dragons[0].data);
  // Seller makes the egg unavailable (incubation is not removal): purchase is refused, nothing moves.
  const tile = f.load(a).grid.findIndex(x => x.open && !x.b);
  const g = f.load(a); g.grid[tile].b = 'kulucka'; f.save(a, g);
  f.run(a, 'egg.incubate', { assetId: A.eggs[0].assetId, enabled: true });
  const before = [f.eco(a), f.eco(b)];
  assert.throws(() => buy(f, b, egg), /egg_unavailable/);
  assert.deepEqual([f.eco(a), f.eco(b)], before);
  assert.equal(buy(f, b, dragon).listing.status, 'sold');
  assert.equal(buy(f, b, item).listing.status, 'sold');
});

test('ENG07 trade reservations block listing reserved assets and buying with reserved gold', t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh(), c = f.fresh();
  const listing = listFood(f, c, 1, 50);
  let tr = f.trade(a, 'invite', { targetId: b }).trade; tr = f.trade(b, 'accept', { tradeId: tr.id }).trade;
  const A = f.eco(a);
  tr = f.trade(a, 'offer', { tradeId: tr.id, revision: tr.revision, offer: { gold: 400, dragons: [A.dragons[0].assetId], food: { balik: 3 } } }).trade;
  assert.throws(() => listDragon(f, a), /asset_reserved/);
  assert.throws(() => listFood(f, a, 3, 5), /food_reserved/);
  assert.equal(listFood(f, a, 2, 5).remaining, 2);
  assert.throws(() => buy(f, a, listing), /trade_reserved_gold/);
  assert.equal(f.eco(a).gold, 420); assert.equal(f.rows().find(r => r.id === listing.id).remaining, 1);
});

test('ENG07 debt (D4): debtor buyer cannot buy, debtor seller cannot list, and a seller in debt is not settled', t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh();
  const listing = listFood(f, a, 2, 10);
  const indebt = id => { const g = f.load(id); g.gold = 0; g.funds = { schema: 1, bound: 0, unknown: 0, earned: 0 }; g.debt = 50; f.save(id, g); };
  indebt(b);
  assert.throws(() => buy(f, b, listing), /debt_outstanding/);
  assert.throws(() => listFood(f, b, 1, 10), /debt_outstanding/);
  const c = f.fresh(); indebt(a);
  const before = [f.eco(a), f.eco(c)];
  assert.throws(() => buy(f, c, listing), /seller_unavailable/);
  assert.deepEqual([f.eco(a), f.eco(c)], before);
  // Cancelling is still allowed while in debt: it only releases a reservation.
  assert.equal(f.market(a, op('cancel', { listingId: listing.id })).listing.status, 'cancelled');
});

test('ENG07 strict schema: legacy client shapes, injected identity fields, offer and technical limits are rejected', t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh();
  const dragonId = f.eco(a).dragons[0].assetId;
  const bad = [
    [{ op: 'list', action: 'list', listing: { assetId: dragonId, price: 10 } }, /unknown_market_field/],
    [op('list', { kind: 'dragon', assetId: dragonId, quantity: 1, unitPrice: 10, seller: '@x' }), /unknown_market_field/],
    [op('list', { kind: 'dragon', assetId: dragonId, quantity: 1, unitPrice: 10, accountId: b }), /unknown_market_field/],
    [op('list', { kind: 'dragon', assetId: dragonId, quantity: 2, unitPrice: 10 }), /invalid_quantity/],
    [op('list', { kind: 'dragon', assetId: dragonId, quantity: 1, unitPrice: 0 }), /invalid_price/],
    [op('list', { kind: 'dragon', assetId: dragonId, quantity: 1, unitPrice: 1.5 }), /invalid_price/],
    [op('list', { kind: 'dragon', assetId: dragonId, quantity: 1, unitPrice: -5 }), /invalid_price/],
    [op('list', { kind: 'dragon', assetId: dragonId, quantity: 1, unitPrice: LIMITS.maxUnitPrice + 1 }), /invalid_price/],
    [op('list', { kind: 'food', foodKey: 'balik', quantity: 3, unitPrice: 1_000_000_000 }), /invalid_total/],
    [op('list', { kind: 'food', foodKey: 'balik', quantity: LIMITS.maxFoodQuantity + 1, unitPrice: 1 }), /invalid_quantity/],
    [op('list', { kind: 'food', foodKey: '../x', quantity: 1, unitPrice: 1 }), /invalid_food_key/],
    [op('list', { kind: 'stone', assetId: 'kor_t1', quantity: 1, unitPrice: 1 }), /invalid_listing_kind/],
    [op('list', { kind: 'gold', assetId: 'x', quantity: 1, unitPrice: 1 }), /invalid_listing_kind/],
    [{ op: 'list', requestId: 'nope', kind: 'dragon', assetId: dragonId, quantity: 1, unitPrice: 1 }, /invalid_request_id/],
    [op('buy', { listingId: 'mk_seed_1', quantity: 1, unitPrice: 1 }), /invalid_listing_id/],
    [{ op: 'offer', id: 'x' }, /market_settlement_unavailable/],
    [{ op: 'auction' }, /unsupported_market_operation/],
    [null, /invalid_market_operation/],
  ];
  for (const [input, error] of bad) assert.throws(() => f.market(a, input), error, JSON.stringify(input));
  assert.throws(() => f.market(a, { op: 'offer' }), e => e.status === 503);
  assert.equal(MARKET_FEE_BPS, 0);
  for (let i = 0; i < LIMITS.maxOpenPerAccount; i++) { const g = f.load(a); g.food.balik += 1; g.foodSources.balik.earned += 1; f.save(a, g); listFood(f, a, 1, 1); }
  assert.throws(() => listFood(f, a, 1, 1), /market_listing_limit/);
  assert.equal(f.rows().length, LIMITS.maxOpenPerAccount);
});

test('ENG07 a failure after the transfer step rolls back both accounts, listing, holds and receipt', t => {
  const f = fixture(t), a = f.fresh(), b = f.fresh();
  const listing = listFood(f, a, 2, 10);
  // Corrupt the buyer's own reservation so the post-transfer guard throws inside the transaction.
  f.raw.prepare('INSERT INTO market_holds VALUES (?, ?)').run(b, JSON.stringify({ schema: 1, listings: ['mk_x'], items: [], dragons: ['ghost'], eggs: [], food: {} }));
  const before = [f.eco(a), f.eco(b), f.rows(), f.hold(a), f.hold(b)];
  const input = op('buy', { listingId: listing.id, quantity: 1, unitPrice: 10 });
  assert.throws(() => f.market(b, input), /market_reserved_asset/);
  assert.deepEqual([f.eco(a), f.eco(b), f.rows(), f.hold(a), f.hold(b)], before);
  assert.equal(f.raw.prepare('SELECT COUNT(*) n FROM market_receipts').get().n, 1, 'only the listing receipt exists');
});

test('ENG07 SQLite: two processes buying the last unit concurrently settle exactly once', async t => {
  const { Worker } = require('node:worker_threads');
  const f = fixture(t), a = f.fresh(), b = f.fresh(), c = f.fresh();
  const listing = listDragon(f, a, 100);
  const file = f.raw.prepare('PRAGMA database_list').get().file;
  const code = `const {workerData,parentPort}=require('node:worker_threads');const {openEconomyStore}=require(${JSON.stringify(require.resolve('../server/economy_store'))});
    const s=openEconomyStore(workerData.file);const sab=new Int32Array(workerData.gate);Atomics.wait(sab,0,0);
    try{parentPort.postMessage({ok:s.executeMarket(workerData.actor,workerData.input).sale.total});}catch(e){parentPort.postMessage({error:e.code||e.message});}finally{s.close();}`;
  const gate = new SharedArrayBuffer(4);
  const run = actor => new Promise((resolve, reject) => { const w = new Worker(code, { eval: true, workerData: { file, actor, gate, input: op('buy', { listingId: listing.id, quantity: 1, unitPrice: 100 }) } }); w.once('message', resolve); w.once('error', reject); });
  const pending = [run(b), run(c)];
  await new Promise(r => setTimeout(r, 300)); Atomics.store(new Int32Array(gate), 0, 1); Atomics.notify(new Int32Array(gate), 0);
  const results = await Promise.all(pending);
  assert.equal(results.filter(r => r.ok === 100).length, 1, JSON.stringify(results));
  assert.match(results.find(r => r.error).error, /listing_closed/);
  assert.equal(f.eco(a).gold, 520); assert.equal(f.eco(b).gold + f.eco(c).gold, 740);
});
