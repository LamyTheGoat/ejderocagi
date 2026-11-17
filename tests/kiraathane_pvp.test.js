'use strict';
// Kıraathane · oyuncuya karşı masa: gerçek SQLite deposu, gerçek takas emaneti, ortak oda altyapısı.
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { openEconomyStore } = require('../server/economy_store');
const { createOrtakOdalar } = require('../server/ortak_odalar');
const { createKiraathanePvp, HAMLE_MS } = require('../server/kiraathane_pvp');
const { earnedFixture } = require('./helpers/earned_fixture');

const uuid = () => crypto.randomUUID(), bekle = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };
function kur(t, zarlar, kartlar) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-kir-')), file = path.join(dir, 't.sqlite'), store = openEconomyStore(file), raw = new DatabaseSync(file);
  t.after(() => { raw.close(); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const yeni = () => { const g = store.createGuest(); store.executeCommand(g.accountId, { requestId: uuid(), expectedVersion: 0, type: 'game.start', args: {} });
    const oyun = JSON.parse(raw.prepare('SELECT game_json FROM game_states WHERE account_id=?').get(g.accountId).game_json); raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(earnedFixture(oyun)), g.accountId); return g; };
  const soketler = new Set(), kutu = new Map(); let zaman = Date.now(), zi = 0, ki = 0;
  const send = (s, m) => { if (!kutu.has(s)) kutu.set(s, []); kutu.get(s).push(m); }, kimlik = s => s.k, kilitli = new Set();
  const O = createOrtakOdalar({ send, sockets: () => soketler, kimlik, now: () => zaman });
  const K = createKiraathanePvp({ store, send, sockets: () => soketler, kimlik, kilitli, now: () => zaman, zar: () => zarlar[zi++ % zarlar.length], kartSec: kartlar ? () => kartlar[ki++ % kartlar.length] : undefined });
  O.kaydet('kiraathane', K.tanim);
  const baglan = g => { const s = { k: { accountId: g.accountId, handle: g.handle } }; soketler.add(s); return s; };
  const son = (s, tur) => (kutu.get(s) || []).filter(m => m.type === tur).pop();
  const tr = (a, type, ek) => store.executeTrade(a, { type, requestId: uuid(), ...ek }).trade;
  const masa = async (sa, sb, oyun) => { O.onMessage(sa, { type: 'ortak_kur', tur: 'kiraathane', anahtar: oyun || 'poker' }); O.onMessage(sb, { type: 'ortak_katil', kod: son(sa, 'ortak_oda').oda.kod }); O.onMessage(sb, { type: 'ortak_hazir' }); O.onMessage(sa, { type: 'ortak_baslat' }); await bekle(); };
  const eylem = async (s, e) => { O.onMessage(s, { type: 'ortak_eylem', eylem: e }); await bekle(); };
  return { store, O, K, yeni, baglan, son, tr, masa, eylem, kilitli, ileri: ms => { zaman += ms; }, altin: id => store.readEconomy(id).gold, kopar: s => { soketler.delete(s); O.onDisconnect(s); } };
}

test('bahisli Ejder Pokeri: zarları sunucu atar, kazanan kaybedenin bahsini alır; oyun sürerken takasa komut kilitlidir', async t => {
  // A: 6-6-6-6-6 (Ejderha Eli), B: 1-2-3-4-6 (yüksek zar)
  const { store, yeni, baglan, son, tr, masa, eylem, kilitli, altin } = kur(t, [6, 6, 6, 6, 6, 1, 2, 3, 4, 6]);
  const a = yeni(), b = yeni(), sa = baglan(a), sb = baglan(b), a0 = altin(a.accountId), b0 = altin(b.accountId);
  await masa(sa, sb); assert.equal(son(sb, 'ortak_basladi').durum.faz, 'bahis');
  let tk = tr(a.accountId, 'invite', { targetId: b.accountId }); tk = tr(b.accountId, 'accept', { tradeId: tk.id });
  tk = tr(a.accountId, 'offer', { tradeId: tk.id, revision: tk.revision, offer: { gold: 40, items: [], dragons: [], eggs: [], food: {} } });
  tk = tr(b.accountId, 'offer', { tradeId: tk.id, revision: tk.revision, offer: { gold: 25, items: [], dragons: [], eggs: [], food: {} } });
  await eylem(sa, { t: 'kilit', takas: tk.id }); assert.equal(son(sb, 'ortak_olay').durum.faz, 'bahis');
  await eylem(sb, { t: 'kilit', takas: '' }); assert.equal(son(sb, 'ortak_hata').kod, 'bahis_uyusmuyor');
  await eylem(sa, { t: 'kilit', takas: tk.id }); await eylem(sb, { t: 'kilit', takas: tk.id });
  assert.equal(son(sa, 'ortak_olay').durum.faz, 'oyun'); assert.equal(kilitli.has(tk.id), true);
  await eylem(sa, { t: 'ac' }); assert.equal(son(sa, 'ortak_hata').kod, 'once_zar_at');
  await eylem(sa, { t: 'at' }); assert.deepEqual(son(sb, 'ortak_olay').durum.oyuncu[a.accountId].zar, [6, 6, 6, 6, 6]);
  await eylem(sa, { t: 'ac' }); await eylem(sa, { t: 'at' }); assert.equal(son(sa, 'ortak_hata').kod, 'elin_acik');
  await eylem(sb, { t: 'at' }); await eylem(sb, { t: 'ac' }); await bekle(12);
  const bitti = son(sa, 'ortak_bitti'); assert.equal(bitti.sonuc.kazananId, a.accountId);
  assert.equal(son(sb, 'ortak_olay').durum.son.eller[a.accountId].rank, 7);
  const odeme = son(sb, 'masa_odeme'); assert.equal(odeme.odendi, true); assert.equal(odeme.kazanan, a.accountId);
  assert.equal(altin(a.accountId), a0 + 25, 'kazanan kendi bahsini korur, kaybedeninkini alır'); assert.equal(altin(b.accountId), b0 - 25);
  assert.equal(kilitli.has(tk.id), false); assert.equal(store.executeTrade(a.accountId, { type: 'get', requestId: uuid(), tradeId: tk.id }).trade.status, 'completed');
});

