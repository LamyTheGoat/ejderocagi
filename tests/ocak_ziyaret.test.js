'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { createOcakZiyaret, temizTablo, temizEjder, DAVET_MS } = require('../server/ocak_ziyaret');
const { createMeydanPresence } = require('../server/meydan_presence');

function kur() {
  const soketler = new Set(), kutu = new Map(); let zaman = 1000;
  const send = (s, m) => { if (!kutu.has(s)) kutu.set(s, []); kutu.get(s).push(m); };
  const Z = createOcakZiyaret({ send, sockets: () => soketler, kimlik: s => s.k, now: () => zaman });
  const baglan = (id) => { const s = { k: { accountId: id, handle: '@' + id } }; soketler.add(s); return s; };
  const son = (s, tur) => (kutu.get(s) || []).filter(m => m.type === tur).pop();
  return { Z, send, soketler, baglan, son, ileri: ms => { zaman += ms; }, kopar: s => { soketler.delete(s); Z.onDisconnect(s); } };
}
const tablo = () => ({ grid: Array.from({ length: 48 }, (_, i) => [i < 6 ? 1 : 0, i === 2 ? 'kulucka' : 0]), dragons: [{ id: 3, name: 'Kor', el: 'ates', stage: 'genc', sex: 'F' }, { id: 9, name: 'x', el: 'yok', stage: 'genc' }], yum: 2 });
const ejder = () => ({ id: 7, name: 'Ayaz', el: 'buz', stage: 'yetiskin', sex: 'M', traits: ['cesur'], genes: { pot: { gu: [3, 4] }, el: ['buz', 'buz'], pat: ['a', 'b'], eye: ['A', 'a'], horn: ['x', 'y'] } });

test('davet, kabul, tablo, teklif ve eşleşme bildirimi; davetsiz kabul ve misafir olmayanın teklifi reddedilir', () => {
  const { Z, baglan, son } = kur(), ev = baglan('ev'), mis = baglan('mis'), yab = baglan('yab');
  Z.onMessage(mis, { type: 'ziyaret_kabul', ev: '@ev' }); assert.equal(son(mis, 'ziyaret_hata').kod, 'davet_yok');
  Z.onMessage(ev, { type: 'ziyaret_tablo', tablo: tablo(), ad: 'Aylin' });
  Z.onMessage(ev, { type: 'ziyaret_davet', to: '@mis', ad: 'Aylin' }); assert.deepEqual(son(mis, 'ziyaret_davet'), { type: 'ziyaret_davet', h: '@ev', ad: 'Aylin' });
  Z.onMessage(mis, { type: 'ziyaret_kabul', ev: '@ev', ad: 'Bora' });
  const b = son(mis, 'ziyaret_basladi'); assert.equal(b.ad, 'Aylin'); assert.equal(b.tablo.dragons.length, 1); assert.equal(b.tablo.grid[2][1], 'kulucka'); assert.equal(b.tablo.yum, 2);
  assert.equal(son(ev, 'ziyaret_geldi').ad, 'Bora'); assert.equal(Z.evOf('mis'), 'ev');
  assert.equal(Z.alan(mis, 'ocak'), 'ocak:ev'); assert.equal(Z.alan(ev, 'ocak'), 'ocak:ev'); assert.equal(Z.alan(yab, 'ocak'), 'ocak:yab'); assert.equal(Z.alan(mis, 'master'), 'master');
  Z.onMessage(yab, { type: 'ziyaret_teklif', d: ejder() }); assert.equal(son(yab, 'ziyaret_hata').kod, 'misafir_degil');
  Z.onMessage(mis, { type: 'ziyaret_teklif', d: { el: 'buz' } }); assert.equal(son(mis, 'ziyaret_hata').kod, 'bicim');
  Z.onMessage(mis, { type: 'ziyaret_teklif', d: ejder() }); assert.equal(son(ev, 'ziyaret_teklif').d.name, 'Ayaz'); assert.equal(son(ev, 'ziyaret_teklif').h, '@mis');
  Z.onMessage(ev, { type: 'ziyaret_oldu', to: '@mis', benim: 'Kor', onun: 'Ayaz' }); assert.deepEqual(son(mis, 'ziyaret_oldu'), { type: 'ziyaret_oldu', ad: 'Aylin', benim: 'Kor', onun: 'Ayaz' });
  Z.onMessage(ev, { type: 'ziyaret_oldu', to: '@yab', benim: 'Kor', onun: 'Ayaz' }); assert.equal(son(ev, 'ziyaret_hata').kod, 'misafir_degil');
  Z.onMessage(mis, { type: 'ziyaret_bitir' }); assert.equal(Z.evOf('mis'), null); assert.equal(son(ev, 'ziyaret_gitti').h, '@mis'); assert.equal(Z.alan(mis, 'ocak'), 'ocak:mis');
});

