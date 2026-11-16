'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { openEconomyStore } = require('../server/economy_store');
const recovery = require('../server/account_recovery');

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-kurtar-'));
  const filename = path.join(dir, 'economy.sqlite'), store = openEconomyStore(filename);
  t.after(() => { store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  return { store, filename };
}

test('kurtarma kodu: biçim, hoşgörülü yazım ve geçersiz girdiler', () => {
  const kod = recovery.makeCode();
  assert.match(kod, /^[A-HJ-NP-Z2-9]{24}$/);
  assert.equal(recovery.normalizeCode(recovery.formatCode(kod).toLowerCase().replace(/-/g, ' ')), kod);
  for (const kotu of [null, 5, '', 'ABCD', kod + 'A', kod.slice(0, 23) + '0', 'x'.repeat(200)]) assert.equal(recovery.normalizeCode(kotu), null);
  assert.notEqual(recovery.makeCode(), kod);
});

test('kod o hesap için yeni oturum açar; depoda kodun kendisi durmaz; yeni kod eskisini geçersiz kılar', t => {
  const { store, filename } = fixture(t);
  const a = store.createGuest(), b = store.createGuest();
  const kod = store.createRecoveryCode(a.accountId);
  assert.match(kod, /^([A-HJ-NP-Z2-9]{4}-){5}[A-HJ-NP-Z2-9]{4}$/);
  const yeni = store.redeemRecoveryCode(kod.toLowerCase());
  assert.equal(yeni.accountId, a.accountId); assert.equal(yeni.handle, a.handle); assert.notEqual(yeni.token, a.token);
  assert.equal(store.resolveSession(yeni.token).accountId, a.accountId);
  assert.equal(store.resolveSession(a.token).accountId, a.accountId, 'eski oturum geçerli kalır');
  const ham = fs.readFileSync(filename).toString('latin1');
  assert.equal(ham.includes(kod), false); assert.equal(ham.includes(kod.replace(/-/g, '')), false);
  // yanlış kod, başka hesabın kodu, bilinmeyen hesap
  assert.equal(store.redeemRecoveryCode(recovery.formatCode(recovery.makeCode())), null);
  assert.equal(store.redeemRecoveryCode('bozuk'), null);
  assert.equal(store.createRecoveryCode('yok-boyle-hesap'), null);
  const kodB = store.createRecoveryCode(b.accountId);
  assert.equal(store.redeemRecoveryCode(kodB).accountId, b.accountId);
  // yenileme
  const kod2 = store.createRecoveryCode(a.accountId);
  assert.notEqual(kod2, kod);
  assert.equal(store.redeemRecoveryCode(kod), null);
  assert.equal(store.redeemRecoveryCode(kod2).accountId, a.accountId);
});

test('kayıt yedeği: hesaba özel, üzerine yazılır, boyut sınırı; ekonomiye dokunmaz', t => {
  const { store } = fixture(t);
  const a = store.createGuest(), b = store.createGuest();
  assert.equal(store.getSave(a.accountId), null);
  const once = store.readEconomy(a.accountId);
  const ilk = store.putSave(a.accountId, JSON.stringify({ gold: 999999, week: 3 }));
  assert.ok(Number.isSafeInteger(ilk.savedAt));
  assert.deepEqual(JSON.parse(store.getSave(a.accountId).save), { gold: 999999, week: 3 });
  store.putSave(a.accountId, '{"week":4}');
  assert.equal(store.getSave(a.accountId).save, '{"week":4}');
  assert.equal(store.getSave(b.accountId), null);
  assert.deepEqual(store.readEconomy(a.accountId), once, 'yedekteki altın sunucu kesesini değiştirmez');
  assert.throws(() => store.putSave(a.accountId, 'x'.repeat(recovery.SAVE_MAX + 1)), /save_invalid/);
  assert.throws(() => store.putSave(a.accountId, 42), /save_invalid/);
  assert.equal(store.putSave('yok-boyle-hesap', '{}'), null);
});

test('kayıt yedeği çakışması: başka cihazın yazdığı yedek, bilinen zaman tutmuyorsa ezilmez', t => {
  const { store } = fixture(t);
  const a = store.createGuest();
  const ilk = store.putSave(a.accountId, '{"cihaz":"A"}', null);
  assert.throws(() => store.putSave(a.accountId, '{"cihaz":"B"}', null), e => e.code === 'save_conflict' && e.status === 409);
  const ikinci = store.putSave(a.accountId, '{"cihaz":"A2"}', ilk.savedAt);
  assert.ok(ikinci.savedAt > ilk.savedAt);
  assert.throws(() => store.putSave(a.accountId, '{"cihaz":"B"}', ilk.savedAt), /save_conflict/);
  assert.throws(() => store.putSave(a.accountId, '{}', 'dun'), /save_invalid/);
  assert.equal(store.getSave(a.accountId).save, '{"cihaz":"A2"}');
  store.putSave(a.accountId, '{"cihaz":"B"}');   // bilinçli üzerine yazma
  assert.equal(store.getSave(a.accountId).save, '{"cihaz":"B"}');
});