test('berabere: bahisler iade; bahissiz oyunda takas gerekmez; süresi dolan oyuncu adına sunucu oynar', async t => {
  const { yeni, baglan, son, tr, masa, eylem, altin, O, ileri } = kur(t, [2, 2, 3, 3, 5]);
  const a = yeni(), b = yeni(), sa = baglan(a), sb = baglan(b), a0 = altin(a.accountId);
  await masa(sa, sb);
  let tk = tr(a.accountId, 'invite', { targetId: b.accountId }); tk = tr(b.accountId, 'accept', { tradeId: tk.id });
  tk = tr(a.accountId, 'offer', { tradeId: tk.id, revision: tk.revision, offer: { gold: 30, items: [], dragons: [], eggs: [], food: {} } });
  await eylem(sa, { t: 'kilit', takas: tk.id }); await eylem(sb, { t: 'kilit', takas: tk.id });
  await eylem(sa, { t: 'at' }); await eylem(sa, { t: 'ac' }); await eylem(sb, { t: 'at' }); await eylem(sb, { t: 'ac' }); await bekle(12);
  assert.equal(son(sa, 'ortak_bitti').sonuc.kazananId, null); assert.equal(son(sa, 'masa_odeme').neden, 'berabere'); assert.equal(altin(a.accountId), a0);
  // rövanş, bahissiz; B hiç oynamaz: süre dolunca sunucu onun adına atar ve açar
  O.onMessage(sb, { type: 'ortak_hazir' }); O.onMessage(sa, { type: 'ortak_baslat' }); await bekle();
  await eylem(sa, { t: 'kilit', takas: '' }); await eylem(sb, { t: 'kilit' }); assert.equal(son(sa, 'ortak_olay').durum.faz, 'oyun'); assert.equal(son(sa, 'ortak_olay').durum.takas, null);
  await eylem(sa, { t: 'at' }); await eylem(sa, { t: 'ac' });
  ileri(HAMLE_MS + 1000); O.supur(); await bekle(12);
  assert.equal(son(sb, 'ortak_bitti').oda.durum, 'bitti'); assert.equal(son(sb, 'masa_odeme').bahis, false);
});

test('oyun sürerken masadan kalkan kaybeder: bahsi kalana geçer; bahis fazında kalkınca takas oyuncularda kalır', async t => {
  const { yeni, baglan, son, tr, masa, eylem, altin, O, kilitli } = kur(t, [1, 2, 3, 4, 6]);
  const a = yeni(), b = yeni(), sa = baglan(a), sb = baglan(b), a0 = altin(a.accountId), b0 = altin(b.accountId);
  await masa(sa, sb);
  let tk = tr(a.accountId, 'invite', { targetId: b.accountId }); tk = tr(b.accountId, 'accept', { tradeId: tk.id });
  tk = tr(b.accountId, 'offer', { tradeId: tk.id, revision: tk.revision, offer: { gold: 20, items: [], dragons: [], eggs: [], food: {} } });
  await eylem(sa, { t: 'kilit', takas: tk.id }); await eylem(sb, { t: 'kilit', takas: tk.id });
  O.onMessage(sb, { type: 'ortak_cik' }); await bekle(12);
  assert.equal(son(sa, 'masa_odeme').kazanan, a.accountId); assert.equal(altin(a.accountId), a0 + 20); assert.equal(altin(b.accountId), b0 - 20); assert.equal(kilitli.size, 0);
});

