'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { createOrtakOdalar } = require('../server/ortak_odalar');
const { createZindanOrtak, HASAR_UST } = require('../server/zindan_ortak');

const bekle = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };
/* Kural testleri sabit bir deneme tarifiyle koşar (Zümrüt Saray'ın 2026-11-17 düzeni: altı yılan, iki muhafız, boss); oyundaki güncel Zümrüt Saray en alttaki testte. */
const DENEME = { tarif: { zumrut: { ad: 'Zümrüt Saray', asama: ['k', 'd'] } }, arena: {
  k: { ad: 'Köprü', dusman: [{ hp: 640, dalga: 3 }, { hp: 800, dalga: 2 }, { hp: 760 }, { hp: 760 }, { hp: 800, dalga: 2 }, { hp: 640, dalga: 3 }] },
  d: { ad: 'Defile', dusman: [{ hp: 640 }, { hp: 640 }], boss: { hp: 3600 } } } };
function kur(gercek) {
  const soketler = new Set(), kutu = new Map(); let zaman = 1000;
  const send = (s, m) => { if (!kutu.has(s)) kutu.set(s, []); kutu.get(s).push(m); };
  const O = createOrtakOdalar({ send, sockets: () => soketler, kimlik: s => s.k, now: () => zaman });
  O.kaydet('zindan', createZindanOrtak(Object.assign({ now: () => zaman }, gercek ? {} : DENEME)).tanim);
  const baglan = id => { const s = { k: { accountId: id, handle: '@' + id } }; soketler.add(s); return s; };
  const son = (s, tur) => (kutu.get(s) || []).filter(m => m.type === tur).pop();
  const eylem = async (s, e) => { zaman += 200; O.onMessage(s, { type: 'ortak_eylem', eylem: e }); await bekle(); };
  const olay = (s, t) => { const L = (kutu.get(s) || []).filter(m => m.type === 'ortak_olay'); for (let i = L.length - 1; i >= 0; i--) { const o = L[i].olaylar.find(x => x.t === t); if (o) return o; } return null; };
  return { O, soketler, baglan, son, eylem, olay, ileri: ms => { zaman += ms; } };
}

test('iki kişilik Zümrüt Saray: kamp, ortak düşman canı, çark, kampa dönüş, boss, sefer sonu', async () => {
  const { O, baglan, son, eylem, olay } = kur(), a = baglan('a'), b = baglan('b');
  O.onMessage(a, { type: 'ortak_kur', tur: 'zindan', anahtar: 'zumrut-normal' }); O.onMessage(b, { type: 'ortak_katil', kod: son(a, 'ortak_oda').oda.kod });
  O.onMessage(b, { type: 'ortak_hazir' }); O.onMessage(a, { type: 'ortak_baslat' }); await bekle();
  let d = son(a, 'ortak_basladi').durum; assert.equal(d.faz, 'bekleme'); assert.equal(d.n, 2);
  await eylem(a, { t: 'hasar', i: 0, h: 50 }); assert.equal(son(a, 'ortak_olay').durum.faz, 'bekleme', 'kampta hasar sayılmaz');
  await eylem(a, { t: 'hazir' }); assert.equal(son(a, 'ortak_olay').durum.faz, 'bekleme'); await eylem(b, { t: 'hazir' });
  d = son(b, 'ortak_olay').durum; assert.equal(d.faz, 'savas'); assert.deepEqual(d.dusman.map(q => q.max), [720, 900, 855, 855, 900, 720], '640, 800 ve 760 × 0,75 × 1,5 (iki kişi; soldan sağa)');
  assert.deepEqual(olay(b, 'asama_basla').dusman, [720, 900, 855, 855, 900, 720]);
  await eylem(a, { t: 'hasar', i: 1, h: 300 }); assert.deepEqual(olay(b, 'hasar'), { t: 'hasar', kim: 'a', i: 1, h: 300, hp: 600 });
  await eylem(b, { t: 'hasar', i: 1, h: 99999 }); assert.equal(olay(a, 'hasar').h, 600, 'kalan candan fazlası sayılmaz'); assert.ok(HASAR_UST >= 600);
  await eylem(b, { t: 'can', hp: 700, max: 1900 }); assert.deepEqual(olay(a, 'can'), { t: 'can', kim: 'b', hp: 700, max: 1900 });
  for (const i of [0, 2, 3, 4, 5]) await eylem(a, { t: 'hasar', i, h: 5000 });
  assert.deepEqual(olay(b, 'asama_bitti'), { t: 'asama_bitti', zafer: true, asama: 0, son: false }); assert.equal(son(b, 'ortak_olay').durum.faz, 'cark');
  await eylem(a, { t: 'hazir' }); assert.equal(son(a, 'ortak_hata').kod, 'faz_uygun_degil');
  await eylem(a, { t: 'cark' }); assert.equal(son(a, 'ortak_olay').durum.faz, 'cark'); await eylem(b, { t: 'cark' });
  d = son(a, 'ortak_olay').durum; assert.equal(d.faz, 'bekleme'); assert.equal(d.asama, 1); assert.deepEqual(olay(a, 'kampa_don'), { t: 'kampa_don', asama: 1 });
  await eylem(a, { t: 'hazir' }); await eylem(b, { t: 'hazir' }); d = son(a, 'ortak_olay').durum; assert.equal(d.dusman[2].boss, true); assert.equal(d.dusman[2].max, 4050);
  for (let k = 0; k < 2; k++) await eylem(b, { t: 'hasar', i: 2, h: 5000 });
  d = son(a, 'ortak_olay').durum; assert.equal(d.faz, 'cark', 'boss düşünce muhafızlar da düşer'); assert.equal(olay(a, 'asama_bitti').son, true);
  await eylem(a, { t: 'cark' }); await eylem(b, { t: 'cark' }); await bekle(8);
  const bitti = son(b, 'ortak_bitti'); assert.equal(bitti.sonuc.kazanan, true); assert.equal(bitti.sonuc.zindan, 'zumrut'); assert.equal(bitti.oda.durum, 'bitti');
});

