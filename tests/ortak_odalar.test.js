'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrtakOdalar } = require('../server/ortak_odalar');

function kur(config) {
  const soketler = new Set(), kutu = new Map(); let t = 1000, sira = 0; const biten = [];
  const O = createOrtakOdalar({ send: (s, m) => { if (!kutu.has(s)) kutu.set(s, []); kutu.get(s).push(m); }, sockets: () => soketler, kimlik: s => s.k, now: () => t, random: () => ((++sira * 7919) % 1000) / 1000, config });
  // deneme türü: ortak canı olan bir hedef; her vuruş canı düşürür, can bitince örnek biter
  O.kaydet('deneme', { enAz: 1, enCok: 3, anahtarGecerli: k => k === 'kule' || k === 'magara', baslat: () => ({ can: 30, enCan: 30, vuran: {} }),
    eylem(d, uye, e) { if (!e || e.t !== 'vur' || !Number.isSafeInteger(e.guc) || e.guc < 1 || e.guc > 10) throw Object.assign(new Error('x'), { kod: 'eylem_gecersiz' }); d.can = Math.max(0, d.can - e.guc); d.vuran[uye.id] = (d.vuran[uye.id] || 0) + e.guc; return { olaylar: [{ t: 'vurdu', kim: uye.id, guc: e.guc }], bitti: d.can === 0 ? { kazanan: true } : null }; },
    bitir: (oda, sonuc, d) => biten.push({ oda: oda.id, sonuc, vuran: d && d.vuran }) });
  const baglan = (id, h) => { const s = { k: { accountId: id, handle: h } }; soketler.add(s); return s; };
  const son = (s, tur) => (kutu.get(s) || []).filter(m => m.type === tur).pop();
  return { O, baglan, kopar: s => { soketler.delete(s); O.onDisconnect(s); }, son, gelen: s => kutu.get(s) || [], bosalt: () => kutu.clear(), ileri: ms => { t += ms; }, biten };
}

test('oda: kur, kodla katıl, hazır, başlat; ortak durum sunucuda; eylem herkese yayılır; bitince kanca bir kez çağrılır', () => {
  const { O, baglan, son, gelen, bosalt, biten } = kur(), a = baglan('a1', '@a'), b = baglan('b1', '@b'), c = baglan('c1', '@c');
  assert.equal(O.onMessage(a, { type: 'meydan' }), false);
  O.onMessage(a, { type: 'ortak_kur', tur: 'yok', anahtar: 'kule' }); assert.equal(son(a, 'ortak_hata').kod, 'tur_bilinmiyor');
  O.onMessage(a, { type: 'ortak_kur', tur: 'deneme', anahtar: 'saray' }); assert.equal(son(a, 'ortak_hata').kod, 'anahtar_gecersiz');
  O.onMessage(a, { type: 'ortak_kur', tur: 'deneme', anahtar: 'kule', ad: 'Aylin' });
  const oda = son(a, 'ortak_oda').oda; assert.match(oda.kod, /^ORT-[A-Z2-9]{4}$/); assert.equal(oda.kurucu, 'a1'); assert.equal(oda.uyeler[0].ad, 'Aylin');
  O.onMessage(b, { type: 'ortak_katil', kod: 'ORT-ZZZZ' }); assert.equal(son(b, 'ortak_hata').kod, 'oda_yok');
  O.onMessage(b, { type: 'ortak_katil', kod: oda.kod.toLowerCase(), ad: 'Bora' }); assert.equal(son(a, 'ortak_oda').oda.uyeler.length, 2);
  O.onMessage(b, { type: 'ortak_baslat' }); assert.equal(son(b, 'ortak_hata').kod, 'yalniz_kurucu');
  O.onMessage(a, { type: 'ortak_baslat' }); assert.equal(son(a, 'ortak_hata').kod, 'hazir_degil');
  O.onMessage(b, { type: 'ortak_hazir', hazir: true }); O.onMessage(a, { type: 'ortak_baslat' });
  assert.deepEqual(son(b, 'ortak_basladi').durum, { can: 30, enCan: 30, vuran: {} }); assert.equal(typeof son(b, 'ortak_basladi').tohum, 'number');
  O.onMessage(c, { type: 'ortak_katil', kod: oda.kod }); assert.equal(son(c, 'ortak_hata').kod, 'oda_mesgul');
  O.onMessage(c, { type: 'ortak_eylem', eylem: { t: 'vur', guc: 5 } }); assert.equal(son(c, 'ortak_hata').kod, 'oyunda_degil');
  bosalt(); O.onMessage(b, { type: 'ortak_eylem', eylem: { t: 'vur', guc: 9999 } }); assert.equal(son(b, 'ortak_hata').kod, 'eylem_gecersiz'); assert.equal(gelen(a).length, 0);
  O.onMessage(b, { type: 'ortak_eylem', eylem: { t: 'vur', guc: 10 } }); assert.equal(son(a, 'ortak_olay').durum.can, 20); assert.equal(son(a, 'ortak_olay').kim, 'b1'); assert.equal(gelen(c).length, 0, 'oda dışına yayın yok');
  O.onMessage(a, { type: 'ortak_eylem', eylem: { t: 'vur', guc: 10 } }); O.onMessage(a, { type: 'ortak_eylem', eylem: { t: 'vur', guc: 10 } });
  assert.deepEqual(son(b, 'ortak_bitti').sonuc, { kazanan: true }); assert.equal(biten.length, 1); assert.deepEqual(biten[0].vuran, { b1: 10, a1: 20 });
  O.onMessage(a, { type: 'ortak_eylem', eylem: { t: 'vur', guc: 1 } }); assert.equal(son(a, 'ortak_hata').kod, 'oyunda_degil'); assert.equal(biten.length, 1);
});

