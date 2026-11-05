'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { openFirestoreStore } = require('../server/firestore_store');
// Never let an integration test accidentally contact a real Google project.
if (!/^127\.0\.0\.1:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '')) throw new Error('Local Firestore emulator required');
const options = { projectId: 'demo-ejder-ocagi', databaseId: 'economy' };
const command = (type, args, expectedVersion) => ({ requestId: crypto.randomUUID(), type, args, expectedVersion });

test('Firestore: two independent instances share durable accounts and command receipts', { timeout: 30000 }, async t => {
  const a = openFirestoreStore(options), b = openFirestoreStore(options);
  t.after(async () => { await a.close(); await b.close(); });
  const guest = await a.createGuest();
  assert.equal((await b.resolveSession(guest.token)).accountId, guest.accountId);
  assert.equal(await b.resolveSession('forged'), null);
  const initial = command('game.start', {}, 0);
  const started = await a.executeCommand(guest.accountId, initial);
  assert.equal(started.economy.gold, 420);
  assert.equal(started.economy.stones.kor_t1, 12);
  assert.equal(started.economy.dragons[0].data.name, 'Kor');
  // Lost response / reconnect to another Cloud Run instance.
  const replay = await b.executeCommand(guest.accountId, initial);
  assert.equal(replay.replayed, true); assert.equal(replay.economy.version, 1);
  const purchase = command('chibi.craft', { itemId: 'hat_2' }, 1);
  const same = await Promise.all([a.executeCommand(guest.accountId, purchase), b.executeCommand(guest.accountId, purchase)]);
  assert.equal(same.filter(r => r.replayed).length, 1);
  assert.equal((await b.readEconomy(guest.accountId)).gold, 220);
  await assert.rejects(b.executeCommand(guest.accountId, { ...purchase, args: { itemId: 'armor_2' } }), /request_id_reused/);
  const before = await b.readEconomy(guest.accountId);
  await assert.rejects(a.executeCommand(guest.accountId, command('chibi.craft', { itemId: 'hat_8' }, 2)));
  assert.deepEqual(await b.readEconomy(guest.accountId), before);
  await b.revokeSession(guest.token);
  assert.equal(await a.resolveSession(guest.token), null);
});

test('Firestore: concurrent spends serialize; ownership and arbitrary rewards cannot bypass rules', { timeout: 30000 }, async t => {
  const a = openFirestoreStore(options), b = openFirestoreStore(options);
  t.after(async () => { await a.close(); await b.close(); });
  const guest = await a.createGuest(), other = await b.createGuest();
  const start = await a.executeCommand(guest.accountId, command('game.start', {}, 0));
  await b.executeCommand(other.accountId, command('game.start', {}, 0));
  const attempts = await Promise.allSettled([
    a.executeCommand(guest.accountId, command('chibi.craft', { itemId: 'hat_2' }, 1)),
    b.executeCommand(guest.accountId, command('chibi.craft', { itemId: 'armor_2' }, 1)),
  ]);
  assert.equal(attempts.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(attempts.find(x => x.status === 'rejected').reason.code, 'version_conflict');
  const after = await a.readEconomy(guest.accountId);
  assert.equal(after.gold, 220); assert.equal(after.version, 2); assert.equal(after.stones.kor_t1, 8);
  await assert.rejects(b.executeCommand(other.accountId, command('egg.incubate', { assetId: start.economy.eggs[0].assetId, enabled: true }, 1)), /asset_not_owned/);
  await assert.rejects(a.executeCommand(guest.accountId, command('reward.grant', { gold: 9999 }, 2)), /unsupported_command/);
  assert.equal((await b.readEconomy(guest.accountId)).gold, 220);
});
