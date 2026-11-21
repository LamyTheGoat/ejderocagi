'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { openEconomyStore } = require('../server/economy_store');
const { createHuni, planla, temizAdimlar, gunNo, ADIMLAR } = require('../server/huni_service');

const GUN = 86400000, T0 = Date.UTC(2026, 10, 20, 9);   // 20 Kasım 2026, 12:00 Türkiye

test('planla: adım hesap başına bir kez sayılır; ertesi gün ve 7+ gün dönüş sunucu gününden çıkar', () => {
  const g = 20000;
  let r = planla(null, ['sayfa', 'ad'], g);
  assert.deepEqual(r.yeni, ['sayfa', 'ad']); assert.equal(r.kohort, g);
  r = planla(r.kayit, ['sayfa', 'ad'], g);
  assert.deepEqual(r.yeni, [], 'aynı gün aynı adım yeniden yazılmaz');
  r = planla(r.kayit, ['sayfa'], g + 1);
  assert.deepEqual(r.yeni, ['geri1']); assert.equal(r.kohort, g, 'kohort ilk gündür');
  r = planla(r.kayit, ['sayfa'], g + 3);
  assert.deepEqual(r.yeni, []);
  r = planla(r.kayit, ['sayfa'], g + 8);
  assert.deepEqual(r.yeni, ['geri7']);
  // ertesi gün gelmeyen geri1 almaz
  const s = planla(planla(null, ['sayfa'], g).kayit, ['sayfa'], g + 2);
  assert.deepEqual(s.yeni, []);
});

test('temizAdimlar: yalnız bilinen istemci adımları; sunucu adımı (geri1) istemciden gelemez', () => {
  assert.deepEqual(temizAdimlar({ adimlar: ['ad', 'ad', 'geri1', 'geri7', 'uydurma', 5, 'hafta1'] }), ['ad', 'hafta1']);
  assert.throws(() => temizAdimlar({ adimlar: ['geri1'] }), /funnel_step_invalid/);
  assert.throws(() => temizAdimlar(null), /funnel_step_invalid/);
});

test('gunNo Türkiye takvimine göredir: UTC 21:30 ertesi güne düşer', () => {
  const a = gunNo(Date.UTC(2026, 10, 20, 20, 59)), b = gunNo(Date.UTC(2026, 10, 20, 21, 1));
  assert.equal(b - a, 1);
});

test('SQLite deposu: kaydet ve oku; yinelenen istek sayıyı şişirmez; kohort oranları', async () => {
  let t = T0; const store = openEconomyStore(':memory:', { now: () => t });
  const huni = createHuni({ store, anahtar: 'x'.repeat(20), now: () => t });
  const a = await store.createGuest(), b = await store.createGuest();
  assert.deepEqual((await huni.kaydet(a, { adimlar: ['sayfa', 'yuklendi', 'yeni_ocak', 'ad'] })).yeni, ['sayfa', 'yuklendi', 'yeni_ocak', 'ad']);
  assert.deepEqual((await huni.kaydet(a, { adimlar: ['sayfa', 'ad'] })).yeni, []);
  await huni.kaydet(b, { adimlar: ['sayfa'] });
  t += GUN; await huni.kaydet(a, { adimlar: ['sayfa', 'hafta1'] });
  const o = await huni.oku(7);
  assert.equal(o.gunler.length, 1, 'iki oyuncu da ilk günün kohortunda');
  const g = o.gunler[0];
  assert.equal(g.sayac.sayfa, 2); assert.equal(g.sayac.ad, 1); assert.equal(g.sayac.hafta1, 1); assert.equal(g.sayac.geri1, 1); assert.equal(g.yas, 1);
  assert.deepEqual(o.geri1, { taban: 2, donen: 1 });
  assert.deepEqual(o.geri7, { taban: 0, donen: 0 }, 'yedi günü dolmayan kohort 7+ oranına girmez');
  assert.deepEqual(o.adimlar.map(x => x.id), ADIMLAR);
  await assert.rejects(huni.kaydet(null, { adimlar: ['sayfa'] }), /guest_session_required/);
  store.close();
});

test('okuma izni: anahtar yoksa ya da kısaysa kapalı; yanlış anahtar reddedilir', () => {
  const store = {};
  const req = h => ({ headers: { authorization: h } });
  assert.equal(createHuni({ store }).okumaIzni(req('Bearer ')), false);
  assert.equal(createHuni({ store, anahtar: 'kisa' }).okumaIzni(req('Bearer kisa')), false);
  const h = createHuni({ store, anahtar: 'dogru-anahtar-12345' });
  assert.equal(h.okumaIzni(req('Bearer dogru-anahtar-12345')), true);
  assert.equal(h.okumaIzni(req('Bearer yanlis-anahtar-1234')), false);
  assert.equal(h.okumaIzni(req(undefined)), false);
});
