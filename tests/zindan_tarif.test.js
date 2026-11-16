'use strict';
// Ortak zindan tarifleri (eo2/js/zindan_tarif.js): biçim denetimi ve sunucunun tariften kurulması.
// Yeni zindan eklendiğinde bu test, eksik ya da tutarsız alanı yakalar (eo2/docs/ZINDAN_YONTEMI.md).
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const TARIF = require('../eo2/js/zindan_tarif.js');
const { createOrtakOdalar } = require('../server/ortak_odalar');
const { createZindanOrtak, ZINDANLAR } = require('../server/zindan_ortak');
const kok = path.join(__dirname, '..', 'eo2');
const oku = f => fs.readFileSync(path.join(kok, 'js', f), 'utf8');

test('her zindan tarifi tam ve tutarlı: yazılar, sahne dosyası, zemin, düşmanlar, canlar', () => {
  const veri = oku('topcu_veri.js');
  assert.ok(Object.keys(TARIF).length >= 1);
  for (const [k, Z] of Object.entries(TARIF)) {
    assert.match(k, /^[a-z0-9]+$/, k + ': anahtar küçük harf ve rakam olmalı (oda anahtarı "zindan-zorluk" biçimindedir)');
    for (const alan of ['ad', 'odul', 'tema', 'ortam', 'tanitim']) assert.ok(typeof Z[alan] === 'string' && Z[alan], k + '.' + alan);
    assert.ok(new RegExp('\\b' + Z.odul + ': \\{ ad:').test(veri), k + ': odul "' + Z.odul + '" js/topcu_veri.js ZINDAN içinde yok');
    assert.ok(Array.isArray(Z.asama) && Z.asama.length >= 1, k + ': en az bir aşama');
    Z.asama.forEach((A, i) => { const ad = k + ' aşama ' + (i + 1);
      for (const alan of ['ad', 'alt', 'ipucu']) assert.ok(typeof A[alan] === 'string' && A[alan], ad + '.' + alan);
      assert.ok(Array.isArray(A.zemin) && A.zemin.length >= 2, ad + ': zemin en az iki nokta');
      assert.equal(A.zemin[0][0], 0, ad + ': zemin 0\'dan başlar'); assert.equal(A.zemin[A.zemin.length - 1][0], 3400, ad + ': zemin 3400\'de biter');
      for (let j = 1; j < A.zemin.length; j++) assert.ok(A.zemin[j][0] > A.zemin[j - 1][0], ad + ': zemin noktaları soldan sağa');
      const yer = x => { for (let j = 1; j < A.zemin.length; j++) if (x <= A.zemin[j][0]) { const [x0, y0] = A.zemin[j - 1], [x1, y1] = A.zemin[j]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } };
      assert.ok(A.x0 > 100 && A.x0 < 3300, ad + ': x0');
      if (A.sahne) { assert.ok(fs.existsSync(path.join(kok, A.sahne.src)), ad + ': sahne resmi yok: ' + A.sahne.src); assert.equal(A.kirilmaz, true, ad + ': sahne resimli aşama kırılmaz olmalı');
        assert.equal(A.sahne.y, yer(A.x0), ad + ': sahne.y oyuncuların durduğu zeminle aynı olmalı'); assert.ok(A.sahne.yer > 0 && A.sahne.ust && A.sahne.alt, ad + ': sahne.yer, ust, alt'); }
      const dus = (A.dusman || []).concat(A.boss ? [A.boss] : []); assert.ok(dus.length >= 1, ad + ': en az bir düşman');
      for (const q of dus) { assert.ok(q.tip && q.ad && q.x > 0 && q.x < 3400, ad + ': düşman tip, ad, x'); assert.ok(Number.isInteger(q.hp) && q.hp > 0, ad + ': ' + q.ad + ' canı');
        assert.ok(veri.includes(q.tip + ':') || veri.includes('.' + q.tip + ' ='), ad + ': "' + q.tip + '" js/topcu_veri.js içinde tanımlı değil'); }
      if (A.boss) assert.ok(A.boss.unvan, ad + ': boss unvanı'); });
    // sunucu aynı tariften kurulur: aşama sayısı ve canlar birebir
    assert.equal(ZINDANLAR[k].asama.length, Z.asama.length);
    Z.asama.forEach((A, i) => assert.deepEqual(ZINDANLAR[k].asama[i].dusman.map(q => q.hp), (A.dusman || []).map(q => q.hp).concat(A.boss ? [A.boss.hp] : [])));
  }
});

