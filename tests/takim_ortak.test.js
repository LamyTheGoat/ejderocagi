'use strict';
// Takım Meydanı 2v2 (server/takim_ortak.js): takımlar, sunucuda sıra ve can, düşenin atlanması, ayrılma, sonuç.
const test = require('node:test'), assert = require('node:assert/strict');
const { createOrtakOdalar } = require('../server/ortak_odalar');
const { createTakimOrtak, VARSAYILAN_CAN } = require('../server/takim_ortak');
const bekle = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };
function kur() { const soketler = new Set(), kutu = new Map(); let zaman = 1000;
  const send = (s, m) => { if (!kutu.has(s)) kutu.set(s, []); kutu.get(s).push(m); };
  const O = createOrtakOdalar({ send, sockets: () => soketler, kimlik: s => s.k, now: () => zaman, kuyrukMs: 20000 });
  O.kaydet('takim', createTakimOrtak({ now: () => zaman }).tanim);
  const baglan = id => { const s = { k: { accountId: id, handle: '@' + id } }; soketler.add(s); return s; };
  const son = (s, tip) => (kutu.get(s) || []).filter(m => m.type === tip).pop();
  const olay = (s, t) => { for (const m of (kutu.get(s) || []).slice().reverse()) if (m.type === 'ortak_olay') for (const o of m.olaylar.slice().reverse()) if (o.t === t) return o; };
  const eylem = async (s, e) => { O.onMessage(s, { type: 'ortak_eylem', eylem: e }); await bekle(); };
  return { O, soketler, baglan, son, olay, eylem, ileri: ms => { zaman += ms; } }; }

test('2v2: sıraya giren dört kişi eşleşir; takımlar sırayla; sıra ve can sunucuda; düşen atlanır; bir takım bitince maç biter', async () => {
  const { O, baglan, son, olay, eylem, ileri } = kur(), S = ['a', 'b', 'c', 'd'].map(baglan), [a, b, c, d] = S;
  for (const s of S.slice(0, 3)) O.onMessage(s, { type: 'ortak_kuyruk', tur: 'takim', anahtar: '2v2' });
  ileri(30000); O.supur(); await bekle(); assert.equal(son(a, 'ortak_basladi'), undefined, 'üç kişiyle maç başlamaz (beklese de)');
  O.onMessage(d, { type: 'ortak_kuyruk', tur: 'takim', anahtar: '2v2' }); await bekle();
  let D = son(d, 'ortak_basladi').durum; assert.deepEqual(['a', 'b', 'c', 'd'].map(k => D.uye[k].takim), ['A', 'B', 'A', 'B']); assert.deepEqual(D.sira, ['a', 'b', 'c', 'd']);
  for (const s of S) await eylem(s, { t: 'can', hp: 1, max: 1600 }); await eylem(a, { t: 'can', hp: 1, max: 99 });
  D = son(a, 'ortak_olay').durum; assert.equal(D.uye.a.hp, 1600, 'can sunucudadır: en çok can bir kez bildirilir, sonra değişmez');
  for (const s of S) await eylem(s, { t: 'tur_bitti', adim: 0 });
  let o = olay(d, 'sira'); assert.equal(o.kim, 'a'); assert.equal(o.adim, 1); assert.ok(Math.abs(o.ruzgar) <= 2.3);
  await eylem(b, { t: 'isabet', kime: 'a', h: 500 }); assert.equal(son(a, 'ortak_olay').durum.uye.a.hp, 1600, 'sırası olmayanın isabeti sayılmaz');
  await eylem(a, { t: 'isabet', kime: 'c', h: 500 }); assert.equal(son(a, 'ortak_olay').durum.uye.c.hp, 1600, 'takım arkadaşına hasar yok');
  await eylem(a, { t: 'isabet', kime: 'b', h: 500, bas: true }); assert.deepEqual(olay(c, 'can'), { t: 'can', kim: 'b', hp: 1100, max: 1600, h: 500, bas: true, it: 1, vuran: 'a' });
  await eylem(a, { t: 'isabet', kime: 'b', h: 99999 }); assert.equal(olay(d, 'dustu').kim, 'b'); assert.equal(son(b, 'ortak_oda').oda.uyeler.length, 4, 'düşen odada kalır');
  for (const s of S) await eylem(s, { t: 'tur_bitti', adim: 1 });
  assert.equal(olay(a, 'sira').kim, 'c', 'düşen b atlanır');
  // d ayrılır: Kızıl takımda ayakta kimse kalmaz, Mavi kazanır
  O.onMessage(d, { type: 'ortak_cik' }); await bekle();
  const r = son(a, 'ortak_bitti').sonuc; assert.equal(r.kazananTakim, 'A'); assert.equal(r.takim.b, 'B');
});

test('2v2: canını bildirmeyen oyuncuya varsayılan can; kodla kurulan oda dört kişi olmadan başlamaz', async () => {
  const { O, baglan, son, eylem } = kur(), S = ['a', 'b', 'c', 'd'].map(baglan), [a, b, c, d] = S;
  O.onMessage(a, { type: 'ortak_kur', tur: 'takim', anahtar: '2v2', ozel: true }); const kod = son(a, 'ortak_oda').oda.kod;
  O.onMessage(b, { type: 'ortak_katil', kod }); O.onMessage(b, { type: 'ortak_hazir' }); O.onMessage(a, { type: 'ortak_baslat' }); await bekle();
  assert.equal(son(a, 'ortak_basladi'), undefined); assert.ok(son(a, 'ortak_hata'));
  for (const s of [c, d]) { O.onMessage(s, { type: 'ortak_katil', kod }); O.onMessage(s, { type: 'ortak_hazir' }); } O.onMessage(a, { type: 'ortak_baslat' }); await bekle();
  assert.ok(son(a, 'ortak_basladi')); for (const s of S) await eylem(s, { t: 'tur_bitti', adim: 0 });
  await eylem(a, { t: 'isabet', kime: 'b', h: 100 }); assert.equal(son(a, 'ortak_olay').durum.uye.b.hp, VARSAYILAN_CAN - 100);
  const e = baglan('e'); O.onMessage(e, { type: 'ortak_kur', tur: 'takim', anahtar: '1v1' }); assert.equal(son(e, 'ortak_hata').kod, 'anahtar_gecersiz', 'Takım Meydanı yalnız 2v2 oynanır');
});
