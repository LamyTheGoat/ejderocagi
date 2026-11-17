'use strict';
// Kor Örsü kuralları (eo2/js/ors_kural.js): bedeller, bölgeler, tav puanı, sonuçlar, onarım, çarpan.
const test = require('node:test'), assert = require('node:assert/strict');
const K = require('../eo2/js/ors_kural.js');

test('bedel ve şans tablosu: on iki kademe, üç bölge; +12 zirvedir', () => {
  assert.equal(K.sira(12), null);
  const hepsi = Array.from({ length: 12 }, (_, k) => K.sira(k));
  assert.deepEqual(hepsi.map(s => s.bolge), ['guvenli', 'guvenli', 'guvenli', 'guvenli', 'harli', 'harli', 'harli', 'cehennem', 'cehennem', 'cehennem', 'cehennem', 'cehennem']);
  assert.deepEqual(hepsi.map(s => s.sans), [100, 95, 90, 82, 70, 58, 46, 36, 26, 18, 12, 8], 'eski oyunun başarı oranları');
  assert.deepEqual(hepsi.map(s => s.altin), [40, 80, 140, 220, 320, 480, 680, 950, 1300, 1800, 2500, 3500], 'eski oyunun birinci kademe altın bedelleri');
  assert.deepEqual(hepsi.map(s => s.tas + '×' + s.adet), ['kor_t1×3', 'kor_t1×6', 'kor_t1×10', 'kor_t1×16', 'kor_t2×5', 'kor_t2×9', 'kor_t2×14', 'kor_t2×20', 'kor_t3×6', 'kor_t3×11', 'kor_t3×18', 'kor_t3×28']);
});

test('tav: ibrenin yeri darbeyi belirler; körük kumarı ödülü ve cezayı büyütür; şans 1 ile 100 arasında kalır', () => {
  assert.equal(K.vurus(0.5), 'altin'); assert.equal(K.vurus(0.42), 'altin'); assert.equal(K.vurus(0.35), 'sicak'); assert.equal(K.vurus(0.7), 'sicak'); assert.equal(K.vurus(0.1), 'soguk'); assert.equal(K.vurus(0.95), 'soguk');
  assert.equal(K.tavPuani(['altin', 'altin', 'altin']), 15); assert.equal(K.tavPuani(['altin', 'sicak', 'soguk']), 4); assert.equal(K.tavPuani(['soguk', 'soguk', 'soguk']), -9);
  assert.equal(K.tavPuani(['altin', 'altin', 'altin'], true), 27); assert.equal(K.tavPuani(['soguk', 'soguk', 'soguk'], true), -18);
  assert.equal(K.sans(7, ['altin', 'altin', 'altin']), 51); assert.equal(K.sans(11, ['soguk', 'soguk', 'soguk'], true), 1, 'en az yüzde 1'); assert.equal(K.sans(0, ['altin', 'altin', 'altin'], true), 100, 'en çok yüzde 100');
});

test('sonuçlar: tutarsa bir kademe; usta işi iki kademe; tutmazsa bölgenin cezası; Anka korur', () => {
  const s = (k, o) => K.sonuc(k, Object.assign({ vuruslar: ['sicak', 'sicak', 'sicak'], zar: 0 }, o));
  assert.deepEqual([s(3).kademe, s(3).olay], [4, 'tuttu']);
  const usta = s(6, { vuruslar: ['altin', 'altin', 'altin'] }); assert.deepEqual([usta.kademe, usta.usta, usta.olay], [8, true, 'usta'], 'usta işi bölge sınırını aşar');
  assert.equal(s(11, { vuruslar: ['altin', 'altin', 'altin'] }).kademe, 12, '+12 aşılmaz');
  assert.equal(s(2, { vuruslar: ['altin', 'altin', 'sicak'] }).usta, false, 'üç darbe de altın olmalı');
  const tutmaz = (k, o) => s(k, Object.assign({ zar: 99.9 }, o));
  assert.deepEqual([tutmaz(2).kademe, tutmaz(2).catlak, tutmaz(2).olay], [2, false, 'kayipsiz']);
  assert.deepEqual([tutmaz(5).kademe, tutmaz(5).olay], [4, 'dustu']);
  assert.deepEqual([tutmaz(9).kademe, tutmaz(9).catlak, tutmaz(9).olay], [9, true, 'catladi']);
  assert.deepEqual([tutmaz(5, { anka: true }).kademe, tutmaz(5, { anka: true }).anka, tutmaz(5, { anka: true }).olay], [5, true, 'anka']);
  assert.deepEqual([tutmaz(9, { anka: true }).catlak, tutmaz(9, { anka: true }).olay], [false, 'anka']);
  assert.equal(s(9, { anka: true }).anka, false, 'deneme tutarsa Anka harcanmış sayılmaz (ekran taşı yine de peşin alır)');
  assert.equal(tutmaz(2, { anka: true }).anka, false, 'güvenli bölgede Anka gerekmez');
  // zar şansın tam üstündeyse tutmaz, hemen altındaysa tutar
  assert.equal(K.sonuc(4, { vuruslar: [], zar: 69.99 }).tuttu, true); assert.equal(K.sonuc(4, { vuruslar: [], zar: 70 }).tuttu, false);
});

test('onarım dört kademe geri alır (en az +4); çarpan kademe başına yüzde 2, çatlak topta 1', () => {
  assert.equal(K.onarilmis(7), 4); assert.equal(K.onarilmis(9), 5); assert.equal(K.onarilmis(11), 7);
  assert.equal(K.carpan({ kademe: 0 }), 1); assert.equal(K.carpan({ kademe: 5 }), 1.1); assert.equal(K.carpan({ kademe: 12 }), 1.24);
  assert.equal(K.carpan({ kademe: 12, catlak: true }), 1); assert.equal(K.carpan(null), 1); assert.equal(K.carpan({ kademe: 99 }), 1.24);
  assert.equal(K.AD(0), 'Ejder Topu'); assert.equal(K.AD(7), 'Kor Ejder Topu'); assert.equal(K.AD(12), 'Kadim Magma Topu');
});
