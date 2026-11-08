'use strict';
// ENG-12 · Kayıtlı hesap sunucu senkronu (js/economy_sync.js saf kısmı). Sunucu durumu gerçek indirgeyiciyle üretilir.
const test = require('node:test'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { reduceCommand, validateCommand, gameEconomy } = require('../server/economy_commands');
const Y = require('../js/economy_sync');

const ACC = 'acct-12';
const plain = v => JSON.parse(JSON.stringify(v));
let version = 0;
const srvStart = () => { version = 1; return reduceCommand(null, { type: 'game.start', args: {} }, { accountId: ACC, seed: 'seed' }).game; };
const srvStep = (game, type, args = {}) => { version++; return reduceCommand(game, validateCommand({ type, args, requestId: crypto.randomUUID(), expectedVersion: 0 }).command, { accountId: ACC, seed: crypto.randomUUID() }).game; };
const ecoOf = game => plain(gameEconomy(ACC, version, plain(game)));
// Yerel oyun: aynı başlangıç kuralları, ama sunucu kimliği/kaynak alanı yok (tarayıcıdaki S gibi).
function localGame() {
  const g = reduceCommand(null, { type: 'game.start', args: {} }, { accountId: 'local', seed: 'other' }).game;
  for (const rows of [g.dragons, g.eggs, g.inv]) for (const r of rows) { delete r.assetId; delete r.funding; }
  delete g.funds; delete g.foodSources; delete g.milestoneSources;
  g.gold = 1234; g.dragons[0].name = 'YerelKor';
  return g;
}
const kf = S => () => 2 - S.eggs.filter(e => e.inK).length;

test('ENG-12 ilk etkinleşme: tek altın (sunucu), sunucu pazarı; sunucu başlangıç varlıkları yerele kopyalanmaz; yerel ejderhalar kalır', () => {
  const srv = srvStart(), S = localGame();
  const r = Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  assert.equal(r.first, true); assert.equal(r.changed, true);
  assert.equal(S.gold, 420, 'kese sunucu kesesi'); assert.equal(S.srvSync.localGold, 1234, 'eski yerel kese kayıt altında');
  assert.deepEqual(S.market, srv.market, 'Rüstem/Hatice sunucu pazarını gösterir');
  assert.deepEqual(S.dragons.map(d => d.name), ['YerelKor']); assert.equal(S.eggs.length, 1);
  assert.deepEqual(S.srvSync.base.sort(), [...srv.dragons, ...srv.eggs].map(x => x.assetId).sort());
  const again = Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  assert.equal(again.changed, false, 'idempotent');
});

test('ENG-12 NPC ejderha + yumurta alımı: iyimser yerel kopya sunucu kaydına bağlanır (çift kayıt yok), kaynak sunucudan', () => {
  let srv = srvStart(); const S = localGame();
  Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  // Yerel ACT.buyD/buyEgg ile aynı iyimser değişiklik (yerel kimlik, fiyat silinir).
  const d = S.market.dragons[0], srvId = d.id; S.gold -= d.price; d.id = S.nid++; delete d.price; S.dragons.push(d); S.market.dragons.splice(0, 1);
  const e = S.market.egg; S.gold -= 0; delete e.price; S.eggs.push(e); S.market.egg = null;
  srv = srvStep(srv, 'shop.dragon', { id: srvId }); srv = srvStep(srv, 'shop.egg', { id: srv.market.egg.id });
  const r = Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  assert.equal(r.added.length, 2);
  assert.equal(S.dragons.length, 2, 'iyimser kopya bağlandı, ikinci kopya yok'); assert.equal(S.eggs.length, 2);
  const linked = S.dragons.find(x => x.assetId);
  assert.equal(linked, d); assert.equal(linked.funding, 'bound'); assert.equal(linked.id, d.id, 'yerel kimlik korunur');
  assert.equal(S.eggs.find(x => x.assetId), e);
  assert.equal(S.gold, srv.gold); assert.equal(S.market.egg, null);
  assert.equal(Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) }).changed, false);
});

test('ENG-12 sunucuda beliren varlık (Bedesten/takas/sunucu çatlaması) yerel ocağa gelir; sunucudan giden bağlı varlık yerelden çıkar', () => {
  let srv = srvStart(); const S = localGame();
  Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  srv = srvStep(srv, 'shop.dragon', { id: srv.market.dragons[0].id }); // başka sekmede/cihazda alındı: yerel kopya yok
  let r = Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  assert.equal(r.added.length, 1);
  const imported = S.dragons.find(x => x.assetId);
  assert.equal(typeof imported.id, 'number'); assert.ok(Object.values(imported.equip).every(v => v == null));
  assert.equal(new Set(S.dragons.map(x => x.id)).size, S.dragons.length, 'yerel kimlik çakışmaz');
  // Satıldı (Bedesten/takas): sunucuda yok → yerelden çıkar. Yerel-only ejderha asla silinmez.
  srv = srvStep(srv, 'dragon.sell', { assetId: imported.assetId });
  r = Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  assert.deepEqual(r.removed, [imported.assetId]);
  assert.deepEqual(S.dragons.map(x => x.name), ['YerelKor']);
});

