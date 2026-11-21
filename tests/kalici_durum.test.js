'use strict';
// Kalıcı sunucu durumu: sunucu yeniden başlayınca parti, oda lobisi, künye ve Kıraathane bahis kilidi kaybolmaz.
// "Yeniden başlatma" burada: aynı SQLite deposu üstünde servislerin yeni örnekleri kurulur, bellek sıfırdan başlar.
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { openEconomyStore } = require('../server/economy_store');
const { createKalici } = require('../server/kalici_durum');
const { createOrtakOdalar } = require('../server/ortak_odalar');
const { createKiraathanePvp } = require('../server/kiraathane_pvp');
const { createParti, KOPMA_MS } = require('../server/parti_service');
const { createProfil } = require('../server/profil_service');
const { earnedFixture } = require('./helpers/earned_fixture');

const uuid = () => crypto.randomUUID(), bekle = async (n = 12) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };
function depo(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-kalici-')), file = path.join(dir, 't.sqlite'); let zaman = Date.now();
  const store = openEconomyStore(file, { now: () => zaman }), raw = new DatabaseSync(file);
  t.after(() => { raw.close(); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const yeni = () => { const g = store.createGuest(); store.executeCommand(g.accountId, { requestId: uuid(), expectedVersion: 0, type: 'game.start', args: {} });
    const oyun = JSON.parse(raw.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(g.accountId).game_json); raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(earnedFixture(oyun)), g.accountId); return g; };
  return { store, yeni, now: () => zaman, ileri: ms => { zaman += ms; } };
}
// bir "sunucu süreci": bellekteki her şey burada; aynı depoyla ikinci kez kurulunca yeniden başlamış olur
function surec(D) {
  const soketler = new Set(), kutu = new Map(), kilitli = new Set(), now = D.now;
  const send = (s, m) => { if (!kutu.has(s)) kutu.set(s, []); kutu.get(s).push(m); }, kimlik = s => s.k;
  const kalici = createKalici({ store: D.store, now });
  const O = createOrtakOdalar({ send, sockets: () => soketler, kimlik, now });
  const K = createKiraathanePvp({ store: D.store, send, sockets: () => soketler, kimlik, kilitli, kalici, now, zar: () => 6 });
  O.kaydet('kiraathane', K.tanim); O.kaydet('zindan', { enAz: 1, enCok: 4, baslat: () => ({ can: 10 }), eylem: () => ({ olaylar: [] }) });
  const P = createParti({ send, sockets: () => soketler, kimlik, now }), PR = createProfil({ send, sockets: () => soketler, kimlik, kalici, now });
  const baglan = g => { const s = { k: { accountId: g.accountId, handle: g.handle } }; soketler.add(s); O.onConnect(s); P.onConnect(s); return s; };
  const son = (s, tur) => (kutu.get(s) || []).filter(m => m.type === tur).pop();
  const anlikP = kalici.anlik('parti', () => P.anlik()), anlikO = kalici.anlik('ortak_oda', () => O.anlik());
  async function ac() { await K.yukle(); P.geriYukle(await anlikP.oku()); O.geriYukle(await anlikO.oku()); await K.kurtar(); }
  return { O, K, P, PR, kalici, kilitli, baglan, son, ac, kaydet: () => Promise.all([kalici.hepsiniYaz(), PR.kaydet()]) };
}
const tr = (store, a, type, ek) => store.executeTrade(a, { type, requestId: uuid(), ...ek }).trade;

test('depo: kalıcı kayıt yazılır, okunur, listelenir, silinir; süresi geçen görünmez ve süpürülür', async t => {
  const D = depo(t), K = createKalici({ store: D.store, now: D.now });
  await K.put('kunye', '@a', { ad: 'Aylin' }, 1000); await K.put('kunye', '@b/x', { ad: 'Bora' }, 5000); await K.put('parti', 'hepsi', { n: 1 }, 5000);
  assert.deepEqual(await K.get('kunye', '@a'), { ad: 'Aylin' });
  assert.deepEqual((await K.list('kunye')).map(r => r.key).sort(), ['@a', '@b/x'], 'tür kendi kayıtlarını listeler, başka türü karıştırmaz');
  D.ileri(2000); assert.equal(await K.get('kunye', '@a'), null); assert.deepEqual((await K.list('kunye')).map(r => r.key), ['@b/x']);
  assert.ok(D.store.pruneServiceState(50) >= 1);
  await K.del('kunye', '@b/x'); assert.equal(await K.get('kunye', '@b/x'), null);
  assert.throws(() => K.anlik('Kötü Tür', () => 1));
});

test('anlık görüntü yalnız değişince yazılır; depo uçları yoksa sessizce bellekte kalır', async t => {
  const D = depo(t); let yazim = 0; const store = Object.assign({}, D.store, { putDurable: (...a) => { yazim++; return D.store.putDurable(...a); } });
  const K = createKalici({ store, now: D.now }); let deger = { a: 1 }; const A = K.anlik('parti', () => deger);
  await A.yaz(); await A.yaz(); assert.equal(yazim, 1); deger = { a: 2 }; await A.yaz(); assert.equal(yazim, 2); assert.deepEqual(await A.oku(), { a: 2 });
  const bos = createKalici({ store: {} }); assert.equal(bos.etkin, false); await bos.put('kunye', '@a', 1, 1000); assert.equal(await bos.get('kunye', '@a'), null);
});

test('Kıraathane: oyun ortasında sunucu yeniden başlarsa bahis iade edilir, kilit açılır, oyunculara söylenir', async t => {
  const D = depo(t), a = D.yeni(), b = D.yeni(), g0 = [a, b].map(g => D.store.readEconomy(g.accountId).gold);
  const S1 = surec(D), sa = S1.baglan(a), sb = S1.baglan(b);
  S1.O.onMessage(sa, { type: 'ortak_kur', tur: 'kiraathane', anahtar: 'poker' }); S1.O.onMessage(sb, { type: 'ortak_katil', kod: S1.son(sa, 'ortak_oda').oda.kod });
  S1.O.onMessage(sb, { type: 'ortak_hazir' }); S1.O.onMessage(sa, { type: 'ortak_baslat' }); await bekle();
  let tk = tr(D.store, a.accountId, 'invite', { targetId: b.accountId }); tk = tr(D.store, b.accountId, 'accept', { tradeId: tk.id });
  tk = tr(D.store, a.accountId, 'offer', { tradeId: tk.id, revision: tk.revision, offer: { gold: 40, items: [], dragons: [], eggs: [], food: {} } });
  tk = tr(D.store, b.accountId, 'offer', { tradeId: tk.id, revision: tk.revision, offer: { gold: 25, items: [], dragons: [], eggs: [], food: {} } });
  for (const s of [sa, sb]) { S1.O.onMessage(s, { type: 'ortak_eylem', eylem: { t: 'kilit', takas: tk.id } }); await bekle(); }
  assert.equal(S1.son(sa, 'ortak_olay').durum.faz, 'oyun'); assert.deepEqual((await S1.kalici.list('kir_kilit')).map(r => r.key), [tk.id], 'kilit oyun başlamadan depoya yazıldı');
  await S1.kaydet();
  // yeniden başlatma: yeni süreç, bellek boş
  const S2 = surec(D); await S2.K.yukle(); assert.equal(S2.kilitli.has(tk.id), true, 'açılışta kilit hemen geri konur');
  await S2.ac(); const ya = S2.baglan(a); await bekle();
  assert.equal(tr(D.store, a.accountId, 'get', { tradeId: tk.id }).status, 'cancelled');
  assert.deepEqual([a, b].map(g => D.store.readEconomy(g.accountId).gold), g0, 'iki taraf da bahsini geri aldı');
  assert.equal(S2.kilitli.size, 0); assert.deepEqual(await S2.kalici.list('kir_kilit'), []);
  const bitti = S2.son(ya, 'ortak_bitti'); assert.equal(bitti.sonuc.neden, 'sunucu_yeniden_basladi'); assert.equal(bitti.oda.durum, 'bekliyor', 'masa lobiye döner, rövanş yapılabilir');
  assert.equal(bitti.oda.uyeler.length, 2);
});

test('Kıraathane: sonuç yazıldıktan sonra ödeme yarıda kalırsa yeniden başlatmada kazanana ödenir', async t => {
  const D = depo(t), a = D.yeni(), b = D.yeni(), a0 = D.store.readEconomy(a.accountId).gold, b0 = D.store.readEconomy(b.accountId).gold;
  let tk = tr(D.store, a.accountId, 'invite', { targetId: b.accountId }); tk = tr(D.store, b.accountId, 'accept', { tradeId: tk.id });
  tk = tr(D.store, b.accountId, 'offer', { tradeId: tk.id, revision: tk.revision, offer: { gold: 30, items: [], dragons: [], eggs: [], food: {} } });
  tk = tr(D.store, a.accountId, 'offer', { tradeId: tk.id, revision: tk.revision, offer: { gold: 10, items: [], dragons: [], eggs: [], food: {} } });
  tk = tr(D.store, a.accountId, 'confirm', { tradeId: tk.id, revision: tk.revision });   // ödemenin bir kısmı yapılmış gibi
  const K = createKalici({ store: D.store, now: D.now }); await K.put('kir_kilit', tk.id, { uyeler: [a.accountId, b.accountId], bitis: tk.expiresAt, sonuc: { kazanan: a.accountId } }, 3600000);
  const S = surec(D); await S.ac();
  assert.equal(tr(D.store, a.accountId, 'get', { tradeId: tk.id }).status, 'completed');
  assert.equal(D.store.readEconomy(a.accountId).gold, a0 + 30); assert.equal(D.store.readEconomy(b.accountId).gold, b0 - 30);
  assert.deepEqual(await S.kalici.list('kir_kilit'), []);
  await S.K.kurtar(); assert.equal(D.store.readEconomy(a.accountId).gold, a0 + 30, 'ikinci kurtarma bir şey yapmaz');
});

test('oda lobisi ve parti yeniden başlatmada geri gelir; dönmeyen üye süre dolunca düşer', async t => {
  const D = depo(t), [a, b, c] = [D.yeni(), D.yeni(), D.yeni()];
  const S1 = surec(D), [sa, sb, sc] = [a, b, c].map(S1.baglan);
  S1.O.onMessage(sa, { type: 'ortak_kur', tur: 'zindan', anahtar: 'zumrut', ad: 'Aylin' }); const kod = S1.son(sa, 'ortak_oda').oda.kod;
  S1.O.onMessage(sb, { type: 'ortak_katil', kod, ad: 'Bora' }); S1.O.onMessage(sb, { type: 'ortak_hazir' });
  S1.P.onMessage(sa, { type: 'parti_davet', to: c.handle, ad: 'Aylin' }); S1.P.onMessage(sc, { type: 'parti_kabul', lider: a.handle, ad: 'Cem' });
  await S1.kaydet();
  const S2 = surec(D); await S2.ac();
  const yb = S2.baglan(b); S2.O.onMessage(yb, { type: 'ortak_durum' });
  const oda = S2.son(yb, 'ortak_oda').oda; assert.equal(oda.kod, kod); assert.deepEqual(oda.uyeler.map(u => [u.ad, u.hazir, u.bagli]), [['Aylin', false, false], ['Bora', true, true]]);
  assert.equal(S2.son(yb, 'ortak_bitti'), undefined, 'lobideki odaya kesinti bildirimi gitmez');
  const yc = S2.baglan(c); S2.P.onMessage(yc, { type: 'parti_durum' }); const p = S2.son(yc, 'parti').parti;
  assert.equal(p.lider, a.handle); assert.deepEqual(p.uyeler.map(u => [u.ad, u.cevrimici]), [['Aylin', false], ['Cem', true]]);
  // A hiç dönmez: oda ek süre + kopma süresi sonra, parti KOPMA_MS sonra onu çıkarır
  D.ileri(130000); S2.O.supur(); assert.deepEqual(S2.son(yb, 'ortak_oda').oda.uyeler.map(u => u.ad), ['Bora']);
  D.ileri(KOPMA_MS); S2.P.supur(); assert.equal(S2.son(yc, 'parti').parti, null, 'tek kişi kalınca parti dağılır');
});

test('künye depoya yazılır; sunucu yeniden başlayınca çevrimdışı oyuncunun künyesi görünür', async t => {
  const D = depo(t), a = D.yeni(), b = D.yeni();
  const S1 = surec(D), sa = S1.baglan(a);
  S1.PR.onMessage(sa, { type: 'profil', p: { ad: 'Aylin', hafta: 7, un: 120, ejder: 3, st: { wins: 2 } } });
  assert.equal(await S1.PR.kaydet(), 1); assert.equal(await S1.PR.kaydet(), 0, 'değişmeyen künye yeniden yazılmaz');
  S1.PR.onMessage(sa, { type: 'profil', p: { ad: 'Aylin', hafta: 7, un: 120, ejder: 3, st: { wins: 2 } } }); assert.equal(await S1.PR.kaydet(), 0);
  const S2 = surec(D), sb = S2.baglan(b);
  S2.PR.onMessage(sb, { type: 'profil_iste', h: a.handle }); await bekle();
  const kart = S2.son(sb, 'profil_kart'); assert.equal(kart.p.ad, 'Aylin'); assert.equal(kart.p.hafta, 7); assert.equal(kart.cevrimici, false);
  S2.PR.onMessage(sb, { type: 'profil_iste', h: '@yok_boyle' }); await bekle(); assert.equal(S2.son(sb, 'profil_kart').p, null);
});
