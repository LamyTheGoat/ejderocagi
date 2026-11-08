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

test('ENG13 auction.sell: sunucu tohumlu RNG ile müzayedeyi oynar; %10 komisyon, earned (tavanlı), haftada bir; aynı tohum aynı sonuç', () => {
  const g0 = start(), id = kor(g0).assetId;
  const a = run(g0, 'auction.sell', { assetId: id }), b = run(g0, 'auction.sell', { assetId: id });
  assert.deepEqual(a.result.auction, b.result.auction); // tekrar denemede yeniden zar yok
  const sim = a.result.auction;
  assert.equal(sim.bidders.length, 3);
  if (sim.sold !== false && a.result.sold) {
    assert.equal(a.result.got, Math.round(sim.price * 0.9));
    assert.equal(a.game.gold, g0.gold + a.result.got);
    assert.equal(a.game.funds.earned, g0.funds.earned + a.result.got); // K13-2: günlük tavan altında earned
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
  assert.equal(r.game.funds.earned, g0.funds.earned + r.result.gold); // K13-2
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
  assert.equal(r.result.gold, 150); assert.equal(g.funds.earned, 150); assert.equal(g.funds.unknown, 0);
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
  return { store, fresh, eco, exec, file };
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

test('ENG13 topcu: garantili düşüşler sunucu chibi kesesine yazılır; çark tohumlu (aynı tohum aynı dilim)', () => {
  let g = start();
  const t2 = g.chibi.stones.kor_t2;
  const r = run(g, 'topcu.clear', { mode: 'raid_normal:komutan' });
  assert.equal(r.result.drops.kalgarot_kalip, 1); assert.ok(r.result.drops.kor_t2 >= 2);
  assert.equal(r.game.chibi.stones.kor_t2, t2 + r.result.drops.kor_t2);
  assert.throws(() => run(g, 'topcu.clear', { mode: 'raid_normal:<x>' }), /unknown_topcu_mode/);
  g = r.game;
  const a = run(g, 'topcu.spin', { wheel: 'major_normal' }, env('same')), b = run(g, 'topcu.spin', { wheel: 'major_normal' }, env('same'));
  assert.equal(a.result.idx, b.result.idx);
  const ids = new Set(); for (let i = 0; i < 40; i++) ids.add(run(g, 'topcu.spin', { wheel: 'major_normal' }, env('w' + i)).result.id);
  assert.ok(ids.size >= 3); // gerçekten zarlanıyor
});
test('ENG13 istemci saf yardımcılar: yığından gelir türü, defter birleştirme, sipariş tanımı sunucu ayrıştırıcısıyla uyumlu', () => {
  const Y = require('../js/economy_sync');
  const st = f => `Error\n    at note (http://x/js/economy_sync.js:1:1)\n    at fn (http://x/js/${f}:10:2)`;
  assert.equal(Y.reasonFromStack(st('race.js')), 'race');
  assert.equal(Y.reasonFromStack(st('minigame/shm_ui.js')), 'topcu');
  assert.equal(Y.reasonFromStack(st('kiraathane.js')), 'kiraathane');
  assert.equal(Y.reasonFromStack(st('bilinmeyen.js')), 'other');
  assert.equal(Y.reasonFromStack(''), 'other');
  for (const r of new Set(Object.values(Y.FILE_REASON))) if (r !== 'topcu') assert.ok(Object.hasOwn(income.LOCAL_REASONS, r), r);
  const L = []; Y.pushLedger(L, 'arena', 50); Y.pushLedger(L, 'arena', 30); Y.pushLedger(L, 'arena', -10); Y.pushLedger(L, 'race', 5);
  assert.deepEqual(L, [{ r: 'arena', a: 80 }, { r: 'arena', a: -10 }, { r: 'race', a: 5 }]);
  const o = { lv: 2, by: 14, reqs: [['el', 'buz'], ['stage', 'yetiskin'], ['pot', ['ze', 4]], ['sex', 'F'], ['pig', 'a']] };
  const spec = Y.orderSpec(o), parsed = income.parseOrder(spec, ['ates', 'buz']);
  assert.equal(spec, 'lv=2;wk=7;el=buz;stage=yetiskin;pot=ze4;sex=F;pig=a');
  assert.equal(parsed.lv, 2); assert.equal(parsed.wk, 7); assert.deepEqual(parsed.reqs.find(r => r[0] === 'pot')[1], ['ze', 4]);
  assert.match(Y.importText(9579, 2000, 2000), /420 başlangıç.*2000.*7579 altın aktarılmadı/);
});

test('ENG13 K13-2: sunucu geliri günlük earned tavanına kadar earned, aşanı unknown; ertesi gün sıfırlanır; harcama sırası değişmez', () => {
  const day = new Date(NOW).toISOString().slice(0, 10), cap = income.CAPS.earnedDaily;
  assert.equal(cap, 3000);
  let g = start(); g.srvDaily = { day, local: 0, topcu: 0, orders: 0, offers: 0, earned: cap - 100 };
  const r = run(g, 'topcu.clear', { mode: 'raid_normal:komutan' }); // 250
  assert.equal(r.result.credit.earned, 100); assert.equal(r.result.credit.unknown, 150);
  assert.equal(r.game.funds.earned, g.funds.earned + 100); assert.equal(r.game.funds.unknown, g.funds.unknown + 150);
  assert.equal(r.game.funds.bound + r.game.funds.unknown + r.game.funds.earned, r.game.gold); // invariant
  // Tavan dolu: hepsi unknown. Ertesi gün: yine earned.
  g = r.game;
  const full = run(g, 'topcu.clear', { mode: 'stage' });
  assert.equal(full.result.credit.earned, 0); assert.equal(full.result.credit.unknown, 150);
  const next = run(g, 'topcu.clear', { mode: 'stage' }, { ...env(), now: NOW + 86_400_000 });
  assert.equal(next.result.credit.earned, 150);
  // İstemci bildirimli defter ve aktarım earned olmaz.
  assert.equal(run(start(), 'gold.local', { reason: 'race', amount: 200 }).game.funds.earned, start().funds.earned);
  assert.equal(run(start(), 'gold.import', { amount: 500 }).game.funds.earned, start().funds.earned);
  // Harcama sırası bound → unknown → earned: earned en son harcanır.
  const mix = full.game; // bound 420 + earned 100 + unknown 300
  const spent = run(mix, 'gold.local', { reason: 'other', amount: -(mix.funds.bound + 10) });
  assert.equal(spent.game.funds.bound, 0); assert.equal(spent.game.funds.unknown, mix.funds.unknown - 10); assert.equal(spent.game.funds.earned, mix.funds.earned);
  // Yapılandırma
  assert.equal(income.readCaps({ EO_EARNED_DAILY_CAP: '500' }).earnedDaily, 500);
  assert.throws(() => income.readCaps({ EO_EARNED_DAILY_CAP: 'x' }), /invalid_EO_EARNED_DAILY_CAP/);
});
test('ENG13 K13-2 depo: earned Topçu geliriyle alınan ejderha Bedesten\'e konur; unknown altınla alınan konamaz', t => {
  const f = storeFixture(t);
  const listFirstNew = (a, before) => {
    const row = f.eco(a).dragons.find(r => !before.includes(r.assetId));
    return () => f.store.executeMarket(a, { op: 'list', requestId: crypto.randomUUID(), kind: 'dragon', assetId: row.assetId, quantity: 1, unitPrice: 100 });
  };
  const buyWith = a => { const before = f.eco(a).dragons.map(r => r.assetId); const id = f.eco(a).game.market.dragons[0].id; f.exec(a, 'shop.dragon', { id }); return listFirstNew(a, before); };
  const zero = (a, extra) => { const raw = new DatabaseSync(f.file); const g = JSON.parse(raw.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(a).game_json); g.gold = 0; g.funds = { schema: 1, bound: 0, unknown: 0, earned: 0 }; g.goals = (g.goals || []).concat(['acq']); Object.assign(g, extra); raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), a); raw.close(); };
  // A: kese yalnız Topçu earned geliri (tavan altı).
  const a = f.fresh(); zero(a, {});
  for (const mode of ['raid_extreme:komutan', 'raid_extreme:komutan', 'raid_hard:komutan']) f.exec(a, 'topcu.clear', { mode });
  assert.equal(f.eco(a).funds.earned, Math.min(3000, 950 + 950 + 500)); assert.equal(f.eco(a).funds.unknown, 0);
  const listA = buyWith(a);
  assert.equal(listA().listing.status, 'open');
  // B: kese yalnız istemci defteri (unknown).
  const b = f.fresh(); zero(b, {});
  for (let i = 0; i < 4; i++) f.exec(b, 'gold.local', { reason: 'dungeon', amount: 2500 });
  assert.equal(f.eco(b).funds.unknown, 10000); assert.equal(f.eco(b).funds.earned, 0);
  const listB = buyWith(b);
  assert.throws(listB, /asset_not_transferable/);
});