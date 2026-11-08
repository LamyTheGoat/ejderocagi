'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const { createMarketService } = require('../server/market_service');
const { openEconomyStore } = require('../server/economy_store');
const { createMarketClient } = require('../js/market_client');
const { earnedFixture } = require('./helpers/earned_fixture');

test('market rejects unavailable assets and storage failures without creating listings', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eo-mksec-')), file = path.join(dir, 'db.sqlite');
  const store = openEconomyStore(file), raw = new DatabaseSync(file);
  t.after(() => { raw.close(); store.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  const id = store.createGuest().accountId;
  store.executeCommand(id, { requestId: crypto.randomUUID(), expectedVersion: 0, type: 'game.start', args: {} });
  const base = earnedFixture(store.readEconomy(id).game);
  base.inv.push({ uid: base.uid++, id: 'zirh1', assetId: id + ':item:x', funding: 'earned' });
  base.eggs.forEach(e => { e.inK = false; });
  const market = createMarketService({ store });
  const list = (kind, assetId) => market.execute({ accountId: id }, { op: 'list', requestId: crypto.randomUUID(), kind, assetId, quantity: 1, unitPrice: 10 });
  const cases = [
    ['dragon', g => { g.dragons[0].task = 'quest'; }, /asset_unavailable/], ['dragon', g => { g.dragons[0].dead = true; }, /asset_unavailable/],
    ['dragon', g => { g.dragons[0].old = true; }, /asset_unavailable/], ['dragon', g => { g.dragons[0].equip = { head: 1 }; }, /asset_equipped/],
    ['egg', g => { g.eggs[0].inK = true; }, /asset_unavailable/], ['item', g => { g.inv.at(-1).tradeLocked = true; }, /asset_unavailable/],
    ['item', g => { g.inv.at(-1).heirloomId = 'u'; }, /asset_unavailable/], ['item', g => { g.dragons[0].equip = { body: g.inv.at(-1).uid }; }, /asset_equipped/],
  ];
  for (const [kind, mutate, error] of cases) {
    const g = structuredClone(base); mutate(g);
    raw.prepare('UPDATE game_states SET game_json=? WHERE account_id=?').run(JSON.stringify(g), id);
    const assetId = kind === 'dragon' ? g.dragons[0].assetId : kind === 'egg' ? g.eggs[0].assetId : g.inv.at(-1).assetId;
    await assert.rejects(list(kind, assetId), e => error.test(e.code) && e.status === 409);
  }
  const broken = createMarketService({ store: { async executeMarket() { throw new Error('offline'); } } });
  await assert.rejects(broken.execute({ accountId: id }, {}), /offline/);
  await assert.rejects(market.execute(null, { op: 'buy' }), e => e.status === 401);
  assert.equal(raw.prepare('SELECT COUNT(*) n FROM market_listings').get().n, 0);
  assert.equal(raw.prepare('SELECT COUNT(*) n FROM market_receipts').get().n, 0);
});

test('legacy Bedesten actions never change local balances or assets; closed ones say so', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/pazar.js'), 'utf8');
  assert.doesNotMatch(source, /DEFAULT_BEDESTEN_SEED|mk_seed_|bed-mult|bedMult/, 'no fake seed listings or value()-based price multiplier');
  const section = source.slice(source.indexOf("'bedesten-open'() {"),source.indexOf('function hanSVG'));
  assert.doesNotMatch(section, /S\.(gold|dragons|eggs|inv|food)\s*(\+|-)?=[^=]|S\.(dragons|eggs|inv)\.(push|splice)|bedestenListings/);
  const S = { gold: 500, dragons: [{ id: 1 }], inv: [], eggs: [], food: {} };
  const before = structuredClone(S), notices = [], sent = [];
  const closed = ['bed-post-mat', 'bed-sim-sale', 'bed-offer'];
  for (const name of ['bed-buy', 'bed-cancel', 'bed-post-dragon', 'bed-post-egg', 'bed-post-item', 'bed-post-food', ...closed]) {
    const handler = source.match(new RegExp("'" + name + "'\\(el\\) \\{([\\s\\S]*?)^  \\}", 'm'));
    assert.ok(handler, name);
    vm.runInNewContext('(function(el) {' + handler[1] + '})({dataset:{id:"fake"}})', { S, toast: value => notices.push(value), bedSend: (...args) => sent.push(args[0]) });
    assert.deepEqual(S, before, name);
  }
  assert.deepEqual(sent, ['buy', 'cancel', 'list', 'list', 'list', 'list']);
  assert.equal(notices.length, closed.length);
  assert.ok(notices.every(value => value.includes('kapalı')));
});

test('market client keeps the exact body on ambiguous failures, clears it on rejection and never reports unverified success', async () => {
  const saved = new Map(), calls = [];
  const storage = { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v), removeItem: k => saved.delete(k) };
  let mode = 'down';
  const reply = (status, body) => ({ ok: status < 400, status, json: async () => body });
  const fetch = async (url, options = {}) => {
    calls.push({ url, body: options.body });
    if (url === '/api/session') return reply(200, { accountId: 'acc', handle: '@me' });
    if (url === '/api/market' && !options.method) return reply(200, { listings: [], mine: [] });
    if (url === '/api/economy') return reply(200, { economy: { version: 1, gold: 1 } });
    if (mode === 'down') throw new Error('network');
    if (mode === '503') return reply(503, { error: 'market_unavailable' });
    if (mode === '409') return reply(409, { error: 'listing_closed' });
    return reply(200, { listing: { id: 'mk_x' }, sale: { total: 5 } });
  };
  let n = 0;
  const client = createMarketClient({ fetch, storage, uuid: () => '00000000-0000-4000-8000-00000000000' + (n++) });
  await assert.rejects(client.buy({ id: 'mk_' + 'a'.repeat(32), unitPrice: 5 }, 1), /network/);
  assert.ok(client.state.pending); assert.equal(client.state.error, 'market_unverified'); assert.equal(client.state.notice, '');
  const sentBody = calls.filter(c => c.url === '/api/market' && c.body).at(-1).body;
  assert.ok(saved.get('eo-market-pending:acc'));
  await assert.rejects(client.cancel('mk_' + 'b'.repeat(32)), /market_pending_retry/);
  mode = '503'; await client.retry(); assert.ok(client.state.pending); assert.equal(client.state.notice, '');
  mode = 'ok'; await client.retry();
  assert.equal(client.state.pending, null); assert.equal(saved.has('eo-market-pending:acc'), false);
  assert.ok(client.state.notice.length > 0);
  const posts = calls.filter(c => c.url === '/api/market' && c.body).map(c => c.body);
  assert.equal(posts.length, 3);
  assert.ok(posts.every(b => b === sentBody), 'retries resend the identical body (same requestId)');
  mode = '409';
  await assert.rejects(client.cancel('mk_' + 'c'.repeat(32)), /listing_closed/);
  assert.equal(client.state.pending, null); assert.equal(client.state.error, 'listing_closed'); assert.equal(client.state.notice, '');
});
