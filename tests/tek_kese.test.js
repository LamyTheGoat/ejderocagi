'use strict';
// Tek kese (2026-11-20): sunucu altının tek doğruluk kaynağıdır.
//  - gold.merge: 2.0 kaydının yerel kesesi hesaba bir kez, tavansız, BAĞLI taşınır; ocak bağlanmadan reddedilir.
//  - gold.local artı tutar: tarayıcı beyanı bağlı girer, takasa giremez.
//  - eo2/js/kese.js: gösterge, bekleyen fark, yoldaki istek ve tekrarsız yeniden gönderme kuralları.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { reduceCommand, validateCommand } = require('../server/economy_commands');
const sources = require('../server/economy_sources');
const K = require('../eo2/js/kese.js');

const NOW = Date.UTC(2026, 10, 20, 12);
const env = () => ({ accountId: 'acct', seed: 'tek-kese', now: NOW });
const start = () => reduceCommand(null, { type: 'game.start', args: {} }, env()).game;
const cmd = (type, args = {}) => validateCommand({ type, args, requestId: crypto.randomUUID(), expectedVersion: 0 }).command;
const run = (state, type, args = {}) => reduceCommand(state, cmd(type, args), env());
const OCAK = 'ocak-0001-aaaa';
const bagli = () => run(start(), 'ocak.sync', { body: JSON.stringify({ ocak: OCAK, ejIds: [], yuIds: [] }) }).game;   // çift başlangıç kesesi düşülmüş
const bos = () => ({ offer: o => Object.assign({ gold: 0, items: [], dragons: [], eggs: [], food: {} }, o) });

test('gold.merge: ocak bağlanmadan reddedilir (sonraki ilk bağlanma taşınan altını silerdi)', () => {
  assert.throws(() => run(start(), 'gold.merge', { amount: 500 }), /ocak_not_linked/);
});

test('gold.merge: yerel kese bir kez, tavansız, bağlı taşınır; ikinci kez taşınmaz', () => {
  const g0 = bagli();
  assert.equal(g0.ocak.kese.dusulen >= 0, true);
  const r = run(g0, 'gold.merge', { amount: 25_000 });        // gold.import'un 2000 tavanı burada YOK: oyuncunun altını silinmez
  assert.equal(r.result.applied, 25_000);
  assert.equal(r.game.gold, g0.gold + 25_000);
  assert.equal(r.game.funds.bound, g0.funds.bound + 25_000);
  assert.equal(r.game.funds.earned, g0.funds.earned);
  assert.equal(r.game.tekKese.applied, 25_000);
  const again = run(r.game, 'gold.merge', { amount: 9_999 });
  assert.equal(again.result.already, true); assert.equal(again.game.gold, r.game.gold);
  // sıfır tutar da birleşmedir (yerel kesesi boş oyuncu)
  assert.equal(run(bagli(), 'gold.merge', { amount: 0 }).game.tekKese.applied, 0);
});

test('gold.merge: eksi tutar yalnız bağlı ve bilinmeyen altından düşer; kazanılmış altına dokunmaz', () => {
  const g0 = bagli();
  g0.gold += 300; g0.funds.earned += 300; g0.funds.bound += 40;  g0.gold += 40;   // 300 kazanılmış, 40 bağlı
  const r = run(g0, 'gold.merge', { amount: -1000 });
  assert.equal(r.result.applied, -40);
  assert.equal(r.game.funds.earned, g0.funds.earned);
  assert.equal(r.game.funds.bound, 0);
});

test('gold.merge şema: yalnız tam sayı, en çok 1.000.000.000; fazladan alan yok', () => {
  assert.throws(() => cmd('gold.merge', { amount: 1.5 }), /invalid_arguments/);
  assert.throws(() => cmd('gold.merge', { amount: 1_000_000_001 }), /invalid_arguments/);
  assert.throws(() => cmd('gold.merge', { amount: 5, source: 'earned' }), /invalid_arguments/);
  assert.doesNotThrow(() => cmd('gold.merge', { amount: 5_000_000 }));
});

test('gold.local artı tutar bağlı girer: takasa ve bahse konamaz, kazanılmış altın takas edilebilir kalır', () => {
  const g0 = bagli();
  g0.gold += 100; g0.funds.earned += 100;
  const g = run(g0, 'gold.local', { reason: 'kiraathane', amount: 5000 }).game;
  assert.equal(g.funds.earned, g0.funds.earned);
  assert.throws(() => sources.tradable(g, bos().offer({ gold: g0.funds.earned + 1 })), /gold_not_transferable/);
  assert.doesNotThrow(() => sources.tradable(g, bos().offer({ gold: g0.funds.earned })));
  // gider önce bağlı altından düşer: kazanılmış altın en son harcanır
  const h = run(g, 'gold.local', { reason: 'other', amount: -4000 }).game;
  assert.equal(h.funds.earned, g0.funds.earned);
});

/* ---------- istemci kuralları (eo2/js/kese.js) ---------- */
test('kese: gösterge = sunucu + bekleyen + yoldaki; yerel yazım farkı biriktirir', () => {
  const A = { tek: true, son: 1000, bek: 0, ucus: null };
  assert.equal(K.goster(A), 1000);
  assert.equal(K.yaz(A, 1000 + 120), 120);          // S.gold += 120
  assert.equal(K.yaz(A, K.goster(A) - 50), -50);    // S.gold -= 50
  assert.equal(A.bek, 70); assert.equal(K.goster(A), 1070);
  // müzayede kalıbı: değeri sakla, yerel kod ekler, eski değeri geri yaz → net sıfır
  const sak = K.goster(A); K.yaz(A, sak + 900); K.yaz(A, sak); assert.equal(A.bek, 70);
  // sahne tutması: sunucu kısmı donuk kalır
  A.son = 5000; assert.equal(K.goster(A, 1000), 1070);
});

