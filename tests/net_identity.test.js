'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function context(fetch) {
  const sandbox = vm.createContext({
    fetch, location: { protocol: 'http:', origin: 'http://game.test' },
    S: { gold: 420, inv: [{ uid: 1, id: 'test' }], dragons: [{ id: 1, name: 'Kor' }], eggs: [{ id: 'e1' }], handle: '@local', xVerified: true },
    byId: () => null, saveGame() {}, setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {},
  });
  vm.runInContext(fs.readFileSync(require.resolve('../js/net'), 'utf8'), sandbox);
  return { sandbox, run: code => vm.runInContext(code, sandbox) };
}

test('client shares bootstrap, keeps gameplay assets and applies identity after a new local game', async () => {
  const requests = [];
  const { sandbox, run } = context(async (url, options) => {
    requests.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ ok: true, accountId: 'server-account', handle: '@server', economyReady: false }) };
  });
  const economyBefore = JSON.stringify([sandbox.S.gold, sandbox.S.inv, sandbox.S.dragons, sandbox.S.eggs]);
  await Promise.all([run("mpEnsureGuestSession('http://game.test')"), run("mpEnsureGuestSession('http://game.test')")]);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.body, undefined);
  assert.equal(run('MP.accountId'), 'server-account');
  assert.equal(sandbox.S.handle, '@server'); assert.equal(sandbox.S.xVerified, false);
  assert.equal(JSON.stringify([sandbox.S.gold, sandbox.S.inv, sandbox.S.dragons, sandbox.S.eggs]), economyBefore);
  sandbox.S.handle = '@new_local_game';
  run('MP.connected = true');
  await run('mpSyncState()');
  assert.equal(sandbox.S.handle, '@server');
  const sync = JSON.parse(requests[1].options.body);
  for (const key of ['gold', 'inv', 'dragons', 'eggs']) assert.equal(Object.hasOwn(sync, key), false);
  run("XAUTH.handle = '@verified_x'; xApplyToState()");
  assert.equal(sandbox.S.handle, '@server'); assert.equal(sandbox.S.xVerified, true);
});

test('client never silently creates a replacement account for rejected sessions', async () => {
  let calls = 0;
  const { run, sandbox } = context(async () => { calls++; return { ok: false, status: 401 }; });
  await assert.rejects(run("mpEnsureGuestSession('http://game.test')"), /guest_session_unavailable/);
  assert.equal(calls, 1); assert.equal(sandbox.S.handle, '@local');
  assert.equal(run('MP.accountId'), undefined);
});
