'use strict';
// ENG-13 · Tek kese sunucu komutları: ejderha yaşam döngüsü (ölüm, müzayede, sipariş, teklif), Topçu, hedef,
// yerel gelir/gider defteri ve kayıt öncesi altın aktarımı. İstemci miktar göndermez (gold.local hariç: tavanlı).
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { reduceCommand, validateCommand } = require('../server/economy_commands');
const { openEconomyStore } = require('../server/economy_store');
const income = require('../server/local_income');
const { earnedFixture } = require('./helpers/earned_fixture');
const NOW = Date.UTC(2026, 10, 8, 12);
const env = (seed = 'eng13-seed') => ({ accountId: 'acct', seed, now: NOW });
const start = () => reduceCommand(null, { type: 'game.start', args: {} }, env()).game;
const cmd = (type, args = {}) => validateCommand({ type, args, requestId: crypto.randomUUID(), expectedVersion: 0 }).command;
const run = (state, type, args = {}, e = env()) => reduceCommand(state, cmd(type, args), e);
const kor = g => g.dragons[0];

test('ENG13 validator: yeni komutlar sabit şemalı; miktar/fiyat alanı eklenemez', () => {
  for (const [type, args] of [['dragon.die', { assetId: 'a', gold: 5 }], ['auction.sell', { assetId: 'a', price: 1 }], ['topcu.clear', { mode: 'stage', gold: 900 }], ['topcu.spin', { wheel: 'minor1', idx: 0 }], ['goal.reach', { id: 'win1', r: 1 }]]) {
    assert.throws(() => cmd(type, args), /invalid_arguments/);
  }
  assert.throws(() => cmd('gold.local', { reason: 'arena', amount: 0 }), /invalid_arguments/);
  assert.throws(() => cmd('gold.local', { reason: 'arena', amount: 1.5 }), /invalid_arguments/);
  assert.throws(() => cmd('gold.local', { reason: 'arena', amount: 2_000_000 }), /invalid_arguments/);
  assert.throws(() => run(start(), 'gold.local', { reason: 'mint', amount: 10 }), /unknown_reason/);
  assert.throws(() => run(start(), 'topcu.clear', { mode: 'boss999' }), /unknown_topcu_mode/);
  assert.throws(() => run(start(), 'topcu.spin', { wheel: 'major_ultra' }), /unknown_wheel/);
});

test('ENG13 dragon.die: sunucudan kalkar, S.dead\'e geçer, diriltilemez; ikinci ölüm ve satış reddedilir', () => {
  const g0 = start(), id = kor(g0).assetId;
  const { game, result } = run(g0, 'dragon.die', { assetId: id });
  assert.equal(result.died, id);
  assert.equal(game.dragons.some(d => d.assetId === id), false);
  assert.equal(game.dead.at(-1).assetId, id); assert.equal(game.dead.at(-1).dead, true);
  assert.equal(game.gold, g0.gold); // ölüm altın üretmez
  assert.throws(() => run(game, 'dragon.die', { assetId: id }), /asset_not_owned/);
  assert.throws(() => run(game, 'dragon.sell', { assetId: id }), /asset_not_owned/);
  const locked = start(); kor(locked).tradeLocked = true;
  assert.throws(() => run(locked, 'dragon.die', { assetId: kor(locked).assetId }), /dragon_busy/);
});

test('ENG13 auction.sell: sunucu tohumlu RNG ile müzayedeyi oynar; %10 komisyon, unknown, haftada bir; aynı tohum aynı sonuç', () => {
  const g0 = start(), id = kor(g0).assetId;
  const a = run(g0, 'auction.sell', { assetId: id }), b = run(g0, 'auction.sell', { assetId: id });
  assert.deepEqual(a.result.auction, b.result.auction); // tekrar denemede yeniden zar yok
  const sim = a.result.auction;
  assert.equal(sim.bidders.length, 3);
  if (sim.sold !== false && a.result.sold) {
    assert.equal(a.result.got, Math.round(sim.price * 0.9));
    assert.equal(a.game.gold, g0.gold + a.result.got);
    assert.equal(a.game.funds.unknown, g0.funds.unknown + a.result.got);
    assert.equal(a.game.dragons.some(d => d.assetId === id), false);
    assert.deepEqual(sim.log.at(-1), [sim.leader, sim.price]);
    // Haftada bir: aynı sunucu haftasında ikinci satış yok.
    const second = a.game; second.dragons.push({ ...JSON.parse(JSON.stringify(g0.dragons[0])), id: 99, assetId: 'acct:dragon:99' });
    assert.throws(() => run(second, 'auction.sell', { assetId: 'acct:dragon:99' }), /auction_weekly_limit/);
  }
  // Farklı tohumlarda en az bir satış olur ve fiyat tahmini değerin makul katı içinde kalır.
  let sold = 0;
  for (let i = 0; i < 12; i++) { const r = run(g0, 'auction.sell', { assetId: id }, env('s' + i)).result; if (r.sold) { sold++; assert.ok(r.auction.price <= r.auction.v * 2.5); } }
  assert.ok(sold > 0);
});

