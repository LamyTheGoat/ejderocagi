'use strict';
// Hesap tezgâhı (2.0): sunucu pazar stoğunun yenilenmesi (tezgah.hafta) ve bağlı ocakta shop.dragon / shop.egg.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { reduceCommand, validateCommand } = require('../server/economy_commands');

const env = (seed = 'tezgah-seed') => ({ accountId: 'acct', seed, now: Date.UTC(2026, 10, 16, 12) });
const start = () => reduceCommand(null, { type: 'game.start', args: {} }, env()).game;
const cmd = (type, args = {}) => validateCommand({ type, args, requestId: crypto.randomUUID(), expectedVersion: 0 }).command;
const run = (state, type, args = {}, e = env()) => reduceCommand(state, cmd(type, args), e);
const bagla = g => run(g, 'ocak.sync', { body: JSON.stringify({ ocak: 'ocak-0001-aaaa', ej: [], yu: [], ejIds: [], yuIds: [] }) }).game;
const zengin = (g, earned) => { g.funds.earned += earned; g.gold += earned; return g; };
const bosalt = g => { g.gold -= g.funds.bound; g.funds.bound = 0; return g; };

test('tezgah.hafta şema: hafta tam sayı olmalı; bağlı olmayan ocakta reddedilir', () => {
  assert.throws(() => cmd('tezgah.hafta', { week: '3' }), /invalid_arguments/);
  assert.throws(() => cmd('tezgah.hafta', { week: 0 }), /invalid_arguments/);
  assert.throws(() => cmd('tezgah.hafta', { week: 3, gold: 5 }), /invalid_arguments/);
  assert.throws(() => run(start(), 'tezgah.hafta', { week: 3 }), /ocak_not_bound/);
});

test('tezgah.hafta: hafta ilerleyince stok yenilenir, aynı ya da eski hafta yenilemez; sunucu haftası ve kesesi değişmez', () => {
  const g = bagla(start()), once = JSON.stringify(g.market);
  const a = run(g, 'tezgah.hafta', { week: 5 });
  assert.equal(a.result.tezgah.yenilendi, true);
  assert.notEqual(JSON.stringify(a.game.market), once);
  assert.equal(a.game.week, g.week); assert.equal(a.game.gold, g.gold); assert.deepEqual(a.game.funds, g.funds);
  assert.equal(a.game.ocak.hafta, 5);
  for (const tekrar of [5, 4, 1]) {
    const b = run(a.game, 'tezgah.hafta', { week: tekrar }, env('baska-zar'));
    assert.equal(b.result.tezgah.yenilendi, false);
    assert.deepEqual(b.game.market, a.game.market);
  }
  const c = run(a.game, 'tezgah.hafta', { week: 9 }, env('baska-zar'));
  assert.equal(c.result.tezgah.yenilendi, true); assert.equal(c.game.market.dragons.length, 3); // 8. haftadan sonra üçüncü ejderha (core.js)
});

test('bağlı ocakta shop.dragon: sunucu ızgarası dolu olsa da alınır; kazanılmış altınla alınan kazanılmış, bağlı altın karışırsa bağlı olur', () => {
  let g = bagla(start());
  g = run(g, 'tezgah.hafta', { week: 2 }).game;
  const mal = g.market.dragons[0], fiyat = mal.price;
  // bağlanmamış ocakta yer denetimi sürer
  const dolu = start(); dolu.grid.forEach(t => { if (t.b === 'in') t.b = null; });
  assert.throws(() => run(zengin(dolu, 5000), 'shop.dragon', { id: dolu.market.dragons[0].id }), /dragon_unavailable/);
  // bağlı ocak: in olmasa da alınır
  const b = bosalt(zengin(JSON.parse(JSON.stringify(g)), 5000)); b.grid.forEach(t => { if (t.b === 'in') t.b = null; });
  const r = run(b, 'shop.dragon', { id: mal.id });
  const alinan = r.game.dragons[r.game.dragons.length - 1];
  assert.equal(alinan.funding, 'earned'); assert.equal(alinan.name, mal.name); assert.ok(alinan.assetId);
  assert.equal(r.game.gold, b.gold - fiyat); assert.equal(r.game.funds.earned, 5000 - fiyat);
  assert.equal(r.game.market.dragons.some(d => d.name === mal.name && d.price === fiyat), false);
  // bağlı altın duruyorken: önce o harcanır, mal bağlı olur (kaynak politikası değişmedi)
  const karisik = zengin(JSON.parse(JSON.stringify(g)), 5000); karisik.funds.bound += 100; karisik.gold += 100;
  const k = run(karisik, 'shop.dragon', { id: mal.id });
  assert.equal(k.game.dragons[k.game.dragons.length - 1].funding, 'bound');
  // altın yetmezse reddedilir
  assert.throws(() => run(bosalt(JSON.parse(JSON.stringify(g))), 'shop.dragon', { id: mal.id }), /insufficient_gold/);
});

test('bağlı ocakta shop.egg: kazanılmış altınla alınan yumurta kazanılmıştır', () => {
  let g = bagla(start());
  g = bosalt(zengin(run(g, 'tezgah.hafta', { week: 3 }).game, 1000));
  const r = run(g, 'shop.egg', { id: g.market.egg.id });
  assert.equal(r.game.eggs[r.game.eggs.length - 1].funding, 'earned'); assert.equal(r.game.market.egg, null);
});

