'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { createParti, KOPMA_MS, DAVET_MS } = require('../server/parti_service');
const { createProfil, temizProfil } = require('../server/profil_service');

function kur() {
  const soketler = new Set(), kutu = new Map(); let zaman = 1000;
  const send = (s, m) => { if (!kutu.has(s)) kutu.set(s, []); kutu.get(s).push(m); };
  const o = { send, sockets: () => soketler, kimlik: s => s.k, now: () => zaman };
  const baglan = id => { const s = { k: { accountId: id, handle: '@' + id }, yer: { alan: 'master', set: 'avci' } }; soketler.add(s); return s; };
  const son = (s, tur) => (kutu.get(s) || []).filter(m => m.type === tur).pop();
  return { o, soketler, baglan, son, ileri: ms => { zaman += ms; } };
}

test('parti: davet, kabul, dört kişi sınırı, sohbet, atma, lider devri, dağılma', () => {
  const { o, baglan, son, ileri } = kur(), P = createParti(Object.assign({ yer: s => s.yer }, o));
  const [a, b, c, d, e] = ['a', 'b', 'c', 'd', 'e'].map(baglan);
  P.onMessage(b, { type: 'parti_kabul', lider: '@a' }); assert.equal(son(b, 'parti_hata').kod, 'davet_yok');
  P.onMessage(a, { type: 'parti_davet', to: '@b', ad: 'Aylin' }); assert.deepEqual(son(b, 'parti_davet'), { type: 'parti_davet', h: '@a', ad: 'Aylin' });
  P.onMessage(b, { type: 'parti_kabul', lider: '@a', ad: 'Bora' });
  let g = son(a, 'parti').parti; assert.equal(g.lider, '@a'); assert.deepEqual(g.uyeler.map(u => u.ad), ['Aylin', 'Bora']); assert.equal(g.uyeler[1].alan, 'master'); assert.equal(g.uyeler[1].set, 'avci');
  ileri(1100); P.onMessage(b, { type: 'parti_davet', to: '@c' }); assert.equal(son(b, 'parti_hata').kod, 'lider_degil');
  for (const [s, h] of [[c, '@c'], [d, '@d']]) { ileri(1100); P.onMessage(a, { type: 'parti_davet', to: h, ad: 'Aylin' }); P.onMessage(s, { type: 'parti_kabul', lider: '@a', ad: h }); }
  assert.equal(son(d, 'parti').parti.uyeler.length, 4);
  ileri(1100); P.onMessage(a, { type: 'parti_davet', to: '@e' }); assert.equal(son(a, 'parti_hata').kod, 'dolu');
  P.onMessage(c, { type: 'parti_soz', x: 'selam www.kotu.com dostlar' }); assert.equal(son(a, 'parti_soz').x, 'selam dostlar'); assert.equal(son(c, 'parti_soz').ben, true); assert.equal(son(e, 'parti_soz'), undefined);
  P.onMessage(e, { type: 'parti_soz', x: 'ben de' }); assert.equal(son(e, 'parti_hata').kod, 'parti_yok');
  P.onMessage(a, { type: 'parti_at', to: '@d' }); assert.equal(son(d, 'parti').parti, null); assert.ok(son(d, 'parti_atildi')); assert.equal(son(a, 'parti').parti.uyeler.length, 3);
  ileri(1100); P.onMessage(a, { type: 'parti_cik' }); assert.equal(son(a, 'parti').parti, null); assert.equal(son(b, 'parti').parti.lider, '@b'); assert.deepEqual(P.uyeler('b'), ['b', 'c']);
  P.onMessage(c, { type: 'parti_cik' }); assert.equal(son(b, 'parti').parti, null); assert.deepEqual(P.sayim(), { parti: 0, uye: 0 });
});

test('parti: kopan üye çevrimdışı görünür, süresi dolunca çıkarılır; davetin süresi dolar', async () => {
  const { o, baglan, son, ileri, soketler } = kur(), P = createParti(o), a = baglan('a'), b = baglan('b'), c = baglan('c');
  P.onMessage(a, { type: 'parti_davet', to: '@b' }); ileri(DAVET_MS + 1); P.onMessage(b, { type: 'parti_kabul', lider: '@a' }); assert.equal(son(b, 'parti_hata').kod, 'davet_yok');
  for (const [s, h] of [[b, '@b'], [c, '@c']]) { ileri(1100); P.onMessage(a, { type: 'parti_davet', to: h }); P.onMessage(s, { type: 'parti_kabul', lider: '@a' }); }
  soketler.delete(c); P.onDisconnect(c); await new Promise(r => setImmediate(r));
  assert.equal(son(a, 'parti').parti.uyeler[2].cevrimici, false);
  ileri(KOPMA_MS + 1000); P.supur(); assert.equal(son(a, 'parti').parti.uyeler.length, 2);
});

test('profil: künye süzülür, saklanır, sorana verilir', () => {
  const { o, baglan, son } = kur(), R = createProfil(o), a = baglan('a'), b = baglan('b');
  R.onMessage(b, { type: 'profil_iste', h: '@a' }); assert.deepEqual(son(b, 'profil_kart'), { type: 'profil_kart', h: '@a', p: null, cevrimici: true });
  R.onMessage(a, { type: 'profil', p: { ad: 'Aylin', set: 'avci', gor: 'ikiz.blue.iri.green', hafta: 7, un: 31.9, ejder: 3, yildiz: { name: 'Kor', el: 'ates', stage: 'genc', sex: 'F', gizli: 1 }, st: { wins: 5, kupa: -2, hile: 9 }, fazla: 'x' } });
  R.onMessage(b, { type: 'profil_iste', h: '@a' }); const p = son(b, 'profil_kart').p;
  assert.deepEqual(p, { ad: 'Aylin', set: 'avci', gor: 'ikiz.blue.iri.green', hafta: 7, un: 31, ejder: 3, yildiz: { name: 'Kor', el: 'ates', stage: 'genc', sex: 'F' }, st: { wins: 5, losses: 0, kupa: 0, bred: 0, hatch: 0, seferler: 0, raceWins: 0 } });
  assert.equal(temizProfil(null), null); assert.equal(temizProfil({ ad: 'orospu' }).ad, 'Gezgin'); assert.equal(temizProfil({ yildiz: { el: 'x' } }).yildiz, null);
});
