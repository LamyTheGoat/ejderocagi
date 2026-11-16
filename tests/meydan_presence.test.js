'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createMeydanPresence, temizAd, temizDurum, KANAL_BOYU, HIZ } = require('../server/meydan_presence');

function kur() { let t = 1000; const kutu = new Map(); const P = createMeydanPresence({ send: (s, m) => { if (!kutu.has(s)) kutu.set(s, []); kutu.get(s).push(m); }, now: () => t, kimlik: s => '@' + s.ad });
  return { P, soket: ad => ({ ad }), gelen: s => kutu.get(s) || [], bosalt: () => kutu.clear(), ileri: ms => { t += ms; } }; }
const konum = (x, y, a = 'master', ek = {}) => ({ type: 'meydan', a, x, y, d: 'left', s: 'temel', p: 1, n: 'Ayşe', ...ek });

test('ad süzgeci: uygun ad geçer, uygunsuz ya da biçimsiz ad Gezgin olur', () => {
  assert.equal(temizAd('  Ayşe  Nur '), 'Ayşe Nur');
  assert.equal(temizAd('Çağrı-2'), 'Çağrı-2');
  assert.equal(temizAd('Klasik'), 'Klasik');
  assert.equal(temizAd('<b>Demir</b>'), 'bDemirb');
  assert.equal(temizAd('x'.repeat(40)).length, 16);
  for (const kotu of [null, 5, '', 'a', 'Orospu', 'F u c k', 'S1kici', 'AMK', '0r0spu cocugu', '!!!']) assert.equal(temizAd(kotu), 'Gezgin', String(kotu));
});

test('durum doğrulaması: sayılar sınırlanır, bilinmeyen değerler varsayılana döner, eksik konum atılır', () => {
  const d = temizDurum({ a: 'master', x: 99999, y: -7.123456, d: 'yukari', s: 'DROP TABLE', p: 'evet', e: { k: 'heart', t: 5 }, n: 'Ali', handle: '@baskasi' });
  assert.deepEqual(d, { a: 'master', x: 400, y: -7.12, d: 'down', s: 'temel', p: 1, e: { k: 'heart', t: 5 }, n: 'Ali' });
  assert.equal(temizDurum({ a: 'master', x: 'NaN', y: 1 }), null);
  assert.equal(temizDurum({ a: '../etc', x: 1, y: 1 }), null);
  assert.equal(temizDurum({ a: 'master', x: 1, y: 1, e: { k: 'küfür', t: 1 } }).e, null);
});

test('aynı alandakiler birbirini görür; gönderen kendi yankısını almaz; alan değişince çıkış ve yeni liste gelir', () => {
  const { P, soket, gelen, bosalt } = kur(), A = soket('A'), B = soket('B'), C = soket('C');
  assert.equal(P.onMessage(A, { type: 'chat' }), false);
  assert.equal(P.onMessage(A, konum(1, 2)), true);
  assert.deepEqual(gelen(A), [{ type: 'meydan_liste', a: 'master', liste: [] }]);
  P.onMessage(B, konum(3, 4, 'master', { n: 'Bora' }));
  assert.equal(gelen(B)[0].liste.length, 1); assert.equal(gelen(B)[0].liste[0].n, 'Ayşe');
  const bA = gelen(A).find(m => m.type === 'meydan'); assert.equal(bA.n, 'Bora'); assert.equal(bA.x, 3); assert.equal(bA.h, '@B', 'hesap adı soketten gelir');
  assert.equal(gelen(B).some(m => m.type === 'meydan'), false, 'yankı yok');
  assert.notEqual(bA.id, gelen(B)[0].liste[0].id);
  // kimlik soketten: mesajdaki id yok sayılır
  bosalt(); P.onMessage(B, konum(5, 5, 'master', { id: 'sahte', n: 'Bora' })); assert.equal(gelen(A)[0].id, bA.id);
  // C handa: meydandakilere görünmez
  bosalt(); P.onMessage(C, konum(0, 0, 'han')); assert.equal(gelen(A).length, 0); assert.deepEqual(gelen(C)[0].liste, []);
  // B hana geçer: A çıkış alır, C onu görür, B hanın listesini alır
  bosalt(); P.onMessage(B, konum(1, 1, 'han', { n: 'Bora' }));
  assert.deepEqual(gelen(A), [{ type: 'meydan_cik', id: bA.id }]);
  assert.equal(gelen(C)[0].type, 'meydan'); assert.equal(gelen(B)[0].liste.length, 1);
  // B kopar: yalnız handaki C haber alır
  bosalt(); P.onDisconnect(B); assert.deepEqual(gelen(C), [{ type: 'meydan_cik', id: bA.id }]); assert.equal(gelen(A).length, 0);
  P.onDisconnect(B); P.onDisconnect(soket('yabancı'));
});