test('ENG13 order.deliver: gen şartları sunucu ejderhasında doğrulanır, altın orders.js formülüyle sunucuda hesaplanır, tavanlı', () => {
  const g0 = start(), d = kor(g0), el = d.el, other = el === 'ates' ? 'buz' : 'ates';
  const spec = `lv=0;wk=3;el=${el};stage=genc`;
  const r = run(g0, 'order.deliver', { assetId: d.assetId, spec });
  assert.equal(r.result.gold, Math.round((140 + 1 * 120 + 3 * 12) / 10) * 10); // 300
  assert.equal(r.game.gold, g0.gold + r.result.gold);
  assert.equal(r.game.funds.unknown, g0.funds.unknown + r.result.gold);
  assert.equal(r.game.dragons.some(x => x.assetId === d.assetId), false);
  assert.throws(() => run(g0, 'order.deliver', { assetId: d.assetId, spec: `lv=0;wk=3;el=${other};stage=genc` }), /order_unfit/);
  // Yapı orders.js orderGen dışında olamaz: seviye 0'a nadir şart eklenemez, ağırlık şişirilemez.
  for (const bad of [`lv=0;wk=3;el=${el};stage=genc;par=P`, `lv=2;wk=3;el=${el};stage=genc`, `lv=0;wk=99;el=${el};stage=genc`, `lv=0;el=${el};stage=genc`, 'gold=9999']) {
    assert.throws(() => run(g0, 'order.deliver', { assetId: d.assetId, spec: bad }), /invalid_order/);
  }
  // Haftalık tavan.
  let g = g0; for (let i = 0; i < 3; i++) { g = JSON.parse(JSON.stringify(g)); g.dragons.push({ ...JSON.parse(JSON.stringify(d)), id: 50 + i, assetId: 'acct:dragon:x' + i }); g = run(g, 'order.deliver', { assetId: 'acct:dragon:x' + i, spec }).game; }
  g.dragons.push({ ...JSON.parse(JSON.stringify(d)), id: 70, assetId: 'acct:dragon:x9' });
  assert.throws(() => run(g, 'order.deliver', { assetId: 'acct:dragon:x9', spec }), /order_limit/);
});

test('ENG13 offer.sell: value × 1.4 sunucuda; haftada bir', () => {
  const g0 = start(), d = kor(g0);
  const r = run(g0, 'offer.sell', { assetId: d.assetId });
  assert.ok(r.result.price > 0); assert.equal(r.game.gold, g0.gold + r.result.price);
  const g = r.game; g.dragons.push({ ...JSON.parse(JSON.stringify(d)), id: 77, assetId: 'acct:dragon:77' });
  assert.throws(() => run(g, 'offer.sell', { assetId: 'acct:dragon:77' }), /offer_limit/);
});

