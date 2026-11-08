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
  const child = fork('-e', [`const { server } = require(${JSON.stringify(require.resolve('../server'))}); process.on('message', msg => { if (msg === 'shutdown') process.emit('SIGTERM'); }); server.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));`], {
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
    async stop() { if (child.exitCode !== null) return; const exited = once(child, 'exit'); child.send('shutdown'); await exited; },
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
  assert.equal(economic.body.economy.gold, 0); assert.equal(economic.body.economyReady, true); assert.equal(economic.body.week, null);
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
  const persisted = JSON.parse(fs.readFileSync(path.join(dir, 'world.json'), 'utf8'));
  assert.equal(persisted.players[a.body.handle].star.name, maliciousName);
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
  for (let i = 0; i < 18; i++) assert.equal((await server.request('/api/session', { method: 'POST' })).status, 200);
  assert.equal((await server.request('/api/session', { method: 'POST' })).status, 429);
  assert.equal((await server.request('/api/session', { method: 'POST', cookie: a.cookie })).status, 200);
});


test('Bedesten HTTP: real server settlement, forged ownership rejected, no fake listings, WS mutations closed (ENG-07)', { timeout: 30000 }, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-market-'));
  const server = await startServer(dir);
  const sockets = [];
  t.after(async () => { sockets.forEach(s => s.destroy()); await server.stop(); fs.rmSync(dir, { recursive: true, force: true }); });
  const a = await server.request('/api/session', { method: 'POST' });
  const b = await server.request('/api/session', { method: 'POST' });
  const post = (cookie, body) => server.request('/api/market', { method: 'POST', cookie, body });
  const start = cookie => server.request('/api/economy/command', { method: 'POST', cookie, body: { requestId: crypto.randomUUID(), expectedVersion: 0, type: 'game.start', args: {} } });
  const started = await start(a.cookie); await start(b.cookie);
  const file = path.join(dir, 'local-economy', 'economy.sqlite');
  require('./helpers/earned_fixture').seedSQLite(file, a.body.accountId);
  const assetId = started.body.economy.dragons[0].assetId;
  const list = (cookie, extra = {}) => post(cookie, { op: 'list', requestId: crypto.randomUUID(), kind: 'dragon', assetId, quantity: 1, unitPrice: 10, ...extra });
  const initialMarket = (await server.request('/api/market')).body;
  assert.equal(initialMarket.ok, true); assert.equal(initialMarket.settlementReady, true);
  assert.deepEqual(initialMarket.listings, [], 'no seeded/fake live listings');
  assert.equal((await post(undefined, { op: 'buy', id: 'fake' })).status, 401);
  assert.equal((await list(undefined)).status, 401);
  assert.equal((await list(b.cookie)).status, 403);
  assert.equal((await list(a.cookie, { assetId: 'forged' })).status, 403);
  for (const unitPrice of [-1, 0, 1.5, '10', 2000000001]) assert.equal((await list(a.cookie, { unitPrice })).status, 400);
  assert.equal((await list(a.cookie, { seller: b.body.handle })).status, 400);
  assert.equal((await post(a.cookie, { op: 'list', listing: { assetId, price: 10 } })).status, 400);
  assert.equal((await post(a.cookie, { op: 'offer', id: 'x' })).status, 503);
  assert.deepEqual((await server.request('/api/market')).body.listings, []);
  const before = (await server.request('/api/economy', { cookie: a.cookie })).body;
  const created = await list(a.cookie);
  assert.equal(created.status, 200);
  assert.equal(created.body.listing.seller, a.body.handle);
  assert.equal(created.body.listing.sellerAccountId, undefined);
  const id = created.body.listing.id;
  assert.equal((await list(a.cookie)).status, 409);
  assert.equal((await post(b.cookie, { op: 'cancel', requestId: crypto.randomUUID(), listingId: id })).status, 403);
  const publicView = (await server.request('/api/market', { cookie: b.cookie })).body.listings;
  assert.equal(publicView.length, 1); assert.equal(publicView[0].mine, false); assert.equal(publicView[0].assetId, undefined);
  // WS mutation path is closed for every op, including forged seller/buyer fields.
  const ws = await openWs(server.port, b.cookie); sockets.push(ws.socket);
  await ws.next('welcome');
  for (const op of ['list', 'cancel', 'buy', 'offer']) {
    ws.send({ type: 'market_op', op, id, listing: { assetId, price: 10, seller: a.body.handle }, buyer: a.body.handle });
    assert.equal((await ws.next('market_error')).error, 'market_http_only');
  }
  // ENG-10: `week.serverNow` (ve çapasız biletin nextAt'i) her okumada değişir; ekonomi ve bilet sayısı değişmemeli.
  const stable = body => ({ ...body, week: body.week && { ...body.week, serverNow: 0, ticket: body.week.ticket && { ...body.week.ticket, nextAt: 0 } } }); // bilet çapası yokken nextAt okuma anına göre
  assert.deepEqual(stable((await server.request('/api/economy', { cookie: a.cookie })).body), stable(before));
  // Buyer b only has bound starter gold: it cannot pay another player.
  const buyBody = { op: 'buy', requestId: crypto.randomUUID(), listingId: id, quantity: 1, unitPrice: 10 };
  const bound = await post(b.cookie, buyBody);
  assert.equal(bound.status, 409); assert.equal(bound.body.error, 'gold_not_transferable');
  require('./helpers/earned_fixture').seedSQLite(file, b.body.accountId);
  const sold = await post(b.cookie, buyBody);
  assert.equal(sold.status, 200); assert.equal(sold.body.sale.total, 10); assert.equal(sold.body.listing.status, 'sold');
  const update = await ws.next('market_update');
  assert.deepEqual(Object.keys(update).sort(), ['listingId', 'type'], 'broadcast carries no listings, sale or gold');
  const replay = await post(b.cookie, buyBody);
  assert.equal(replay.status, 200); assert.equal(replay.body.replayed, true);
  assert.equal((await post(b.cookie, { ...buyBody, quantity: 2 })).body.error, 'request_id_reused');
  assert.equal((await post(b.cookie, { ...buyBody, requestId: crypto.randomUUID() })).body.error, 'listing_closed');
  assert.equal((await post(b.cookie, { ...buyBody, unitPrice: 11 })).body.error, 'request_id_reused');
  const A = (await server.request('/api/economy', { cookie: a.cookie })).body.economy, B = (await server.request('/api/economy', { cookie: b.cookie })).body.economy;
  assert.equal(A.gold, 430); assert.equal(B.gold, 410);
  assert.equal(A.dragons.some(d => d.assetId === assetId), false); assert.equal(B.dragons.some(d => d.assetId === assetId), true);
  const mine = (await server.request('/api/market', { cookie: a.cookie })).body.mine;
  assert.equal(mine[0].status, 'sold'); assert.equal(mine[0].sales[0].buyer, b.body.handle);
  assert.deepEqual((await server.request('/api/market')).body.listings, []);
});

