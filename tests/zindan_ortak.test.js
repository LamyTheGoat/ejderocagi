'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { createOrtakOdalar } = require('../server/ortak_odalar');
const { createZindanOrtak, HASAR_UST } = require('../server/zindan_ortak');

const bekle = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };
function kur() {
  const soketler = new Set(), kutu = new Map(); let zaman = 1000;
  const send = (s, m) => { if (!kutu.has(s)) kutu.set(s, []); kutu.get(s).push(m); };
  const O = createOrtakOdalar({ send, sockets: () => soketler, kimlik: s => s.k, now: () => zaman });
  O.kaydet('zindan', createZindanOrtak({ now: () => zaman }).tanim);
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
  d = son(b, 'ortak_olay').durum; assert.equal(d.faz, 'savas'); assert.deepEqual(d.dusman.map(q => q.max), [855, 900, 855, 900], '760 ve 800 × 0,75 × 1,5 (iki kişi)');
  assert.deepEqual(olay(b, 'asama_basla').dusman, [855, 900, 855, 900]);
  await eylem(a, { t: 'hasar', i: 0, h: 300 }); assert.deepEqual(olay(b, 'hasar'), { t: 'hasar', kim: 'a', i: 0, h: 300, hp: 555 });
  await eylem(b, { t: 'hasar', i: 0, h: 99999 }); assert.equal(olay(a, 'hasar').h, 555, 'kalan candan fazlası sayılmaz'); assert.ok(HASAR_UST >= 555);
  await eylem(b, { t: 'can', hp: 700, max: 1900 }); assert.deepEqual(olay(a, 'can'), { t: 'can', kim: 'b', hp: 700, max: 1900 });
  for (const i of [1, 2, 3]) await eylem(a, { t: 'hasar', i, h: 5000 });
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
  await eylem(a, { t: 'hazir' }); await eylem(b, { t: 'hazir' }); assert.equal(son(a, 'ortak_olay').durum.dusman[0].max, 1140, '760 × 1,0 × 1,5');
  await eylem(a, { t: 'dustu' }); assert.equal(son(a, 'ortak_olay').durum.faz, 'savas'); await eylem(a, { t: 'hasar', i: 0, h: 100 }); assert.equal(son(b, 'ortak_olay').durum.dusman[0].hp, 1140, 'düşen oyuncunun hasarı sayılmaz');
  await eylem(b, { t: 'dustu' }); let d = son(b, 'ortak_olay').durum; assert.equal(d.faz, 'bekleme'); assert.equal(d.asama, 0); assert.equal(d.deneme, 1); assert.equal(olay(b, 'asama_bitti').zafer, false);
  // b kopar: a tek başına hazır olunca aşama başlar (süpürme turu kuralı yeniden değerlendirir)
  await eylem(a, { t: 'hazir' }); assert.equal(son(a, 'ortak_olay').durum.faz, 'bekleme');
  soketler.delete(b); O.onDisconnect(b); ileri(1000); O.supur(); await bekle(8);
  d = son(a, 'ortak_olay').durum; assert.equal(d.faz, 'savas'); assert.equal(d.dusman[0].max, 760, 'tek kişi kaldı: parti çarpanı 1');
  // tek kişilik sefer
  const c = baglan('c'); O.onMessage(c, { type: 'ortak_kur', tur: 'zindan', anahtar: 'zumrut-normal' }); O.onMessage(c, { type: 'ortak_baslat' }); await bekle();
  await eylem(c, { t: 'hazir' }); assert.equal(son(c, 'ortak_olay').durum.dusman[0].max, 570);
  O.onMessage(c, { type: 'ortak_kur', tur: 'zindan', anahtar: 'yok-normal' }); assert.equal(son(c, 'ortak_hata').kod, 'anahtar_gecersiz');
});

test('konum ve atış yoldaşlara iletilir, sayılar sınırlanır; kampta ve düşen oyuncudan iletilmez', async () => {
  const { O, baglan, son, eylem, olay } = kur(), a = baglan('a'), b = baglan('b');
  O.onMessage(a, { type: 'ortak_kur', tur: 'zindan', anahtar: 'zumrut-normal' }); O.onMessage(b, { type: 'ortak_katil', kod: son(a, 'ortak_oda').oda.kod });
  O.onMessage(b, { type: 'ortak_hazir' }); O.onMessage(a, { type: 'ortak_baslat' }); await bekle();
  await eylem(a, { t: 'konum', x: 10, y: 5, aci: 40, yon: 1 }); assert.equal(olay(b, 'konum'), null, 'kampta iletilmez');
  await eylem(a, { t: 'hazir' }); await eylem(b, { t: 'hazir' });
  await eylem(a, { t: 'konum', x: 999, y: 5.123, aci: 400, yon: -1 }); assert.deepEqual(olay(b, 'konum'), { t: 'konum', kim: 'a', x: 64, y: 5.12, aci: 70, yon: -1 });
  await eylem(a, { t: 'ates', x: 31, y: 10, aci: 45, guc: 7, yon: 1, ruz: 1.5, mod: { trident: 1, hile: 1 } });
  assert.deepEqual(olay(b, 'ates'), { t: 'ates', kim: 'a', x: 31, y: 10, aci: 45, yon: 1, guc: 1, ruz: 1.5, mod: { trident: true } });
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
  o = olay(a, 'sira'); assert.equal(o.adim, 3); assert.equal(o.tip, 'dusman'); assert.equal(o.i, 0); assert.ok(['a', 'b'].includes(o.hedef)); assert.ok(o.tohum > 0);
  // ikinci düşman ölü: atlanır
  await eylem(a, { t: 'hasar', i: 1, h: 5000 }); await eylem(a, { t: 'tur_bitti', adim: 3 }); await eylem(b, { t: 'tur_bitti', adim: 3 });
  o = olay(a, 'sira'); assert.equal(o.adim, 4); assert.equal(o.i, 2, 'ölen düşmanın sırası atlanır');
  await eylem(a, { t: 'tur_bitti', adim: 4 }); await eylem(b, { t: 'tur_bitti', adim: 4 }); assert.equal(olay(a, 'sira').i, 3);
  await eylem(a, { t: 'tur_bitti', adim: 5 }); await eylem(b, { t: 'tur_bitti', adim: 5 });
  o = olay(a, 'sira'); assert.equal(o.tur, 2); assert.equal(o.kim, 'a');
  // a düşer: sırası hemen b'ye geçer; sonraki turda a atlanır
  await eylem(a, { t: 'dustu' }); o = olay(b, 'sira'); assert.equal(o.kim, 'b'); assert.equal(o.adim, 7);
  await eylem(b, { t: 'tur_bitti', adim: 7 }); o = olay(b, 'sira'); assert.equal(o.tip, 'dusman'); assert.equal(o.hedef, 'b', 'düşman yalnız ayaktakini hedef alır');
  // kimse bitirmezse adım süresi dolunca ilerlenir
  ileri(17000); O.supur(); await bekle(8); assert.equal(olay(b, 'sira').adim, 9);
});