test('ENG13 topcu.clear/spin: sabit geçiş ödülü, çark sunucuda zarlanır, hak olmadan çevrilmez, ücretli çark, günlük tavan', () => {
  let g = start();
  assert.throws(() => run(g, 'topcu.spin', { wheel: 'minor1' }), /topcu_spin_unavailable/);
  let r = run(g, 'topcu.clear', { mode: 'stage' }); g = r.game;
  assert.equal(r.result.gold, 150); assert.equal(g.funds.unknown, 150);
  r = run(g, 'topcu.spin', { wheel: 'minor1' });
  assert.ok(r.result.idx >= 0 && r.result.idx < 8);
  assert.equal(r.result.gold, { minor_gold_120: 120, minor_gold_220: 220 }[r.result.id] || 0);
  g = r.game;
  assert.throws(() => run(g, 'topcu.spin', { wheel: 'minor1' }), /topcu_spin_unavailable/); // aşama başına bir çark
  r = run(g, 'topcu.clear', { mode: 'raid_extreme' }); g = r.game; assert.equal(r.result.gold, 950);
  r = run(g, 'topcu.spin', { wheel: 'major_extreme' }); g = r.game; assert.equal(r.result.paid, false);
  const before = g.gold;
  r = run(g, 'topcu.spin', { wheel: 'major_extreme' }); assert.equal(r.result.paid, true); // ek çark ücretli
  assert.equal(r.game.gold, before - 120 + r.result.gold);
  // Günlük tavan: dolunca altın 0, hak yine işler.
  const capped = JSON.parse(JSON.stringify(g)); capped.srvDaily = { day: new Date(NOW).toISOString().slice(0, 10), local: 0, topcu: income.CAPS.topcuDaily, orders: 0, offers: 0 };
  r = run(capped, 'topcu.clear', { mode: 'raid_normal' });
  assert.equal(r.result.gold, 0); assert.equal(r.result.capped, 250); assert.equal(r.game.gold, capped.gold);
  // Ertesi gün tavan sıfırlanır.
  r = run(capped, 'topcu.clear', { mode: 'raid_normal' }, { ...env(), now: NOW + 86_400_000 });
  assert.equal(r.result.gold, 250);
  // Ejderhasız ocak: ödül yok.
  const empty = start(); empty.dragons = [];
  assert.throws(() => run(empty, 'topcu.clear', { mode: 'stage' }), /topcu_no_dragon/);
  // Sunucu saati yoksa günlük tavan hesaplanamaz: ret.
  assert.throws(() => reduceCommand(start(), cmd('topcu.clear', { mode: 'stage' }), { accountId: 'acct', seed: 'x' }), /server_time_unavailable/);
});

test('ENG13 goal.reach: tutar sunucu GOALS tablosundan, hesap başına bir kez (DÜŞÜK-1), bound', () => {
  const g0 = start();
  const r = run(g0, 'goal.reach', { id: 'win1' });
  assert.equal(r.result.gold, 50); assert.equal(r.game.gold, g0.gold + 50);
  // Kaynak: mevcut goalSource politikası (değişmedi): girdisi doğrulanmamış hedef unknown, aksi bound; asla earned.
  assert.ok(['bound', 'unknown'].includes(r.result.source)); assert.equal(r.game.funds[r.result.source], g0.funds[r.result.source] + 50); assert.equal(r.game.funds.earned, g0.funds.earned);
  const again = run(r.game, 'goal.reach', { id: 'win1' });
  assert.equal(again.result.already, true); assert.equal(again.game.gold, r.game.gold);
  // Sunucunun kendi hedef denetimi aynı hedefi ikinci kez ödemez.
  assert.equal(run(r.game, 'goals.claim').game.gold, r.game.gold);
  assert.throws(() => run(g0, 'goal.reach', { id: 'para' }), /unknown_goal/);
});

test('ENG13 gold.local: gider düşer (yetmezse ret), gelir tür tavanı + günlük tavanla unknown girer; borç önce kapanır', () => {
  const g0 = start();
  let r = run(g0, 'gold.local', { reason: 'arena', amount: -100 });
  assert.equal(r.game.gold, g0.gold - 100); assert.equal(r.result.spent, 100);
  assert.throws(() => run(g0, 'gold.local', { reason: 'other', amount: -(g0.gold + 1) }), /insufficient_gold/);
  r = run(g0, 'gold.local', { reason: 'race', amount: 5000 });
  assert.equal(r.result.credited, income.LOCAL_REASONS.race); assert.equal(r.result.clipped, 5000 - income.LOCAL_REASONS.race);
  assert.equal(r.game.funds.unknown, g0.funds.unknown + income.LOCAL_REASONS.race); assert.equal(r.game.funds.earned, g0.funds.earned);
  // Günlük tavan
  const full = JSON.parse(JSON.stringify(g0)); full.srvDaily = { day: new Date(NOW).toISOString().slice(0, 10), local: income.CAPS.localDaily - 10, topcu: 0, orders: 0, offers: 0 };
  r = run(full, 'gold.local', { reason: 'arena', amount: 300 }); assert.equal(r.result.credited, 10);
  // Borç: gelir önce borca gider.
  const owing = JSON.parse(JSON.stringify(g0)); owing.gold = 0; owing.funds = { schema: 1, bound: 0, unknown: 0, earned: 0 }; owing.debt = 50;
  r = run(owing, 'gold.local', { reason: 'event', amount: 80 });
  assert.equal(r.game.debt, 0); assert.equal(r.game.gold, 30);
  assert.throws(() => run(owing, 'gold.local', { reason: 'event', amount: -1 }), /debt_outstanding/);
});

