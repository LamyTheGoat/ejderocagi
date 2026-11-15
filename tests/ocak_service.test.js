'use strict';
// Ocak defteri (server/ocak_service.js `ocak.sync`): yerel ocağın deftere içe aktarılması.
// Ayna varlık = istemci beyanı: hesaba bağlı, satılamaz, çoğalmaz. Sunucu kökenli varlık yalnız bırakılabilir.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { reduceCommand, validateCommand } = require('../server/economy_commands');
const { openEconomyStore } = require('../server/economy_store');
const { earnedFixture } = require('./helpers/earned_fixture');

const NOW = Date.UTC(2026, 10, 15, 12);
const env = (seed = 'ocak-seed') => ({ accountId: 'acct', seed, now: NOW });
const start = () => reduceCommand(null, { type: 'game.start', args: {} }, env()).game;
const cmd = (type, args = {}) => validateCommand({ type, args, requestId: crypto.randomUUID(), expectedVersion: 0 }).command;
const run = (state, type, args = {}, e = env()) => reduceCommand(state, cmd(type, args), e);
const sync = (state, body) => run(state, 'ocak.sync', { body: JSON.stringify(body) });
const OCAK = 'ocak-0001-aaaa';
// Yerel ocaktan bir ejderha (sunucunun başlangıç ejderhası kalıp olarak kullanılır; yerelde de aynı biçimdedir).
const yerelEj = (g, id, ad, ek = {}) => ({ id, d: Object.assign(JSON.parse(JSON.stringify(g.dragons[0])), { id, name: ad, assetId: undefined, funding: 'earned' }, ek) });
const yerelYu = (g, id) => ({ id, d: { id, genes: g.dragons[0].genes, sex: 'F', traits: [], w: 1, inK: true, gen: 1, parents: null, origin: 'Yerel yumurta' } });
const aynalar = g => g.dragons.filter(d => d.yerel);
const toplam = g => g.funds.bound + g.funds.unknown + g.funds.earned;

test('ocak.sync şema: altın, kaynak ya da fiyat alanı gönderilemez; bozuk gövde reddedilir', () => {
  const g = start();
  assert.throws(() => cmd('ocak.sync', { body: '{}', gold: 500 }), /invalid_arguments/);
  assert.throws(() => sync(g, { ocak: OCAK, gold: 5000 }), /ocak_body_invalid/);
  assert.throws(() => sync(g, { ocak: OCAK, funding: 'earned' }), /ocak_body_invalid/);
  assert.throws(() => sync(g, { ocak: 'x' }), /ocak_body_invalid/);
  assert.throws(() => sync(g, { ocak: OCAK, ej: [yerelEj(g, 1, 'Kor')], ejIds: [] }), /ocak_body_invalid/);      // listede olmayan ejderha
  assert.throws(() => sync(g, { ocak: OCAK, ej: [{ id: 1, d: { name: 'x' } }], ejIds: [1] }), /ocak_dragon_invalid/);
  assert.throws(() => sync(g, { ocak: OCAK, ejIds: [1, 1] }), /ocak_body_invalid/);
});

test('içe aktarma: yerel ejderha ve yumurtalar hesaba bağlı ayna olur; altın değişmez; taban varlıklar yerinde kalır', () => {
  const g0 = start(), n0 = g0.dragons.length, e0 = g0.eggs.length;
  const { game, result } = sync(g0, { ocak: OCAK, ej: [yerelEj(g0, 1, 'Kor'), yerelEj(g0, 2, 'Ayaz')], yu: [yerelYu(g0, 'e7')], ejIds: [1, 2], yuIds: ['e7'] });
  assert.equal(result.ocak.ilk, true); assert.deepEqual(result.ocak.ayna, { ej: 2, yu: 1 }); assert.deepEqual(result.ocak.eksik, { ej: [], yu: [] });
  assert.equal(game.dragons.length, n0 + 2); assert.equal(game.eggs.length, e0 + 1);
  assert.equal(game.gold, g0.gold); assert.equal(toplam(game), game.gold);
  for (const d of aynalar(game)) { assert.equal(d.funding, 'bound'); assert.ok(d.assetId); assert.equal(d.task, null); assert.deepEqual(Object.values(d.equip), [null, null, null, null]); }   // istemcinin 'earned' beyanı yok sayıldı
  assert.deepEqual(game.ocak.taban.sort(), [...g0.dragons, ...g0.eggs, ...g0.inv].map(r => r.assetId).sort());
  assert.equal(new Set(game.dragons.map(d => d.assetId)).size, game.dragons.length);
  assert.equal(new Set(game.dragons.map(d => d.id)).size, game.dragons.length);
});