test('hız sınırı saniyede ' + HIZ + ' bildirim; kanal ' + KANAL_BOYU + ' oyuncuda dolar ve yeni gelen ayrı kanala oturur', () => {
  const { P, soket, gelen, bosalt, ileri } = kur(), A = soket('A'), B = soket('B');
  P.onMessage(A, konum(0, 0)); P.onMessage(B, konum(0, 0)); bosalt();
  for (let i = 0; i < 25; i++) P.onMessage(B, konum(i, 0));
  assert.equal(gelen(A).length, HIZ - 1, 'pencerenin ilk bildirimi kurulumda sayıldı');
  ileri(1000); bosalt(); P.onMessage(B, konum(50, 0)); assert.equal(gelen(A).length, 1);
  const kalabalik = Array.from({ length: KANAL_BOYU - 2 }, (_, i) => soket('k' + i)); for (const s of kalabalik) P.onMessage(s, konum(1, 1));
  assert.deepEqual(P.sayim(), [KANAL_BOYU]);
  const yeni = soket('yeni'); bosalt(); P.onMessage(yeni, konum(2, 2));
  assert.deepEqual(P.sayim(), [KANAL_BOYU, 1]); assert.deepEqual(gelen(yeni)[0].liste, []); assert.equal(gelen(A).length, 0, 'dolu kanal yeni geleni görmez');
  P.onDisconnect(kalabalik[0]); const sonraki = soket('sonraki'); P.onMessage(sonraki, konum(3, 3)); assert.deepEqual(P.sayim(), [KANAL_BOYU, 1], 'boşalan yere oturur');
});

test('alan sohbeti: süzgeç, bağlantı ayıklama, hız sınırı; yalnız aynı alandakiler duyar', () => {
  const { temizSoz } = require('../server/meydan_presence');
  assert.equal(temizSoz('  Selam   millet!  '), 'Selam millet!');
  assert.equal(temizSoz('bak şuna https://kotu.site/x hemen'), 'bak şuna hemen');
  assert.equal(temizSoz('sitem ornek.com/odul'), 'sitem');
  assert.equal(temizSoz('sen bir orospusun'), 'sen bir ••••••');
  assert.equal(temizSoz('klasik bir maçtı'), 'klasik bir maçtı');
  for (const kotu of [null, 5, '', '   ', 'http://x.y/z']) assert.equal(temizSoz(kotu), null, String(kotu));
  assert.equal(temizSoz('a'.repeat(300)).length, 120);
  const { P, soket, gelen, bosalt, ileri } = kur(), A = soket('A'), B = soket('B'), C = soket('C'), Y = soket('Y');
  assert.equal(P.onMessage(Y, { type: 'meydan_soz', x: 'katılmadan yazıyorum' }), true); assert.equal(gelen(Y).length, 0);
  P.onMessage(A, konum(0, 0)); P.onMessage(B, konum(1, 1, 'master', { n: 'Bora' })); P.onMessage(C, konum(0, 0, 'han')); bosalt();
  P.onMessage(B, { type: 'meydan_soz', x: 'Selam Ayşe', n: 'Sahte', id: 'sahte' });
  assert.equal(gelen(A).length, 1); assert.equal(gelen(A)[0].x, 'Selam Ayşe'); assert.equal(gelen(A)[0].n, 'Bora'); assert.equal(gelen(A)[0].h, '@B');
  assert.equal(gelen(B)[0].ben, true); assert.equal(gelen(C).length, 0, 'başka alan duymaz');
  bosalt(); P.onMessage(B, { type: 'meydan_soz', x: 'hemen ardından' });
  assert.equal(gelen(A).length, 0); assert.deepEqual(gelen(B), [{ type: 'meydan_soz_red', neden: 'hiz' }]);
  for (let i = 0; i < 7; i++) { ileri(1300); P.onMessage(B, { type: 'meydan_soz', x: 'söz ' + i }); }
  bosalt(); ileri(1300); P.onMessage(B, { type: 'meydan_soz', x: 'dokuzuncu' }); assert.equal(gelen(A).length, 0, 'otuz saniyede sekiz söz');
  ileri(30000); bosalt(); P.onMessage(B, { type: 'meydan_soz', x: 'yeniden' }); assert.equal(gelen(A).length, 1);
});