test('ENG13 gold.import: kayıt öncesi yerel altın bir kez, tavanla, bound', () => {
  const g0 = start();
  const r = run(g0, 'gold.import', { amount: 9999 });
  assert.equal(r.result.credited, income.CAPS.importCap); assert.equal(r.result.dropped, 9999 - income.CAPS.importCap);
  assert.equal(r.game.funds.bound, g0.funds.bound + income.CAPS.importCap);
  const again = run(r.game, 'gold.import', { amount: 500 });
  assert.equal(again.result.already, true); assert.equal(again.game.gold, r.game.gold);
  assert.equal(run(g0, 'gold.import', { amount: 0 }).result.credited, 0);
});

test('ENG13 yapılandırma: geçersiz tavan açılışta hata verir', () => {
  assert.throws(() => income.readCaps({ EO_LOCAL_INCOME_DAILY_CAP: 'çok' }), /invalid_EO_LOCAL_INCOME_DAILY_CAP/);
  assert.throws(() => income.readCaps({ EO_LOCAL_IMPORT_CAP: '-1' }), /invalid_EO_LOCAL_IMPORT_CAP/);
  assert.equal(income.readCaps({ EO_LOCAL_IMPORT_CAP: '500' }).importCap, 500);
});

// Depo katmanı: ilandaki/takastaki ejderha ölemez, verilemez (net hata); idempotency.
function storeFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-eng13-')), file = path.join(dir, 'db.sqlite');
  const store = openEconomyStore(file), raw = new DatabaseSync(file);
  t.after(() => { raw.close(); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const load = id => JSON.parse(raw.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(id).game_json);
  const save = (id, g) => raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), id);
  const fresh = () => { const id = store.createGuest().accountId; store.executeCommand(id, { requestId: crypto.randomUUID(), expectedVersion: 0, type: 'game.start', args: {} }); const g = load(id); earnedFixture(g); save(id, g); return id; };
  const eco = id => store.readEconomy(id);
  const exec = (id, type, args, requestId = crypto.randomUUID()) => store.executeCommand(id, { requestId, expectedVersion: eco(id).version, type, args });
  return { store, fresh, eco, exec };
}
test('ENG13 depo: ilandaki ejderha ölemez/müzayedeye/siparişe verilemez (market_reserved_asset); ilan geri çekilince ölür', t => {
  const f = storeFixture(t), a = f.fresh(), id = f.eco(a).dragons[0].assetId, el = f.eco(a).dragons[0].data.el;
  const listing = f.store.executeMarket(a, { op: 'list', requestId: crypto.randomUUID(), kind: 'dragon', assetId: id, quantity: 1, unitPrice: 100 }).listing;
  for (const [type, args] of [['dragon.die', { assetId: id }], ['auction.sell', { assetId: id }], ['order.deliver', { assetId: id, spec: `lv=0;wk=1;el=${el};stage=genc` }], ['offer.sell', { assetId: id }]]) {
    assert.throws(() => f.exec(a, type, args), /market_reserved_asset/, type);
  }
  assert.equal(f.eco(a).dragons.some(r => r.assetId === id), true);
  f.store.executeMarket(a, { op: 'cancel', requestId: crypto.randomUUID(), listingId: listing.id });
  const rid = crypto.randomUUID();
  const out = f.exec(a, 'dragon.die', { assetId: id }, rid);
  assert.equal(f.eco(a).dragons.some(r => r.assetId === id), false);
  // Aynı requestId: aynı makbuz, ikinci kez uygulanmaz.
  const v = f.eco(a).version;
  const replay = f.store.executeCommand(a, { requestId: rid, expectedVersion: v - 1, type: 'dragon.die', args: { assetId: id } });
  assert.equal(JSON.stringify(replay.result), JSON.stringify(out.result)); assert.equal(f.eco(a).version, v);
});
test('ENG13 depo: takastaki ejderha ölemez (trade_reserved_asset)', t => {
  const f = storeFixture(t), a = f.fresh(), b = f.fresh(), id = f.eco(a).dragons[0].assetId;
  const send = (actor, type, extra) => f.store.executeTrade(actor, { type, requestId: crypto.randomUUID(), ...extra }).trade;
  let trade = send(a, 'invite', { targetId: b });
  trade = send(b, 'accept', { tradeId: trade.id });
  send(a, 'offer', { tradeId: trade.id, revision: trade.revision, offer: { gold: 0, items: [], dragons: [id], eggs: [], food: {} } });
  assert.throws(() => f.exec(a, 'dragon.die', { assetId: id }), /trade_reserved_asset/);
});