test('çoğaltma yok: aynı kayıt yeniden, eski kayıt ya da ikinci sekmeden gönderilince satır sayısı değişmez', () => {
  const g0 = start(), body = { ocak: OCAK, ej: [yerelEj(g0, 1, 'Kor'), yerelEj(g0, 2, 'Ayaz')], ejIds: [1, 2] };
  const a = sync(g0, body).game, b = sync(a, body), c = sync(b.game, body).game;
  assert.equal(b.result.ocak.ilk, false);
  assert.equal(aynalar(c).length, 2);
  assert.deepEqual(aynalar(c).map(d => d.assetId), aynalar(a).map(d => d.assetId));           // kimlikler sabit
  // eski kayıt (Ayaz'ın eski hâli) geri yüklenip gönderilirse satır güncellenir, eklenmez
  const eski = sync(c, { ocak: OCAK, ej: [yerelEj(g0, 2, 'Ayaz', { w: 0, stage: 'yavru' })], ejIds: [1, 2] }).game;
  assert.equal(aynalar(eski).length, 2); assert.equal(aynalar(eski).find(d => d.yerelId === 2).stage, 'yavru');
  // yerelde ölen/satılan ejderha listeden düşer: ayna silinir
  const olu = sync(eski, { ocak: OCAK, ejIds: [1] }).game;
  assert.deepEqual(aynalar(olu).map(d => d.yerelId), [1]);
  // listede var ama hiç gönderilmemiş ayna: sunucu eksik diye bildirir
  assert.deepEqual(sync(olu, { ocak: OCAK, ejIds: [1, 9] }).result.ocak.eksik.ej, [9]);
});

test('başka yerel ocak (yeni oyun ya da bağlanmadan önceki kayıt): eski aynalar kalkar, yenileri kurulur; taban ve kazanılmış varlık durur', () => {
  const g0 = earnedFixture ? start() : start();
  const a = sync(g0, { ocak: OCAK, ej: [yerelEj(g0, 1, 'Kor'), yerelEj(g0, 2, 'Ayaz')], ejIds: [1, 2] }).game;
  const b = sync(a, { ocak: 'ocak-0002-bbbb', ej: [yerelEj(g0, 1, 'Yeni Kor')], ejIds: [1] });
  assert.equal(b.result.ocak.degisti, true);
  assert.deepEqual(aynalar(b.game).map(d => d.name), ['Yeni Kor']);
  assert.equal(b.game.dragons.filter(d => !d.yerel).length, g0.dragons.length);
  assert.deepEqual(b.game.ocak.taban, a.ocak.taban);
});

test('ayna sunucuda altına ya da takas malına çevrilemez; hedef ödülü bağlı ocakta sunucudan yazılmaz', () => {
  const g0 = start(), a = sync(g0, { ocak: OCAK, ej: [yerelEj(g0, 1, 'Kor', { stage: 'yetiskin', st: { gu: 400, ce: 400, da: 400, ze: 400 } })], ejIds: [1] });
  const ayna = aynalar(a.game)[0];
  for (const type of ['dragon.sell', 'auction.sell', 'offer.sell']) assert.throws(() => run(a.game, type, { assetId: ayna.assetId }), /dragon_busy/);
  assert.equal(a.game.gold, g0.gold); assert.deepEqual(a.result.goals, []);
  // bağlı ocakta başka komutlar da hedef ödülü yazmaz (yerel oyun öder); bağlı olmayan hesapta eskisi gibi
  const s = run(a.game, 'gold.local', { amount: -1, reason: 'other' }); assert.deepEqual(s.result.goals, []);
  const yu = sync(a.game, { ocak: OCAK, yu: [yerelYu(g0, 'e1')], ejIds: [1], yuIds: ['e1'] }).game.eggs.find(e => e.yerel);
  assert.throws(() => run(a.game, 'egg.hatch', { assetId: 'yok' }), /asset_not_owned/);
  assert.equal(yu.funding, 'bound'); assert.equal(yu.inK, false);
});

