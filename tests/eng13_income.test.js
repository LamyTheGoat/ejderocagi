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

test('ENG13 auction.sell: sunucu tohumlu RNG ile müzayedeyi oynar; %10 komisyon, ejderhanın kaynağı korunur (Y-1), haftada bir (oyun kuralı); aynı tohum aynı sonuç', () => {
  const g0 = start(), id = kor(g0).assetId;
  const a = run(g0, 'auction.sell', { assetId: id }), b = run(g0, 'auction.sell', { assetId: id });
  assert.deepEqual(a.result.auction, b.result.auction); // tekrar denemede yeniden zar yok
  const sim = a.result.auction;
  assert.equal(sim.bidders.length, 3);
  if (sim.sold !== false && a.result.sold) {
    assert.equal(a.result.got, Math.round(sim.price * 0.9));
    assert.equal(a.game.gold, g0.gold + a.result.got);
    const src = kor(g0).funding; assert.equal(a.result.source, src); // Y-1: başlangıç ejderhası bound → gelir bound
    assert.equal(a.game.funds[src], g0.funds[src] + a.result.got);
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

test('ENG13 order.deliver: gen şartları sunucu ejderhasında doğrulanır, altın orders.js formülüyle sunucuda hesaplanır, kaynak korunur, sayı sınırı yok', () => {
  const g0 = start(), d = kor(g0), el = d.el, other = el === 'ates' ? 'buz' : 'ates';
  const spec = `lv=0;wk=3;el=${el};stage=genc`;
  const r = run(g0, 'order.deliver', { assetId: d.assetId, spec });
  assert.equal(r.result.gold, Math.round((140 + 1 * 120 + 3 * 12) / 10) * 10); // 300
  assert.equal(r.game.gold, g0.gold + r.result.gold);
  assert.equal(r.result.source, d.funding); assert.equal(r.game.funds[d.funding], g0.funds[d.funding] + r.result.gold); // Y-1
  assert.equal(r.game.dragons.some(x => x.assetId === d.assetId), false);
  assert.throws(() => run(g0, 'order.deliver', { assetId: d.assetId, spec: `lv=0;wk=3;el=${other};stage=genc` }), /order_unfit/);
  // Yapı orders.js orderGen dışında olamaz: seviye 0'a nadir şart eklenemez, ağırlık şişirilemez.
  for (const bad of [`lv=0;wk=3;el=${el};stage=genc;par=P`, `lv=2;wk=3;el=${el};stage=genc`, `lv=0;wk=99;el=${el};stage=genc`, `lv=0;el=${el};stage=genc`, 'gold=9999']) {
    assert.throws(() => run(g0, 'order.deliver', { assetId: d.assetId, spec: bad }), /invalid_order/);
  }
  // Kullanıcı kararı: sayı sınırı yok; kazanılmış (earned) ejderhanın sipariş geliri earned.
  let g = g0; for (let i = 0; i < 5; i++) { g = JSON.parse(JSON.stringify(g)); g.dragons.push({ ...JSON.parse(JSON.stringify(d)), id: 50 + i, assetId: 'acct:dragon:x' + i, funding: 'earned' }); g = run(g, 'order.deliver', { assetId: 'acct:dragon:x' + i, spec }).game; }
  assert.equal(g.funds.earned, g0.funds.earned + 5 * 300);
});

test('ENG13 offer.sell: value × 1.4 sunucuda; kaynak korunur; sayı sınırı yok', () => {
  const g0 = start(), d = kor(g0);
  const r = run(g0, 'offer.sell', { assetId: d.assetId });
  assert.ok(r.result.price > 0); assert.equal(r.game.gold, g0.gold + r.result.price);
  assert.equal(r.result.source, d.funding);
  const g = r.game; g.dragons.push({ ...JSON.parse(JSON.stringify(d)), id: 77, assetId: 'acct:dragon:77', funding: 'earned' });
  const r2 = run(g, 'offer.sell', { assetId: 'acct:dragon:77' });
  assert.equal(r2.game.funds.earned, g.funds.earned + r2.result.price);
});

test('ENG13 topcu.clear/spin: sabit geçiş ödülü, çark sunucuda zarlanır, hak olmadan çevrilmez, ücretli çark, tavan yok, earned', () => {
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
  // Kullanıcı kararı: tavan ve ejderha şartı yok; gelir earned; sunucu saati gerekmez.
  let many = g; for (let i = 0; i < 20; i++) many = run(many, 'topcu.clear', { mode: 'raid_extreme' }).game;
  assert.equal(many.gold, g.gold + 20 * 950); assert.equal(many.funds.earned, g.funds.earned + 20 * 950);
  const empty = start(); empty.dragons = [];
  assert.equal(run(empty, 'topcu.clear', { mode: 'stage' }).result.gold, 150);
  assert.equal(reduceCommand(start(), cmd('topcu.clear', { mode: 'stage' }), { accountId: 'acct', seed: 'x' }).result.gold, 150);
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

test('ENG13 gold.local: gider düşer (yetmezse ret), gelir tavansız earned girer; borç önce kapanır', () => {
  const g0 = start();
  let r = run(g0, 'gold.local', { reason: 'arena', amount: -100 });
  assert.equal(r.game.gold, g0.gold - 100); assert.equal(r.result.spent, 100);
  assert.throws(() => run(g0, 'gold.local', { reason: 'other', amount: -(g0.gold + 1) }), /insufficient_gold/);
  r = run(g0, 'gold.local', { reason: 'race', amount: 5000 });
  assert.equal(r.result.credited, 5000); assert.equal(r.game.funds.earned, g0.funds.earned + 5000); assert.equal(r.game.funds.unknown, g0.funds.unknown);
  // Geçerlilik denetimi kalır: tek istek ≤ 1.000.000, tam sayı, sıfır değil.
  assert.throws(() => cmd('gold.local', { reason: 'race', amount: 1_000_001 }), /invalid_arguments/);
  assert.throws(() => cmd('gold.local', { reason: 'race', amount: NaN }), /invalid_arguments/);
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

test('ENG13 kullanıcı kararı: tavan yok; sunucu gelirleri earned, aktarım ve hedef bound; harcama sırası ve invariant korunur', () => {
  const g0 = start();
  let g = g0;
  for (const [type, args] of [['topcu.clear', { mode: 'raid_extreme:komutan' }], ['gold.local', { reason: 'dungeon', amount: 250000 }], ['topcu.clear', { mode: 'stage' }]]) g = run(g, type, args).game;
  assert.equal(g.funds.earned, g0.funds.earned + 950 + 250000 + 150); assert.equal(g.funds.unknown, g0.funds.unknown);
  assert.equal(g.funds.bound + g.funds.unknown + g.funds.earned, g.gold); // invariant
  assert.equal(g.srvDaily, undefined); // günlük sayaç yok
  // Aktarım ve hedef bound kalır (D15).
  assert.equal(run(g0, 'gold.import', { amount: 500 }).game.funds.bound, g0.funds.bound + 80 * 0 + 500);
  // Harcama sırası bound → unknown → earned: earned en son harcanır.
  const spent = run(g, 'gold.local', { reason: 'other', amount: -(g.funds.bound + 10) });
  assert.equal(spent.game.funds.bound, 0); assert.equal(spent.game.funds.earned, g.funds.earned - 10);
  // Eski veri: unknown kova olduğu gibi kalır ve harcamada önce o düşer.
  const legacy = JSON.parse(JSON.stringify(g)); legacy.gold += 100; legacy.funds.unknown += 100;
  const s2 = run(legacy, 'gold.local', { reason: 'other', amount: -(legacy.funds.bound + 50) });
  assert.equal(s2.game.funds.unknown, 50); assert.equal(s2.game.funds.earned, legacy.funds.earned);
  assert.deepEqual(Object.keys(income.CAPS), ['importCap']);
});
test('ENG13 O-1: ardışık yerel kazançlar birleşse de kaybolmaz (5 × 200 = 1000 sunucuya)', () => {
  const Y = require('../js/economy_sync');
  const L = []; for (let i = 0; i < 5; i++) Y.pushLedger(L, 'other', 200);
  assert.deepEqual(L, [{ r: 'other', a: 1000 }]);
  const r = run(start(), 'gold.local', { reason: L[0].r, amount: L[0].a });
  assert.equal(r.result.credited, 1000);
  // Tek istek sınırını aşan birikim parçalanır (geçerlilik sınırı), hiçbir kısım atılmaz.
  const B = []; Y.pushLedger(B, 'dungeon', 900_000); Y.pushLedger(B, 'dungeon', 300_000);
  assert.deepEqual(B.map(x => x.a), [900_000, 300_000]);
});
test('ENG13 K-1: ölüm yeniden denemesi üstel geri çekilir (2 sn → 60 sn), anında döngü yok', () => {
  const Y = require('../js/economy_sync');
  const seq = []; let d; for (let i = 0; i < 8; i++) { d = Y.nextBackoff(d); seq.push(d); }
  assert.deepEqual(seq, [2000, 4000, 8000, 16000, 32000, 60000, 60000, 60000]);
  // 15 sn içinde en çok 4 deneme (0, 2, 6, 14 sn).
  let t = 0, n = 0, delay; while (t <= 15000) { n++; delay = Y.nextBackoff(delay); t += delay; }
  assert.ok(n <= 4, String(n));
});
test('ENG13 depo: earned altınla alınan ejderha Bedesten\'e konur; başlangıç (bound) altınıyla alınan konamaz; Y-1 kaynak korunur', t => {
  const f = storeFixture(t);
  const zero = a => { const raw = new DatabaseSync(f.file); const g = JSON.parse(raw.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(a).game_json); g.gold = 0; g.funds = { schema: 1, bound: 0, unknown: 0, earned: 0 }; g.goals = (g.goals || []).concat(['acq']); raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), a); raw.close(); };
  const buy = a => { const before = f.eco(a).dragons.map(r => r.assetId); f.exec(a, 'shop.dragon', { id: f.eco(a).game.market.dragons[0].id }); return f.eco(a).dragons.find(r => !before.includes(r.assetId)); };
  const list = (a, id) => f.store.executeMarket(a, { op: 'list', requestId: crypto.randomUUID(), kind: 'dragon', assetId: id, quantity: 1, unitPrice: 100 });
  // A: Topçu ve yerel defter geliri earned → alınan ejderha ilana konur.
  const a = f.fresh(); zero(a);
  f.exec(a, 'topcu.clear', { mode: 'raid_extreme:komutan' }); f.exec(a, 'gold.local', { reason: 'dungeon', amount: 2500 });
  assert.equal(f.eco(a).funds.earned, 3450);
  const da = buy(a); assert.equal(da.data.funding, 'earned');
  assert.equal(list(a, da.assetId).listing.status, 'open');
  // B: yalnız aktarım (bound) → alınan ejderha bound, ilana konamaz; Rüstem/sipariş/teklif geliri bound kalır (Y-1).
  const b = f.fresh(); zero(b);
  f.exec(b, 'gold.import', { amount: 2000 });
  const db = buy(b); assert.equal(db.data.funding, 'bound');
  assert.throws(() => list(b, db.assetId), /asset_not_transferable/);
  const before = f.eco(b).funds;
  const r = f.exec(b, 'offer.sell', { assetId: db.assetId });
  assert.equal(r.result.source, 'bound'); assert.equal(f.eco(b).funds.bound, before.bound + r.result.price); assert.equal(f.eco(b).funds.earned, before.earned);
});