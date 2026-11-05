'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createMarketService } = require('../server/market_service');

test('market rejects unavailable assets and storage failures without changing listings', async () => {
  const identity = { accountId: 'a', handle: '@a' };
  const world = { marketListings: [], marketSales: [] };
  const economy = { accountId: 'a', items: [], dragons: [], eggs: [] };
  const market = createMarketService({ world, store: { async readEconomy() { return economy; } } });
  const list = () => market.execute(identity, { op: 'list', listing: { assetId: 'asset', price: 10 } });
  for (const [key, data] of [
    ['dragons', { task: 'quest' }], ['dragons', { dead: true }],
    ['dragons', { equip: { head: 1 } }], ['eggs', { inK: true }],
    ['items', { tradeLocked: true }], ['items', { heirloomId: 'unique' }],
  ]) {
    economy[key] = [{ assetId: 'asset', data }];
    await assert.rejects(list(), error => error.status === 409);
    economy[key] = [];
  }
  economy.items = [{ assetId: 'asset', data: { uid: 1 } }];
  economy.dragons = [{ assetId: 'dragon', data: { equip: { head: 1 } } }];
  await assert.rejects(list(), /asset_equipped/);
  const broken = createMarketService({ world, store: { async readEconomy() { throw new Error('offline'); } } });
  await assert.rejects(broken.execute(identity, { op: 'list', listing: { assetId: 'asset', price: 10 } }), /offline/);
  assert.deepEqual(world, { marketListings: [], marketSales: [] });
  await assert.rejects(market.execute(null, { op: 'buy' }), error => error.status === 401);
});

test('legacy Bedesten actions cannot change local balances, assets or announce success', () => {
  const source = fs.readFileSync(path.join(__dirname, '../js/pazar.js'), 'utf8');
  const S = { gold: 500, dragons: [{ id: 1 }], inv: [], eggs: [], food: {} };
  const before = structuredClone(S), notices = [];
  for (const name of ['bed-buy', 'bed-cancel', 'bed-post-dragon', 'bed-post-egg', 'bed-post-item', 'bed-post-food', 'bed-post-mat', 'bed-sim-sale', 'bed-offer']) {
    const handler = source.match(new RegExp("'" + name + "'\\(el\\) \\{([\\s\\S]*?)^  \\}", 'm'));
    assert.ok(handler, name);
    vm.runInNewContext('(function(el) {' + handler[1] + '})({dataset:{id:"fake"}})', { S, toast: value => notices.push(value) });
    assert.deepEqual(S, before, name);
  }
  assert.equal(notices.length, 9);
  assert.ok(notices.every(value => value.includes('kapalı')));
});
