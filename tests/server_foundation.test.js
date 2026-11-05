'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const { fork } = require('node:child_process');
const { once } = require('node:events');
const ORIGIN = 'http://game.test';

async function startServer(dir) {
  const child = fork('-e', [`const { server } = require(${JSON.stringify(require.resolve('../server'))}); server.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));`], {
    env: { ...process.env, NODE_ENV: 'test', DATA_DIR: dir, LOCAL_ECONOMY_DIR: path.join(dir, 'local-economy'), ECONOMY_BACKEND: 'sqlite', PUBLIC_URL: ORIGIN, PORT: '0' }, silent: true,
  });
  let stderr = '';
  child.stderr.on('data', x => { stderr += x; }); child.stdout.resume();
  const info = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('server startup timeout: ' + stderr)); }, 5000);
    child.once('message', value => { clearTimeout(timer); resolve(value); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`server exit ${code}: ${stderr}`)); });
  });
  return {
    port: info.port,
    async request(url, { cookie, method = 'GET', body, origin = ORIGIN } = {}) {
      const response = await fetch(`http://127.0.0.1:${info.port}${url}`, { method, headers: {
        Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}),
      }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const text = await response.text();
      return { status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers, body: (() => { try { return JSON.parse(text); } catch (_) { return text; } })() };
    },
    async stop() { if (child.exitCode !== null) return; const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; },
  };
}

function clientFrame(message) {
  const payload = Buffer.from(JSON.stringify(message)), mask = crypto.randomBytes(4);
  const header = Buffer.alloc(payload.length < 126 ? 2 : 4);
  header[0] = 0x81;
  if (payload.length < 126) header[1] = 0x80 | payload.length;
  else { header[1] = 0xfe; header.writeUInt16BE(payload.length, 2); }
  const data = Buffer.from(payload); data.forEach((v, i) => { data[i] = v ^ mask[i % 4]; });
  return Buffer.concat([header, mask, data]);
}

async function openWs(port, cookie, origin = ORIGIN) {
  const socket = net.connect(port, '127.0.0.1');
  let pending = Buffer.alloc(0), status, readyResolve;
  const ready = new Promise(resolve => { readyResolve = resolve; });
  const messages = [], waiters = [];
  socket.on('data', chunk => {
    pending = Buffer.concat([pending, chunk]);
    if (!status) {
      const end = pending.indexOf('\r\n\r\n'); if (end < 0) return;
      status = Number(pending.toString('utf8', 0, end).split(' ')[1]); pending = pending.subarray(end + 4); readyResolve();
    }
    if (status !== 101) return;
    while (pending.length >= 2) {
      let size = pending[1] & 127, offset = 2;
      if (size === 126) { if (pending.length < 4) return; size = pending.readUInt16BE(2); offset = 4; }
      else if (size === 127) { if (pending.length < 10) return; size = Number(pending.readBigUInt64BE(2)); offset = 10; }
      if (pending.length < offset + size) return;
      const msg = JSON.parse(pending.toString('utf8', offset, offset + size)); pending = pending.subarray(offset + size);
      const i = waiters.findIndex(w => w.type === msg.type);
      if (i >= 0) waiters.splice(i, 1)[0].resolve(msg); else messages.push(msg);
    }
  });
  await once(socket, 'connect');
  socket.write(`GET /ws HTTP/1.1\r\nHost: game.test\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}\r\nOrigin: ${origin}\r\n${cookie ? `Cookie: ${cookie}\r\n` : ''}\r\n`);
  await ready;
  return { socket, status, send(msg) { socket.write(clientFrame(msg)); }, next(type) {
    const i = messages.findIndex(m => m.type === type); if (i >= 0) return Promise.resolve(messages.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('WS message timeout: ' + type)), 3000);
      waiters.push({ type, resolve(msg) { clearTimeout(timer); resolve(msg); } });
    });
  } };
}

