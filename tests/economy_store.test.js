'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const { openEconomyStore, SESSION_TTL_MS } = require('../server/economy_store');
const { createGuestSessions } = require('../server/guest_session');
const { createPublicFiles } = require('../server/public_files');

function fixture(t, options) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-store-'));
  const filename = path.join(dir, 'economy.sqlite');
  const store = openEconomyStore(filename, options);
  t.after(() => { store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  return { store, filename, dir };
}

test('guest sessions persist, contain only token hashes, expire and revoke', t => {
  let time = Date.now();
  const { store, filename } = fixture(t, { now: () => time });
  const a = store.createGuest(), b = store.createGuest();
  assert.notEqual(a.accountId, b.accountId);
  assert.notEqual(a.handle, b.handle);
  assert.equal(store.resolveSession(a.token).accountId, a.accountId);
  assert.equal(store.resolveSession(a.accountId), null);
  assert.equal(store.resolveSession('x'.repeat(43)), null);
  const other = openEconomyStore(filename);
  assert.equal(other.resolveSession(a.token).accountId, a.accountId);
  assert.deepEqual(other.readEconomy(a.accountId), { accountId: a.accountId, version: 0, gold: 0, items: [], dragons: [], eggs: [] });
  other.close();
  const db = new DatabaseSync(filename);
  const rows = db.prepare('SELECT * FROM sessions').all();
  assert.ok(rows.every(row => row.token_hash.length === 64 && !Object.values(row).includes(a.token)));
  assert.equal(db.prepare('PRAGMA journal_mode').get().journal_mode, 'wal');
  db.close();
  store.revokeSession(b.token);
  assert.equal(store.resolveSession(b.token), null);
  time += SESSION_TTL_MS;
  assert.equal(store.resolveSession(a.token), null);
  assert.ok(store.readEconomy(a.accountId)); // Expiration never deletes ownership.
});

test('gold and all asset kinds commit together; failed ownership/balance rolls back both accounts', t => {
  const { store, filename } = fixture(t);
  const a = store.createGuest(), b = store.createGuest();
  const ids = store.transaction(tx => {
    tx.adjustGold(a.accountId, 420);
    return ['item', 'dragon', 'egg'].map(kind => tx.createAsset(a.accountId, kind, { name: kind, id: 1 }));
  });
  assert.equal(new Set(ids).size, 3);
  const beforeA = store.readEconomy(a.accountId), beforeB = store.readEconomy(b.accountId);
  assert.throws(() => store.transaction(tx => {
    tx.adjustGold(a.accountId, -100);
    tx.adjustGold(b.accountId, 100);
    ids.forEach(id => tx.moveAsset(id, a.accountId, b.accountId));
    tx.adjustGold(a.accountId, -9999);
  }), /invalid_balance/);
  assert.deepEqual(store.readEconomy(a.accountId), beforeA);
  assert.deepEqual(store.readEconomy(b.accountId), beforeB);
  assert.throws(() => store.transaction(tx => tx.moveAsset(ids[0], b.accountId, a.accountId)), /asset_not_owned/);
  assert.throws(() => store.transaction(tx => tx.moveAsset(ids[0], a.accountId, 'missing')), /FOREIGN KEY/);
  store.transaction(tx => {
    tx.adjustGold(a.accountId, -100); tx.adjustGold(b.accountId, 100);
    ids.forEach(id => tx.moveAsset(id, a.accountId, b.accountId));
  });
  const other = openEconomyStore(filename);
  assert.equal(other.readEconomy(a.accountId).gold, 320);
  const result = other.readEconomy(b.accountId);
  assert.equal(result.gold, 100);
  assert.deepEqual([result.items.length, result.dragons.length, result.eggs.length], [1, 1, 1]);
  assert.throws(() => other.transaction(tx => tx.moveAsset(ids[0], a.accountId, b.accountId)), /asset_not_owned/);
  other.close();
});

test('invalid values, async/nested work and escaped transaction handles are rejected', t => {
  const { store } = fixture(t);
  const { accountId } = store.createGuest();
  for (const amount of ['10', NaN, Infinity, 1.2, 2_000_000_001, -1]) {
    assert.throws(() => store.transaction(tx => tx.adjustGold(accountId, amount)));
  }
  assert.throws(() => store.transaction(tx => tx.createAsset(accountId, 'unknown', {})), /invalid_asset/);
  assert.throws(() => store.transaction(tx => tx.createAsset(accountId, 'egg', [])), /invalid_asset/);
  assert.throws(() => store.transaction(async tx => tx.adjustGold(accountId, 1)), /sync_transaction_required/);
  assert.throws(() => store.transaction(() => store.transaction(() => {})), /nested_transaction/);
  let escaped;
  assert.throws(() => store.transaction(tx => { escaped = tx; tx.adjustGold(accountId, 1); return Promise.resolve(); }), /async_transaction_not_allowed/);
  assert.throws(() => escaped.adjustGold(accountId, 1), /transaction_closed/);
  assert.equal(store.readEconomy(accountId).gold, 0);
});

test('process exit during transaction leaves neither gold nor assets committed', t => {
  const { store, filename } = fixture(t);
  const { accountId } = store.createGuest();
  const script = `const s = require(process.argv[1]).openEconomyStore(process.argv[2]);
    s.transaction(tx => { tx.adjustGold(process.argv[3], 100); tx.createAsset(process.argv[3], 'egg', {}); process.exit(17); });`;
  const child = spawnSync(process.execPath, ['-e', script, require.resolve('../server/economy_store'), filename, accountId]);
  assert.equal(child.status, 17, child.stderr.toString());
  assert.equal(store.readEconomy(accountId).gold, 0);
  assert.deepEqual(store.readEconomy(accountId).eggs, []);
});

test('cookie protections, duplicate rejection and Origin checks', async t => {
  const { store } = fixture(t);
  const guest = store.createGuest();
  const sessions = createGuestSessions(store, 'https://game.example', true);
  const cookie = sessions.cookie(guest.token, guest.expiresAt);
  for (const flag of ['__Host-eo_guest=', 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Secure', 'Max-Age=']) assert.ok(cookie.includes(flag));
  const req = { headers: { cookie: cookie.split(';')[0], origin: 'https://game.example' } };
  assert.equal((await sessions.resolve(req)).accountId, guest.accountId);
  assert.equal(sessions.allowedOrigin(req), true);
  assert.equal(sessions.allowedOrigin({ headers: { origin: 'https://evil.example' } }), false);
  assert.equal(sessions.allowedOrigin({ headers: { 'sec-fetch-site': 'cross-site' } }), false);
  req.headers.cookie += '; ' + cookie.split(';')[0];
  assert.equal(await sessions.resolve(req), null);
});

test('public files deny private sources, traversal and symlink aliases', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-static-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'img')); fs.mkdirSync(path.join(dir, 'data'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<script src="client.js"></script>');
  fs.writeFileSync(path.join(dir, 'client.js'), '// public');
  fs.writeFileSync(path.join(dir, 'data', 'world.json'), '{}');
  fs.symlinkSync(path.join(dir, 'data', 'world.json'), path.join(dir, 'img', 'alias.json'));
  const resolve = createPublicFiles(dir, [path.join(dir, 'data')]);
  assert.equal(resolve('/client.js'), fs.realpathSync(path.join(dir, 'client.js')));
  for (const url of ['/data/world.json', '/server.js', '/.git/config', '/img/alias.json', '/img/../data/world.json', '/img/%2e%2e/data/world.json', '/%zz', '/img/%00.png']) assert.equal(resolve(url), null, url);
});
