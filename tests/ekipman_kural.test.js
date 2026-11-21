'use strict';
// Ekipman kuralları (eo2/js/ekipman_kural.js): beş slot, güç tavanı, eski kayıttan geçiş, kuşanma ve satın alma.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../eo2/js/ekipman_kural.js');

test('beş slot; güç veren dört parça +12de %15, dördü birden %60 (tavan); aksesuar güç vermez', () => {
  assert.deepEqual(E.SLOT, ['silah', 'zirh', 'baslik', 'pelerin', 'yuz']);
  assert.equal(E.gucVerir('yuz'), false);
  const S = { gold: 0 }, K = E.duzenle(S);
  const ekle = (id, kademe) => { const p = E.yeniParca(id, { kademe }); K.parca.push(p); E.giy(K, p.uid); return p; };
  for (const p of K.parca) p.kademe = 12;
  ekle('tolga', 12); ekle('sancak', 12); ekle('tunc_maske', 12);
  E.duzenle(S);
  const c = E.carpanlar(K);
  assert.equal(c.hasar, 1.15); assert.equal(c.can, 1.15); assert.equal(c.kritik, 0.15); assert.equal(c.dayaniklilik, 1.15);
  assert.equal(Math.round(c.toplam * 100), 60, 'tavan %60');
  assert.equal(E.giyiliParca(K, 'yuz').kademe, 0, 'aksesuar kademe taşımaz');
});

test('çatlak parça artış vermez', () => {
  const S = {}, K = E.duzenle(S), top = E.giyiliParca(K, 'silah');
  top.kademe = 8; assert.equal(E.carpanlar(K).hasar, 1.1);
  top.catlak = true; assert.equal(E.carpanlar(K).hasar, 1);
});

test('eski kayıt: setler zırh olur, topun kademesi silahta kalır, giyili zırh tek seferlik aynı kademeyle başlar', () => {
  const S = { kusam: { giyili: 'avci', sahip: ['bare', 'temel', 'avci'] }, ors: { kademe: 7, catlak: false, deneme: 30, zirve: 8 } };
  const K = E.duzenle(S);
  assert.equal(E.giyiliParca(K, 'silah').id, 'ejder_topu'); assert.equal(E.giyiliParca(K, 'silah').kademe, 7); assert.equal(E.giyiliParca(K, 'silah').zirve, 8);
  assert.equal(E.giyiliParca(K, 'zirh').id, 'avci'); assert.equal(E.giyiliParca(K, 'zirh').kademe, 7);
  assert.equal(K.parca.find(p => p.id === 'temel').kademe, 0, 'giyilmeyen set sıfırdan');
  assert.deepEqual(K.parca.filter(p => E.slotu(p) === 'zirh').map(p => p.id).sort(), ['avci', 'bare', 'temel']);
  assert.equal(K.giyili.baslik, null); assert.equal(K.giyili.yuz, null);
  E.duzenle(S); assert.equal(S.ekipman.parca.length, 4, 'ikinci düzenleme bir şey eklemez');
});

test('çatlak top eski kayıttan çatlak gelir; kayıtsız yeni oyuncu çıplak set ve +0 topla başlar', () => {
  const K1 = E.duzenle({ kusam: { giyili: 'bare', sahip: ['bare'] }, ors: { kademe: 9, catlak: true } });
  assert.equal(E.giyiliParca(K1, 'silah').catlak, true);
  const K2 = E.duzenle({ kusam: { giyili: 'bare', sahip: ['bare'] } });
  assert.equal(E.giyiliParca(K2, 'zirh').id, 'bare'); assert.equal(E.giyiliParca(K2, 'silah').kademe, 0); assert.equal(K2.parca.length, 2);
});

test('kuşanma: silah ve zırh çıkarılamaz; başlık, pelerin ve yüz çıkarılır', () => {
  const S = {}, K = E.duzenle(S);
  assert.equal(E.cikar(K, 'silah'), false); assert.equal(E.cikar(K, 'zirh'), false);
  const p = E.yeniParca('bork'); K.parca.push(p); assert.equal(E.giy(K, p.uid), true); assert.equal(K.giyili.baslik, p.uid);
  assert.equal(E.cikar(K, 'baslik'), true); assert.equal(K.giyili.baslik, null);
});

test('satın alma: altın ve malzeme düşer, parça giyilir; eksikte ve ikinci kopyada olmaz', () => {
  const S = { gold: 1000 }, heybe = { kalip_zirh: 1 };
  assert.equal(E.alinabilir(E.duzenle(S), 'kukulete', S.gold, heybe).neden, 'malzeme');
  assert.equal(E.satinAl(S, 'ejder_topu', heybe), null, 'başlangıç parçası satılmaz');
  const p = E.satinAl(S, 'tolga', heybe);
  assert.ok(p); assert.equal(S.gold, 680); assert.equal(heybe.kalip_zirh, 0); assert.equal(S.ekipman.giyili.baslik, p.uid);
  assert.equal(E.satinAl(S, 'tolga', heybe), null); assert.equal(E.alinabilir(S.ekipman, 'tolga', S.gold, heybe).neden, 'sende');
  assert.equal(E.alinabilir(S.ekipman, 'kara_migfer', 50, {}).neden, 'altin');
});

test('katalog: her parçanın slotu geçerli; zırh setleri 2026-11-17 kuşam fiyatlarıyla aynı', () => {
  for (const k of E.KATALOG) assert.ok(E.SLOT.includes(k.slot), k.id);
  const z = Object.fromEntries(E.KATALOG.filter(k => k.slot === 'zirh').map(k => [k.id, k.fiyat]));
  assert.deepEqual(z, { bare: 0, temel: 120, avci: 250, madenci: 250, senlik: 350, buyucu: 400, muhafiz: 500 });
  for (const s of ['baslik', 'pelerin', 'yuz']) assert.ok(E.KATALOG.filter(k => k.slot === s).length >= 4, s);
});