test('bırakma: sunucu kökenli varlık defterden silinir, altın yazılmaz; taban ve ayna bırakılamaz; yineleme zararsız', () => {
  const g0 = start(), bagli = sync(g0, { ocak: OCAK, ejIds: [] }).game;
  // sunucu kökenli (kazanılmış) bir ejderha: bağlandıktan sonra deftere girmiş gibi
  const gelen = Object.assign(JSON.parse(JSON.stringify(g0.dragons[0])), { id: bagli.nid++, assetId: 'baska:dragon:77', funding: 'earned', name: 'Gelen' });
  bagli.dragons.push(gelen);
  const tabanId = bagli.ocak.taban[0];
  const r = sync(bagli, { ocak: OCAK, ejIds: [], birak: ['baska:dragon:77', tabanId, 'uydurma:1'] });
  assert.deepEqual(r.result.ocak.birakildi, ['baska:dragon:77']);
  assert.equal(r.game.dragons.some(d => d.assetId === 'baska:dragon:77'), false);
  assert.equal(r.game.dragons.some(d => d.assetId === tabanId) || r.game.eggs.some(d => d.assetId === tabanId) || r.game.inv.some(d => d.assetId === tabanId), true);
  assert.equal(r.game.gold, g0.gold);
  assert.deepEqual(sync(r.game, { ocak: OCAK, ejIds: [], birak: ['baska:dragon:77'] }).result.ocak.birakildi, []);
});

test('yem teslimi: yalnız kazanılmış kovadan, tek yönlü; bağlı yem ve fazlası reddedilir', () => {
  const g0 = start(), bagli = sync(g0, { ocak: OCAK, ejIds: [] }).game, k = Object.keys(bagli.food)[0];
  bagli.food[k] = (bagli.food[k] || 0) + 5; bagli.foodSources[k] = bagli.foodSources[k] || { bound: 0, unknown: 0, earned: 0 }; bagli.foodSources[k].earned += 5;
  const once = bagli.food[k];
  assert.throws(() => sync(bagli, { ocak: OCAK, ejIds: [], yem: { [k]: 6 } }), /ocak_food_unavailable/);
  assert.throws(() => sync(bagli, { ocak: OCAK, ejIds: [], yem: { [k]: 0 } }), /ocak_food_invalid/);
  const r = sync(bagli, { ocak: OCAK, ejIds: [], yem: { [k]: 5 } });
  assert.deepEqual(r.result.ocak.yem, { [k]: 5 }); assert.equal(r.game.food[k], once - 5); assert.equal(r.game.foodSources[k].earned, 0);
  assert.throws(() => sync(r.game, { ocak: OCAK, ejIds: [], yem: { [k]: 1 } }), /ocak_food_unavailable/);       // bağlı (başlangıç) yem teslim alınamaz
});

test('depo: aynı istek iki kez gelirse tek uygulanır; iki sekmenin eşzamanlı içe aktarması çoğaltmaz; ayna Bedesten\'e konamaz', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-ocak-'));
  const store = openEconomyStore(path.join(dir, 'e.sqlite'));
  try {
    const acc = (await store.createGuest()).accountId;
    const send = body => store.executeCommand(acc, body);
    let r = await send({ requestId: crypto.randomUUID(), expectedVersion: 0, type: 'game.start', args: {} });
    const g = r.economy.game, body = JSON.stringify({ ocak: OCAK, ej: [yerelEj(g, 1, 'Kor'), yerelEj(g, 2, 'Ayaz')], ejIds: [1, 2] });
    const istek = { requestId: crypto.randomUUID(), expectedVersion: r.economy.version, type: 'ocak.sync', args: { body } };
    const a = await send(istek), b = await send(istek);                                   // aynı istek (ağ yinelemesi)
    assert.equal(b.replayed, true); assert.equal(b.economy.version, a.economy.version);
    // ikinci sekme aynı ocağı kendi isteğiyle gönderir: eski sürümle reddedilir, güncel sürümle satır eklenmez
    assert.throws(() => send({ requestId: crypto.randomUUID(), expectedVersion: r.economy.version, type: 'ocak.sync', args: { body } }), /version_conflict/);
    const c = await send({ requestId: crypto.randomUUID(), expectedVersion: a.economy.version, type: 'ocak.sync', args: { body } });
    assert.equal(c.economy.dragons.filter(d => d.data.yerel).length, 2);
    assert.equal(c.economy.gold, r.economy.gold);
    const ayna = c.economy.dragons.find(d => d.data.yerel);
    assert.throws(() => store.executeMarket(acc, { requestId: crypto.randomUUID(), op: 'list', kind: 'dragon', assetId: ayna.assetId, quantity: 1, unitPrice: 100 }), /asset_not_transferable/);
  } finally { store.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