test('herkes düşerse aşama başarısız: kampa dönülür, aynı aşama yeniden denenir; kopan üye beklenmez; tek kişi de girebilir', async () => {
  const { O, baglan, son, eylem, olay, soketler, ileri } = kur(), a = baglan('a'), b = baglan('b');
  O.onMessage(a, { type: 'ortak_kur', tur: 'zindan', anahtar: 'zumrut-zor' }); O.onMessage(b, { type: 'ortak_katil', kod: son(a, 'ortak_oda').oda.kod });
  O.onMessage(b, { type: 'ortak_hazir' }); O.onMessage(a, { type: 'ortak_baslat' }); await bekle();
  await eylem(a, { t: 'hazir' }); await eylem(b, { t: 'hazir' }); assert.equal(son(a, 'ortak_olay').durum.dusman[1].max, 1200, '800 × 1,0 × 1,5');
  await eylem(a, { t: 'dustu' }); assert.equal(son(a, 'ortak_olay').durum.faz, 'savas'); await eylem(a, { t: 'hasar', i: 1, h: 100 }); assert.equal(son(b, 'ortak_olay').durum.dusman[1].hp, 1200, 'düşen oyuncunun hasarı sayılmaz');
  await eylem(b, { t: 'dustu' }); let d = son(b, 'ortak_olay').durum; assert.equal(d.faz, 'bekleme'); assert.equal(d.asama, 0); assert.equal(d.deneme, 1); assert.equal(olay(b, 'asama_bitti').zafer, false);
  // b kopar: a tek başına hazır olunca aşama başlar (süpürme turu kuralı yeniden değerlendirir)
  await eylem(a, { t: 'hazir' }); assert.equal(son(a, 'ortak_olay').durum.faz, 'bekleme');
  soketler.delete(b); O.onDisconnect(b); ileri(1000); O.supur(); await bekle(8);
  d = son(a, 'ortak_olay').durum; assert.equal(d.faz, 'savas'); assert.equal(d.dusman[1].max, 800, 'tek kişi kaldı: parti çarpanı 1');
  // tek kişilik sefer
  const c = baglan('c'); O.onMessage(c, { type: 'ortak_kur', tur: 'zindan', anahtar: 'zumrut-normal' }); O.onMessage(c, { type: 'ortak_baslat' }); await bekle();
  await eylem(c, { t: 'hazir' }); assert.equal(son(c, 'ortak_olay').durum.dusman[1].max, 600);
  O.onMessage(c, { type: 'ortak_kur', tur: 'zindan', anahtar: 'yok-normal' }); assert.equal(son(c, 'ortak_hata').kod, 'anahtar_gecersiz');
});

