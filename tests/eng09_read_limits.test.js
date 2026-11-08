'use strict';
// ENG-09 Y-1 · Okuma uçlarında hesap/IP limiti ve GET /api/market kısa ömürlü önbelleği (SQLite + saf modül).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { fork } = require('node:child_process');
const { once } = require('node:events');
const { createMarketReadCache } = require('../server/market_read_cache');
const { publicListing } = require('../server/market_service');
const ORIGIN = 'http://game.test';

async function startServer(dir, extraEnv = {}) {
  const child = fork('-e', [`const { server } = require(${JSON.stringify(require.resolve('../server'))}); process.on('message', msg => { if (msg === 'shutdown') process.emit('SIGTERM'); }); server.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));`], {
    env: { ...process.env, NODE_ENV: 'test', DATA_DIR: dir, LOCAL_ECONOMY_DIR: path.join(dir, 'local-economy'), ECONOMY_BACKEND: 'sqlite', PUBLIC_URL: ORIGIN, PORT: '0', ...extraEnv }, silent: true,
  });
  let stderr = '';
  child.stderr.on('data', x => { stderr += x; }); child.stdout.resume();
  const info = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('server startup timeout: ' + stderr)); }, 5000);
    child.once('message', value => { clearTimeout(timer); resolve(value); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`server exit ${code}: ${stderr}`)); });
  });
  return {
    async request(url, { cookie, method = 'GET', body } = {}) {
      const response = await fetch(`http://127.0.0.1:${info.port}${url}`, { method, headers: {
        Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}),
      }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const text = await response.text();
      return { status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0], body: (() => { try { return JSON.parse(text); } catch (_) { return text; } })() };
    },
    async stop() { if (child.exitCode !== null) return; const exited = once(child, 'exit'); child.send('shutdown'); await exited; },
  };
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'eo-eng09-'));

test('ENG09 read limits: normal client polling (several tabs, Bedesten + Takas) never hits the default limit', { timeout: 60000 }, async t => {
  const dir = tmp(), server = await startServer(dir);
  t.after(async () => { await server.stop(); fs.rmSync(dir, { recursive: true, force: true }); });
  const a = await server.request('/api/session', { method: 'POST' });
  const id = a.body.accountId;
  // Bir dakikalık yoğun kullanım: 4 sekme Bedesten (10 sn: market + economy) ve 4 sekme Takas (5 sn: state + peers).
  const minute = [];
  for (let tab = 0; tab < 4; tab++) {
    for (let i = 0; i < 6; i++) minute.push('/api/market', '/api/economy');
    for (let i = 0; i < 12; i++) minute.push('/api/trade/state', '/api/trade/peers');
  }
  assert.equal(minute.length, 144);
  for (const url of minute) {
    const r = await server.request(url, { cookie: a.cookie });
    assert.equal(r.status, 200, url + ' ' + JSON.stringify(r.body));
  }
  // POST kovası ayrı: okuma trafiği komut limitini tüketmez.
  const started = await server.request('/api/economy/command', { method: 'POST', cookie: a.cookie, body: { requestId: crypto.randomUUID(), expectedVersion: 0, type: 'game.start', args: {} } });
  assert.equal(started.status, 200);
  assert.equal((await server.request('/api/market', { cookie: a.cookie })).status, 200);
  assert.ok(id);
});

test('ENG09 read limits: per-account and per-IP 429 rate_limited, separate buckets, POST limits untouched', { timeout: 30000 }, async t => {
  const dir = tmp(), server = await startServer(dir, { READ_RATE_PER_ACCOUNT: '5', READ_RATE_PER_IP: '3' });
  t.after(async () => { await server.stop(); fs.rmSync(dir, { recursive: true, force: true }); });
  const a = await server.request('/api/session', { method: 'POST' });
  const b = await server.request('/api/session', { method: 'POST' });
  const urls = ['/api/market', '/api/economy', '/api/trade/state', '/api/trade/peers', '/api/market'];
  for (const url of urls) assert.equal((await server.request(url, { cookie: a.cookie })).status, 200, url);
  for (const url of ['/api/market', '/api/economy', '/api/trade/state']) {
    const over = await server.request(url, { cookie: a.cookie });
    assert.equal(over.status, 429, url); assert.deepEqual(over.body, { ok: false, error: 'rate_limited' });
  }
  // Başka hesap etkilenmez; aynı IP'den oturumsuz kova da ayrıdır.
  assert.equal((await server.request('/api/market', { cookie: b.cookie })).status, 200);
  for (let i = 0; i < 3; i++) assert.equal((await server.request('/api/market')).status, 200);
  const anon = await server.request('/api/market');
  assert.equal(anon.status, 429); assert.equal(anon.body.error, 'rate_limited');
  // Oturumsuz /api/economy de IP kovasından düşer (401'den önce).
  assert.equal((await server.request('/api/economy')).status, 429);
  // POST uçları okuma kovasından etkilenmez (ENG-05 'economy:' kovası değişmedi).
  const started = await server.request('/api/economy/command', { method: 'POST', cookie: a.cookie, body: { requestId: crypto.randomUUID(), expectedVersion: 0, type: 'game.start', args: {} } });
  assert.equal(started.status, 200);
  const offer = await server.request('/api/market', { method: 'POST', cookie: a.cookie, body: { op: 'offer' } });
  assert.equal(offer.status, 503); assert.equal(offer.body.error, 'market_settlement_unavailable', 'POST /api/market reaches the handler, not the read limiter');
  // Limitsiz uçlar (ör. oturum) etkilenmez.
  assert.equal((await server.request('/api/session', { method: 'POST', cookie: a.cookie })).status, 200);
});