test('davetin süresi dolar; ev sahibi kopunca misafir çıkarılır; ev sahibi misafirleri yollayabilir', () => {
  const { Z, baglan, son, ileri, kopar } = kur(), ev = baglan('ev'), mis = baglan('mis');
  Z.onMessage(ev, { type: 'ziyaret_davet', to: '@mis' }); ileri(DAVET_MS + 1); Z.onMessage(mis, { type: 'ziyaret_kabul', ev: '@ev' }); assert.equal(son(mis, 'ziyaret_hata').kod, 'davet_yok');
  ileri(2000); Z.onMessage(ev, { type: 'ziyaret_davet', to: '@mis' }); Z.onMessage(mis, { type: 'ziyaret_kabul', ev: '@ev' }); assert.equal(Z.evOf('mis'), 'ev');
  ileri(2000); Z.onMessage(ev, { type: 'ziyaret_bitir' }); assert.equal(son(mis, 'ziyaret_bitti').neden, 'ev_sahibi_yolladi'); assert.equal(Z.evOf('mis'), null);
  ileri(2000); Z.onMessage(ev, { type: 'ziyaret_davet', to: '@mis' }); Z.onMessage(mis, { type: 'ziyaret_kabul', ev: '@ev' });
  kopar(ev); assert.equal(son(mis, 'ziyaret_bitti').neden, 'ev_sahibi_cikti'); assert.equal(Z.evOf('mis'), null);
});

test('süzgeçler: tablo ve ejderha biçimi', () => {
  assert.equal(temizTablo({ grid: [], dragons: [] }), null); assert.equal(temizTablo(tablo()).dragons[0].id, '3');
  assert.equal(temizEjder(Object.assign(ejder(), { stage: 'yavru' })), null); assert.equal(temizEjder(Object.assign(ejder(), { name: 'orospu' })).name, 'Gezgin');
  assert.equal(temizEjder(Object.assign(ejder(), { not: 'x'.repeat(20000) })), null);
});

test('meydan varlığı: herkes kendi ocağında yalnızdır; misafir ev sahibini görür', () => {
  const { Z, baglan, send, son } = kur(), M = createMeydanPresence({ send, kimlik: s => s.k.handle, alan: Z.alan });
  const ev = baglan('ev'), mis = baglan('mis'); const d = (x) => ({ type: 'meydan', a: 'ocak', x, y: 2, d: 'up', s: 'temel', n: 'Ad' });
  M.onMessage(ev, d(1)); M.onMessage(mis, d(2)); assert.equal(son(ev, 'meydan'), undefined, 'ayrı ocaklar birbirini görmez');
  Z.onMessage(ev, { type: 'ziyaret_davet', to: '@mis' }); Z.onMessage(mis, { type: 'ziyaret_kabul', ev: '@ev' });
  M.onMessage(mis, d(3)); assert.equal(son(ev, 'meydan').x, 3); assert.equal(son(ev, 'meydan').a, 'ocak'); assert.equal(son(mis, 'meydan_liste').liste.length, 1);
  Z.onMessage(mis, { type: 'ziyaret_bitir' }); M.onMessage(mis, d(4)); assert.equal(son(ev, 'meydan_cik').id, mis.meydan.id);
});