test('HTTP/WS identity, private files and economy isolation survive server restart', { timeout: 20000 }, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-http-'));
  let server;
  const sockets = [];
  t.after(async () => { sockets.forEach(s => s.destroy()); if (server) await server.stop(); fs.rmSync(dir, { recursive: true, force: true }); });
  server = await startServer(dir);
  const a = await server.request('/api/session', { method: 'POST', body: { accountId: 'chosen', handle: '@victim', gold: 9999 } });
  const b = await server.request('/api/session', { method: 'POST' });
  assert.equal(a.status, 200); assert.ok(a.cookie.startsWith('eo_guest='));
  assert.notEqual(a.body.accountId, 'chosen'); assert.notEqual(a.body.handle, '@victim');
  assert.notEqual(a.body.accountId, b.body.accountId);
  const resumed = await server.request('/api/session', { method: 'POST', cookie: a.cookie });
  assert.equal(resumed.body.accountId, a.body.accountId); assert.equal(resumed.cookie, undefined);
  assert.equal((await server.request('/api/session', { method: 'POST', cookie: 'eo_guest=forged' })).status, 401);
  assert.equal((await server.request('/api/session', { method: 'POST', origin: 'https://evil.test' })).status, 403);
  assert.equal((await server.request('/api/economy?accountId=' + a.body.accountId)).status, 401);
  const economic = await server.request('/api/economy?accountId=' + b.body.accountId, { cookie: a.cookie });
  assert.equal(economic.body.economy.accountId, a.body.accountId);
  assert.equal(economic.body.economy.gold, 0); assert.equal(economic.body.economyReady, false);
  assert.equal(economic.headers.get('cache-control'), 'no-store');
  assert.equal(economic.headers.get('access-control-allow-origin'), null);
  assert.equal((await server.request('/api/economy', { method: 'POST', cookie: a.cookie, body: { gold: 9000 } })).status, 405);
  assert.equal((await server.request('/api/sync', { method: 'POST', body: {} })).status, 401);
  assert.equal((await server.request('/api/sync', { method: 'POST', cookie: a.cookie, body: { gold: 9000, dragons: [{ id: 'fake' }] } })).status, 400);
  const sync = await server.request('/api/sync', { method: 'POST', cookie: a.cookie, body: { handle: b.body.handle, accountId: b.body.accountId, verified: true, star: { id: 'local-only', name: 'Kor' } } });
  assert.equal(sync.status, 200); assert.equal(sync.body.handle, a.body.handle);
  assert.equal(sync.body.peers.find(p => p.handle === a.body.handle).verified, false);
  assert.deepEqual((await server.request('/api/economy', { cookie: a.cookie })).body.economy.dragons, []);
  for (const url of ['/server.js', '/server/economy_store.js', '/js/trade_engine.js', '/js/duel_server.js', '/js/duel_engine.js', '/data/world.json', '/data/economy.sqlite', '/data/economy.sqlite-wal', '/.git/config', '/package.json', '/tests/economy_store.test.js', '/.env']) {
    assert.equal((await server.request(url)).status, 404, url);
  }
  for (const url of ['/', '/style.css', '/js/core.js', '/js/net.js', '/img/pose/meta.json']) assert.equal((await server.request(url)).status, 200, url);
  const maliciousName = '<script>alert(1)</script>';
  await server.request('/api/sync', { method: 'POST', cookie: a.cookie, body: { star: { name: maliciousName, st: {} } } });
  const card = await server.request('/share/card/' + encodeURIComponent(a.body.handle) + '.svg');
  assert.equal(card.status, 200); assert.ok(!card.body.includes(maliciousName)); assert.ok(card.body.includes('&lt;script&gt;'));
  const denied = await openWs(server.port, null); sockets.push(denied.socket); assert.equal(denied.status, 403);
  const foreign = await openWs(server.port, a.cookie, 'https://evil.test'); sockets.push(foreign.socket); assert.equal(foreign.status, 403);
  const ws = await openWs(server.port, a.cookie); sockets.push(ws.socket); assert.equal(ws.status, 101);
  const welcome = await ws.next('welcome');
  assert.equal(welcome.accountId, a.body.accountId); assert.equal(welcome.authenticated, true); assert.equal(welcome.xVerified, false);
  ws.send({ type: 'hub_update', handle: b.body.handle, accountId: b.body.accountId, x: 20 });
  assert.equal((await ws.next('hub_actor')).handle, a.body.handle);
  const frame = clientFrame({ type: 'chat', handle: b.body.handle, text: 'split frame' });
  ws.socket.write(frame.subarray(0, 5));
  await new Promise(resolve => setTimeout(resolve, 15));
  ws.socket.write(frame.subarray(5));
  assert.equal((await ws.next('chat')).entry.handle, a.body.handle);
  sockets.forEach(s => s.destroy());
  await server.stop();
  server = await startServer(dir);
  assert.equal((await server.request('/api/session', { method: 'POST', cookie: a.cookie })).body.accountId, a.body.accountId);
  assert.equal((await server.request('/api/economy', { cookie: a.cookie })).body.economy.gold, 0);
  const init = { requestId: crypto.randomUUID(), expectedVersion: 0, type: 'game.start', args: {} };
  assert.equal((await server.request('/api/economy/command', { method: 'POST', body: init })).status, 401);
  const started = await server.request('/api/economy/command', { method: 'POST', cookie: a.cookie, body: init });
  assert.equal(started.status, 200); assert.equal(started.body.economy.gold, 420);
  const replay = await server.request('/api/economy/command', { method: 'POST', cookie: a.cookie, body: init });
  assert.equal(replay.body.replayed, true); assert.equal(replay.body.economy.gold, 420);
  const spoof = await server.request('/api/economy/command', { method: 'POST', cookie: a.cookie, body: { ...init, accountId: b.body.accountId } });
  assert.equal(spoof.status, 400);
  const reward = { requestId: crypto.randomUUID(), expectedVersion: 1, type: 'reward.grant', args: { gold: 9999 } };
  assert.equal((await server.request('/api/economy/command', { method: 'POST', cookie: a.cookie, body: reward })).status, 400);
  assert.equal((await server.request('/api/economy', { cookie: a.cookie })).body.economy.gold, 420);
  assert.equal((await server.request('/api/economy', { cookie: b.cookie })).body.economy.gold, 0);
  assert.ok(fs.existsSync(path.join(dir, 'world.json')));
  assert.equal(fs.existsSync(path.join(dir, 'economy.sqlite')), false);
  for (let i = 0; i < 20; i++) assert.equal((await server.request('/api/session', { method: 'POST' })).status, 200);
  assert.equal((await server.request('/api/session', { method: 'POST' })).status, 429);
  assert.equal((await server.request('/api/session', { method: 'POST', cookie: a.cookie })).status, 200);
});