test('çift başlangıç kesesi: ocak bağlanınca bağlı altın bir kez sıfırlanır; kazanılmış altın ve bağlı olmayan hesap etkilenmez', () => {
  const g = zengin(start(), 300), bagliAltin = g.funds.bound;
  assert.ok(bagliAltin > 0);
  const a = run(g, 'ocak.sync', { body: JSON.stringify({ ocak: 'ocak-0001-aaaa', ej: [], yu: [], ejIds: [], yuIds: [] }) });
  assert.equal(a.result.ocak.kese, bagliAltin);
  assert.deepEqual([a.game.gold, a.game.funds.bound, a.game.funds.earned], [300, 0, 300]);
  assert.equal(a.game.ocak.kese.dusulen, bagliAltin);
  // ikinci eşleme bir daha düşmez; sonradan yazılan altına dokunmaz
  const sonra = JSON.parse(JSON.stringify(a.game)); sonra.funds.bound += 50; sonra.gold += 50;
  const b = run(sonra, 'ocak.sync', { body: JSON.stringify({ ocak: 'ocak-0001-aaaa', ej: [], yu: [], ejIds: [], yuIds: [] }) });
  assert.equal(b.result.ocak.kese, undefined); assert.equal(b.game.gold, 350); assert.equal(b.game.funds.bound, 50);
  // sıfırlamadan sonra hesap tezgâhından alınan mal kazanılmıştır
  const c = run(zengin(run(a.game, 'tezgah.hafta', { week: 2 }).game, 2000), 'shop.egg', { id: run(a.game, 'tezgah.hafta', { week: 2 }).game.market.egg.id });
  assert.equal(c.game.eggs[c.game.eggs.length - 1].funding, 'earned');
  // bağlı olmayan hesap: tezgah ve kese aynen
  assert.equal(run(start(), 'goals.claim', {}).game.funds.bound, bagliAltin);
});

test('hedef ödülü bağlı ocakta: sunucu hesap başına bir kez yazar, takas edilemez; yerelde ödenmiş hedefler bir kez bildirilir ve ödenmez', () => {
  const body = ek => JSON.stringify(Object.assign({ ocak: 'ocak-0001-aaaa', ej: [], yu: [], ejIds: [], yuIds: [] }, ek));
  assert.throws(() => run(start(), 'ocak.sync', { body: body({ hedefler: 'win1' }) }), /ocak_body_invalid/);
  const g = run(start(), 'ocak.sync', { body: body({ hedefler: ['train', 'yok-boyle-hedef', 'train'] }) }).game;
  assert.deepEqual(g.ocak.hedef, ['train']); assert.equal(g.gold, 0);
  // bildirilmiş hedef ödenmez; yeni hedef bir kez ödenir
  const t = run(g, 'goal.reach', { id: 'train' });
  assert.equal(t.result.already, true); assert.equal(t.game.gold, 0);
  const w = run(g, 'goal.reach', { id: 'win1' });
  assert.equal(w.result.gold, 50); assert.equal(w.game.gold, 50); assert.equal(w.game.funds.earned, 0); assert.notEqual(w.result.source, 'earned');
  const w2 = run(w.game, 'goal.reach', { id: 'win1' });
  assert.equal(w2.result.already, true); assert.equal(w2.game.gold, 50);
  // liste kurulduktan sonra yeniden bildirim listeyi değiştirmez (ödenmemiş hedef "ödendi" yapılamaz, ödenmiş silinemez)
  const s = run(w.game, 'ocak.sync', { body: body({ hedefler: [] }) }).game;
  assert.deepEqual(s.ocak.hedef, ['train', 'win1']);
  // başka ocak kimliğiyle (yeniden kurulan ocak) aynı hesapta ödül yeniden yazılmaz
  const yeniOcak = run(w.game, 'ocak.sync', { body: JSON.stringify({ ocak: 'ocak-0002-bbbb', ej: [], yu: [], ejIds: [], yuIds: [] }) }).game;
  assert.equal(run(yeniOcak, 'goal.reach', { id: 'win1' }).result.already, true);
  assert.throws(() => run(g, 'goal.reach', { id: 'olmayan' }), /unknown_goal/);
});

test('bağlı ocakta haftalık kural yerel haftaya bakar: müzayede satışı bildirilen hafta ilerleyince yeniden açılır; stok sezon içi haftayla üretilir', () => {
  let g = bagla(start());
  const ekle = (g, n) => { const d = JSON.parse(JSON.stringify(g.dragons[0])); Object.assign(d, { id: 900 + n, assetId: 'acct:dragon:k' + n, funding: 'earned', stage: 'yetiskin' }); delete d.yerel; g.dragons.push(d); return d.assetId; };
  g = run(g, 'tezgah.hafta', { week: 3 }).game;
  const a1 = ekle(g, 1), a2 = ekle(g, 2);
  let satildi = null;
  for (let i = 0; i < 12 && !satildi; i++) { const r = run(g, 'auction.sell', { assetId: a1 }, env('z' + i)); if (r.result.sold) satildi = r; }
  assert.ok(satildi, 'on iki zarda en az bir satış beklenir');
  assert.equal(satildi.game.funds.earned, satildi.result.got);
  assert.throws(() => run(satildi.game, 'auction.sell', { assetId: a2 }), /auction_weekly_limit/);
  const sonraki = run(satildi.game, 'tezgah.hafta', { week: 4 }).game;
  assert.doesNotThrow(() => run(sonraki, 'auction.sell', { assetId: a2 }));
  // mutlak hafta 23 = ikinci sezonun 3. haftası: stok üretilir, sunucu haftası değişmez, üçüncü ejderha (8. haftadan sonra) yoktur
  const s2 = run(sonraki, 'tezgah.hafta', { week: 23 });
  assert.equal(s2.result.tezgah.yenilendi, true); assert.equal(s2.game.market.dragons.length, 2); assert.equal(s2.game.week, sonraki.week);
});
