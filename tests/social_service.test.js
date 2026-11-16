'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createSocial } = require('../server/social_service');
const { openEconomyStore } = require('../server/economy_store');

const A = { accountId: '11111111-1111-4111-8111-111111111111', handle: '@gezgin_aaaaaa' }, B = { accountId: '22222222-2222-4222-8222-222222222222', handle: '@gezgin_bbbbbb' }, C = { accountId: '33333333-3333-4333-8333-333333333333', handle: '@gezgin_cccccc' };
function kur() {
  const kayit = new Map(), kutu = new Map(), soketler = new Set();
  const store = { getSocial: async id => kayit.get(id) ? JSON.parse(kayit.get(id)) : null, putSocial: async (id, k) => { kayit.set(id, JSON.stringify(k)); }, findAccountByHandle: async h => [A, B, C].find(x => x.handle === h)?.accountId || null };
  let t = 1000; const S = createSocial({ store, send: (s, m) => { if (!kutu.has(s)) kutu.set(s, []); kutu.get(s).push(m); }, sockets: () => soketler, now: () => t });
  const baglan = kim => { const s = { playerInfo: { accountId: kim.accountId, handle: kim.handle } }; soketler.add(s); return s; };
  return { S, baglan, kopar: s => soketler.delete(s), gelen: s => kutu.get(s) || [], bosalt: () => kutu.clear(), ileri: ms => { t += ms; } };
}

test('arkadaşlık: istek, kabul, karşılıklı istek, geri çevirme, silme; kimlik oturumdan gelir', async () => {
  const { S, baglan, gelen } = kur(), sb = baglan(B);
  await S.komut(A, { type: 'ad', ad: 'Aylin' }); await S.komut(B, { type: 'ad', ad: 'Bora' });
  let a = await S.komut(A, { type: 'istek', to: B.handle, accountId: C.accountId });
  assert.equal(a.giden, 1); assert.equal(a.dostlar.length, 0);
  assert.deepEqual(gelen(sb), [{ type: 'sosyal' }], 'hedef dürtülür');
  let b = await S.durum(B); assert.equal(b.gelen.length, 1); assert.equal(b.gelen[0].ad, 'Aylin'); assert.equal(b.gelen[0].id, A.accountId);
  b = await S.komut(B, { type: 'kabul', id: A.accountId });
  assert.equal(b.dostlar[0].ad, 'Aylin'); assert.equal(b.gelen.length, 0);
  a = await S.durum(A); assert.equal(a.dostlar[0].ad, 'Bora'); assert.equal(a.dostlar[0].h, B.handle); assert.equal(a.dostlar[0].cevrimici, true); assert.equal(a.giden, 0);
  await assert.rejects(() => S.komut(A, { type: 'istek', to: B.handle }), /social_already_friends/);
  await assert.rejects(() => S.komut(A, { type: 'istek', to: A.handle }), /social_invalid_target/);
  await assert.rejects(() => S.komut(A, { type: 'istek', to: '@yok_boyle' }), /social_target_not_found/);
  await assert.rejects(() => S.komut(A, { type: 'kabul', id: C.accountId }), /social_no_request/);
  // karşılıklı istek: ikincisi kabul sayılır
  await S.komut(A, { type: 'istek', to: C.handle }); const c = await S.komut(C, { type: 'istek', to: A.handle });
  assert.equal(c.dostlar.length, 1); assert.equal((await S.durum(A)).dostlar.length, 2);
  // geri çevirme ve silme iki tarafı da temizler
  await S.komut(B, { type: 'istek', to: C.handle }); await S.komut(C, { type: 'red', id: B.accountId });
  assert.equal((await S.durum(C)).gelen.length, 0); assert.equal((await S.durum(B)).giden, 0);
  await S.komut(A, { type: 'sil', id: B.accountId });
  assert.equal((await S.durum(A)).dostlar.length, 1); assert.equal((await S.durum(B)).dostlar.length, 0);
});

test('özel mesaj: yalnız arkadaşa, çevrimiçiyken; süzülür; hız sınırı', async () => {
  const { S, baglan, kopar, gelen, bosalt, ileri } = kur(), sa = baglan(A), sb = baglan(B), sc = baglan(C);
  await S.komut(A, { type: 'ad', ad: 'Aylin' }); await S.komut(A, { type: 'istek', to: B.handle }); await S.komut(B, { type: 'kabul', id: A.accountId }); bosalt();
  assert.equal(await S.onMessage(sa, { type: 'chat' }), false);
  await S.onMessage(sa, { type: 'ozel', to: B.accountId, x: 'selam orospu  https://x.y/z', from: C.accountId });
  assert.deepEqual(gelen(sb), [{ type: 'ozel', from: A.accountId, h: A.handle, ad: 'Aylin', x: 'selam ••••••' }]);
  assert.equal(gelen(sa)[0].ben, true); assert.equal(gelen(sc).length, 0);
  bosalt(); await S.onMessage(sa, { type: 'ozel', to: B.accountId, x: 'hemen' }); assert.deepEqual(gelen(sa), [{ type: 'ozel_red', neden: 'hiz' }]);
  ileri(1100); bosalt(); await S.onMessage(sa, { type: 'ozel', to: C.accountId, x: 'tanışmıyoruz' }); assert.equal(gelen(sa)[0].neden, 'dost_degil'); assert.equal(gelen(sc).length, 0);
  kopar(sb); ileri(1100); bosalt(); await S.onMessage(sa, { type: 'ozel', to: B.accountId, x: 'orada mısın' }); assert.equal(gelen(sa)[0].neden, 'cevrimdisi');
});

test('SQLite deposu: sosyal kayıt yazılır ve okunur; hesap adıyla hesap bulunur', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-sosyal-')), store = openEconomyStore(path.join(dir, 'e.sqlite'));
  t.after(() => { store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const g = store.createGuest();
  assert.equal(store.getSocial(g.accountId), null);
  store.putSocial(g.accountId, { ad: 'Aylin', dost: {}, gelen: {}, giden: {} });
  assert.equal(store.getSocial(g.accountId).ad, 'Aylin');
  assert.equal(store.findAccountByHandle(g.handle), g.accountId); assert.equal(store.findAccountByHandle('@yok'), null);
  assert.throws(() => store.putSocial(g.accountId, { ad: 'x'.repeat(70000) }), /social_too_large/);
});