test('kuyruk: aynı tür ve anahtarı arayanlar dolunca oda açılıp başlar; davet yalnız hedefe gider', () => {
  const { O, baglan, son, gelen, ileri } = kur({ kuyrukMs: 20000 }), a = baglan('a1', '@a'), b = baglan('b1', '@b'), c = baglan('c1', '@c'), d = baglan('d1', '@d');
  O.onMessage(a, { type: 'ortak_kuyruk', tur: 'deneme', anahtar: 'kule' }); assert.equal(son(a, 'ortak_kuyruk').durum, 'ariyor');
  O.onMessage(b, { type: 'ortak_kuyruk', tur: 'deneme', anahtar: 'magara' }); O.onMessage(c, { type: 'ortak_kuyruk', tur: 'deneme', anahtar: 'kule' });
  assert.equal(son(a, 'ortak_basladi'), undefined, 'iki kişi, süre dolmadan başlamaz');
  ileri(21000); O.supur();
  assert.equal(son(a, 'ortak_basladi').oda.uyeler.length, 2); assert.equal(son(c, 'ortak_basladi').oda.anahtar, 'kule'); assert.equal(son(b, 'ortak_basladi'), undefined);
  assert.deepEqual(O.sayim(), { oda: 1, kuyruk: 1, turler: ['deneme'] });
  O.onMessage(b, { type: 'ortak_kuyruk_cik' }); O.onMessage(b, { type: 'ortak_kur', tur: 'deneme', anahtar: 'magara', ad: 'Bora' });
  O.onMessage(b, { type: 'ortak_davet', to: '@yok' }); assert.equal(son(b, 'ortak_hata').kod, 'cevrimdisi');
  O.onMessage(b, { type: 'ortak_davet', to: '@d' }); assert.equal(son(d, 'ortak_davet').kod, son(b, 'ortak_oda').oda.kod); assert.equal(son(d, 'ortak_davet').ad, 'Bora'); assert.equal(gelen(a).some(m => m.type === 'ortak_davet'), false);
});

test('kopma ve ayrılma: kopan üye süre içinde dönerse sürer, dönmezse düşer; kurucu ayrılınca kuruculuk devredilir; boşalan oda kapanır', () => {
  const { O, baglan, kopar, son, ileri, biten } = kur({ kopmaMs: 45000 }), a = baglan('a1', '@a'), b = baglan('b1', '@b');
  O.onMessage(a, { type: 'ortak_kur', tur: 'deneme', anahtar: 'kule' }); O.onMessage(b, { type: 'ortak_katil', kod: son(a, 'ortak_oda').oda.kod }); O.onMessage(b, { type: 'ortak_hazir' }); O.onMessage(a, { type: 'ortak_baslat' });
  kopar(b); assert.equal(son(a, 'ortak_oda').oda.uyeler.find(u => u.id === 'b1').bagli, false);
  const b2 = baglan('b1', '@b'); O.onConnect(b2); O.onMessage(b2, { type: 'ortak_durum' });
  assert.equal(son(b2, 'ortak_basladi').surur, true); assert.equal(son(a, 'ortak_oda').oda.uyeler.find(u => u.id === 'b1').bagli, true);
  kopar(b2); ileri(46000); O.supur(); assert.equal(son(a, 'ortak_oda').oda.uyeler.length, 1, 'dönmeyen üye düşer; tek kişilik türde örnek sürer');
  O.onMessage(a, { type: 'ortak_cik' }); assert.equal(son(a, 'ortak_ayrildi').type, 'ortak_ayrildi'); assert.equal(O.sayim().oda, 0); assert.equal(biten.length, 0);
  // kuruculuk devri
  const c = baglan('c1', '@c'); O.onMessage(a, { type: 'ortak_kur', tur: 'deneme', anahtar: 'kule' }); O.onMessage(c, { type: 'ortak_katil', kod: son(a, 'ortak_oda').oda.kod }); O.onMessage(a, { type: 'ortak_cik' });
  assert.equal(son(c, 'ortak_oda').oda.kurucu, 'c1');
});