test('kese: parça sınırı, yanıt anlamı', () => {
  assert.equal(K.parca(0), 0); assert.equal(K.parca(2_500_000), 1_000_000); assert.equal(K.parca(-7), -7);
  assert.equal(K.anlam(null), 'uygulandi');
  assert.equal(K.anlam({ status: 0 }), 'ayni'); assert.equal(K.anlam({ status: 503 }), 'ayni');
  assert.equal(K.anlam({ status: 409, code: 'version_conflict' }), 'geri');
  assert.equal(K.anlam({ status: 401 }), 'geri');
  assert.equal(K.anlam({ status: 409, code: 'insufficient_gold' }), 'dus');
});

test('kese: yoldaki istek; başarı, kopma, çakışma ve ret göstergeyi doğru bırakır', () => {
  const yol = (tutar) => ({ tek: true, son: 1000, bek: 0, ucus: { tutar, govde: {} } });
  let A = yol(200);                      // gösterge 1200
  assert.equal(K.goster(A), 1200);
  assert.equal(K.sonuc(A, null, 1200), 'uygulandi'); assert.equal(A.ucus, null); assert.equal(K.goster(A), 1200);
  A = yol(200);
  assert.equal(K.sonuc(A, { status: 0 }), 'ayni'); assert.ok(A.ucus); assert.equal(K.goster(A), 1200);   // aynı gövde yeniden gider
  A = yol(200);
  assert.equal(K.sonuc(A, { status: 409, code: 'version_conflict' }), 'geri'); assert.equal(A.bek, 200); assert.equal(K.goster(A), 1200);
  A = yol(-300);                         // gösterge 700, sunucu harcamayı reddetti
  assert.equal(K.sonuc(A, { status: 409, code: 'insufficient_gold' }), 'dus'); assert.equal(K.goster(A), 1000);
});

test('kese: birleşme gösterilen altını korur; istek giderken yapılan yerel yazım kaybolmaz', () => {
  assert.equal(K.birlesmeTutari(1500, 300, false), null);       // durgun değil: bekle
  const tutar = K.birlesmeTutari(1500, 300, true);
  assert.equal(tutar, 1200);
  // sunucu 1200'ü yazdı: yeni sunucu altını 1500; istek yoldayken oyuncu 40 harcadı (gösterge 1460)
  const A = K.tekeGec({ acct: 'a', base: 0, srv: 300 }, 1500, 1460, 1500, false);
  assert.equal(A.tek, true); assert.equal(K.goster(A), 1460); assert.equal(A.bek, -40);
  assert.equal(A.base, undefined);
  // hesap başka kayıttan zaten birleşmiş: bu kayıt hesabın kesesini benimser
  const B = K.tekeGec({ acct: 'a' }, 800, 1500, 1500, true);
  assert.equal(K.goster(B), 800);
});

test('uçtan uca (sunucu + istemci kuralı): birleşme ve yerel değişimler sunucuyla aynı sonuca varır', () => {
  let g = bagli();
  const A = { acct: 'acct', base: g.gold, srv: 0 };
  const gosterge = 900;                                     // eski iki kese: yerel 900, sunucu payı 0
  const t = K.birlesmeTutari(gosterge, g.gold, true);
  g = run(g, 'gold.merge', { amount: t }).game;
  K.tekeGec(A, g.gold, gosterge, gosterge, false);
  assert.equal(K.goster(A), 900);
  K.yaz(A, K.goster(A) + 75); K.yaz(A, K.goster(A) - 500);  // kıraathane kazancı, bina gideri
  const p = K.parca(A.bek); A.ucus = { tutar: p, govde: {} }; A.bek -= p;
  g = run(g, 'gold.local', { reason: 'other', amount: p }).game;
  K.sonuc(A, null, g.gold);
  assert.equal(g.gold, 475); assert.equal(K.goster(A), 475);
});

test('hesap tezgâhı: tek keseli hesapta önce kazanılmış altın harcanır, mal satılabilir kalır; birleşmemiş hesapta sıra aynı', () => {
  const hazirla = birlesik => {
    let g = bagli();
    g.gold += 5000; g.funds.earned += 5000;                    // arena kazancı gibi
    if (birlesik) g = run(g, 'gold.merge', { amount: 3000 }).game;   // yerel kese (bağlı)
    else { g.gold += 3000; g.funds.bound += 3000; }
    return g;
  };
  const al = g => { const d = g.market.dragons[0]; const r = run(g, 'shop.dragon', { id: d.id }).game; return { r, d: r.dragons[r.dragons.length - 1], fiyat: d.price }; };
  const t = hazirla(true), { r, d, fiyat } = al(t);
  assert.equal(d.funding, 'earned');
  assert.equal(r.funds.earned, t.funds.earned - fiyat); assert.equal(r.funds.bound, t.funds.bound);
  const u = hazirla(false), x = al(u);
  assert.equal(x.d.funding, 'bound');                            // eski sıra (bound → unknown → earned) değişmedi
});