test('ENG-12 iyimser satış askıdayken (gone) sunucu kaydı geri gelmez; ret olursa yerelde geri konur', () => {
  let srv = srvStart(); const S = localGame();
  Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  srv = srvStep(srv, 'shop.dragon', { id: srv.market.dragons[0].id });
  Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  const d = S.dragons.find(x => x.assetId);
  S.dragons = S.dragons.filter(x => x !== d); S.srvSync.gone.push(d.assetId); // yerel satış, sunucu yanıtı bekleniyor
  Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  assert.equal(S.dragons.some(x => x.assetId === d.assetId), false, 'askıda: yeniden içe alınmaz');
  srv = srvStep(srv, 'dragon.sell', { assetId: d.assetId });
  Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  assert.deepEqual(S.srvSync.gone, [], 'onaylanınca temizlenir'); assert.equal(S.gold, srv.gold);
});

test('ENG-12 yumurta: yerelde çatlayan bağlı yumurta yeniden gelmez; sunucuda çatlayınca doğan ejderha yerel yavruya bağlanır', () => {
  let srv = srvStart(); const S = localGame();
  Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  srv = srvStep(srv, 'building.buy', { kind: 'kulucka', tile: Y.serverBuildTile(srv, 0) });
  srv = srvStep(srv, 'shop.egg', { id: srv.market.egg.id });
  Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  const egg = S.eggs.find(x => x.assetId);
  assert.ok(egg, 'sunucudan alınan yumurta yerelde');
  // Yerel çatlama (hatchEgg) → yerel yavru; sunucu yumurtası henüz duruyor.
  S.eggs = S.eggs.filter(x => x !== egg);
  const kid = { id: S.nid++, name: 'Yavru', genes: egg.genes, equip: {} }; S.dragons.push(kid);
  assert.equal(Y.noteLocalHatch(S, egg, kid), true);
  Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  assert.equal(S.eggs.some(x => x.assetId === egg.assetId), false, 'yerelde çatlamış yumurta geri gelmez');
  // Sunucu iki hafta sonra çatlatır.
  srv = srvStep(srv, 'week.end'); srv = srvStep(srv, 'week.end');
  const before = ecoOf(srv);
  srv = srvStep(srv, 'egg.hatch', { assetId: egg.assetId });
  const row = Y.newRows(before, ecoOf(srv), 'dragons')[0];
  assert.ok(row);
  assert.equal(Y.linkHatched(S, egg.assetId, row), true);
  Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  assert.equal(kid.assetId, row.assetId); assert.equal(S.dragons.filter(x => x.assetId === row.assetId).length, 1);
});

test('ENG-12 başka hesap ya da eski kayıt: yeni taban; sunucu arsa seçimi; ret metinleri', () => {
  const srv = srvStart(), S = localGame();
  S.srvSync = { schema: 1, acct: 'baska', base: [], gone: [], hatched: {} };
  assert.equal(Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) }).first, true);
  assert.equal(S.srvSync.acct, ACC);
  assert.equal(Y.reconcile(S, null).changed, false); assert.equal(Y.reconcile(S, { accountId: ACC }).changed, false);
  const g = { grid: [{ open: true, b: 'in' }, { open: false }, { open: true, b: null }] };
  assert.equal(Y.serverBuildTile(g, 0), 2); assert.equal(Y.serverBuildTile(g, 2), 2); assert.equal(Y.serverBuildTile({ grid: [{ open: true, b: 'x' }] }, 0), 0);
  assert.match(Y.rejectText('dragon_unavailable'), /Tezgâh yenilendi/); assert.match(Y.rejectText('zzz'), /geri alındı/);
});

test('ENG-12 art arda iki alım: eski "önce" görüntüsüyle bile her yerel kopya kendi sunucu kaydına bağlanır', () => {
  let srv = srvStart(); const S = localGame();
  srv.gold = 5000; srv.funds = { schema: 1, bound: 0, unknown: 0, earned: 5000 };
  srv = srvStep(srv, 'building.buy', { kind: 'in', tile: Y.serverBuildTile(srv, 0) });
  Y.reconcile(S, ecoOf(srv), { kuluckaFree: kf(S) });
  const before = ecoOf(srv);
  const [a, b] = S.market.dragons.map(x => plain(x));
  srv = srvStep(srv, 'shop.dragon', { id: a.id }); const mid = ecoOf(srv);
  srv = srvStep(srv, 'shop.dragon', { id: b.id }); const end = ecoOf(srv);
  const rowA = Y.pickNewRow(S, before, mid, 'dragons', a);
  S.dragons.push(Object.assign(a, { id: S.nid++, assetId: rowA.assetId }));
  const rowB = Y.pickNewRow(S, before, end, 'dragons', b); // "önce" iki alım öncesinden: yine doğru satır
  assert.notEqual(rowA.assetId, rowB.assetId);
  assert.equal(rowB.data.name, b.name);
});