test('oyun tarif dosyasını zindan kodundan önce yükler', () => {
  const html = fs.readFileSync(path.join(kok, 'index.html'), 'utf8');
  assert.ok(html.indexOf('js/zindan_tarif.js') > 0 && html.indexOf('js/zindan_tarif.js') < html.indexOf('js/zindan_ortak.js'));
});

test('yeni bir tarif sunucuda kod değişmeden çalışır; düşen oyuncu seferde kalır, yalnız sırası atlanır', async () => {
  const bekle = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };
  const tarif = { deneme: { ad: 'Deneme', asama: [{ ad: 'Tek oda', dusman: [{ hp: 100 }], boss: { hp: 400 } }] } };
  const soketler = new Set(), kutu = new Map(); let zaman = 1000;
  const send = (s, m) => { if (!kutu.has(s)) kutu.set(s, []); kutu.get(s).push(m); };
  const O = createOrtakOdalar({ send, sockets: () => soketler, kimlik: s => s.k, now: () => zaman });
  O.kaydet('zindan', createZindanOrtak({ now: () => zaman, tarif }).tanim);
  const baglan = id => { const s = { k: { accountId: id, handle: '@' + id } }; soketler.add(s); return s; };
  const son = (s, tip) => (kutu.get(s) || []).filter(m => m.type === tip).pop();
  const olay = (s, t) => { for (const m of (kutu.get(s) || []).slice().reverse()) if (m.type === 'ortak_olay') for (const o of m.olaylar.slice().reverse()) if (o.t === t) return o; };
  const eylem = async (s, e) => { O.onMessage(s, { type: 'ortak_eylem', eylem: e }); await bekle(); };
  const a = baglan('a'), b = baglan('b');
  O.onMessage(a, { type: 'ortak_kur', tur: 'zindan', anahtar: 'zumrut-normal' }); assert.equal(son(a, 'ortak_oda'), undefined, 'verilen tarifte olmayan zindan kurulamaz');
  O.onMessage(a, { type: 'ortak_kur', tur: 'zindan', anahtar: 'deneme-zor' }); O.onMessage(b, { type: 'ortak_katil', kod: son(a, 'ortak_oda').oda.kod });
  O.onMessage(b, { type: 'ortak_hazir' }); O.onMessage(a, { type: 'ortak_baslat' }); await bekle();
  await eylem(a, { t: 'hazir' }); await eylem(b, { t: 'hazir' });
  let d = son(a, 'ortak_olay').durum; assert.equal(d.zindan, 'deneme'); assert.deepEqual(d.dusman.map(q => q.max), [150, 600], 'can = tarif × zorluk (1,0) × grup çarpanı (1,5)');
  await eylem(a, { t: 'tur_bitti', adim: 0 }); await eylem(b, { t: 'tur_bitti', adim: 0 }); assert.equal(olay(a, 'sira').kim, 'a');
  // a düşer: seferde ve odada kalır; sıra hemen b'ye geçer, sonraki turlarda a hiç çağrılmaz
  await eylem(a, { t: 'dustu' }); assert.equal(olay(b, 'sira').kim, 'b');
  d = son(a, 'ortak_olay').durum; assert.equal(d.faz, 'savas'); assert.equal(d.uye.a.hayatta, false); assert.equal(son(a, 'ortak_oda').oda.uyeler.length, 2, 'düşen oyuncu odadan çıkarılmaz');
  for (let k = 0; k < 6; k++) { const s = son(b, 'ortak_olay').durum.sav; assert.notEqual(s.kim, 'a'); if (s.tip === 'dusman') assert.equal(s.hedef, 'b'); await eylem(b, { t: 'tur_bitti', adim: s.adim }); }
  // b boss'u indirir: aşama biter, düşen a da çarkını çevirir ve sefer herkes için tamamlanır
  await eylem(b, { t: 'hasar', i: 1, h: 600 }); assert.equal(olay(a, 'asama_bitti').zafer, true);
  await eylem(a, { t: 'cark' }); await eylem(b, { t: 'cark' }); assert.equal(son(a, 'ortak_bitti').sonuc.kazanan, true);
});