test('trade HTTP/WS authenticate participants and recover completed transfer after socket disconnect', { timeout: 20000 }, async t => {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eo-trade-http-'));const server=await startServer(dir);const sockets=[];
 t.after(async()=>{sockets.forEach(s=>s.destroy());await server.stop();fs.rmSync(dir,{recursive:true,force:true});});
 const a=await server.request('/api/session',{method:'POST'}),b=await server.request('/api/session',{method:'POST'});
 const command=(type,extra={})=>({type,requestId:crypto.randomUUID(),...extra});
 const post=(cookie,body)=>server.request('/api/trade',{method:'POST',cookie,body});
 for(const user of [a,b]) await server.request('/api/economy/command',{method:'POST',cookie:user.cookie,body:{...command('game.start'),expectedVersion:0,args:{}}});
 require('./helpers/earned_fixture').seedSQLite(path.join(dir,'local-economy','economy.sqlite'));
 assert.equal((await post(undefined,command('invite',{targetId:b.body.accountId}))).status,401);
 assert.equal((await post(a.cookie,{...command('invite',{targetId:b.body.accountId}),accountId:b.body.accountId})).status,400);
 let response=await post(a.cookie,command('invite',{targetId:b.body.accountId}));assert.equal(response.status,200);let trade=response.body.trade;
 trade=(await post(b.cookie,command('accept',{tradeId:trade.id}))).body.trade;
 trade=(await post(a.cookie,command('offer',{tradeId:trade.id,revision:trade.revision,offer:{gold:40}}))).body.trade;
 await post(a.cookie,command('confirm',{tradeId:trade.id,revision:trade.revision}));
 const ws=await openWs(server.port,b.cookie);sockets.push(ws.socket);await ws.next('welcome');
 const confirm=command('confirm',{tradeId:trade.id,revision:trade.revision});
 ws.send({type:'trade_command',accountId:a.body.accountId,command:confirm});
 assert.equal((await ws.next('trade_state')).trade.status,'completed');ws.socket.destroy();
 const replay=await post(b.cookie,confirm);assert.equal(replay.body.replayed,true);
 assert.equal((await post(a.cookie,command('get',{tradeId:trade.id}))).body.trade.status,'completed');
 assert.equal((await server.request('/api/economy',{cookie:a.cookie})).body.economy.gold,380);
 assert.equal((await server.request('/api/economy',{cookie:b.cookie})).body.economy.gold,460);
});

test('ENG05 HTTP and existing WS reject a revoked session without waiting for cache or timer', {timeout:20000}, async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eo-revoke-')),server=await startServer(dir);
 let ws;t.after(async()=>{ws?.socket.destroy();await server.stop();fs.rmSync(dir,{recursive:true,force:true});});
 const a=await server.request('/api/session',{method:'POST'});
 ws=await openWs(server.port,a.cookie);await ws.next('welcome');
 const store=require('../server/economy_store').openEconomyStore(path.join(dir,'local-economy','economy.sqlite'));
 try{store.revokeSession(a.cookie.split('=')[1]);}finally{store.close();}
 assert.equal((await server.request('/api/trade/state',{cookie:a.cookie})).status,401);
 const closed=once(ws.socket,'close');ws.send({type:'trade_command',command:{type:'invite',requestId:crypto.randomUUID(),targetId:crypto.randomUUID()}});
 await Promise.race([closed,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('revoked WS remained open')),2000);timer.unref();})]);
});