test('ENG09 market cache: listing, sale and cancel are visible immediately; per-account fields never leak through the cache', { timeout: 30000 }, async t => {
  const dir = tmp(), server = await startServer(dir, { MARKET_CACHE_TTL_MS: '60000' });
  t.after(async () => { await server.stop(); fs.rmSync(dir, { recursive: true, force: true }); });
  const a = await server.request('/api/session', { method: 'POST' });
  const b = await server.request('/api/session', { method: 'POST' });
  const start = cookie => server.request('/api/economy/command', { method: 'POST', cookie, body: { requestId: crypto.randomUUID(), expectedVersion: 0, type: 'game.start', args: {} } });
  const started = await start(a.cookie); await start(b.cookie);
  const file = path.join(dir, 'local-economy', 'economy.sqlite');
  require('./helpers/earned_fixture').seedSQLite(file, a.body.accountId);
  require('./helpers/earned_fixture').seedSQLite(file, b.body.accountId);
  const d0 = started.body.economy.dragons[0];
  // Önbelleği doldur (60 sn TTL: yalnız geçersiz kılma tazeliği sağlayabilir).
  assert.deepEqual((await server.request('/api/market')).body.listings, []);
  assert.deepEqual((await server.request('/api/market', { cookie: b.cookie })).body.listings, []);
  const post = (cookie, body) => server.request('/api/market', { method: 'POST', cookie, body: { requestId: crypto.randomUUID(), ...body } });
  const listed = await post(a.cookie, { op: 'list', kind: 'dragon', assetId: d0.assetId, quantity: 1, unitPrice: 10 });
  assert.equal(listed.status, 200);
  const id = listed.body.listing.id;
  const seen = (await server.request('/api/market', { cookie: b.cookie })).body.listings;
  assert.deepEqual(seen.map(l => l.id), [id], 'new listing visible right after POST');
  assert.equal(seen[0].mine, false); assert.equal(seen[0].assetId, undefined); assert.equal(seen[0].sales, undefined); assert.equal(seen[0].sellerId, undefined);
  const own = (await server.request('/api/market', { cookie: a.cookie })).body;
  assert.equal(own.listings[0].mine, true); assert.equal(own.listings[0].assetId, d0.assetId, 'seller sees own fields from the same cached page');
  assert.equal(own.mine[0].id, id);
  const anon = (await server.request('/api/market')).body.listings;
  assert.equal(anon[0].mine, false); assert.equal(anon[0].assetId, undefined);
  // Satış sonrası taze veri.
  const sold = await post(b.cookie, { op: 'buy', listingId: id, quantity: 1, unitPrice: 10 });
  assert.equal(sold.status, 200);
  assert.deepEqual((await server.request('/api/market', { cookie: b.cookie })).body.listings, [], 'sold listing disappears immediately');
  assert.equal((await server.request('/api/market', { cookie: a.cookie })).body.mine[0].status, 'sold');
  // İptal sonrası taze veri: alıcı satın aldığı ejderhayı yeniden ilana koyup geri çeker.
  {
    const second = await post(b.cookie, { op: 'list', kind: 'dragon', assetId: d0.assetId, quantity: 1, unitPrice: 12 });
    assert.equal(second.status, 200, JSON.stringify(second.body));
    assert.equal((await server.request('/api/market')).body.listings.length, 1);
    assert.equal((await post(b.cookie, { op: 'cancel', listingId: second.body.listing.id })).status, 200);
    assert.deepEqual((await server.request('/api/market')).body.listings, [], 'cancelled listing disappears immediately');
  }
});

test('ENG09 market cache module: TTL, single-flight, generation guard against stale in-flight reads, ttl 0 disables', async () => {
  let clock = 1000, calls = 0, release = null;
  const rows = [{ id: 'l1', sellerId: 'acc-a', assetId: 'x', sales: [], status: 'open' }];
  const store = {
    listMarketRaw(actor, { open = true } = {}) {
      if (!open) return { open: [], mine: rows.filter(r => r.sellerId === actor) };
      calls++;
      const snapshot = rows.map(r => ({ ...r }));
      return release ? new Promise(resolve => { const r = release; release = null; r(() => resolve({ open: snapshot, mine: [] })); }) : { open: snapshot, mine: [] };
    },
  };
  const cache = createMarketReadCache({ store, publicListing, ttlMs: 2500, now: () => clock });
  const v1 = await cache.view(null);
  assert.equal(v1.listings[0].assetId, undefined); assert.equal(calls, 1);
  const v2 = await cache.view('acc-a');
  assert.equal(v2.listings[0].mine, true); assert.equal(v2.listings[0].assetId, 'x'); assert.equal(v2.mine.length, 1);
  assert.equal(calls, 1, 'second view served from cache');
  await Promise.all([cache.view('acc-b'), cache.view(null)]); assert.equal(calls, 1);
  clock += 2500; await cache.view(null); assert.equal(calls, 2, 'expired after TTL');
  rows.push({ id: 'l2', sellerId: 'acc-b', status: 'open' });
  cache.invalidate(); assert.equal((await cache.view(null)).listings.length, 2); assert.equal(calls, 3);
  // Uçuşta eski okuma: invalidate sonrası tamamlansa da önbelleğe yazılmaz.
  clock += 5000;
  let finish;
  release = done => { finish = done; };
  const stale = cache.view(null);
  await new Promise(r => setImmediate(r));
  rows.pop(); cache.invalidate();
  finish(); await stale;
  assert.equal((await cache.view(null)).listings.length, 1, 'fresh read after invalidate, stale in-flight result discarded');
  const off = createMarketReadCache({ store, publicListing, ttlMs: 0, now: () => clock });
  const before = calls; await off.view(null); await off.view(null); assert.equal(calls, before + 2);
});