test('konum ve atış yoldaşlara iletilir, sayılar sınırlanır; kampta ve düşen oyuncudan iletilmez', async () => {
  const { O, baglan, son, eylem, olay } = kur(), a = baglan('a'), b = baglan('b');
  O.onMessage(a, { type: 'ortak_kur', tur: 'zindan', anahtar: 'zumrut-normal' }); O.onMessage(b, { type: 'ortak_katil', kod: son(a, 'ortak_oda').oda.kod });
  O.onMessage(b, { type: 'ortak_hazir' }); O.onMessage(a, { type: 'ortak_baslat' }); await bekle();
  await eylem(a, { t: 'konum', x: 10, y: 5, aci: 40, yon: 1 }); assert.equal(olay(b, 'konum'), null, 'kampta iletilmez');
  await eylem(a, { t: 'hazir' }); await eylem(b, { t: 'hazir' });
  await eylem(a, { t: 'konum', x: 999, y: 5.123, aci: 400, yon: -1 }); assert.deepEqual(olay(b, 'konum'), { t: 'konum', kim: 'a', x: 64, y: 5.12, aci: 70, yon: -1 });
  await eylem(a, { t: 'ates', x: 31, y: 10, aci: 45, guc: 7, yon: 1, ruz: 1.5, mod: { trident: 1, hile: 1 }, el: 'ates' });
  assert.deepEqual(olay(b, 'ates'), { t: 'ates', kim: 'a', x: 31, y: 10, aci: 45, yon: 1, guc: 1, ruz: 1.5, mod: { trident: true }, el: 'ates' });
  await eylem(a, { t: 'dustu' }); await eylem(a, { t: 'ates', x: 1, y: 1, aci: 1, guc: 0.5, yon: 1 }); assert.equal(olay(b, 'ates').x, 31, 'düşen oyuncunun atışı iletilmez');
});

test('ortak sıra: önce oyuncular sırayla, sonra yaşayan düşmanlar; rüzgâr ve hedef sunucudan; düşen ve kopan atlanır, donan beklenmez', async () => {
  const { O, baglan, son, eylem, olay, ileri } = kur(), a = baglan('a'), b = baglan('b');
  O.onMessage(a, { type: 'ortak_kur', tur: 'zindan', anahtar: 'zumrut-normal' }); O.onMessage(b, { type: 'ortak_katil', kod: son(a, 'ortak_oda').oda.kod });
  O.onMessage(b, { type: 'ortak_hazir' }); O.onMessage(a, { type: 'ortak_baslat' }); await bekle();
  await eylem(a, { t: 'hazir' }); await eylem(b, { t: 'hazir' });
  let s = son(a, 'ortak_olay').durum.sav; assert.equal(s.adim, 0); assert.equal(s.tip, 'giris');
  await eylem(a, { t: 'tur_bitti', adim: 0 }); assert.equal(son(a, 'ortak_olay').durum.sav.adim, 0, 'herkes hazır olmadan sıra başlamaz');
  await eylem(b, { t: 'tur_bitti', adim: 0 });
  let o = olay(b, 'sira'); assert.equal(o.adim, 1); assert.equal(o.tur, 1); assert.equal(o.tip, 'oyuncu'); assert.equal(o.kim, 'a'); assert.ok(Math.abs(o.ruzgar) <= 2.3);
  assert.deepEqual(olay(a, 'sira'), o, 'iki oyuncu aynı sırayı ve aynı rüzgârı görür');
  await eylem(b, { t: 'tur_bitti', adim: 0 }); assert.equal(son(a, 'ortak_olay').durum.sav.adim, 1, 'eski adımın bildirimi sayılmaz');
  await eylem(a, { t: 'tur_bitti', adim: 1, ex: [14.3, 7, 49.7, 56.8], x: 30, y: 9 }); assert.deepEqual(olay(b, 'tur_bitti'), { t: 'tur_bitti', kim: 'a', adim: 1, x: 30, y: 9 });
  await eylem(b, { t: 'tur_bitti', adim: 1 }); o = olay(a, 'sira'); assert.equal(o.adim, 2); assert.equal(o.kim, 'b'); assert.deepEqual(o.ex, [14.3, 7, 49.7, 56.8], 'düşman yerleri sıranın sahibinden gelir');
  // b bitirir, a donmuş: gecikme süresi dolunca beklenmez
  await eylem(b, { t: 'tur_bitti', adim: 2 }); assert.equal(son(a, 'ortak_olay').durum.sav.adim, 2); ileri(7000); O.supur(); await bekle(8);
  o = olay(a, 'sira'); assert.equal(o.adim, 3); assert.equal(o.tip, 'dusman'); assert.equal(o.i, 2, 'ilk sıra birinci dalganın düşmanında: bekleyen dalgalar sıra almaz'); assert.ok(['a', 'b'].includes(o.hedef)); assert.ok(o.tohum > 0);
  // birinci dalganın öteki düşmanı ölü: atlanır
  await eylem(a, { t: 'hasar', i: 3, h: 5000 }); await eylem(a, { t: 'tur_bitti', adim: 3 }); await eylem(b, { t: 'tur_bitti', adim: 3 });
  o = olay(a, 'sira'); assert.equal(o.adim, 4); assert.equal(o.tur, 2); assert.equal(o.kim, 'a', 'ölen düşman ve bekleyen dalgalar atlanır: yeni tur başlar');
  // birinci dalga inince ikinci dalga sıra almaya başlar
  await eylem(b, { t: 'hasar', i: 2, h: 5000 });
  assert.equal(son(a, 'ortak_olay').durum.dusman.filter(q => q.hp > 0).length, 4);
  // a düşer: sırası hemen b'ye geçer; sonraki turda a atlanır
  await eylem(a, { t: 'dustu' }); o = olay(b, 'sira'); assert.equal(o.kim, 'b'); assert.equal(o.adim, 5);
  await eylem(b, { t: 'tur_bitti', adim: 5 }); o = olay(b, 'sira'); assert.equal(o.tip, 'oyuncu', 'ikinci dalga çıktığı tur saldırmaz (kullanıcı, 2026-11-20)'); assert.equal(o.kim, 'b'); assert.equal(o.tur, 3);
  await eylem(b, { t: 'tur_bitti', adim: 6 }); o = olay(b, 'sira'); assert.equal(o.tip, 'dusman'); assert.equal(o.hedef, 'b', 'düşman yalnız ayaktakini hedef alır'); assert.equal(o.i, 1, 'sonraki turda ikinci dalganın ilk düşmanı');
  // kimse bitirmezse adım süresi dolunca ilerlenir
  ileri(17000); O.supur(); await bekle(8); assert.equal(olay(b, 'sira').adim, 8);
});