test('Kor 21: kartları sunucu dağıtır, yirmi bire yakın el kazanır ve bahsi alır; yanan kaybeder; süresi dolan durmuş sayılır', async t => {
  // deste sırası: ♠A..♠K, ♥A..; kartSec hep kalan destenin belirli sırasını seçer.
  // dağıtım (A, B, A, B): 9 → ♠10 ; 0 → ♠A ; 7 → ♠9 (A: 10+9 = 19) ; 0 → ♠2 (B: as+2 = 13) ; B çeker: 5 → ♠8 (21: el kendiliğinden kapanır)
  const { yeni, baglan, son, tr, masa, eylem, altin, O, ileri, kilitli } = kur(t, [1], [9, 0, 7, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const a = yeni(), b = yeni(), sa = baglan(a), sb = baglan(b), a0 = altin(a.accountId), b0 = altin(b.accountId);
  await masa(sa, sb, 'kor21'); assert.equal(son(sb, 'ortak_basladi').durum.oyun, 'kor21'); assert.equal(son(sb, 'ortak_basladi').durum.faz, 'bahis');
  let tk = tr(a.accountId, 'invite', { targetId: b.accountId }); tk = tr(b.accountId, 'accept', { tradeId: tk.id });
  tk = tr(a.accountId, 'offer', { tradeId: tk.id, revision: tk.revision, offer: { gold: 30, items: [], dragons: [], eggs: [], food: {} } });
  tk = tr(b.accountId, 'offer', { tradeId: tk.id, revision: tk.revision, offer: { gold: 15, items: [], dragons: [], eggs: [], food: {} } });
  await eylem(sa, { t: 'kilit', takas: tk.id }); await eylem(sb, { t: 'kilit', takas: tk.id });
  let d = son(sa, 'ortak_olay').durum; assert.equal(d.faz, 'oyun'); assert.equal(kilitli.has(tk.id), true);
  assert.deepEqual(d.oyuncu[a.accountId].el.map(k => k.r), ['10', '9']); assert.deepEqual(d.oyuncu[b.accountId].el.map(k => k.r), ['A', '2']);
  await eylem(sa, { t: 'at' }); assert.equal(son(sa, 'ortak_hata').kod, 'eylem_gecersiz');
  await eylem(sa, { t: 'dur' }); await eylem(sa, { t: 'cek' }); assert.equal(son(sa, 'ortak_hata').kod, 'elin_acik');
  await eylem(sb, { t: 'cek' }); await bekle(12);
  d = son(sa, 'ortak_olay').durum; assert.equal(d.faz, 'bitti'); assert.deepEqual(d.son.eller[b.accountId], { deger: 21, yandi: false }); assert.deepEqual(d.son.eller[a.accountId], { deger: 19, yandi: false });
  assert.equal(son(sa, 'ortak_bitti').sonuc.kazananId, b.accountId); assert.equal(son(sa, 'masa_odeme').odendi, true);
  assert.equal(altin(b.accountId), b0 + 30); assert.equal(altin(a.accountId), a0 - 30); assert.equal(kilitli.size, 0);
  // rövanş, bahissiz: A üst üste çekip yanar; B hiç oynamaz, süre dolunca durmuş sayılır ve kazanır
  O.onMessage(sb, { type: 'ortak_hazir' }); O.onMessage(sa, { type: 'ortak_baslat' }); await bekle();
  await eylem(sa, { t: 'kilit', takas: '' }); await eylem(sb, { t: 'kilit', takas: '' });
  for (let i = 0; i < 8 && !son(sa, 'ortak_olay').durum.oyuncu[a.accountId].acik; i++) await eylem(sa, { t: 'cek' });
  d = son(sa, 'ortak_olay').durum; assert.equal(d.faz, 'oyun'); assert.equal(d.oyuncu[a.accountId].acik, true);
  ileri(HAMLE_MS + 1000); O.supur(); await bekle(12);
  d = son(sb, 'ortak_olay').durum; assert.equal(d.faz, 'bitti'); const ea = d.son.eller[a.accountId], eb = d.son.eller[b.accountId];
  assert.equal(d.son.kazanan, ea.yandi ? b.accountId : ea.deger > eb.deger ? a.accountId : ea.deger < eb.deger ? b.accountId : null); assert.equal(son(sb, 'masa_odeme').bahis, false);
});

test('Kervan Tavlası: zarı sunucu atar, sıra dışı ve kural dışı hamle reddedilir, oynanamayan sıra geçer, altı pulu toplayan bahsi alır, oyalananın yerine sunucu oynar', async t => {
  // zar sırası: A 3-5 · B 2-2 (düşeş: dört hamle) · sonra hep 6-6
  const { yeni, baglan, son, tr, masa, eylem, altin, O, ileri, kilitli } = kur(t, [3, 5, 2, 2, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6]);
  const a = yeni(), b = yeni(), sa = baglan(a), sb = baglan(b), a0 = altin(a.accountId), b0 = altin(b.accountId);
  await masa(sa, sb, 'tavla'); let d = son(sb, 'ortak_basladi').durum; assert.equal(d.oyun, 'tavla'); assert.equal(d.yan[a.accountId], 'me'); assert.equal(d.yan[b.accountId], 'opp');
  assert.equal(d.T.pts[0].n, 6); assert.equal(d.T.pts[11].n, 6);
  let tk = tr(a.accountId, 'invite', { targetId: b.accountId }); tk = tr(b.accountId, 'accept', { tradeId: tk.id });
  tk = tr(b.accountId, 'offer', { tradeId: tk.id, revision: tk.revision, offer: { gold: 20, items: [], dragons: [], eggs: [], food: {} } });
  await eylem(sa, { t: 'kilit', takas: tk.id }); await eylem(sb, { t: 'kilit', takas: tk.id }); assert.equal(son(sa, 'ortak_olay').durum.faz, 'oyun'); assert.equal(kilitli.has(tk.id), true);
  await eylem(sb, { t: 'zar' }); assert.equal(son(sb, 'ortak_hata').kod, 'sira_sende_degil');
  await eylem(sa, { t: 'oyna', from: 0, to: 3, d: 3 }); assert.equal(son(sa, 'ortak_hata').kod, 'once_zar_at');
  await eylem(sa, { t: 'zar' }); d = son(sb, 'ortak_olay').durum; assert.deepEqual(d.T.dice, [3, 5]); assert.equal(d.T.phase, 'move');
  await eylem(sa, { t: 'oyna', from: 0, to: 4, d: 4 }); assert.equal(son(sa, 'ortak_hata').kod, 'hamle_gecersiz');
  await eylem(sa, { t: 'oyna', from: 0, to: 3, d: 3 }); await eylem(sa, { t: 'oyna', from: 0, to: 5, d: 5 });
  d = son(sb, 'ortak_olay').durum; assert.equal(d.T.turn, 'opp'); assert.equal(d.T.phase, 'roll'); assert.equal(d.T.pts[0].n, 4); assert.equal(d.T.pts[3].n, 1); assert.equal(d.T.pts[5].n, 1);
  await eylem(sb, { t: 'zar' }); assert.deepEqual(son(sa, 'ortak_olay').durum.T.moves, [2, 2, 2, 2]);
  for (let i = 0; i < 4; i++) await eylem(sb, { t: 'oyna', from: 11, to: 9, d: 2 });
  d = son(sa, 'ortak_olay').durum; assert.equal(d.T.turn, 'me'); assert.equal(d.T.pts[9].n, 4); assert.equal(d.T.pts[9].o, 'opp');
  // A oyalanır: süre dolunca sunucu onun adına zar atar ve oynar; sıra B'ye geçer
  ileri(HAMLE_MS + 1000); O.supur(); await bekle(12); d = son(sb, 'ortak_olay').durum; assert.equal(d.T.turn, 'opp'); assert.equal(d.faz, 'oyun');
  // son pul: A'nın beş pulu toplanmış, biri son hanede; B geçer, A toplar ve kazanır (durum nesnesi doğrudan kurulur)
  d.T.pts = Array.from({ length: 12 }, () => ({ o: null, n: 0 })); d.T.pts[11] = { o: 'me', n: 1 }; d.T.pts[0] = { o: 'opp', n: 6 }; d.T.bar = { me: 0, opp: 0 }; d.T.off = { me: 5, opp: 0 }; d.T.turn = 'me'; d.T.phase = 'roll'; d.T.moves = [];
  await eylem(sa, { t: 'zar' }); await eylem(sa, { t: 'oyna', from: 11, to: 'off', d: 6 }); await bekle(12);
  d = son(sb, 'ortak_olay').durum; assert.equal(d.faz, 'bitti'); assert.equal(d.son.kazanan, a.accountId); assert.equal(son(sb, 'ortak_bitti').sonuc.kazananId, a.accountId);
  assert.equal(son(sa, 'masa_odeme').odendi, true); assert.equal(altin(a.accountId), a0 + 20); assert.equal(altin(b.accountId), b0 - 20); assert.equal(kilitli.size, 0);
});