test('Zümrüt Saray (2026-11-20): köprüde üç dalga × sekiz yılan; Defile’de Şahmeran yılan kalmayan her tur başında altı yılan çağırır', async () => {
  const { O, baglan, son, eylem, olay } = kur(true), a = baglan('a');
  O.onMessage(a, { type: 'ortak_kur', tur: 'zindan', anahtar: 'zumrut-normal' }); O.onMessage(a, { type: 'ortak_baslat' }); await bekle();
  await eylem(a, { t: 'hazir' }); let d = son(a, 'ortak_olay').durum;
  assert.equal(d.dusman.length, 24); for (const n of [1, 2, 3]) assert.equal(d.dusman.filter(q => q.dalga === n).length, 8, 'her dalgada sekiz yılan');
  assert.deepEqual([...new Set(d.dusman.map(q => q.max))].sort(), [225, 255, 270], '300, 340 ve 360 × 0,75 (tek kişi)');
  for (let i = 0; i < 24; i++) await eylem(a, { t: 'hasar', i, h: 5000 });
  assert.equal(son(a, 'ortak_olay').durum.faz, 'cark'); await eylem(a, { t: 'cark' }); await eylem(a, { t: 'hazir' });
  d = son(a, 'ortak_olay').durum; assert.equal(d.dusman.length, 7); assert.ok(d.dusman.slice(0, 6).every(q => q.cagri && q.hp === 0 && q.max === 180), 'çağrı yılanları başta yok (240 × 0,75)');
  await eylem(a, { t: 'tur_bitti', adim: 0 });
  let c = olay(a, 'cagri'); assert.deepEqual(c.liste.map(x => x.i), [0, 1, 2, 3, 4, 5], 'ilk tur başında altı yılan doğar'); assert.equal(olay(a, 'sira').kim, 'a');
  for (let i = 0; i < 6; i++) await eylem(a, { t: 'hasar', i, h: 5000 });
  await eylem(a, { t: 'tur_bitti', adim: 1 }); assert.equal(olay(a, 'sira').i, 6, 'ölü yılanlar atlanır: sıra Şahmeran’da');
  await eylem(a, { t: 'tur_bitti', adim: 2 }); const L = (son(a, 'ortak_olay').olaylar || []).map(o => o.t);
  assert.ok(L.indexOf('cagri') >= 0 && L.indexOf('cagri') < L.indexOf('sira'), 'yılan kalmayınca yeni tur çağrıyla başlar, çağrı sıradan önce gelir');
  d = son(a, 'ortak_olay').durum; assert.equal(d.dusman.filter(q => q.cagri && q.hp > 0).length, 6);
  await eylem(a, { t: 'tur_bitti', adim: 3 }); assert.equal(olay(a, 'sira').i, 6, 'yeni çağrılan yılanlar o tur saldırmaz: sıra Şahmeran’da');
  await eylem(a, { t: 'hasar', i: 0, h: 5000 }); let cagriVar = false;
  for (let adim = 4; adim < 14; adim++) { await eylem(a, { t: 'tur_bitti', adim }); const S = son(a, 'ortak_olay'); cagriVar = cagriVar || S.olaylar.some(o => o.t === 'cagri'); if (S.durum.sav.kim === 'a') break; }
  assert.equal(son(a, 'ortak_olay').durum.sav.kim, 'a', 'yeni tur başladı'); assert.equal(cagriVar, false, 'ayakta yılan varken çağrı yok');
  await eylem(a, { t: 'hasar', i: 6, h: 6000 }); assert.equal(son(a, 'ortak_olay').durum.faz, 'cark', 'Şahmeran düşünce yılanlar da düşer');
});
